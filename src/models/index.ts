// Import all models to ensure schemas are registered with Mongoose
import './User';
import './Company';
import './Machine';
import './MachineModel';
import './MaintenanceRange';
import './Operation';
import './WorkOrder';
import './Location';

// Re-export all models for convenience
export { default as User } from './User';
export { default as Company } from './Company';
export { default as Machine } from './Machine';
export { default as MachineModel } from './MachineModel';
export { default as MaintenanceRange } from './MaintenanceRange';
export { default as Operation } from './Operation';
export { default as WorkOrder } from './WorkOrder';
export { default as Location } from './Location';
