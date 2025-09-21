import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMaintenanceRange {
  _id: string;
  internalCode: string; // GUID for Excel/CSV relationships
  name: string;
  description: string;
  type: 'preventive' | 'corrective';
  operations: string[];
  // Planificación para mantenimiento preventivo
  frequency?: 'daily' | 'monthly' | 'yearly';
  startDate?: Date; // Fecha de inicio para monthly y yearly
  startTime?: string; // Hora de inicio para monthly y yearly (formato HH:mm)
  daysOfWeek?: number[]; // Días de la semana para daily (0=domingo, 1=lunes, etc.)
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRangeSchema = new Schema({
  internalCode: {
    type: String,
    required: [true, 'Internal code is required'],
    unique: true,
    trim: true,
    maxlength: [36, 'Internal code too long'],
  },
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
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: {
      values: ['preventive', 'corrective'],
      message: 'Type must be preventive or corrective',
    },
  },
  operations: [{
    type: Schema.Types.ObjectId,
    ref: 'Operation',
  }],
  // Planificación para mantenimiento preventivo
  frequency: {
    type: String,
    enum: {
      values: ['daily', 'monthly', 'yearly'],
      message: 'Frequency must be daily, monthly, or yearly',
    },
  },
  startDate: {
    type: Date,
  },
  startTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'],
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
  }],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  }
}, {
  timestamps: true,
});

// Pre-validate middleware to generate internalCode
MaintenanceRangeSchema.pre('validate', function(next) {
  // Generate internalCode if not provided
  if (!this.internalCode) {
    this.internalCode = randomUUID();
  }
  next();
});

// Index for better query performance
MaintenanceRangeSchema.index({ internalCode: 1 });
MaintenanceRangeSchema.index({ name: 1 });
MaintenanceRangeSchema.index({ companyId: 1 });

export default mongoose.models.MaintenanceRange || mongoose.model<IMaintenanceRange>('MaintenanceRange', MaintenanceRangeSchema);
