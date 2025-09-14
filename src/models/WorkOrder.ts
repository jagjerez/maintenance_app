import mongoose, { Schema, Document } from 'mongoose';
import { IMachine } from './Machine';
import { IOperation } from './Operation';

export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed';
export type WorkOrderType = 'preventive' | 'corrective';

export interface IFilledOperation {
  operationId: string;
  operation: IOperation;
  value: unknown;
  description?: string;
  filledAt: Date;
  filledBy?: string;
}

export interface IWorkOrder {
  _id: string;
  customCode?: string;
  machines: string[]; // Array of machine IDs
  type: WorkOrderType;
  status: WorkOrderStatus;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: string;
  notes?: string;
  operations: string[]; // Array of operation IDs for this work order
  filledOperations: IFilledOperation[]; // Operations that have been filled
  properties: Map<string, unknown>; // Custom properties
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema({
  customCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Allow multiple null values
  },
  machines: [{
    type: Schema.Types.ObjectId,
    ref: 'Machine',
    required: true,
  }],
  type: {
    type: String,
    required: [true, 'Work order type is required'],
    enum: {
      values: ['preventive', 'corrective'],
      message: 'Type must be preventive or corrective',
    },
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
  operations: [{
    type: Schema.Types.ObjectId,
    ref: 'Operation',
  }],
  filledOperations: [{
    operationId: {
      type: Schema.Types.ObjectId,
      ref: 'Operation',
      required: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    filledAt: {
      type: Date,
      default: Date.now,
    },
    filledBy: {
      type: String,
      trim: true,
    },
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
WorkOrderSchema.index({ machines: 1 });
WorkOrderSchema.index({ status: 1 });
WorkOrderSchema.index({ scheduledDate: 1 });
WorkOrderSchema.index({ type: 1 });
WorkOrderSchema.index({ customCode: 1 });
WorkOrderSchema.index({ companyId: 1 });

export default mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
