# Cron Job Setup for Integration Processing

## Overview

The integration system now uses Vercel Cron Jobs to process files in the background, improving performance and reliability.

## Architecture

### 1. Upload Process
- Users upload multiple files through the UI
- Files are uploaded to Vercel Blob Storage
- IntegrationJob records are created with status 'pending'
- No processing happens during upload (fast response)

### 2. Background Processing
- Vercel Cron runs every 2 minutes (`*/2 * * * *`)
- Processes up to 5 pending jobs per run
- Jobs are processed in FIFO order (oldest first)
- Each job is processed sequentially to avoid conflicts

### 3. Queue Management
- `QueueManager` provides real-time queue status
- Tracks pending, processing, completed, and failed jobs
- Provides statistics and analytics

## Configuration

### Vercel Cron Configuration
The `vercel.json` file configures the cron job:

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

### Environment Variables
Add to your `.env.local`:

```env
CRON_SECRET=your-secret-key-here
```

This provides basic security for the cron endpoint.

## API Endpoints

### 1. Upload Files
```
POST /api/integration/upload
```
- Uploads files and creates pending jobs
- Returns immediately with job IDs

### 2. Process Jobs (Cron)
```
GET /api/cron/process-integration-jobs
```
- Processes pending jobs
- Called by Vercel Cron every 2 minutes
- Can be called manually for testing

### 3. Queue Status
```
GET /api/integration/queue
```
- Returns current queue status
- Shows pending, processing, completed, failed counts

### 4. Statistics
```
GET /api/integration/stats?days=7
```
- Returns processing statistics
- Success rate, average processing time, etc.

## Benefits

### Performance
- Upload API responds immediately
- No timeout issues with large files
- Better user experience

### Reliability
- Jobs are processed in background
- Failed jobs don't affect uploads
- Automatic retry capability

### Scalability
- Can process multiple jobs per cron run
- Easy to adjust processing frequency
- Queue-based architecture

## Monitoring

### Queue Status
The UI shows real-time queue status:
- Number of pending jobs
- Number of processing jobs
- Visual indicators for active processing

### Statistics
Track processing performance:
- Success rate
- Average processing time
- Jobs by type and status

## Troubleshooting

### Manual Processing
To manually trigger processing:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/process-integration-jobs
```

### Check Queue Status
```bash
curl https://your-domain.vercel.app/api/integration/queue
```

### View Statistics
```bash
curl https://your-domain.vercel.app/api/integration/stats
```

## Development

### Local Testing
For local development, you can manually call the cron endpoint:
```bash
curl -X POST http://localhost:3000/api/cron/process-integration-jobs
```

### Adjusting Cron Frequency
Modify the schedule in `vercel.json`:
- `*/1 * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `0 */1 * * *` - Every hour

## Security

The cron endpoint includes basic security:
- Optional `CRON_SECRET` environment variable
- Authorization header validation
- Rate limiting through Vercel Cron

For production, consider additional security measures:
- IP whitelisting
- More complex authentication
- Monitoring and alerting
