# Internal Code Format Guide for Data Import

## Overview
When importing data using Excel/CSV files, the `internalCode` column is used to determine whether to create a new record or update an existing one. The system uses GUIDs (UUIDs) for internal codes instead of MongoDB ObjectIds.

## Internal Code Format Rules

### For Creating New Records
- Leave the `internalCode` column **empty** or **blank**
- The system will automatically generate a new GUID (UUID)

### For Updating Existing Records
- Use a valid **GUID (UUID)** (36 characters with hyphens)
- Example: `40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6`
- Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Valid GUID Examples
```
40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6
550e8400-e29b-41d4-a716-446655440000
6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

## Invalid GUID Examples (Will Cause Errors)
```
507f1f77bcf86cd799439011  (MongoDB ObjectId format)
12345                      (Too short)
40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6abc  (Too long)
40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6g    (Invalid characters)
```

## How to Get Valid Internal Codes

### From the Application
1. Go to the respective data page (Locations, Machines, etc.)
2. View existing records in the table
3. The internal codes are not displayed in the UI (they're for system use only)

### From Database Export
1. Export data from the system
2. The exported files will include the internal codes
3. Use these codes for updates

## Template Usage

### Creating New Records
```csv
internalCode,name,description,icon,parentInternalCode
,"New Location","Description here","factory",""
,"Another Location","Another description","building",""
```

### Updating Existing Records
```csv
internalCode,name,description,icon,parentInternalCode
40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6,"Updated Location","New description","factory",""
```

### Mixed Operations
```csv
internalCode,name,description,icon,parentInternalCode
40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6,"Updated Location","New description","factory",""
,"New Location","Description here","building","40e836bc-aeb3-41aa-a2b5-7ce00fb3a2e6"
```

## Field Mappings

### Locations
- `internalCode` - GUID for the location
- `parentInternalCode` - GUID of the parent location (for hierarchy)

### Machine Models
- `internalCode` - GUID for the machine model

### Machines
- `internalCode` - GUID for the machine
- `modelInternalCode` - GUID of the machine model
- `locationInternalCode` - GUID of the location

### Maintenance Ranges
- `internalCode` - GUID for the maintenance range

### Operations
- `internalCode` - GUID for the operation

## Error Messages

If you see this error:
```
Location with this internal code not found
```

**Solution:** Check that the internal code exists in the system or leave it empty to create a new record.

## Processing Limits

- Only the first 100 rows will be processed per file upload
- If your file contains more than 100 rows, the remaining rows will be skipped
- This limit applies to all data types (locations, machines, operations, etc.)

## Benefits of Internal Codes

1. **User-Friendly**: GUIDs are easier to work with than MongoDB ObjectIds
2. **Consistent**: Same format across all data types
3. **Reliable**: No conflicts with database internal IDs
4. **Portable**: Can be used across different environments
