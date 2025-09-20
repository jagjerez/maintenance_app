const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Datos de ejemplo para cada plantilla
const templates = {
  locations: [
    ['name', 'description', 'icon', 'parentId'],
    ['Plant A', 'Main production facility', 'factory', ''],
    ['Building A', 'Main building structure', 'building', 'Plant A'],
    ['Building B', 'Secondary building', 'building2', 'Plant A'],
    ['Production Line 1', 'Production line 1', 'wrench', 'Building A'],
    ['Production Line 2', 'Production line 2', 'wrench', 'Building A'],
    ['Warehouse Section', 'Storage and logistics area', 'warehouse', 'Building B'],
    ['Office Area', 'Administrative offices', 'landmark', 'Building A'],
    ['Loading Dock', 'Transport and loading area', 'truck', 'Plant A']
  ],
  'machine-models': [
    ['name', 'manufacturer', 'brand', 'year', 'properties'],
    ['Model X1', 'Manufacturer A', 'Brand X', 2023, '{"power":"100kW","weight":"500kg"}'],
    ['Model Y2', 'Manufacturer B', 'Brand Y', 2022, '{"power":"150kW","weight":"750kg"}'],
    ['Model Z3', 'Manufacturer C', 'Brand Z', 2024, '{"power":"200kW","weight":"1000kg"}']
  ],
  machines: [
    ['model', 'location', 'description', 'properties'],
    ['Model X1', 'Plant A/Line 1/Station 1', 'Main production machine', '{"serialNumber":"MX1001","installationDate":"2023-01-15"}'],
    ['Model Y2', 'Plant A/Line 1/Station 2', 'Secondary machine', '{"serialNumber":"MY2002","installationDate":"2023-02-20"}'],
    ['Model Z3', 'Plant A/Line 2/Station 3', 'Backup machine', '{"serialNumber":"MZ3003","installationDate":"2023-03-10"}']
  ],
  'maintenance-ranges': [
    ['name', 'description', 'type', 'frequency', 'startDate', 'startTime', 'daysOfWeek'],
    ['Daily Inspection', 'Daily safety and performance check', 'preventive', 'daily', '', '08:00', '1,2,3,4,5'],
    ['Weekly Maintenance', 'Weekly comprehensive maintenance', 'preventive', 'weekly', '2024-01-01', '09:00', '1'],
    ['Monthly Service', 'Monthly deep service', 'preventive', 'monthly', '2024-01-01', '10:00', ''],
    ['Annual Overhaul', 'Annual complete overhaul', 'preventive', 'yearly', '2024-01-01', '08:00', ''],
    ['Emergency Repair', 'Emergency corrective maintenance', 'corrective', '', '', '', '']
  ],
  operations: [
    ['name', 'description', 'type'],
    ['Temperature Check', 'Measure and record temperature', 'number'],
    ['Pressure Reading', 'Check pressure levels', 'number'],
    ['Visual Inspection', 'Perform visual inspection', 'text'],
    ['Maintenance Date', 'Date when maintenance was performed', 'date'],
    ['Start Time', 'Time when operation started', 'time'],
    ['Completion Status', 'Whether operation was completed', 'boolean'],
    ['Notes', 'Additional notes and observations', 'text']
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
