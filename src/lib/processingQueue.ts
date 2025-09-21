import { IntegrationJob } from '@/models';
import { FileProcessor } from './fileProcessor';
import { connectDB } from './db';

interface QueuedJob {
  jobId: string;
  type: string;
  companyId: string;
  fileUrl: string;
  priority: number; // Lower number = higher priority
}

class ProcessingQueue {
  private static instance: ProcessingQueue;
  private queue: QueuedJob[] = [];
  private isProcessing = false;
  private currentJob: QueuedJob | null = null;

  private constructor() {}

  public static getInstance(): ProcessingQueue {
    if (!ProcessingQueue.instance) {
      ProcessingQueue.instance = new ProcessingQueue();
    }
    return ProcessingQueue.instance;
  }

  public async addJob(jobId: string, type: string, companyId: string, fileUrl: string, priority: number = 0): Promise<void> {
    const job: QueuedJob = {
      jobId,
      type,
      companyId,
      fileUrl,
      priority
    };

    // Insert job in priority order (lower priority number = higher priority)
    const insertIndex = this.queue.findIndex(q => q.priority > priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();
    
    if (!job) {
      this.isProcessing = false;
      return;
    }

    this.currentJob = job;

    try {
      console.log(`Processing job ${job.jobId} (${job.type})`);
      
      // Update job status to processing
      await connectDB();
      await IntegrationJob.findByIdAndUpdate(job.jobId, { 
        status: 'processing',
        updatedAt: new Date()
      });

      // Process the file
      const processor = new FileProcessor(job.jobId, job.type, job.companyId);
      await processor.processFile(job.fileUrl);

      console.log(`Job ${job.jobId} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${job.jobId}:`, error);
      
      // Update job status to failed
      try {
        await connectDB();
        await IntegrationJob.findByIdAndUpdate(job.jobId, { 
          status: 'failed',
          completedAt: new Date(),
          updatedAt: new Date()
        });
      } catch (updateError) {
        console.error('Error updating job status to failed:', updateError);
      }
    } finally {
      this.currentJob = null;
      this.isProcessing = false;
      
      // Process next job in queue
      if (this.queue.length > 0) {
        // Add a small delay between jobs to prevent overwhelming the system
        setTimeout(() => {
          this.processNext();
        }, 1000);
      }
    }
  }

  public getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentJob: QueuedJob | null;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentJob: this.currentJob
    };
  }

  public clearQueue(): void {
    this.queue = [];
  }
}

export default ProcessingQueue;
