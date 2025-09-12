import mongoose, { Schema, Document } from 'mongoose';
import { IMachineModel } from './MachineModel';

export interface IMachine {
  _id: string;
  model: string;
  location: string;
  properties: Map<string, unknown>;
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
  properties: {
    type: Map,
    of: Schema.Types.Mixed,
    default: new Map(),
  },
}, {
  timestamps: true,
});

// Index for better query performance
MachineSchema.index({ model: 1 });
MachineSchema.index({ location: 1 });

export default mongoose.models.Machine || mongoose.model<IMachine>('Machine', MachineSchema);
