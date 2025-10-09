export interface Machine {
  _id: string;
  internalCode: string;
  description: string;
  brand: string;
  model: string;
  series: string;
  category: string;
  state: string;
  locationId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationNode {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  machines: Machine[];
  children: LocationNode[];
  childrenLoaded?: boolean;
  isLoadingChildren?: boolean;
  childrenCount?: number;
  hasChildren?: boolean;
  childrenOffset?: number;
  hasMoreChildren?: boolean;
  machinesLoaded?: boolean;
  isLoadingMachines?: boolean;
  machinesCount?: number;
  hasMachines?: boolean;
  machinesOffset?: number;
  hasMoreMachines?: boolean;
}

export interface LocationTreeViewProps {
  onLocationClick?: (location: LocationNode) => void;
  onLocationEdit?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationDelete?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationAdd?: (
    parentLocation?: LocationNode,
    event?: React.MouseEvent
  ) => void;
  onMachineClick?: (machine: Machine, event: React.MouseEvent) => void;
  selectedLocationId?: string;
  showActions?: boolean;
  className?: string;
  showMachines?: boolean;
  preventFormSubmit?: boolean;
  // Data props instead of internal API calls
  tree?: LocationNode[];
  loading?: boolean;
  expandedNodes?: Set<string>;
  onToggleExpanded?: (nodeId: string) => void;
  onLoadMoreChildren?: (nodeId: string) => void;
  onLoadMoreMachines?: (nodeId: string) => void;
  onMachineScroll?: (nodeId: string, container: HTMLElement) => void;
  hasMoreRoot?: boolean;
  isLoadingMore?: boolean;
  onLoadMoreRoot?: () => void;
}

export interface LocationNodeProps {
  node: LocationNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  showActions: boolean;
  showMachines: boolean;
  preventFormSubmit: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onLocationClick?: (location: LocationNode) => void;
  onLocationEdit?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationDelete?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationAdd?: (parentLocation: LocationNode, event: React.MouseEvent) => void;
  onMachineClick?: (machine: Machine, event: React.MouseEvent) => void;
  onLoadMoreChildren: (nodeId: string) => void;
  onLoadMoreMachines: (nodeId: string) => void;
  onMachineScroll: (nodeId: string, container: HTMLElement) => void;
}

export interface MachineListProps {
  node: LocationNode;
  level: number;
  onMachineClick?: (machine: Machine, event: React.MouseEvent) => void;
  onMachineScroll: (nodeId: string, container: HTMLElement) => void;
}

export interface LocationActionsProps {
  node: LocationNode;
  onLocationEdit?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationDelete?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationAdd?: (parentLocation: LocationNode, event: React.MouseEvent) => void;
  preventFormSubmit: boolean;
}

export interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline' | 'skeleton';
}
