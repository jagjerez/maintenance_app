import XLSX from 'xlsx';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { connectDB } from './db';
import { IntegrationJob, Location, MachineModel, Machine, MaintenanceRange, Operation } from '@/models';

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    message: string;
  }>;
}

export class FileProcessor {
  private jobId: string;
  private type: string;
  private companyId: string;

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

      let data: any[] = [];

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

  private async parseCSV(fileBuffer: ArrayBuffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const data: any[] = [];
      const stream = Readable.from(Buffer.from(fileBuffer));
      
      stream
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => resolve(data))
        .on('error', reject);
    });
  }

  private async parseExcel(fileBuffer: ArrayBuffer): Promise<any[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  }

  private async processData(data: any[]): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalRows: data.length,
      processedRows: 0,
      successRows: 0,
      errorRows: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1;

      try {
        await this.processRow(row, rowNumber);
        result.successRows++;
      } catch (error: any) {
        result.errorRows++;
        result.errors.push({
          row: rowNumber,
          field: error.field || 'unknown',
          value: error.value || '',
          message: error.message || 'Unknown error',
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

  private async processRow(row: any, rowNumber: number): Promise<void> {
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

  private async processLocationRow(row: any, rowNumber: number): Promise<void> {
    const { name, description, icon, parentId } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }

    // Find parent location if parentId is provided
    let parentLocationId = null;
    if (parentId && parentId.trim()) {
      const parentLocation = await Location.findOne({ 
        name: parentId.trim(), 
        companyId: this.companyId 
      });
      if (parentLocation) {
        parentLocationId = parentLocation._id;
      }
    }

    const location = new Location({
      name: name.trim(),
      description: description?.trim() || '',
      icon: icon?.trim() || undefined,
      parentId: parentLocationId,
      companyId: this.companyId,
    });

    await location.save();
  }

  private async processMachineModelRow(row: any, rowNumber: number): Promise<void> {
    const { name, manufacturer, brand, year, properties } = row;

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
        const parsedProperties = JSON.parse(properties);
        propertiesMap = new Map(Object.entries(parsedProperties));
      } catch (error) {
        throw { field: 'properties', value: properties, message: 'Invalid JSON format' };
      }
    }

    const machineModel = new MachineModel({
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      brand: brand.trim(),
      year: Number(year),
      properties: propertiesMap,
      companyId: this.companyId,
    });

    await machineModel.save();
  }

  private async processMachineRow(row: any, rowNumber: number): Promise<void> {
    const { model, location, description, properties } = row;

    if (!model) {
      throw { field: 'model', value: model, message: 'Model is required' };
    }
    if (!location) {
      throw { field: 'location', value: location, message: 'Location is required' };
    }

    // Find model by name
    const machineModel = await MachineModel.findOne({ 
      name: model.trim(), 
      companyId: this.companyId 
    });
    if (!machineModel) {
      throw { field: 'model', value: model, message: 'Machine model not found' };
    }

    // Find location by path
    const locationRecord = await Location.findOne({ 
      path: location.trim(), 
      companyId: this.companyId 
    });
    if (!locationRecord) {
      throw { field: 'location', value: location, message: 'Location not found' };
    }

    let propertiesMap = new Map();
    if (properties) {
      try {
        const parsedProperties = JSON.parse(properties);
        propertiesMap = new Map(Object.entries(parsedProperties));
      } catch (error) {
        throw { field: 'properties', value: properties, message: 'Invalid JSON format' };
      }
    }

    const machine = new Machine({
      model: machineModel._id,
      location: location.trim(),
      locationId: locationRecord._id,
      description: description?.trim() || '',
      properties: propertiesMap,
      companyId: this.companyId,
    });

    await machine.save();
  }

  private async processMaintenanceRangeRow(row: any, rowNumber: number): Promise<void> {
    const { name, description, type, frequency, startDate, startTime, daysOfWeek } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }
    if (!description) {
      throw { field: 'description', value: description, message: 'Description is required' };
    }
    if (!type || !['preventive', 'corrective'].includes(type)) {
      throw { field: 'type', value: type, message: 'Type must be preventive or corrective' };
    }

    let parsedDaysOfWeek: number[] = [];
    if (daysOfWeek && daysOfWeek.trim()) {
      try {
        parsedDaysOfWeek = daysOfWeek.split(',').map((d: string) => parseInt(d.trim()));
      } catch (error) {
        throw { field: 'daysOfWeek', value: daysOfWeek, message: 'Invalid days of week format' };
      }
    }

    const maintenanceRange = new MaintenanceRange({
      name: name.trim(),
      description: description.trim(),
      type,
      frequency: frequency?.trim() || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      startTime: startTime?.trim() || undefined,
      daysOfWeek: parsedDaysOfWeek.length > 0 ? parsedDaysOfWeek : undefined,
      companyId: this.companyId,
    });

    await maintenanceRange.save();
  }

  private async processOperationRow(row: any, rowNumber: number): Promise<void> {
    const { name, description, type } = row;

    if (!name) {
      throw { field: 'name', value: name, message: 'Name is required' };
    }
    if (!description) {
      throw { field: 'description', value: description, message: 'Description is required' };
    }
    if (!type || !['text', 'date', 'time', 'datetime', 'boolean', 'number'].includes(type)) {
      throw { field: 'type', value: type, message: 'Type must be one of: text, date, time, datetime, boolean, number' };
    }

    const operation = new Operation({
      name: name.trim(),
      description: description.trim(),
      type,
      companyId: this.companyId,
    });

    await operation.save();
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
      errors: result.errors,
      completedAt: new Date(),
    });
  }
}
