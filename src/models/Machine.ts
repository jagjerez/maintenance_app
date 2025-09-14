import mongoose, { Schema, Document } from 'mongoose';
import { IMachineModel } from './MachineModel';

export interface IMachine {
  _id: string;
  model: string;
  location: string;
  locationId?: string;
  description?: string;
  maintenanceRanges?: string[];
  properties: Map<string, unknown>;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MachineSchema = new Schema({
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

// Index for better query performance
MachineSchema.index({ model: 1 });
MachineSchema.index({ location: 1 });
MachineSchema.index({ companyId: 1 });

export default mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);
