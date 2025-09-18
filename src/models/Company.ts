import mongoose, { Schema } from 'mongoose';

export interface ICompany {
  _id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  appName: string;
  theme: 'light' | 'dark' | 'system';
  branding: {
    appName: string;
    logo?: string;
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
  };
  settings: {
    allowUserRegistration: boolean;
    requireEmailVerification: boolean;
    defaultUserRole: 'admin' | 'user';
  };
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name too long'],
  },
  logo: {
    type: String,
    trim: true,
  },
  primaryColor: {
    type: String,
    required: [true, 'Primary color is required'],
    default: '#3b82f6', // blue-500
    match: [/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'],
  },
  appName: {
    type: String,
    required: [true, 'App name is required'],
    trim: true,
    maxlength: [50, 'App name too long'],
    default: 'Maintenance App',
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system',
  },
  branding: {
    appName: {
      type: String,
      required: [true, 'Branding app name is required'],
      trim: true,
      maxlength: [50, 'Branding app name too long'],
    },
    logo: {
      type: String,
      trim: true,
    },
    primaryColor: {
      type: String,
      required: [true, 'Branding primary color is required'],
      default: '#3b82f6',
      match: [/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'],
    },
    secondaryColor: {
      type: String,
      match: [/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'],
    },
    accentColor: {
      type: String,
      match: [/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'],
    },
  },
  settings: {
    allowUserRegistration: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: false,
    },
    defaultUserRole: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
  },
}, {
  timestamps: true,
});

// Index for better query performance
CompanySchema.index({ name: 1 });
CompanySchema.index({ appName: 1 });

export default mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);
