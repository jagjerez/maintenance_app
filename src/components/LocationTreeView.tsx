"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Wrench,
  Plus,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  Building,
  Factory,
  Warehouse,
  Home,
  Store,
  Truck,
  Building2,
  Landmark,
  Eye,
} from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { FormButton } from "./Form";
import { ConfirmationModal } from "./ConfirmationModal";
import { toast } from "react-hot-toast";

interface Machine {
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

interface LocationNode {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  machines: Machine[];
  children: LocationNode[];
  childrenLoaded?: boolean; // Track if children have been loaded
  isLoadingChildren?: boolean; // Track loading state
  childrenCount?: number; // Number of children available
  hasChildren?: boolean; // Boolean flag for easy checking
  childrenOffset?: number; // Track pagination offset for children
  hasMoreChildren?: boolean; // Track if there are more children to load
  machinesLoaded?: boolean; // Track if machines have been loaded
  isLoadingMachines?: boolean; // Track machines loading state
  machinesCount?: number; // Number of machines available
  hasMachines?: boolean; // Boolean flag for easy checking
  machinesOffset?: number; // Track pagination offset for machines
  hasMoreMachines?: boolean; // Track if there are more machines to load
}

interface LocationTreeViewProps {
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
  refreshTrigger?: number; // Add this to trigger refresh
  showMachines?: boolean; // New prop to control machine display
  preventFormSubmit?: boolean; // New prop to prevent form submission
  searchQuery?: string; // New prop for search filtering
}

const iconMap = {
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

export default function LocationTreeView({
  onLocationClick,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  onMachineClick,
  selectedLocationId,
  showActions = true,
  className = "",
  refreshTrigger,
  showMachines = false,
  preventFormSubmit = false,
  searchQuery = "",
}: LocationTreeViewProps) {
  const { t } = useTranslations();
  const [tree, setTree] = useState<LocationNode[]>([]);

  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    location: LocationNode | null;
  }>({ isOpen: false, location: null });
  
  // Ref to track loading states and prevent duplicate calls
  const loadingMachinesRef = useRef<Set<string>>(new Set());

  // Scroll infinite states
  const [rootOffset, setRootOffset] = useState(0);
  const [hasMoreRoot, setHasMoreRoot] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Function to load children for a specific location with pagination
  const loadChildren = async (
    locationId: string,
    offset: number = 0,
    limit: number = 50
  ) => {
    try {
      const response = await fetch(
        `/api/locations/${locationId}/children?offset=${offset}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Error loading children:", response.statusText);
        return { locations: [], totalItems: 0, hasMore: false };
      }
    } catch (error) {
      console.error("Error loading children:", error);
      return { locations: [], totalItems: 0, hasMore: false };
    }
  };

  // Function to load machines for a specific location with pagination
  const loadMachines = async (
    locationId: string,
    offset: number = 0,
    limit: number = 50
  ) => {
    try {
      const response = await fetch(
        `/api/locations/${locationId}/machines?offset=${offset}&limit=${limit}`
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error("Error loading machines:", response.statusText);
        return { machines: [], totalItems: 0, hasMore: false };
      }
    } catch (error) {
      console.error("Error loading machines:", error);
      return { machines: [], totalItems: 0, hasMore: false };
    }
  };

  // Function to update tree with loaded machines (supports pagination)
  const updateTreeWithMachines = useCallback((
    tree: LocationNode[],
    locationId: string,
    machines: Machine[],
    append: boolean = false,
    hasMore: boolean = false,
    offset: number = 0,
    totalItems: number = 0
  ): LocationNode[] => {
    return tree.map((node) => {
      if (node._id === locationId) {
        // Filter out duplicate machines when appending
        const existingMachineIds = new Set(node.machines.map(m => m._id));
        const newMachines = append 
          ? machines.filter(machine => !existingMachineIds.has(machine._id))
          : machines;
        
        return {
          ...node,
          machines: append ? [...node.machines, ...newMachines] : machines,
          machinesLoaded: true,
          isLoadingMachines: false, // Reset loading state after machines are loaded
          machinesOffset: append ? (node.machinesOffset || 0) + newMachines.length : machines.length,
          hasMoreMachines: hasMore,
          machinesCount: totalItems > 0 ? totalItems : (append ? (node.machinesCount || 0) : machines.length),
          hasMachines: machines.length > 0,
        };
      }
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithMachines(
            node.children,
            locationId,
            machines,
            append,
            hasMore,
            offset,
            totalItems
          ),
        };
      }
      return node;
    });
  }, []);

  // Function to normalize node properties
  const normalizeNode = (node: Record<string, unknown>): LocationNode => {
    return {
      ...node,
      _id: (node._id as string) || '',
      name: (node.name as string) || '',
      description: (node.description as string) || '',
      icon: (node.icon as string) || '',
      path: (node.path as string) || '',
      level: (node.level as number) || 0,
      isLeaf: (node.isLeaf as boolean) || false,
      isLoadingChildren: (node.isLoadingChildren as boolean) || false,
      isLoadingMachines: (node.isLoadingMachines as boolean) || false,
      machinesLoaded: (node.machinesLoaded as boolean) || false,
      machinesCount: (node.machinesCount as number) || 0,
      hasMachines: (node.hasMachines as boolean) || false,
      machinesOffset: (node.machinesOffset as number) || 0,
      hasMoreMachines: (node.hasMoreMachines as boolean) || false,
      childrenLoaded: (node.childrenLoaded as boolean) || false,
      childrenCount: (node.childrenCount as number) || 0,
      hasChildren: (node.hasChildren as boolean) || false,
      childrenOffset: (node.childrenOffset as number) || 0,
      hasMoreChildren: (node.hasMoreChildren as boolean) || false,
      machines: (node.machines as Machine[]) || [],
      children: (node.children as LocationNode[]) || []
    };
  };

  // Function to update tree with loaded children (supports pagination)
  const updateTreeWithChildren = useCallback((
    tree: LocationNode[],
    parentId: string,
    children: LocationNode[],
    append: boolean = false,
    hasMore: boolean = false,
    offset: number = 0
  ): LocationNode[] => {
    return tree.map((node) => {
      if (node._id === parentId) {
        const existingChildren = append && node.children ? node.children : [];
        return {
          ...node,
          children: [...existingChildren, ...children],
          childrenLoaded: true,
          isLoadingChildren: false,
          isLeaf: children.length === 0 && !hasMore,
          childrenOffset: offset + children.length,
          hasMoreChildren: hasMore,
        };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithChildren(
            node.children,
            parentId,
            children,
            append,
            hasMore,
            offset
          ),
        };
      }
      return node;
    });
  }, []);

  const getIconComponent = (iconName?: string) => {
    if (!iconName || !iconMap[iconName as keyof typeof iconMap]) {
      return null;
    }
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return <IconComponent className="w-4 h-4" />;
  };

  // Function to load more root locations for infinite scroll
  const loadMoreRootLocations = useCallback(async () => {
    if (isLoadingMore || !hasMoreRoot) return;

    try {
      setIsLoadingMore(true);
      
      // Use search API if there's a search query, otherwise use regular tree API
      const apiUrl = searchQuery 
        ? `/api/locations/search-tree?search=${encodeURIComponent(searchQuery)}&limit=50&offset=${rootOffset}`
        : `/api/locations/tree?limit=50&offset=${rootOffset}`;
        
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        const newLocations = data.locations || data;
        // Normalize new locations
        const normalizedNewLocations = Array.isArray(newLocations) 
          ? newLocations.map(normalizeNode)
          : [normalizeNode(newLocations)];

        if (normalizedNewLocations.length > 0) {
          setTree((prevTree) => [...prevTree, ...normalizedNewLocations]);
          setRootOffset((prev) => prev + normalizedNewLocations.length);
          setHasMoreRoot(data.hasMore || false);
          
           // If there's a search query, expand nodes to show search results
           if (searchQuery && normalizedNewLocations.length > 0) {
             // For search results, expand all nodes to show the complete hierarchy
             // This allows users to see the full tree structure and identify which nodes have machines/children
             const allNodeIds = new Set<string>();
             
             const collectAllNodeIds = (nodes: LocationNode[]) => {
               nodes.forEach(node => {
                 allNodeIds.add(node._id);
                 if (node.children && node.children.length > 0) {
                   collectAllNodeIds(node.children);
                 }
               });
             };
             
             collectAllNodeIds(normalizedNewLocations);
             setExpandedNodes((prevExpanded) => {
               const newExpanded = new Set(prevExpanded);
               allNodeIds.forEach(nodeId => newExpanded.add(nodeId));
               return newExpanded;
             });
             
             // Don't load machines automatically during search
             // Let users expand nodes manually to load machines with proper pagination
           }
        } else {
          setHasMoreRoot(false);
        }
      } else {
        console.error(
          "Error loading more root locations:",
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error loading more root locations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [rootOffset, isLoadingMore, hasMoreRoot, searchQuery]);

  // Load location tree with pagination
  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true);
        setRootOffset(0);
        setHasMoreRoot(true);
        
        // Use search API if there's a search query, otherwise use regular tree API
        const apiUrl = searchQuery 
          ? `/api/locations/search-tree?search=${encodeURIComponent(searchQuery)}&limit=50&offset=0`
          : "/api/locations/tree?limit=50&offset=0";
          
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const locations = data.locations || data;
          
          // Debug: Log raw API data
          
          // Normalize all nodes to ensure they have all required properties
          const normalizedLocations = Array.isArray(locations) 
            ? locations.map(normalizeNode)
            : [normalizeNode(locations)];
            
          // Debug: Log normalized data
          
          setTree(normalizedLocations);
          setRootOffset(data.locations?.length || 0);
          setHasMoreRoot(data.hasMore || false);
          
          // If there's a search query, expand all nodes to show search results
          if (searchQuery && data.locations) {
            // For search results, expand all nodes to show the complete hierarchy
            // This allows users to see the full tree structure and identify which nodes have machines/children
            const allNodeIds = new Set<string>();
            
            const collectAllNodeIds = (nodes: LocationNode[]) => {
              nodes.forEach(node => {
                allNodeIds.add(node._id);
                if (node.children && node.children.length > 0) {
                  collectAllNodeIds(node.children);
                }
              });
            };
            
            collectAllNodeIds(normalizedLocations);
            setExpandedNodes(allNodeIds);
            
            // Don't load machines automatically during search
            // Let users expand nodes manually to load machines with proper pagination
          }
        } else {
          console.error("Error loading location tree:", response.status);
        }
      } catch (error) {
        console.error("Error loading location tree:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [refreshTrigger, searchQuery]); // Add searchQuery as dependency

  // Infinite scroll effect
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold


      if (isNearBottom && hasMoreRoot && !isLoadingMore) {
        loadMoreRootLocations();
      }
    };

    // Add throttling to prevent excessive calls
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener("scroll", throttledHandleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", throttledHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [loadMoreRootLocations, hasMoreRoot, isLoadingMore]);

  // Function to load more children for pagination
  const loadMoreChildren = async (nodeId: string) => {
    const findNode = (
      nodes: LocationNode[],
      id: string
    ): LocationNode | null => {
      for (const node of nodes) {
        if (node._id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(tree, nodeId);
    if (node && node.hasMoreChildren && !node.isLoadingChildren) {
      // Mark as loading
      setTree((prevTree) =>
        prevTree.map((n) =>
          n._id === nodeId ? normalizeNode({ ...n, isLoadingChildren: true, childrenLoaded: false }) : n
        )
      );

      // Load more children
      const offset = node.childrenOffset || 0;
      const childrenData = await loadChildren(nodeId, offset, 50);
      const children = childrenData.locations || childrenData;
      const hasMore = childrenData.hasMore || false;

      // Normalize children
      const normalizedChildren = Array.isArray(children) 
        ? children.map(normalizeNode)
        : [normalizeNode(children)];

      // Update tree with additional children
      setTree((prevTree) =>
        updateTreeWithChildren(
          prevTree,
          nodeId,
          normalizedChildren,
          true,
          hasMore,
          offset
        )
      );
    }
  };

  // Function to load more machines for pagination
  const loadMoreMachines = useCallback(async (nodeId: string) => {
    // Check if already loading to prevent duplicate calls
    if (loadingMachinesRef.current.has(nodeId)) {
      return;
    }

    const findNode = (
      nodes: LocationNode[],
      id: string
    ): LocationNode | null => {
      for (const node of nodes) {
        if (node._id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(tree, nodeId);
    if (node && node.hasMoreMachines && !node.isLoadingMachines) {
      
      // Mark as loading in ref
      loadingMachinesRef.current.add(nodeId);
      
      // Mark as loading in tree
      setTree((prevTree) =>
        prevTree.map((n) => {
          if (n._id === nodeId) {
            return normalizeNode({ ...n, isLoadingMachines: true, machinesLoaded: false });
          }
          if (n.children && n.children.length > 0) {
            return normalizeNode({
              ...n,
              children: n.children.map((child) =>
                child._id === nodeId ? normalizeNode({ ...child, isLoadingMachines: true, machinesLoaded: false }) : child
              )
            });
          }
          return n;
        })
      );

      try {
        // Load more machines
        const offset = node.machinesOffset || 0;
        const machinesData = await loadMachines(nodeId, offset, 50);
        const machines = machinesData.machines || machinesData;
        const hasMore = machinesData.hasMore || false;
        const totalItems = machinesData.totalItems || 0;


        // Update tree with additional machines
        setTree((prevTree) =>
          updateTreeWithMachines(
            prevTree,
            nodeId,
            machines,
            true, // append to existing machines
            hasMore,
            offset,
            totalItems
          )
        );
      } catch (error) {
        console.error(`Error loading more machines for ${nodeId}:`, error);
        // Reset loading state on error
        setTree((prevTree) =>
          prevTree.map((n) => {
            if (n._id === nodeId) {
              return normalizeNode({ ...n, isLoadingMachines: false, machinesLoaded: false });
            }
            if (n.children && n.children.length > 0) {
              return normalizeNode({
                ...n,
                children: n.children.map((child) =>
                  child._id === nodeId ? normalizeNode({ ...child, isLoadingMachines: false, machinesLoaded: false }) : child
                )
              });
            }
            return n;
          })
        );
      } finally {
        // Remove from loading ref
        loadingMachinesRef.current.delete(nodeId);
      }
    } else {
    }
  }, [tree, updateTreeWithMachines]);

  // Function to handle infinite scroll for machines with debounce
  const handleMachineScroll = useCallback((nodeId: string, container: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold

    if (isNearBottom) {
      const findNode = (
        nodes: LocationNode[],
        id: string
      ): LocationNode | null => {
        for (const node of nodes) {
          if (node._id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(tree, nodeId);
      
      if (node && node.hasMoreMachines && !node.isLoadingMachines && !loadingMachinesRef.current.has(nodeId)) {
        loadMoreMachines(nodeId);
      }
    }
  }, [tree, loadMoreMachines]);

  const toggleExpanded = async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    if (!isCurrentlyExpanded) {
      // Expanding - check if we need to load children
      const findNode = (
        nodes: LocationNode[],
        id: string
      ): LocationNode | null => {
        for (const node of nodes) {
          if (node._id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(tree, nodeId);
      if (node) {
        // Load children if needed
        if (
          node.hasChildren &&
          !node.childrenLoaded &&
          !node.isLoadingChildren
        ) {
          // Mark as loading children
          setTree((prevTree) =>
            updateTreeWithChildren(prevTree, nodeId, []).map((n) =>
              n._id === nodeId ? normalizeNode({ ...n, isLoadingChildren: true, childrenLoaded: false }) : n
            )
          );

          // Load children
          const childrenData = await loadChildren(nodeId);
          const children = childrenData.locations || childrenData;
          const hasMore = childrenData.hasMore || false;
          const offset = childrenData.offset || 0;

          // Normalize children
          const normalizedChildren = Array.isArray(children) 
            ? children.map(normalizeNode)
            : [normalizeNode(children)];

          // Update tree with loaded children
          setTree((prevTree) =>
            updateTreeWithChildren(
              prevTree,
              nodeId,
              normalizedChildren,
              false,
              hasMore,
              offset
            )
          );
        }

        // Load machines if needed and showMachines is true
        if (
          showMachines &&
          !node.machinesLoaded &&
          !node.isLoadingMachines
        ) {
          
          // Mark as loading machines
          setTree((prevTree) =>
            prevTree.map((n) => {
              if (n._id === nodeId) {
                return normalizeNode({ ...n, isLoadingMachines: true, machinesLoaded: false });
              }
              if (n.children && n.children.length > 0) {
                return normalizeNode({
                  ...n,
                  children: n.children.map((child) =>
                    child._id === nodeId ? normalizeNode({ ...child, isLoadingMachines: true, machinesLoaded: false }) : child
                  )
                });
              }
              return n;
            })
          );

          // Load machines
          const machinesData = await loadMachines(nodeId);
          
          const machines = machinesData.machines || machinesData;
          const hasMore = machinesData.hasMore || false;
          const offset = machinesData.offset || 0;
          const totalItems = machinesData.totalItems || 0;
          

          // Update tree with loaded machines
          setTree((prevTree) =>
            updateTreeWithMachines(
              prevTree,
              nodeId,
              machines,
              false,
              hasMore,
              offset,
              totalItems
            )
          );
        }
      }
    }

    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleLocationEdit = (
    location: LocationNode,
    event: React.MouseEvent
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationEdit) {
      onLocationEdit(location, event);
    }
  };

  const handleLocationDelete = (
    location: LocationNode,
    event: React.MouseEvent
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationDelete) {
      onLocationDelete(location, event);
    }
  };

  const handleLocationAdd = (
    parentLocation: LocationNode | undefined,
    event: React.MouseEvent
  ) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationAdd) {
      onLocationAdd(parentLocation, event);
    }
  };

  const handleMachineClick = (machine: Machine, event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onMachineClick) {
      onMachineClick(machine, event);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.location) return;

    try {
      const response = await fetch(
        `/api/locations/${deleteModal.location._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success(t("locations.deleteSuccess"));
        setDeleteModal({ isOpen: false, location: null });
        // Reload tree
        window.location.reload();
      } else {
        const error = await response.json();
        if (error.machinesCount) {
          toast.error(t("locations.cannotDeleteWithMachines"));
        } else if (error.childrenCount) {
          toast.error(t("locations.cannotDeleteWithChildren"));
        } else {
          toast.error(error.message || t("locations.deleteError"));
        }
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error(t("locations.deleteError"));
    }
  };

  // Filter function for search
  const filterLocation = (node: LocationNode, query: string): boolean => {
    if (!query) return true;

    const searchLower = query.toLowerCase();
    return (
      node.name.toLowerCase().includes(searchLower) ||
      (node.description &&
        node.description.toLowerCase().includes(searchLower)) ||
      node.path.toLowerCase().includes(searchLower) ||
      (showMachines &&
        node.machines &&
        node.machines.some(
          (machine) =>
            machine.description.toLowerCase().includes(searchLower) ||
            machine.brand.toLowerCase().includes(searchLower) ||
            machine.model.toLowerCase().includes(searchLower) ||
            machine.series.toLowerCase().includes(searchLower) ||
            machine.category.toLowerCase().includes(searchLower)
        ))
    );
  };

  // Filter children recursively
  const filterChildren = (
    nodes: LocationNode[],
    query: string
  ): LocationNode[] => {
    // If there's a search query, don't filter on frontend since API already returns relevant nodes
    if (query) {
      return nodes;
    }
    
    return nodes
      .map((node) => ({
        ...node,
        children: node.children ? filterChildren(node.children, query) : [],
      }))
      .filter((node) => {
        const matchesSelf = filterLocation(node, query);
        const hasMatchingChildren = node.children && node.children.length > 0;
        return matchesSelf || hasMatchingChildren;
      });
  };

  const renderLocationNode = (node: LocationNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node._id);
    const isSelected = selectedLocationId === node._id;
    const hasChildren = node.children && node.children.length > 0;
    const isLoadingChildren = node.isLoadingChildren;
    


    // Can expand if has children (loaded or available) or has machines
    const canExpand = hasChildren || node.hasMachines || node.hasChildren;
    
    // Note: Removed search match highlighting as requested

    return (
      <div key={node._id} className="select-none">
        {/* Mobile Card Layout */}
        <div className="block  mt-2">
          <div
            className={`bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2 hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[44px] touch-manipulation transition-colors ${
              isSelected
                ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700"
                : ""
            }`}
            style={{ marginLeft: `${level * 12}px` }}
          >
            <div className="space-y-2">
              {/* Header with expand button and name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(node._id);
                    }}
                    className={`p-1 rounded min-h-[32px] touch-manipulation transition-colors ${
                      canExpand && !isLoadingChildren
                        ? "hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                        : "cursor-default opacity-50"
                    }`}
                    disabled={!canExpand || isLoadingChildren}
                    title={
                      isLoadingChildren
                        ? "Loading children..."
                        : canExpand
                        ? isExpanded
                          ? "Click to collapse"
                          : "Click to expand and load children"
                        : "No children to load"
                    }
                  >
                    {isLoadingChildren || node.isLoadingMachines ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    ) : canExpand ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      )
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </button>

                  <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Call onLocationClick if provided
                      if (onLocationClick) {
                        onLocationClick(node);
                      }
                    }}
                  >
                    {getIconComponent(node.icon) ||
                      (isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      ))}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {node.name}
                    </span>
                  </div>
                </div>

                {/* Counts - Simplified */}
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  {/* Children count - Simple indicator */}
                  {node.hasChildren && (
                    <div className="flex items-center">
                      <Folder className="h-3 w-3 mr-1" />
                      <span>{node.childrenCount || 0}</span>
                    </div>
                  )}

                  {/* Machine count */}
                  {node.hasMachines && (
                    <div className="flex items-center">
                      <Wrench className="h-3 w-3 mr-1 text-blue-500" />
                      <span>{node.machinesCount || 0}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {node.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                  {node.description}
                </div>
              )}

              {/* Actions */}
              {showActions && (
                <div className="flex items-center space-x-1 ml-6">
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleLocationAdd(node, e)}
                    className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
                    title={t("locations.addChild")}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">
                      {t("locations.addChild")}
                    </span>
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleLocationEdit(node, e)}
                    className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
                    title={t("common.edit")}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t("common.edit")}</span>
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="danger"
                    onClick={(e) => handleLocationDelete(node, e)}
                    className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">
                      {t("common.delete")}
                    </span>
                  </FormButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Machines in this location - only show if showMachines is true */}
        {isExpanded && showMachines && (
          <>
            

            {/* Integrated LocationMachinesView - Detailed Machine View */}
            {showMachines && (node.hasMachines || node.isLoadingMachines) && node.machines.length > 0 && (
              <div 
                className="mt-2" 
                style={{ marginLeft: `${level * 12 + 12}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-300 ${
                  node.isLoadingMachines ? 'animate-pulse border-blue-300 dark:border-blue-700' : ''
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <Wrench className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {t("locations.machinesInLocation")}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {node.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {node.isLoadingMachines ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {t("common.loading")}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {node.machines.length} {t("machines.machine")}
                          {(node.machines.length) !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Machine Details */}
                  <div 
                    className="max-h-64 overflow-y-auto"
                    onScroll={(e) => {
                      const container = e.currentTarget;
                      handleMachineScroll(node._id, container);
                    }}
                  >
                    {/* Skeleton loading for initial load */}
                    {node.isLoadingMachines && !node.machinesLoaded && (
                      <div className="p-4 flex flex-col items-center justify-center">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {t("common.loading")} {t("machines.machine")}s...
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                    {node.machines.map((machine) => (
                      <div
                        key={machine._id}
                        className="p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {machine.description}
                              </h4>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  machine.state === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : machine.state === "inactive"
                                    ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                    : machine.state === "maintenance"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    : machine.state === "retired"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {machine.state === "active"
                                  ? t("machines.active")
                                  : machine.state === "inactive"
                                  ? t("machines.inactive")
                                  : machine.state === "maintenance"
                                  ? t("machines.maintenance")
                                  : machine.state === "retired"
                                  ? t("machines.retired")
                                  : machine.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              <p>
                                <span className="font-medium">{t("machines.brand")}:</span> {machine.brand}
                              </p>
                              <p>
                                <span className="font-medium">{t("machines.model")}:</span> {machine.model}
                              </p>
                              <p>
                                <span className="font-medium">{t("machines.series")}:</span> {machine.series}
                              </p>
                              <p>
                                <span className="font-medium">{t("machines.category")}:</span> {machine.category}
                              </p>
                              <p>
                                <span className="font-medium">{t("machines.internalCode")}:</span> {machine.internalCode}
                              </p>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              title={t("common.viewDetails")}
                              onClick={(e) => handleMachineClick(machine, e)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Loading indicator for infinite scroll */}
                    {node.isLoadingMachines && (
                      <div className="p-4 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg mx-2 mb-2 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {!node.machinesLoaded ? t("common.loading") + "..." : t("common.loadingMore") + "..."}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Children */}
        {isExpanded && (
          <div>
            {isLoadingChildren ? (
              <div className="ml-6 p-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>Loading children...</span>
                </div>
              </div>
            ) : hasChildren ? (
              <>
                {node.children.map((child) =>
                  renderLocationNode(child, level + 1)
                )}
                {/* Load More Button */}
                {node.hasMoreChildren && (
                  <div className="ml-6 p-2">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => loadMoreChildren(node._id)}
                      disabled={node.isLoadingChildren}
                      className="px-3 py-1 text-xs min-h-[32px] touch-manipulation"
                    >
                      {node.isLoadingChildren ? (
                        <>
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                          Loading more...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Load more children (
                          {node.childrenCount! -
                            (node.childrenOffset || 0)}{" "}
                          remaining)
                        </>
                      )}
                    </FormButton>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="relative z-10">
        {tree.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {searchQuery ? t("locations.noSearchResults") : t("locations.noLocations")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? t("locations.tryDifferentSearch") 
                : t("locations.startAddingLocation")
              }
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="overflow-y-auto max-h-auto">
            {filterChildren(tree, searchQuery).map((node) =>
              renderLocationNode(node)
            )}

            {/* Load more button */}
            {hasMoreRoot && !isLoadingMore && (
              <div className="flex justify-center py-4">
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={loadMoreRootLocations}
                  className="px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.loadMore")} ({rootOffset} loaded)
                </FormButton>
              </div>
            )}

            {/* Infinite scroll loading indicator */}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-4">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("common.loadingMore")}...
                </span>
              </div>
            )}

            {/* End of list indicator */}
            {!hasMoreRoot && tree.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                {t("common.endOfList")} ({tree.length} total)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, location: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteLocation")}
        message={t("modals.deleteLocationMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={
          deleteModal.location
            ? {
                name: deleteModal.location.name,
                description: deleteModal.location.description || "",
              }
            : undefined
        }
      />
    </div>
  );
}
