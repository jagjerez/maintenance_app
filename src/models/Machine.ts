import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMachine {
  _id: string;
  internalCode: string; // GUID for Excel/CSV relationships
  description: string;
  brand: string;
  model: string;
  series: string;
  category: string;
  locationId?: string;
  rootId?: string;
  characteristics: Map<string, unknown>;
  state: string;
  deletedAt?: Date;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MachineSchema = new Schema({
  internalCode: {
    type: String,
    required: [true, 'Internal code is required'],
    unique: true,
    trim: true,
    maxlength: [36, 'Internal code too long'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [255, 'Brand cannot exceed 255 characters'],
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true,
    maxlength: [255, 'Model cannot exceed 255 characters'],
  },
  series: {
    type: String,
    required: [true, 'Series is required'],
    trim: true,
    maxlength: [255, 'Series cannot exceed 255 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
  },
  rootId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
  },
  characteristics: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    enum: ['active', 'inactive', 'maintenance', 'retired'],
    default: 'active',
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
}, {
  timestamps: true,
});

// Pre-validate middleware to generate internalCode
MachineSchema.pre('validate', function(next) {
  // Generate internalCode if not provided
  if (!this.internalCode) {
    this.internalCode = randomUUID();
  }
  next();
});

// Soft delete middleware
MachineSchema.pre('find', function() {
  this.where({ deletedAt: null });
});

MachineSchema.pre('findOne', { document: false, query: true }, function() {
  this.where({ deletedAt: null });
});

MachineSchema.pre('findOneAndUpdate', function() {
  this.where({ deletedAt: null });
});

// Index for better query performance
MachineSchema.index({ internalCode: 1 });
MachineSchema.index({ brand: 1, model: 1, series: 1, category: 1 });
MachineSchema.index({ state: 1 });
MachineSchema.index({ category: 1 });
MachineSchema.index({ locationId: 1 });
MachineSchema.index({ rootId: 1 });
MachineSchema.index({ deletedAt: 1 });
MachineSchema.index({ companyId: 1 });

export default mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);
