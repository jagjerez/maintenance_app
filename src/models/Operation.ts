import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IOperation {
  _id: string;
  internalCode: string; // GUID for Excel/CSV relationships
  name: string;
  description: string;
  type: 'text' | 'date' | 'time' | 'datetime' | 'boolean' | 'number';
  companyId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OperationSchema = new Schema({
  internalCode: {
    type: String,
    required: [true, 'Internal code is required'],
    unique: true,
    trim: true,
    maxlength: [36, 'Internal code too long'],
  },
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
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Pre-validate middleware to generate internalCode
OperationSchema.pre('validate', function(next) {
  // Generate internalCode if not provided
  if (!this.internalCode) {
    this.internalCode = randomUUID();
  }
  next();
});

// Soft delete middleware
OperationSchema.pre('find', function() {
  this.where({ deletedAt: null });
});

OperationSchema.pre('findOne', { document: false, query: true }, function() {
  this.where({ deletedAt: null });
});

OperationSchema.pre('findOneAndUpdate', function() {
  this.where({ deletedAt: null });
});

// Index for better query performance
OperationSchema.index({ internalCode: 1 });
OperationSchema.index({ name: 1 });
OperationSchema.index({ companyId: 1 });
OperationSchema.index({ deletedAt: 1 });

// Force recreation of the model to avoid cached schema issues
if (mongoose.models.Operation) {
  delete mongoose.models.Operation;
}

export default mongoose.model<IOperation>('Operation', OperationSchema);
