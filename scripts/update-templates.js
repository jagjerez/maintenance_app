const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

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
  'machine-models': {
    headers: ['internalCode', 'name', 'manufacturer', 'brand', 'year', 'properties'],
    data: [
      ['MODEL_X1', 'Model X1', 'Manufacturer A', 'Brand X', 2023, '{"power":"100kW","weight":"500kg"}'],
      ['MODEL_Y2', 'Model Y2', 'Manufacturer B', 'Brand Y', 2022, '{"power":"150kW","weight":"750kg"}'],
      ['MODEL_Z3', 'Model Z3', 'Manufacturer C', 'Brand Z', 2024, '{"power":"200kW","weight":"1000kg"}']
    ]
  },
  machines: {
    headers: ['internalCode', 'modelInternalCode', 'locationInternalCode', 'description', 'properties'],
    data: [
      ['', 'MODEL_X1', 'PLANT_A', 'Main production machine', '{"serialNumber":"MX1001","installationDate":"2023-01-15"}'],
      ['', 'MODEL_Y2', 'BUILDING_A', 'Secondary machine', '{"serialNumber":"MY2002","installationDate":"2023-02-20"}'],
      ['', 'MODEL_Z3', 'BUILDING_B', 'Backup machine', '{"serialNumber":"MZ3003","installationDate":"2023-03-10"}']
    ]
  },
  'maintenance-ranges': {
    headers: ['internalCode', 'name', 'description', 'type', 'frequency', 'startDate', 'startTime', 'daysOfWeek'],
    data: [
      ['DAILY_INSP', 'Daily Inspection', 'Daily safety and performance check', 'preventive', 'daily', '2024-01-01', '08:00', '1,2,3,4,5'],
      ['WEEKLY_MAINT', 'Weekly Maintenance', 'Weekly comprehensive maintenance', 'preventive', 'weekly', '2024-01-01', '09:00', '1'],
      ['MONTHLY_SVC', 'Monthly Service', 'Monthly deep service', 'preventive', 'monthly', '2024-01-01', '10:00', '1'],
      ['ANNUAL_OVER', 'Annual Overhaul', 'Annual complete overhaul', 'preventive', 'yearly', '2024-01-01', '08:00', '1'],
      ['EMERGENCY', 'Emergency Repair', 'Emergency corrective maintenance', 'corrective', 'on_demand', '2024-01-01', '00:00', '']
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

if (require.main === module) {
  updateTemplates();
}

module.exports = { updateTemplates, templates };
