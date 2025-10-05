import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMachine {
  _id: string;
  internalCode: string; // GUID for Excel/CSV relationships
  name: string;
  model: string;
  brand: string;
  locationId?: string;
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
  name: {
    type: String,
    required: [true, 'Machine name is required'],
    trim: true,
  },
  model: {
    type: String,
    trim: true,
    maxlength: [255, 'Model cannot exceed 255 characters'],
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [255, 'Brand cannot exceed 255 characters'],
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
  },
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
MachineSchema.index({ name: 1, model: 1, brand: 1 });
MachineSchema.index({ locationId: 1 });
MachineSchema.index({ companyId: 1 });

export default mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);
