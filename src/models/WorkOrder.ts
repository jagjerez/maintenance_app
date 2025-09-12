import mongoose, { Schema, Document } from 'mongoose';
import { IMachine } from './Machine';
import { IMaintenanceRange } from './MaintenanceRange';

export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed';

export interface IWorkOrder {
  _id: string;
  machine: string;
  maintenanceRange: string;
  status: WorkOrderStatus;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: string;
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema({
  machine: {
    type: Schema.Types.ObjectId,
    ref: 'Machine',
    required: [true, 'Machine is required'],
  },
  maintenanceRange: {
    type: Schema.Types.ObjectId,
    ref: 'MaintenanceRange',
    required: [true, 'Maintenance range is required'],
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['pending', 'in_progress', 'completed'],
      message: 'Status must be pending, in_progress, or completed',
    },
    default: 'pending',
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required'],
  },
  completedDate: {
    type: Date,
  },
  assignedTo: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
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
WorkOrderSchema.index({ machine: 1 });
WorkOrderSchema.index({ status: 1 });
WorkOrderSchema.index({ scheduledDate: 1 });
WorkOrderSchema.index({ maintenanceRange: 1 });
WorkOrderSchema.index({ companyId: 1 });

export default mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
