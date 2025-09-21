import { IntegrationJob } from '@/models';
import { connectDB } from '@/lib/db';
import { FileProcessor } from './fileProcessor';

class LocalCron {
  private static instance: LocalCron;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): LocalCron {
    if (!LocalCron.instance) {
      LocalCron.instance = new LocalCron();
    }
    return LocalCron.instance;
  }

  public start(intervalMinutes: number = 2): void {
    if (this.intervalId) {
      console.log('Local cron is already running');
      return;
    }

    console.log(`Starting local cron every ${intervalMinutes} minutes`);
    
    this.intervalId = setInterval(async () => {
      await this.processJobs();
    }, intervalMinutes * 60 * 1000);

    // Process immediately on start
    this.processJobs();
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Local cron stopped');
    }
  }

  public isActive(): boolean {
    return this.intervalId !== null;
  }

  private async processJobs(): Promise<void> {
    if (this.isRunning) {
      console.log('Cron is already processing, skipping this run');
      return;
    }

    this.isRunning = true;

    try {
      await connectDB();

      // Get pending jobs from ALL companies, ordered by creation date (FIFO)
      const pendingJobs = await IntegrationJob.find({ 
        status: 'pending' 
      }).sort({ createdAt: 1 }).limit(10);

      if (pendingJobs.length === 0) {
        console.log('No pending jobs to process');
        return;
      }

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
        console.log('No jobs selected for processing');
        return;
      }

      console.log(`Processing ${selectedJobs.length} jobs from ${companyIds.length} companies`);

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

      console.log(`Local cron completed: ${processedJobs.length} jobs processed, ${errors.length} errors`);

    } catch (error) {
      console.error('Error in local cron:', error);
    } finally {
      this.isRunning = false;
    }
  }

  public async processJobsNow(): Promise<void> {
    await this.processJobs();
  }
}

export default LocalCron;
