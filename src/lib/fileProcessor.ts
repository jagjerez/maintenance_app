import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { connectDB } from './db';
import { IntegrationJob, Location, MachineModel, Machine, MaintenanceRange, Operation } from '@/models';

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  limitedRows: number; // Number of rows that were not processed due to limit
  errors: Array<{
    row: number;
    field: string;
    value: string;
    message: string;
  }>;
}

export interface FileRowData {
  [key: string]: string | number | undefined;
}

export class FileProcessor {
  private jobId: string;
  private type: string;
  private companyId: string;
  private static readonly MAX_ROWS_PER_PROCESSING = 100;

  private safeTrim(value: string | number | undefined): string {
    return value ? String(value).trim() : '';
  }

  constructor(jobId: string, type: string, companyId: string) {
    this.jobId = jobId;
    this.type = type;
    this.companyId = companyId;
  }


  async processFile(fileUrl: string): Promise<ProcessingResult> {
    try {
      // Update job status to processing
      await this.updateJobStatus('processing');

      // Fetch file content
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const fileBuffer = await response.arrayBuffer();
      const fileExtension = fileUrl.split('.').pop()?.toLowerCase();

      let data: FileRowData[] = [];

      if (fileExtension === 'csv') {
        data = await this.parseCSV(fileBuffer);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        data = await this.parseExcel(fileBuffer);
      } else {
        throw new Error('Unsupported file format');
      }

      // Process data based on type
      const result = await this.processData(data);

      // Update job with final results
      await this.updateJobWithResults(result);

      return result;
    } catch (error) {
      console.error('Error processing file:', error);
      await this.updateJobStatus('failed');
      throw error;
    }
  }

  private async parseCSV(fileBuffer: ArrayBuffer): Promise<FileRowData[]> {
    return new Promise((resolve, reject) => {
      const data: FileRowData[] = [];
      const stream = Readable.from(Buffer.from(fileBuffer));
      
      stream
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
        .on('error', reject);
    });
  }

  private async parseExcel(fileBuffer: ArrayBuffer): Promise<FileRowData[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  private async processData(data: FileRowData[]): Promise<ProcessingResult> {
    const totalRows = data.length;
    const limitedRows = Math.max(0, totalRows - FileProcessor.MAX_ROWS_PER_PROCESSING);
    const rowsToProcess = Math.min(totalRows, FileProcessor.MAX_ROWS_PER_PROCESSING);
    
    const result: ProcessingResult = {
      totalRows,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      limitedRows,
      errors: [],
    };

    // Process only the first MAX_ROWS_PER_PROCESSING rows
    for (let i = 0; i < rowsToProcess; i++) {
      const row = data[i];
      const rowNumber = i + 1;

      try {
        await this.processRow(row, rowNumber);
        result.successRows++;
      } catch (error: unknown) {
        result.errorRows++;
        const errorObj = error as { field?: string; value?: string; message?: string };
        result.errors.push({
          row: rowNumber,
          field: errorObj.field || 'unknown',
          value: errorObj.value || '',
          message: errorObj.message || 'Unknown error',
        });
      }

      result.processedRows++;
      
      // Update progress every 10 rows
      if (i % 10 === 0) {
        await this.updateJobProgress(result);
      }
    }

    return result;
  }

  private async processRow(row: FileRowData, rowNumber: number): Promise<void> {
    switch (this.type) {
      case 'locations':
        await this.processLocationRow(row, rowNumber);
        break;
      case 'machine-models':
        await this.processMachineModelRow(row, rowNumber);
        break;
      case 'machines':
        await this.processMachineRow(row, rowNumber);
        break;
      case 'maintenance-ranges':
        await this.processMaintenanceRangeRow(row, rowNumber);
        break;
      case 'operations':
        await this.processOperationRow(row, rowNumber);
        break;
      default:
        throw new Error(`Unknown type: ${this.type}`);
    }
  }

  private async processLocationRow(row: FileRowData, _rowNumber: number): Promise<void> {
    const { internalCode, name, description, icon, parentInternalCode } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }

    // Check if this is an update (has internalCode) or create
    if (internalCode && this.safeTrim(internalCode)) {
      // Update existing location
      let existingLocation = await Location.findOne({ 
        internalCode: this.safeTrim(internalCode), 
        companyId: this.companyId 
      });
      
      // Find parent location if parentInternalCode is provided
      let parentLocationId = null;
      if (parentInternalCode && this.safeTrim(parentInternalCode)) {
        const parentLocation = await Location.findOne({ 
          internalCode: this.safeTrim(parentInternalCode), 
          companyId: this.companyId 
        });
        if (parentLocation) {
          parentLocationId = parentLocation._id;
        }
      }

      if (!existingLocation) {
        existingLocation = new Location({
          internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
          name: this.safeTrim(name),
          description: this.safeTrim(description) || '',
          icon: this.safeTrim(icon) || undefined,
          parentId: parentLocationId,
          companyId: this.companyId,
        });
      } else {
        // Update the location
        existingLocation.name = this.safeTrim(name);
        existingLocation.description = this.safeTrim(description) || '';
        existingLocation.icon = this.safeTrim(icon) || undefined;
        existingLocation.parentId = parentLocationId || undefined;
      }
      
      await existingLocation.save();
    } else {
      // Create new location
      // Find parent location if parentInternalCode is provided
      let parentLocationId = null;
      if (parentInternalCode && this.safeTrim(parentInternalCode)) {
        const parentLocation = await Location.findOne({ 
          internalCode: this.safeTrim(parentInternalCode), 
          companyId: this.companyId 
        });
        if (parentLocation) {
          parentLocationId = parentLocation._id;
        }
      }

      const location = new Location({
        internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
        name: this.safeTrim(name),
        description: this.safeTrim(description) || '',
        icon: this.safeTrim(icon) || undefined,
        parentId: parentLocationId,
        companyId: this.companyId,
      });

      await location.save();
    }
  }

  private async processMachineModelRow(row: FileRowData, _rowNumber: number): Promise<void> {
    const { internalCode, name, manufacturer, brand, year, properties } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }
    if (!manufacturer) {
      throw { field: 'manufacturer', value: manufacturer, message: 'Manufacturer is required' };
    }
    if (!brand) {
      throw { field: 'brand', value: brand, message: 'Brand is required' };
    }
    if (!year || isNaN(Number(year))) {
      throw { field: 'year', value: year, message: 'Valid year is required' };
    }

    let propertiesMap = new Map();
    if (properties) {
      try {
        const parsedProperties = JSON.parse(String(properties));
        propertiesMap = new Map(Object.entries(parsedProperties));
      } catch (_error) {
        throw { field: 'properties', value: properties, message: 'Invalid JSON format' };
      }
    }

    // Check if this is an update (has internalCode) or create
    if (internalCode && this.safeTrim(internalCode)) {
      // Update existing machine model
      const existingModel = await MachineModel.findOne({ 
        internalCode: this.safeTrim(internalCode), 
        companyId: this.companyId 
      });
      
      if (!existingModel) {
        throw { field: 'internalCode', value: internalCode, message: 'Machine model with this internal code not found' };
      }

      // Update the machine model
      existingModel.name = this.safeTrim(name);
      existingModel.manufacturer = this.safeTrim(manufacturer);
      existingModel.brand = this.safeTrim(brand);
      existingModel.year = Number(year);
      existingModel.properties = propertiesMap;
      
      await existingModel.save();
    } else {
      // Create new machine model
      const machineModel = new MachineModel({
        internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
        name: this.safeTrim(name),
        manufacturer: this.safeTrim(manufacturer),
        brand: this.safeTrim(brand),
        year: Number(year),
        properties: propertiesMap,
        companyId: this.companyId,
      });

      await machineModel.save();
    }
  }

  private async processMachineRow(row: FileRowData, _rowNumber: number): Promise<void> {
    const { internalCode, modelInternalCode, locationInternalCode, description, properties } = row;

    if (!modelInternalCode) {
      throw { field: 'modelInternalCode', value: modelInternalCode, message: 'Model internal code is required' };
    }
    if (!locationInternalCode) {
      throw { field: 'locationInternalCode', value: locationInternalCode, message: 'Location internal code is required' };
    }

    // Find model by internal code
    const machineModel = await MachineModel.findOne({ 
      internalCode: this.safeTrim(modelInternalCode), 
      companyId: this.companyId 
    });
    if (!machineModel) {
      throw { field: 'modelInternalCode', value: modelInternalCode, message: 'Machine model not found' };
    }

    // Find location by internal code
    const locationRecord = await Location.findOne({ 
      internalCode: this.safeTrim(locationInternalCode), 
      companyId: this.companyId 
    });
    if (!locationRecord) {
      throw { field: 'locationInternalCode', value: locationInternalCode, message: 'Location not found' };
    }

    let propertiesMap = new Map();
    if (properties) {
      try {
        const parsedProperties = JSON.parse(String(properties));
        propertiesMap = new Map(Object.entries(parsedProperties));
      } catch (_error) {
        throw { field: 'properties', value: properties, message: 'Invalid JSON format' };
      }
    }

    // Check if this is an update (has internalCode) or create
    if (internalCode && this.safeTrim(internalCode)) {
      // Update existing machine
      const existingMachine = await Machine.findOne({ 
        internalCode: this.safeTrim(internalCode), 
        companyId: this.companyId 
      });
      
      if (!existingMachine) {
        throw { field: 'internalCode', value: internalCode, message: 'Machine with this internal code not found' };
      }

      // Update the machine
      existingMachine.model = machineModel._id;
      existingMachine.location = locationRecord.path;
      existingMachine.locationId = locationRecord._id;
      existingMachine.description = this.safeTrim(description) || '';
      existingMachine.properties = propertiesMap;
      
      await existingMachine.save();
    } else {
      // Create new machine
      const machine = new Machine({
        internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
        model: machineModel._id,
        location: locationRecord.path,
        locationId: locationRecord._id,
        description: this.safeTrim(description) || '',
        properties: propertiesMap,
        companyId: this.companyId,
      });

      await machine.save();
    }
  }

  private async processMaintenanceRangeRow(row: FileRowData, _rowNumber: number): Promise<void> {
    const { internalCode, name, description, type, frequency, startDate, startTime, daysOfWeek } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }
    if (!description) {
      throw { field: 'description', value: description, message: 'Description is required' };
    }
    if (!type || !['preventive', 'corrective'].includes(String(type))) {
      throw { field: 'type', value: type, message: 'Type must be preventive or corrective' };
    }

    let parsedDaysOfWeek: number[] = [];
    if (daysOfWeek && this.safeTrim(daysOfWeek)) {
      try {
        parsedDaysOfWeek = String(daysOfWeek).split(',').map((d: string) => parseInt(d.trim()));
      } catch (_error) {
        throw { field: 'daysOfWeek', value: daysOfWeek, message: 'Invalid days of week format' };
      }
    }

    // Check if this is an update (has internalCode) or create
    if (internalCode && this.safeTrim(internalCode)) {
      // Update existing maintenance range
      const existingRange = await MaintenanceRange.findOne({ 
        internalCode: this.safeTrim(internalCode), 
        companyId: this.companyId 
      });
      
      if (!existingRange) {
        throw { field: 'internalCode', value: internalCode, message: 'Maintenance range with this internal code not found' };
      }

      // Update the maintenance range
      existingRange.name = this.safeTrim(name);
      existingRange.description = this.safeTrim(description);
      existingRange.type = type;
      existingRange.frequency = this.safeTrim(frequency) || undefined;
      existingRange.startDate = startDate ? new Date(startDate) : undefined;
      existingRange.startTime = this.safeTrim(startTime) || undefined;
      existingRange.daysOfWeek = parsedDaysOfWeek.length > 0 ? parsedDaysOfWeek : undefined;
      
      await existingRange.save();
    } else {
      // Create new maintenance range
      const maintenanceRange = new MaintenanceRange({
        internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
        name: this.safeTrim(name),
        description: this.safeTrim(description),
        type,
        frequency: this.safeTrim(frequency) || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        startTime: this.safeTrim(startTime) || undefined,
        daysOfWeek: parsedDaysOfWeek.length > 0 ? parsedDaysOfWeek : undefined,
        companyId: this.companyId,
      });

      await maintenanceRange.save();
    }
  }

  private async processOperationRow(row: FileRowData, _rowNumber: number): Promise<void> {
    const { internalCode, name, description, type } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }
    if (!description) {
      throw { field: 'description', value: description, message: 'Description is required' };
    }
    if (!type || !['text', 'date', 'time', 'datetime', 'boolean', 'number'].includes(String(type))) {
      throw { field: 'type', value: type, message: 'Type must be one of: text, date, time, datetime, boolean, number' };
    }

    // Check if this is an update (has internalCode) or create
    if (internalCode && this.safeTrim(internalCode)) {
      // Update existing operation
      let existingOperation = await Operation.findOne({ 
        internalCode: this.safeTrim(internalCode), 
        companyId: this.companyId 
      });
      
      if (!existingOperation) {
        existingOperation = new Operation({
          internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
          name: this.safeTrim(name),
          description: this.safeTrim(description),
          type,
          companyId: this.companyId,
        });
      }

      // Update the operation
      existingOperation.name = this.safeTrim(name);
      existingOperation.description = this.safeTrim(description);
      existingOperation.type = type as "number" | "boolean" | "text" | "date" | "time" | "datetime";
      
      await existingOperation.save();
    } else {
      // Create new operation
      const operation = new Operation({
        internalCode: this.safeTrim(internalCode) || undefined, // Will be auto-generated if not provided
        name: this.safeTrim(name),
        description: this.safeTrim(description),
        type,
        companyId: this.companyId,
      });

      await operation.save();
    }
  }

  private async updateJobStatus(status: string): Promise<void> {
    await connectDB();
    await IntegrationJob.findByIdAndUpdate(this.jobId, { 
      status,
      ...(status === 'completed' && { completedAt: new Date() })
    });
  }

  private async updateJobProgress(result: ProcessingResult): Promise<void> {
    await connectDB();
    await IntegrationJob.findByIdAndUpdate(this.jobId, {
      totalRows: result.totalRows,
      processedRows: result.processedRows,
      successRows: result.successRows,
      errorRows: result.errorRows,
      limitedRows: result.limitedRows,
      errors: result.errors,
    });
  }

  private async updateJobWithResults(result: ProcessingResult): Promise<void> {
    await connectDB();
    await IntegrationJob.findByIdAndUpdate(this.jobId, {
      status: 'completed',
      totalRows: result.totalRows,
      processedRows: result.processedRows,
      successRows: result.successRows,
      errorRows: result.errorRows,
      limitedRows: result.limitedRows,
      errors: result.errors,
      completedAt: new Date(),
    });
  }
}
