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

export interface ILabor {
  operatorName: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

export interface IMaterial {
  description: string;
  unitType: string;
  quantity: number;
  unit: string;
}

export type UnitType = 'cm' | 'cm3' | 'mm' | 'm' | 'm2' | 'm3' | 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'units';

export interface IWorkOrderImage {
  url: string;
  filename: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface IWorkOrder {
  _id: string;
  customCode?: string;
  machines: string[]; // Array of machine IDs
  location: string; // Location ID for the work order
  workOrderLocation: string; // Location ID where the work order will be performed
  type: WorkOrderType;
  status: WorkOrderStatus;
  description: string;
  maintenanceDescription?: string; // Description for corrective maintenance
  maintenanceDescriptionPerMachine?: Map<string, string>; // Description per machine for corrective maintenance
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: string;
  notes?: string;
  operations: string[]; // Array of operation IDs for this work order
  filledOperations: IFilledOperation[]; // Operations that have been filled
  labor: ILabor[]; // Labor hours tracking
  materials: IMaterial[]; // Materials used
  images: IWorkOrderImage[]; // Images uploaded
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
  location: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Location is required'],
  },
  workOrderLocation: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Work order location is required'],
  },
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
  maintenanceDescription: {
    type: String,
    trim: true,
  },
  maintenanceDescriptionPerMachine: {
    type: Map,
    of: String,
    default: new Map(),
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
  labor: [{
    operatorName: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  materials: [{
    description: {
      type: String,
      required: true,
      trim: true,
    },
    unitType: {
      type: String,
      required: true,
      enum: ['cm', 'cm3', 'mm', 'm', 'm2', 'm3', 'kg', 'g', 'l', 'ml', 'pcs', 'units'],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  }],
  images: [{
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
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
WorkOrderSchema.index({ location: 1 });
WorkOrderSchema.index({ status: 1 });
WorkOrderSchema.index({ scheduledDate: 1 });
WorkOrderSchema.index({ type: 1 });
WorkOrderSchema.index({ companyId: 1 });

export default mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
