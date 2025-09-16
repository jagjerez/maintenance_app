import mongoose, { Schema } from 'mongoose';

export interface IMaintenanceRange {
  _id: string;
  name: string;
  description: string;
  operations: string[];
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRangeSchema = new Schema({
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
  operations: [{
    type: Schema.Types.ObjectId,
    ref: 'Operation',
  }],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  }
}, {
  timestamps: true,
});

// Index for better query performance
MaintenanceRangeSchema.index({ name: 1 });
MaintenanceRangeSchema.index({ companyId: 1 });

export default mongoose.models.MaintenanceRange || mongoose.model<IMaintenanceRange>('MaintenanceRange', MaintenanceRangeSchema);
