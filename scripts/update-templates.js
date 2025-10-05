import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template data with corrected fields
const templates = {
  locations: {
    headers: ['internalCode', 'name', 'description', 'icon', 'parentInternalCode'],
    data: [
      ['PLANT_A', 'Plant A', 'Main production facility', 'factory', ''],
      ['BUILDING_A', 'Building A', 'Main building structure', 'building', 'PLANT_A'],
      ['BUILDING_B', 'Building B', 'Secondary building', 'building2', 'PLANT_A'],
      ['PROD_LINE_1', 'Production Line 1', 'Production line 1', 'wrench', 'BUILDING_A'],
      ['PROD_LINE_2', 'Production Line 2', 'Production line 2', 'wrench', 'BUILDING_A'],
      ['WAREHOUSE', 'Warehouse Section', 'Storage and logistics area', 'warehouse', 'PLANT_A'],
      ['OFFICE', 'Office Area', 'Administrative offices', 'landmark', 'BUILDING_B'],
      ['DOCK', 'Loading Dock', 'Transport and loading area', 'truck', 'PLANT_A']
    ]
  },
  machines: {
    headers: ['internalCode', 'name', 'manufacturer', 'brand', 'year', 'locationInternalCode', 'description', 'properties'],
    data: [
      ['', 'Production Machine 1', 'Manufacturer A', 'Brand X', 2023, 'PLANT_A', 'Main production machine', '{"serialNumber":"MX1001","installationDate":"2023-01-15"}'],
      ['', 'Production Machine 2', 'Manufacturer B', 'Brand Y', 2022, 'BUILDING_A', 'Secondary machine', '{"serialNumber":"MY2002","installationDate":"2023-02-20"}'],
      ['', 'Backup Machine', 'Manufacturer C', 'Brand Z', 2024, 'BUILDING_B', 'Backup machine', '{"serialNumber":"MZ3003","installationDate":"2023-03-10"}']
    ]
  },
  operations: {
    headers: ['internalCode', 'name', 'description', 'type'],
    data: [
      ['TEMP_CHECK', 'Temperature Check', 'Measure and record temperature', 'number'],
      ['PRESSURE_READ', 'Pressure Reading', 'Check pressure levels', 'number'],
      ['VISUAL_INSP', 'Visual Inspection', 'Perform visual inspection', 'text'],
      ['MAINT_DATE', 'Maintenance Date', 'Date when maintenance was performed', 'date'],
      ['START_TIME', 'Start Time', 'Time when operation started', 'time'],
      ['COMPLETION', 'Completion Status', 'Whether operation was completed', 'boolean'],
      ['NOTES', 'Notes', 'Additional notes and observations', 'text']
    ]
  }
};

function createCSV(headers, data) {
  const csvContent = [headers.join(','), ...data.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  return csvContent;
}

function createExcel(headers, data) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function updateTemplates() {
  const templatesDir = path.join(__dirname, '..', 'public', 'templates');
  
  Object.entries(templates).forEach(([templateName, templateData]) => {
    console.log(`Updating ${templateName} template...`);
    
    // Update CSV
    const csvContent = createCSV(templateData.headers, templateData.data);
    const csvPath = path.join(templatesDir, `${templateName}_template.csv`);
    fs.writeFileSync(csvPath, csvContent);
    
    // Update Excel
    const excelBuffer = createExcel(templateData.headers, templateData.data);
    const excelPath = path.join(templatesDir, `${templateName}_template.xlsx`);
    fs.writeFileSync(excelPath, excelBuffer);
    
    console.log(`✅ Updated ${templateName}_template.csv and ${templateName}_template.xlsx`);
  });
  
  console.log('\n🎉 All templates updated successfully!');
  console.log('\n📋 Template Summary:');
  console.log('==================');
  
  Object.entries(templates).forEach(([templateName, templateData]) => {
    console.log(`\n${templateName.toUpperCase()}:`);
    console.log(`  Headers: ${templateData.headers.join(', ')}`);
    console.log(`  Rows: ${templateData.data.length}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateTemplates();
}

export { updateTemplates, templates };
