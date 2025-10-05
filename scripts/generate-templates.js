import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Datos de ejemplo para cada plantilla
const templates = {
  locations: [
    ['_id', 'name', 'description', 'icon', 'parentId'],
    ['', 'Plant A', 'Main production facility', 'factory', ''],
    ['', 'Building A', 'Main building structure', 'building', 'Plant A'],
    ['', 'Building B', 'Secondary building', 'building2', 'Plant A'],
    ['', 'Production Line 1', 'Production line 1', 'wrench', 'Building A'],
    ['', 'Production Line 2', 'Production line 2', 'wrench', 'Building A'],
    ['', 'Warehouse Section', 'Storage and logistics area', 'warehouse', 'Building B'],
    ['', 'Office Area', 'Administrative offices', 'landmark', 'Building A'],
    ['', 'Loading Dock', 'Transport and loading area', 'truck', 'Plant A']
  ],
  machines: [
    ['internalCode', 'description', 'brand', 'model', 'series', 'state', 'characteristics'],
    ['', 'Main production machine', 'Brand X', 'Model X1', 'Series A', 'active', '{"power":"100kW","weight":"500kg","voltage":"220V"}'],
    ['', 'Secondary machine', 'Brand Y', 'Model Y2', 'Series B', 'active', '{"power":"150kW","weight":"750kg","voltage":"380V"}'],
    ['', 'Backup machine', 'Brand Z', 'Model Z3', 'Series C', 'inactive', '{"power":"200kW","weight":"1000kg","voltage":"220V"}']
  ],
  operations: [
    ['_id', 'name', 'description', 'type'],
    ['', 'Temperature Check', 'Measure and record temperature', 'number'],
    ['', 'Pressure Reading', 'Check pressure levels', 'number'],
    ['', 'Visual Inspection', 'Perform visual inspection', 'text'],
    ['', 'Maintenance Date', 'Date when maintenance was performed', 'date'],
    ['', 'Start Time', 'Time when operation started', 'time'],
    ['', 'Completion Status', 'Whether operation was completed', 'boolean'],
    ['', 'Notes', 'Additional notes and observations', 'text']
  ]
};

// Crear directorio de plantillas si no existe
const templatesDir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Generar archivos Excel para cada plantilla
Object.entries(templates).forEach(([type, data]) => {
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  
  const fileName = `${type}_template.xlsx`;
  const filePath = path.join(templatesDir, fileName);
  
  XLSX.writeFile(workbook, filePath);
  console.log(`Generated: ${fileName}`);
});

console.log('All Excel templates generated successfully!');
