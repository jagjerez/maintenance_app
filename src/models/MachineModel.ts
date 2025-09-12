import mongoose, { Schema, Document } from 'mongoose';

export interface IMachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  year: number;
  properties: Map<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MachineModelSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be after 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
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
MachineModelSchema.index({ name: 1, manufacturer: 1 });
MachineModelSchema.index({ year: 1 });

export default mongoose.models.MachineModel || mongoose.model<IMachineModel>('MachineModel', MachineModelSchema);
