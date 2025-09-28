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

// Machine validations
export const machineSchema = z.object({
  name: z.string().min(1, 'Machine name is required').max(100, 'Machine name too long'),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100, 'Manufacturer name too long'),
  brand: z.string().min(1, 'Brand is required').max(100, 'Brand name too long'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  locationId: z.string().optional(),
  description: z.string().max(500, 'Description too long').optional(),
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



// Location validations
export const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Location name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  icon: z.string().max(50, 'Icon identifier too long').optional(),
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
export type MachineInput = z.infer<typeof machineSchema>;
export type MachineUpdateInput = z.infer<typeof machineUpdateSchema>;
export type OperationInput = z.infer<typeof operationSchema>;
export type OperationUpdateInput = z.infer<typeof operationUpdateSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type DynamicProperty = z.infer<typeof dynamicPropertySchema>;
