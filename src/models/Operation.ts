import mongoose, { Schema, Document } from 'mongoose';

export interface IOperation {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number; // in minutes
  requiredResources: string[];
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OperationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  estimatedTime: {
    type: Number,
    required: [true, 'Estimated time is required'],
    min: [1, 'Estimated time must be at least 1 minute'],
  },
  requiredResources: [{
    type: String,
    trim: true,
  }],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
}, {
  timestamps: true,
});

// Index for better query performance
OperationSchema.index({ name: 1 });
OperationSchema.index({ companyId: 1 });

export default mongoose.models.Operation || mongoose.model<IOperation>('Operation', OperationSchema);
