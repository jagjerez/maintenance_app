import {
  MapPin,
  Wrench,
  Folder,
  Building,
  Factory,
  Warehouse,
  Home,
  Store,
  Truck,
  Building2,
  Landmark,
} from "lucide-react";

export const iconMap = {
  building: Building,
  building2: Building2,
  home: Home,
  factory: Factory,
  warehouse: Warehouse,
  store: Store,
  landmark: Landmark,
  wrench: Wrench,
  folder: Folder,
  "map-pin": MapPin,
  truck: Truck,
};

export const MACHINE_STATE_COLORS = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  retired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export const PAGINATION_LIMITS = {
  ROOT_LOCATIONS: 50,
  CHILDREN: 50,
  MACHINES: 50,
} as const;
