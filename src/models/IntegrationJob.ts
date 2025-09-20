import mongoose, { Schema } from 'mongoose';

export interface IIntegrationJob {
  _id: string;
  companyId: string;
  type: 'locations' | 'machine-models' | 'machines' | 'maintenance-ranges';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName: string;
  fileUrl: string; // URL del archivo en Vercel Blob
  fileSize: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    message: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const IntegrationJobSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['locations', 'machine-models', 'machines', 'maintenance-ranges'],
      message: 'Type must be one of: locations, machine-models, machines, maintenance-ranges',
    },
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['pending', 'processing', 'completed', 'failed'],
      message: 'Status must be one of: pending, processing, completed, failed',
    },
    default: 'pending',
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size must be positive'],
  },
  totalRows: {
    type: Number,
    default: 0,
    min: [0, 'Total rows must be non-negative'],
  },
  processedRows: {
    type: Number,
    default: 0,
    min: [0, 'Processed rows must be non-negative'],
  },
  successRows: {
    type: Number,
    default: 0,
    min: [0, 'Success rows must be non-negative'],
  },
  errorRows: {
    type: Number,
    default: 0,
    min: [0, 'Error rows must be non-negative'],
  },
  errors: [{
    row: {
      type: Number,
      required: true,
      min: [1, 'Row number must be at least 1'],
    },
    field: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  }],
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
IntegrationJobSchema.index({ companyId: 1, status: 1 });
IntegrationJobSchema.index({ type: 1, status: 1 });
IntegrationJobSchema.index({ createdAt: -1 });

export default mongoose.models.IntegrationJob || mongoose.model<IIntegrationJob>('IntegrationJob', IntegrationJobSchema);
