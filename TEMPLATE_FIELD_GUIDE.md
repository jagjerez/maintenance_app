# Template Field Guide

## Overview

This guide explains the exact field requirements for each integration template to ensure compatibility with the FileProcessor.

## Template Fields

### 1. Locations Template

**File**: `locations_template.csv` / `locations_template.xlsx`

**Fields**:
- `internalCode` (string, optional): Unique identifier for the location. If empty, will be auto-generated.
- `name` (string, required): Location name
- `description` (string, optional): Location description
- `icon` (string, optional): Icon identifier for the location
- `parentInternalCode` (string, optional): Internal code of parent location for hierarchy

**Example**:
```csv
internalCode,name,description,icon,parentInternalCode
"PLANT_A","Plant A","Main production facility","factory",""
"BUILDING_A","Building A","Main building structure","building","PLANT_A"
```

### 2. Machine Models Template

**File**: `machine-models_template.csv` / `machine-models_template.xlsx`

**Fields**:
- `internalCode` (string, optional): Unique identifier for the machine model. If empty, will be auto-generated.
- `name` (string, required): Model name
- `manufacturer` (string, required): Manufacturer name
- `brand` (string, required): Brand name
- `year` (number, required): Manufacturing year
- `properties` (JSON string, optional): Additional properties as JSON object

**Example**:
```csv
internalCode,name,manufacturer,brand,year,properties
"MODEL_X1","Model X1","Manufacturer A","Brand X",2023,"{""power"":""100kW"",""weight"":""500kg""}"
```

### 3. Machines Template

**File**: `machines_template.csv` / `machines_template.xlsx`

**Fields**:
- `internalCode` (string, optional): Unique identifier for the machine. If empty, will be auto-generated.
- `modelInternalCode` (string, required): Internal code of the machine model (must exist)
- `locationInternalCode` (string, required): Internal code of the location (must exist)
- `description` (string, optional): Machine description
- `properties` (JSON string, optional): Additional properties as JSON object

**Example**:
```csv
internalCode,modelInternalCode,locationInternalCode,description,properties
"","MODEL_X1","PLANT_A","Main production machine","{""serialNumber"":""MX1001""}"
```

### 4. Maintenance Ranges Template

**File**: `maintenance-ranges_template.csv` / `maintenance-ranges_template.xlsx`

**Fields**:
- `internalCode` (string, optional): Unique identifier for the maintenance range. If empty, will be auto-generated.
- `name` (string, required): Maintenance range name
- `description` (string, required): Maintenance range description
- `type` (string, required): Must be "preventive" or "corrective"
- `frequency` (string, required): Frequency of maintenance (daily, weekly, monthly, yearly, on_demand)
- `startDate` (date, required): Start date in YYYY-MM-DD format
- `startTime` (time, required): Start time in HH:MM format
- `daysOfWeek` (string, optional): Comma-separated days of week (1=Monday, 7=Sunday)

**Example**:
```csv
internalCode,name,description,type,frequency,startDate,startTime,daysOfWeek
"DAILY_INSP","Daily Inspection","Daily safety check","preventive","daily","2024-01-01","08:00","1,2,3,4,5"
```

### 5. Operations Template

**File**: `operations_template.csv` / `operations_template.xlsx`

**Fields**:
- `internalCode` (string, optional): Unique identifier for the operation. If empty, will be auto-generated.
- `name` (string, required): Operation name
- `description` (string, required): Operation description
- `type` (string, required): Must be one of: "text", "date", "time", "datetime", "boolean", "number"

**Example**:
```csv
internalCode,name,description,type
"TEMP_CHECK","Temperature Check","Measure and record temperature","number"
"VISUAL_INSP","Visual Inspection","Perform visual inspection","text"
```

## Data Validation Rules

### Required Fields
- **Locations**: `name`
- **Machine Models**: `name`, `manufacturer`, `brand`, `year`
- **Machines**: `modelInternalCode`, `locationInternalCode`
- **Maintenance Ranges**: `name`, `description`, `type`, `frequency`, `startDate`, `startTime`
- **Operations**: `name`, `description`, `type`

### Field Validation
- **Year**: Must be a valid number
- **Type (Maintenance)**: Must be "preventive" or "corrective"
- **Type (Operations)**: Must be "text", "date", "time", "datetime", "boolean", or "number"
- **JSON Properties**: Must be valid JSON format
- **Dates**: Must be in YYYY-MM-DD format
- **Times**: Must be in HH:MM format

### Relationships
- **Machines** must reference existing **Machine Models** and **Locations**
- **Locations** can reference parent locations for hierarchy
- **Internal Codes** must be unique within the same company

## Common Issues and Solutions

### Issue: "Machine model not found"
**Solution**: Ensure `modelInternalCode` in machines template matches `internalCode` in machine-models template

### Issue: "Location not found"
**Solution**: Ensure `locationInternalCode` in machines template matches `internalCode` in locations template

### Issue: "Invalid JSON format"
**Solution**: Ensure properties field contains valid JSON with proper escaping

### Issue: "Type must be one of: text, date, time, datetime, boolean, number"
**Solution**: Use only the allowed operation types

### Issue: "Type must be preventive or corrective"
**Solution**: Use only "preventive" or "corrective" for maintenance ranges

## Template Generation

To regenerate all templates with the correct fields:

```bash
npm run update-templates
```

This will update both CSV and Excel versions of all templates.

## Best Practices

1. **Use Internal Codes**: Provide internal codes for easier reference and updates
2. **Validate Relationships**: Ensure referenced records exist before importing
3. **Test with Small Files**: Start with a few records to test the format
4. **Check JSON Format**: Validate JSON properties before importing
5. **Use Consistent Naming**: Use consistent naming conventions for internal codes

## File Size Limits

- Maximum 100 rows per file will be processed
- Files larger than 100 rows will have remaining rows skipped
- This limit applies to both CSV and Excel files

## Support

If you encounter issues with template processing:

1. Check the error messages in the integration page
2. Verify field names match exactly (case-sensitive)
3. Ensure required fields are not empty
4. Validate JSON format in properties fields
5. Check that referenced records exist in the system
