# Cron Job Troubleshooting Guide

## Cron Configuration

The integration cron job is configured to run every 2 minutes:
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

## Common Issues and Solutions

### 1. Cron Not Running

#### Check Vercel Deployment
- Ensure `vercel.json` is in the root directory
- Verify the cron configuration is correct
- Check if the deployment includes the cron configuration

#### Check Environment Variables
```env
CRON_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-domain.vercel.app
```

#### Manual Testing
Use the "Test Cron" button in the UI or call:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/test
```

### 2. Jobs Not Processing

#### Check Job Status
1. Use the "Diagnose" button in the UI
2. Look for stuck jobs (processing for >10 minutes)
3. Check if jobs are in "pending" status

#### Reset Stuck Jobs
1. Use the "Reset to Pending" button in diagnostics
2. Or call the API directly:
```bash
curl -X POST https://your-domain.vercel.app/api/integration/reset-stuck-jobs
```

### 3. Database Connection Issues

#### Check MongoDB Connection
- Verify `MONGODB_URI` environment variable
- Check if database is accessible
- Ensure proper network connectivity

#### Check Job Records
```bash
# Check pending jobs
curl https://your-domain.vercel.app/api/cron/test
```

### 4. File Processing Errors

#### Check File URLs
- Verify Vercel Blob storage is working
- Check if files are accessible
- Ensure proper file permissions

#### Check FileProcessor
- Look for errors in the console logs
- Verify file format support (CSV, XLSX, XLS)
- Check data validation rules

## Debugging Steps

### Step 1: Check Cron Status
```bash
# Test cron endpoint
curl https://your-domain.vercel.app/api/cron/test
```

Expected response:
```json
{
  "message": "Cron test endpoint working",
  "pendingJobs": 5,
  "jobsByStatus": {
    "pending": 5,
    "processing": 0,
    "completed": 10,
    "failed": 2
  }
}
```

### Step 2: Manual Cron Trigger
```bash
# Trigger cron manually
curl -X POST https://your-domain.vercel.app/api/cron/test
```

### Step 3: Check Logs
Look for these log messages:
```
Processing job 123 (locations) for company 456
Job 123 completed successfully for company 456
```

### Step 4: Verify Job Processing
1. Upload a test file
2. Check if job is created with "pending" status
3. Wait 2-3 minutes for cron to process
4. Check if status changes to "completed" or "failed"

## Vercel Cron Specific Issues

### Cron Not Deployed
- Ensure `vercel.json` is in the root directory
- Redeploy the application
- Check Vercel dashboard for cron configuration

### Cron Frequency Issues
- Vercel cron has a minimum interval of 1 minute
- Free tier has limited cron executions
- Check Vercel plan limits

### Environment Variables
- Cron jobs run in a separate environment
- Ensure all required env vars are set
- Check Vercel environment variables section

## Monitoring and Alerts

### Health Check Endpoint
```bash
curl https://your-domain.vercel.app/api/cron/test
```

### Expected Metrics
- Pending jobs should decrease over time
- Processing jobs should be temporary (<10 minutes)
- Failed jobs should be investigated

### Alert Conditions
- Jobs stuck in "processing" for >10 minutes
- High number of failed jobs
- No jobs processed in >5 minutes

## Performance Optimization

### Batch Processing
- Cron processes max 5 jobs per run
- Max 2 jobs per company per run
- Round-robin distribution for fairness

### Resource Management
- Jobs processed sequentially
- 1-second delay between jobs
- Error handling prevents crashes

## Common Error Messages

### "No pending jobs to process"
- Normal when queue is empty
- Check if jobs are being created
- Verify upload process

### "Error processing job"
- Check file format and content
- Verify data validation rules
- Look for specific error details

### "Failed to fetch file"
- Check Vercel Blob storage
- Verify file URLs
- Check network connectivity

## Testing Checklist

- [ ] Cron endpoint responds correctly
- [ ] Jobs are created with "pending" status
- [ ] Cron processes jobs within 2-3 minutes
- [ ] Jobs change to "completed" or "failed"
- [ ] No jobs stuck in "processing"
- [ ] Multiple companies processed fairly
- [ ] Error handling works correctly

## Support

If issues persist:
1. Check Vercel function logs
2. Verify environment variables
3. Test with minimal data
4. Contact support with specific error messages
