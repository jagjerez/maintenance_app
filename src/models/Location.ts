import mongoose, { Schema, Document } from 'mongoose';

export interface ILocation {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string; // Full path from root (e.g., "/Plant A/Line 1/Station 1")
  level: number; // Depth level in the tree (0 for root)
  isLeaf: boolean; // True if no children
  children?: ILocation[];
  machines?: string[]; // Array of machine IDs in this location
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Location name too long'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description too long'],
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  path: {
    type: String,
    trim: true,
    default: '',
  },
  level: {
    type: Number,
    min: [0, 'Level must be non-negative'],
    default: 0,
  },
  isLeaf: {
    type: Boolean,
    default: true,
  },
  machines: [{
    type: Schema.Types.ObjectId,
    ref: 'Machine',
  }],
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
LocationSchema.index({ companyId: 1 });
LocationSchema.index({ parentId: 1 });
LocationSchema.index({ path: 1 });
LocationSchema.index({ level: 1 });
LocationSchema.index({ isLeaf: 1 });

// Virtual for children count
LocationSchema.virtual('childrenCount', {
  ref: 'Location',
  localField: '_id',
  foreignField: 'parentId',
  count: true,
});

// Virtual for machines count
LocationSchema.virtual('machinesCount', {
  ref: 'Machine',
  localField: '_id',
  foreignField: 'locationId',
  count: true,
});

// Ensure virtual fields are serialized
LocationSchema.set('toJSON', { virtuals: true });
LocationSchema.set('toObject', { virtuals: true });

// Pre-validate middleware to clean parentId
LocationSchema.pre('validate', function(next) {
  // Clean parentId first - convert empty string or undefined to null
  if (this.parentId === '' || this.parentId === undefined) {
    (this as unknown as { parentId: null }).parentId = null;
  }
  next();
});

// Pre-save middleware to update path and level
LocationSchema.pre('save', async function(next) {
  // Always calculate path and level
  if (this.parentId && this.parentId !== null) {
    const parent = await (this.constructor as any).findById(this.parentId);
    if (parent) {
      this.path = `${parent.path}/${this.name}`;
      this.level = parent.level + 1;
    } else {
      this.path = `/${this.name}`;
      this.level = 0;
    }
  } else {
    this.path = `/${this.name}`;
    this.level = 0;
  }
  next();
});

// Pre-save middleware to update parent's isLeaf status
LocationSchema.post('save', async function() {
  if (this.parentId && this.parentId !== '' && this.parentId !== null) {
    const parent = await this.constructor.findById(this.parentId);
    if (parent) {
      parent.isLeaf = false;
      await parent.save();
    }
  }
});

// Pre-remove middleware to handle children
LocationSchema.pre('remove', async function(next) {
  // Check if there are machines in this location
  const Machine = mongoose.model('Machine');
  const machinesCount = await Machine.countDocuments({ locationId: this._id });
  
  if (machinesCount > 0) {
    const error = new Error(`Cannot delete location with ${machinesCount} machine(s). Please move or delete the machines first.`);
    return next(error);
  }

  // Check if there are children
  const childrenCount = await this.constructor.countDocuments({ parentId: this._id });
  if (childrenCount > 0) {
    const error = new Error('Cannot delete location with children. Please delete children first.');
    return next(error);
  }

  // Update parent's isLeaf status if this was the only child
  if (this.parentId && this.parentId !== '' && this.parentId !== null) {
    const siblingsCount = await this.constructor.countDocuments({ parentId: this.parentId });
    if (siblingsCount === 1) { // Only this location is a child
      const parent = await this.constructor.findById(this.parentId);
      if (parent) {
        parent.isLeaf = true;
        await parent.save();
      }
    }
  }

  next();
});

// Delete the model if it exists to force recreation with new schema
if (mongoose.models.Location) {
  delete mongoose.models.Location;
}

export default mongoose.model<ILocation>('Location', LocationSchema);
