import mongoose, { Schema } from 'mongoose';

export interface IOperation {
  _id: string;
  name: string;
  description: string;
  type: 'text' | 'date' | 'time' | 'datetime' | 'boolean' | 'number';
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
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['text', 'date', 'time', 'datetime', 'boolean'],
  },
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

// Force recreation of the model to avoid cached schema issues
if (mongoose.models.Operation) {
  delete mongoose.models.Operation;
}

export default mongoose.model<IOperation>('Operation', OperationSchema);
