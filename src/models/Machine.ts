import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMachine {
  _id: string;
  internalCode: string; // GUID for Excel/CSV relationships
  model: string;
  location: string;
  locationId?: string;
  description?: string;
  maintenanceRanges?: string[];
  operations?: string[];
  properties: Map<string, unknown>;
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
  model: {
    type: Schema.Types.ObjectId,
    ref: 'MachineModel',
    required: [true, 'Machine model is required'],
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  maintenanceRanges: [{
    type: Schema.Types.ObjectId,
    ref: 'MaintenanceRange',
  }],
  operations: [{
    type: Schema.Types.ObjectId,
    ref: 'Operation',
  }],
  properties: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
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

// Index for better query performance
MachineSchema.index({ internalCode: 1 });
MachineSchema.index({ model: 1 });
MachineSchema.index({ location: 1 });
MachineSchema.index({ companyId: 1 });

export default mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);
