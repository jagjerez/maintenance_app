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
  }).default(() => ({
    allowUserRegistration: true,
    requireEmailVerification: false,
    defaultUserRole: 'user' as const,
  })),
});

// User validations
export const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: z.enum(['admin', 'user']).default('user'),
  isActive: z.boolean().default(true),
  companyId: z.string().min(1, 'Company ID is required'),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
    }).default(() => ({
      email: true,
      push: true,
    })),
  }).default(() => ({
    theme: 'system' as const,
    language: 'en',
    notifications: {
      email: true,
      push: true,
    },
  })),
});

// Machine Model validations
export const machineModelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100, 'Manufacturer name too long'),
  brand: z.string().min(1, 'Brand is required').max(100, 'Brand name too long'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
});

export const machineModelCreateSchema = machineModelSchema;

export const machineModelUpdateSchema = machineModelSchema.partial();

// Machine validations
export const machineSchema = z.object({
  model: z.string().min(1, 'Machine model is required'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  locationId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
  maintenanceRanges: z.array(z.string()).optional(),
  operations: z.array(z.string()).optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export const machineCreateSchema = machineSchema;
export const machineUpdateSchema = machineSchema.partial();

// Operation validations
export const operationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  type: z.enum(['text', 'date', 'time', 'datetime', 'boolean'], {
    message: 'Type must be one of: text, date, time, datetime, boolean'
  }),
});

export const operationCreateSchema = operationSchema;
export const operationUpdateSchema = operationSchema.partial();

// Maintenance Range validations
export const maintenanceRangeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  operations: z.array(z.string()).default([]),
});

export const maintenanceRangeCreateSchema = maintenanceRangeSchema;
export const maintenanceRangeUpdateSchema = maintenanceRangeSchema.partial();

// Work Order validations
export const workOrderSchema = z.object({
  customCode: z.string().optional(),
  machines: z.array(z.object({
    machineId: z.string().min(1, 'Machine ID is required'),
    maintenanceRangeIds: z.array(z.string()).optional().default([]), // Solo para preventivo - múltiples maintenance ranges
    operations: z.array(z.string()).optional().default([]), // Solo para preventivo
    filledOperations: z.array(z.object({
      operationId: z.string(),
      value: z.any(),
      description: z.string().optional(),
      filledBy: z.string().optional(),
    })).optional().default([]), // Solo para preventivo
    images: z.array(z.object({
      url: z.string().url('Invalid image URL'),
      filename: z.string().min(1, 'Filename is required'),
      uploadedAt: z.string(),
      uploadedBy: z.string().optional(),
    })).optional().default([]), // Solo para preventivo
    maintenanceDescription: z.string().optional(), // Solo para correctivo
  })).min(1, 'At least one machine is required'),
  workOrderLocation: z.string().min(1, 'Work order location is required'),
  type: z.enum(['preventive', 'corrective', ''], {
    message: 'Type must be preventive or corrective',
  }),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  maintenanceDescription: z.string().optional(), // Solo para correctivo
  scheduledDate: z.string(),
  completedDate: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    filename: z.string().min(1, 'Filename is required'),
    uploadedAt: z.string(),
    uploadedBy: z.string().optional(),
  })).optional().default([]),
  labor: z.array(z.object({
    operatorName: z.string().optional().default(''),
    startTime: z.string(),
    endTime: z.string().optional(),
    isActive: z.boolean().default(true),
  })).optional().default([]),
  materials: z.array(z.object({
    description: z.string().min(1, 'Material description is required'),
    unitType: z.string().min(1, 'Unit type is required'),
    quantity: z.number().min(0, 'Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
  })).optional().default([]),
  operatorSignature: z.object({
    operatorName: z.string().min(1, 'Operator name is required'),
    operatorId: z.string().min(1, 'Operator ID is required'),
    signature: z.string().min(1, 'Signature is required'),
    signedAt: z.string(),
  }).optional().nullable(),
  clientSignature: z.object({
    clientName: z.string().min(1, 'Client name is required'),
    clientId: z.string().min(1, 'Client ID is required'),
    signature: z.string().min(1, 'Signature is required'),
    signedAt: z.string(),
  }).optional().nullable(),
  properties: z.record(z.string(), z.unknown()).optional().default({}),
}).refine((data) => {
  // If type is corrective, at least one machine must have maintenanceDescription
  if (data.type === 'corrective') {
    const hasMaintenanceDescription = data.machines.some(machine => 
      machine.maintenanceDescription && machine.maintenanceDescription.trim() !== ''
    );
    if (!hasMaintenanceDescription) {
      return false;
    }
  }
  return true;
}, {
  message: 'At least one machine must have maintenance description for corrective work orders',
  path: ['machines'],
});

export const workOrderCreateSchema = workOrderSchema;
export const workOrderUpdateSchema = workOrderSchema.partial();

// Labor validations
export const laborSchema = z.object({
  operatorName: z.string().optional().default(''),
  startTime: z.string(),
  endTime: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const laborUpdateSchema = laborSchema.partial();

// Material validations
export const materialSchema = z.object({
  description: z.string().min(1, 'Material description is required'),
  unitType: z.string().min(1, 'Unit type is required'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
});

export const materialUpdateSchema = materialSchema.partial();

// Work Order Image validations
export const workOrderImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  filename: z.string().min(1, 'Filename is required'),
  uploadedAt: z.string(),
  uploadedBy: z.string().optional(),
});

export const workOrderImageUpdateSchema = workOrderImageSchema.partial();

// Filled Operation validations
export const filledOperationSchema = z.object({
  operationId: z.string().min(1, 'Operation ID is required'),
  value: z.any(),
  description: z.string().optional(),
  filledBy: z.string().optional(),
});

export const filledOperationUpdateSchema = filledOperationSchema.partial();

// Location validations
export const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Location name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  parentId: z.string().nullable().optional().transform(val => val === '' ? null : val),
});

export const locationCreateSchema = locationSchema;
export const locationUpdateSchema = locationSchema.partial();

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
export type LaborInput = z.infer<typeof laborSchema>;
export type LaborUpdateInput = z.infer<typeof laborUpdateSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type MaterialUpdateInput = z.infer<typeof materialUpdateSchema>;
export type WorkOrderImageInput = z.infer<typeof workOrderImageSchema>;
export type WorkOrderImageUpdateInput = z.infer<typeof workOrderImageUpdateSchema>;
export type FilledOperationInput = z.infer<typeof filledOperationSchema>;
export type FilledOperationUpdateInput = z.infer<typeof filledOperationUpdateSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type DynamicProperty = z.infer<typeof dynamicPropertySchema>;
