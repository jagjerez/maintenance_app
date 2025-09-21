# Local Cron Setup for Development

## Overview

The integration system includes a local cron implementation for development that works alongside the Vercel cron in production.

## How It Works

### Production (Vercel)
- Uses Vercel Cron Jobs (`vercel.json`)
- Runs every 2 minutes automatically
- No manual intervention needed

### Development (Local)
- Uses Node.js `setInterval` for scheduling
- Can be started/stopped manually
- Provides real-time control and monitoring

## Quick Start

### Option 1: Automatic Start with Dev Server
```bash
npm run dev:with-cron
```
This starts both the Next.js dev server and the local cron automatically.

### Option 2: Manual Control
```bash
# Start dev server
npm run dev

# In another terminal, start cron
npm run cron:start
```

## Available Commands

### NPM Scripts
```bash
# Start dev server with cron
npm run dev:with-cron

# Start cron manually
npm run cron:start

# Check cron status
npm run cron:status

# Process jobs immediately
npm run cron:process
```

### API Endpoints
```bash
# Check status
curl http://localhost:3000/api/cron/local

# Start cron
curl -X POST http://localhost:3000/api/cron/local -d '{"action":"start"}'

# Stop cron
curl -X POST http://localhost:3000/api/cron/local -d '{"action":"stop"}'

# Process jobs now
curl -X POST http://localhost:3000/api/cron/local -d '{"action":"process"}'
```

## UI Controls

When running locally, you'll see additional controls in the integration page:

### Status Indicator
- 🟢 Green dot: Cron is running
- 🔴 Red dot: Cron is stopped

### Control Buttons
- **Start Cron**: Starts the local cron scheduler
- **Stop Cron**: Stops the local cron scheduler
- **Process Now**: Processes pending jobs immediately

## Configuration

### Cron Interval
The local cron runs every 2 minutes by default. To change this:

1. Edit `src/lib/localCron.ts`
2. Modify the `start()` method:
```typescript
localCron.start(5); // Run every 5 minutes
```

### Processing Limits
- Max 5 jobs per cron run
- Max 2 jobs per company per run
- Round-robin distribution between companies

## Monitoring

### Console Logs
The local cron provides detailed logging:
```
🔄 Starting local cron...
Processing job 123 (locations) for company 456
Job 123 completed successfully for company 456
Local cron completed: 3 jobs processed, 0 errors
```

### UI Status
- Real-time status indicator
- Job count and processing status
- Error notifications

## Troubleshooting

### Cron Not Starting
1. Check if the dev server is running
2. Verify the API endpoint is accessible
3. Check console for error messages

### Jobs Not Processing
1. Ensure cron is running (green indicator)
2. Check for pending jobs in the UI
3. Use "Process Now" button for immediate processing
4. Check console logs for errors

### Performance Issues
1. Reduce cron interval if needed
2. Check database connection
3. Monitor memory usage

## Development Workflow

### 1. Start Development
```bash
npm run dev:with-cron
```

### 2. Upload Test Files
- Use the integration page to upload files
- Jobs will be created with "pending" status

### 3. Monitor Processing
- Watch the status indicator
- Check console logs
- Use "Process Now" for immediate testing

### 4. Debug Issues
- Use the diagnostic tools
- Check job status in the UI
- Review console logs

## Production vs Development

| Feature | Production (Vercel) | Development (Local) |
|---------|-------------------|-------------------|
| Scheduling | Automatic (2 min) | Manual control |
| Monitoring | Vercel logs | Console + UI |
| Control | None | Start/Stop/Process |
| Debugging | Limited | Full access |
| Reliability | High | Manual |

## Best Practices

### Development
1. Always start with `npm run dev:with-cron`
2. Use "Process Now" for immediate testing
3. Monitor console logs for errors
4. Stop cron when not needed to save resources

### Testing
1. Upload small test files first
2. Verify jobs are processed correctly
3. Test error handling with invalid files
4. Check data isolation between companies

### Debugging
1. Use the diagnostic tools in the UI
2. Check browser console for errors
3. Review server console logs
4. Use "Process Now" to test specific scenarios

## Environment Variables

No additional environment variables are needed for local cron. It uses the same configuration as the main application:

- `MONGODB_URI`: Database connection
- `NEXTAUTH_URL`: Base URL (defaults to localhost:3000)

## File Structure

```
src/
├── lib/
│   └── localCron.ts          # Local cron implementation
├── app/api/cron/
│   ├── local/route.ts        # Local cron API endpoints
│   └── process-integration-jobs/route.ts  # Main processing logic
scripts/
└── start-local-cron.js       # Cron startup script
```

This setup ensures that the integration system works seamlessly in both development and production environments.
