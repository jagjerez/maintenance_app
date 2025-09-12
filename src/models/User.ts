import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'user';

export interface IUser {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyId: string;
  isActive: boolean;
  emailVerified?: Date;
  lastLogin?: Date;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name too long'],
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['admin', 'user'],
      message: 'Role must be either admin or user',
    },
    default: 'user',
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    language: {
      type: String,
      default: 'en',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
    },
  },
}, {
  timestamps: true,
});

// Index for better query performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ companyId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Ensure users can only access data from their company
UserSchema.pre('find', function() {
  // This will be handled in the API routes with proper authentication
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
