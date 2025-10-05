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
    ['_id', 'name', 'manufacturer', 'brand', 'year', 'locationInternalCode', 'description', 'properties'],
    ['', 'Production Machine 1', 'Manufacturer A', 'Brand X', 2023, 'PLANT_A', 'Main production machine', '{"serialNumber":"MX1001","installationDate":"2023-01-15"}'],
    ['', 'Production Machine 2', 'Manufacturer B', 'Brand Y', 2022, 'PLANT_A', 'Secondary machine', '{"serialNumber":"MY2002","installationDate":"2023-02-20"}'],
    ['', 'Backup Machine', 'Manufacturer C', 'Brand Z', 2024, 'PLANT_A', 'Backup machine', '{"serialNumber":"MZ3003","installationDate":"2023-03-10"}']
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
