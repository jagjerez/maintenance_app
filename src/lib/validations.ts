import { z } from 'zod';

// Machine Model validations
export const machineModelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100, 'Manufacturer name too long'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export const machineModelUpdateSchema = machineModelSchema.partial();

// Machine validations
export const machineSchema = z.object({
  model: z.string().min(1, 'Machine model is required'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export const machineUpdateSchema = machineSchema.partial();

// Operation validations
export const operationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  estimatedTime: z.number().min(1, 'Estimated time must be at least 1 minute'),
  requiredResources: z.array(z.string()).default([]),
});

export const operationUpdateSchema = operationSchema.partial();

// Maintenance Range validations
export const maintenanceRangeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: z.enum(['preventive', 'corrective'], {
    message: 'Type must be either preventive or corrective',
  }),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  operations: z.array(z.string()).default([]),
});

export const maintenanceRangeUpdateSchema = maintenanceRangeSchema.partial();

// Work Order validations
export const workOrderSchema = z.object({
  machine: z.string().min(1, 'Machine is required'),
  maintenanceRange: z.string().min(1, 'Maintenance range is required'),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  scheduledDate: z.string(),
  completedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export const workOrderUpdateSchema = workOrderSchema.partial();

// Dynamic properties validation
export const dynamicPropertySchema = z.object({
  key: z.string().min(1, 'Property key is required'),
  value: z.any(),
});

export const dynamicPropertiesSchema = z.array(dynamicPropertySchema);

// API Response types
export type MachineModelInput = z.infer<typeof machineModelSchema>;
export type MachineModelUpdateInput = z.infer<typeof machineModelUpdateSchema>;
export type MachineInput = z.infer<typeof machineSchema>;
export type MachineUpdateInput = z.infer<typeof machineUpdateSchema>;
export type OperationInput = z.infer<typeof operationSchema>;
export type OperationUpdateInput = z.infer<typeof operationUpdateSchema>;
export type MaintenanceRangeInput = z.infer<typeof maintenanceRangeSchema>;
export type MaintenanceRangeUpdateInput = z.infer<typeof maintenanceRangeUpdateSchema>;
export type WorkOrderInput = z.infer<typeof workOrderSchema>;
export type WorkOrderUpdateInput = z.infer<typeof workOrderUpdateSchema>;
export type DynamicProperty = z.infer<typeof dynamicPropertySchema>;
