import { z } from 'zod';

// Company validations
export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  logo: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
  appName: z.string().min(1, 'App name is required').max(50, 'App name too long').default('Maintenance App'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  branding: z.object({
    appName: z.string().min(1, 'Branding app name is required').max(50, 'Branding app name too long'),
    logo: z.string().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3b82f6'),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  }),
  settings: z.object({
    allowUserRegistration: z.boolean().default(true),
    requireEmailVerification: z.boolean().default(false),
    defaultUserRole: z.enum(['admin', 'user']).default('user'),
  }).default({}),
});

// User validations
export const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: z.enum(['admin', 'user']).default('user'),
  companyId: z.string().min(1, 'Company is required'),
  isActive: z.boolean().default(true),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
    }).default({}),
  }).default({}),
});

// Machine Model validations
export const machineModelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100, 'Manufacturer name too long'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  properties: z.record(z.string(), z.unknown()).default({}),
  companyId: z.string().min(1, 'Company is required'),
});

export const machineModelUpdateSchema = machineModelSchema.partial();

// Machine validations
export const machineSchema = z.object({
  model: z.string().min(1, 'Machine model is required'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  properties: z.record(z.string(), z.unknown()).default({}),
  companyId: z.string().min(1, 'Company is required'),
});

export const machineUpdateSchema = machineSchema.partial();

// Operation validations
export const operationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  estimatedTime: z.number().min(1, 'Estimated time must be at least 1 minute'),
  requiredResources: z.array(z.string()).default([]),
  companyId: z.string().min(1, 'Company is required'),
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
  companyId: z.string().min(1, 'Company is required'),
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
  companyId: z.string().min(1, 'Company is required'),
});

export const workOrderUpdateSchema = workOrderSchema.partial();

// Dynamic properties validation
export const dynamicPropertySchema = z.object({
  key: z.string().min(1, 'Property key is required'),
  value: z.any(),
});

export const dynamicPropertiesSchema = z.array(dynamicPropertySchema);

// API Response types
export type CompanyInput = z.infer<typeof companySchema>;
export type UserInput = z.infer<typeof userSchema>;
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
