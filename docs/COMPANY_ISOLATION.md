# Company Data Isolation in Integration System

## Overview

The integration system ensures complete data isolation between different companies. Each company's data is processed independently and securely.

## Key Security Measures

### 1. Database Level Isolation

All database operations include `companyId` filtering:

```typescript
// Example: Finding locations
const locations = await Location.find({ 
  companyId: session.user.companyId 
});

// Example: Creating new records
const location = new Location({
  name: 'New Location',
  companyId: this.companyId, // Always included
  // ... other fields
});
```

### 2. File Processing Isolation

The `FileProcessor` class is initialized with a specific `companyId`:

```typescript
const processor = new FileProcessor(jobId, type, companyId);
await processor.processFile(fileUrl);
```

All data processing operations use this `companyId` to ensure data isolation.

### 3. Job Management Isolation

#### Upload API
- Each uploaded file creates a job with the user's `companyId`
- Jobs are immediately associated with the correct company

#### Cron Job Processing
- Processes jobs from ALL companies fairly
- Uses round-robin algorithm to ensure fair processing
- Each job is processed with its original `companyId`

#### Queue Management
- All queue operations can be filtered by `companyId`
- Statistics and diagnostics are company-specific

## Processing Flow

### 1. File Upload
```
User (Company A) uploads file
↓
IntegrationJob created with companyId: "companyA"
↓
Job added to processing queue
```

### 2. Cron Job Processing
```
Cron job runs every 2 minutes
↓
Fetches pending jobs from ALL companies
↓
Groups jobs by companyId
↓
Selects jobs fairly (max 2 per company per run)
↓
Processes each job with its original companyId
```

### 3. Data Processing
```
FileProcessor initialized with companyId
↓
All database operations include companyId filter
↓
Data is saved only to the correct company's records
```

## Security Guarantees

### ✅ Data Isolation
- Company A cannot access Company B's data
- All database queries include companyId filtering
- File processing respects company boundaries

### ✅ Fair Processing
- Jobs from different companies are processed fairly
- No company can monopolize the processing queue
- Round-robin algorithm ensures equal opportunity

### ✅ Audit Trail
- All operations are logged with companyId
- Easy to track which company's data is being processed
- Clear separation in logs and diagnostics

## API Endpoints

### Company-Specific Endpoints
- `GET /api/integration/queue` - Queue status for current company
- `GET /api/integration/stats` - Statistics for current company
- `GET /api/integration/diagnose` - Diagnostics for current company

### Global Endpoints (Cron)
- `GET /api/cron/process-integration-jobs` - Processes jobs from all companies

## Configuration

### Environment Variables
```env
# Optional: Add company-specific processing limits
MAX_JOBS_PER_COMPANY_PER_RUN=2
MAX_JOBS_PER_CRON_RUN=10
```

### Vercel Cron Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/process-integration-jobs",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

## Monitoring

### Company-Specific Monitoring
- Each company sees only their own jobs
- Statistics are calculated per company
- Diagnostics show only company-specific issues

### Global Monitoring
- Cron job logs show which companies are being processed
- System administrators can monitor overall processing health
- Fair processing metrics available

## Troubleshooting

### Company Data Issues
1. Check that `companyId` is correctly set in the job
2. Verify that the user's session includes the correct `companyId`
3. Ensure all database operations include company filtering

### Processing Issues
1. Check cron job logs for company-specific errors
2. Use diagnostic tools to identify stuck jobs per company
3. Verify that jobs are being processed fairly across companies

## Best Practices

### Development
- Always include `companyId` in database queries
- Test with multiple companies to ensure isolation
- Use company-specific test data

### Production
- Monitor processing fairness across companies
- Set appropriate limits to prevent resource monopolization
- Regular audits of data isolation

## Example: Multi-Company Processing

```
Company A: 5 pending jobs
Company B: 3 pending jobs
Company C: 2 pending jobs

Cron Run 1:
- Processes 2 jobs from Company A
- Processes 2 jobs from Company B
- Processes 1 job from Company C

Cron Run 2:
- Processes 2 jobs from Company A
- Processes 1 job from Company B
- Processes 1 job from Company C

Result: Fair processing across all companies
```

This ensures that no single company can monopolize the processing queue while maintaining complete data isolation.
