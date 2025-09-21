import { NextRequest, NextResponse } from 'next/server';
import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';
import { FileProcessor } from '@/lib/fileProcessor';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get pending jobs from ALL companies, ordered by creation date (FIFO)
    // Process jobs from different companies in round-robin fashion
    const pendingJobs = await IntegrationJob.find({ 
      status: 'pending' 
    }).sort({ createdAt: 1 }).limit(10); // Process max 10 jobs per cron run

    // Group jobs by company to ensure fair processing
    const jobsByCompany = pendingJobs.reduce((acc, job) => {
      const companyId = job.companyId.toString();
      if (!acc[companyId]) {
        acc[companyId] = [];
      }
      acc[companyId].push(job);
      return acc;
    }, {} as Record<string, typeof pendingJobs>);

    // Select jobs fairly from each company (max 2 per company per run)
    const selectedJobs: typeof pendingJobs = [];
    const companyIds = Object.keys(jobsByCompany);
    
    for (let i = 0; i < 5 && selectedJobs.length < 5; i++) {
      const companyId = companyIds[i % companyIds.length];
      const companyJobs = jobsByCompany[companyId];
      if (companyJobs && companyJobs.length > 0) {
        const job = companyJobs.shift();
        if (job) {
          selectedJobs.push(job);
        }
      }
    }

    if (selectedJobs.length === 0) {
      return NextResponse.json({ 
        message: 'No pending jobs to process',
        processedJobs: 0 
      });
    }

    const processedJobs: string[] = [];
    const errors: string[] = [];

    // Process each job sequentially
    for (const job of selectedJobs) {
      try {
        console.log(`Processing job ${job._id} (${job.type}) for company ${job.companyId}`);
        
        // Update job status to processing
        await IntegrationJob.findByIdAndUpdate(job._id, { 
          status: 'processing',
          updatedAt: new Date()
        });

        // Process the file
        const processor = new FileProcessor(job._id.toString(), job.type, job.companyId.toString());
        await processor.processFile(job.fileUrl);

        processedJobs.push(job._id.toString());
        console.log(`Job ${job._id} completed successfully for company ${job.companyId}`);

      } catch (error) {
        console.error(`Error processing job ${job._id} for company ${job.companyId}:`, error);
        
        // Update job status to failed
        try {
          await IntegrationJob.findByIdAndUpdate(job._id, { 
            status: 'failed',
            completedAt: new Date(),
            updatedAt: new Date()
          });
        } catch (updateError) {
          console.error('Error updating job status to failed:', updateError);
        }

        errors.push(`Job ${job._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${processedJobs.length} jobs`,
      processedJobs,
      errors: errors.length > 0 ? errors : undefined,
      companiesProcessed: [...new Set(selectedJobs.map(job => job.companyId.toString()))],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process integration jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
