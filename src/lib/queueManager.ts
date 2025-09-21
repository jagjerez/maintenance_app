import { IntegrationJob } from '@/models';
import { IIntegrationJob } from '@/models/IntegrationJob';
import { connectDB } from './db';

export interface QueueStatus {
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  nextJobToProcess?: {
    id: string;
    fileName: string;
    type: string;
    createdAt: Date;
  };
}

export class QueueManager {
  private static instance: QueueManager;

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public async getQueueStatus(companyId?: string): Promise<QueueStatus> {
    await connectDB();

    const filter = companyId ? { companyId } : {};
    
    const [pendingJobs, processingJobs, completedJobs, failedJobs] = await Promise.all([
      IntegrationJob.countDocuments({ ...filter, status: 'pending' }),
      IntegrationJob.countDocuments({ ...filter, status: 'processing' }),
      IntegrationJob.countDocuments({ ...filter, status: 'completed' }),
      IntegrationJob.countDocuments({ ...filter, status: 'failed' })
    ]);

    // Get the next job to process (oldest pending job)
    const nextJob = await IntegrationJob.findOne({ 
      ...filter, 
      status: 'pending' 
    }).sort({ createdAt: 1 }).select('_id fileName type createdAt');

    return {
      pendingJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      nextJobToProcess: nextJob ? {
        id: nextJob._id.toString(),
        fileName: nextJob.fileName,
        type: nextJob.type,
        createdAt: nextJob.createdAt
      } : undefined
    };
  }

  public async getPendingJobs(limit: number = 5, companyId?: string): Promise<IIntegrationJob[]> {
    await connectDB();
    
    const filter = companyId ? { companyId, status: 'pending' } : { status: 'pending' };
    
    return await IntegrationJob.find(filter).sort({ createdAt: 1 }).limit(limit);
  }

  public async getProcessingJobs(companyId?: string): Promise<IIntegrationJob[]> {
    await connectDB();
    
    const filter = companyId ? { companyId, status: 'processing' } : { status: 'processing' };
    
    return await IntegrationJob.find(filter).sort({ updatedAt: 1 });
  }

  public async markJobAsProcessing(jobId: string): Promise<void> {
    await connectDB();
    
    await IntegrationJob.findByIdAndUpdate(jobId, {
      status: 'processing',
      updatedAt: new Date()
    });
  }

  public async markJobAsCompleted(jobId: string): Promise<void> {
    await connectDB();
    
    await IntegrationJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async markJobAsFailed(jobId: string): Promise<void> {
    await connectDB();
    
    await IntegrationJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      completedAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async getJobStats(companyId?: string, days: number = 7): Promise<{
    totalJobs: number;
    successRate: number;
    averageProcessingTime: number;
    jobsByType: Record<string, number>;
    jobsByStatus: Record<string, number>;
  }> {
    await connectDB();

    const filter = companyId ? { companyId } : {};
    const dateFilter = {
      ...filter,
      createdAt: {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    };

    const jobs = await IntegrationJob.find(dateFilter);
    
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Calculate average processing time for completed jobs
    const completedJobsWithTime = jobs.filter(job => 
      job.status === 'completed' && job.completedAt
    );
    
    const averageProcessingTime = completedJobsWithTime.length > 0
      ? completedJobsWithTime.reduce((sum, job) => {
          const processingTime = job.completedAt!.getTime() - job.createdAt.getTime();
          return sum + processingTime;
        }, 0) / completedJobsWithTime.length / 1000 // Convert to seconds
      : 0;

    // Jobs by type
    const jobsByType = jobs.reduce((acc, job) => {
      acc[job.type] = (acc[job.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Jobs by status
    const jobsByStatus = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalJobs,
      successRate,
      averageProcessingTime,
      jobsByType,
      jobsByStatus
    };
  }
}

export default QueueManager;
