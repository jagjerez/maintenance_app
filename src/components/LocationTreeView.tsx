'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, MapPin, Wrench, Plus, Edit, Trash2, Folder, FolderOpen, Building, Factory, Warehouse, Home, Store, Truck, Building2, Landmark } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { FormButton } from './Form';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'react-hot-toast';

interface Machine {
  _id: string;
  model: {
    _id: string;
    name: string;
    manufacturer: string;
    brand: string;
    year: number;
  };
  maintenanceRanges?: {
    _id: string;
    name: string;
    type: 'preventive' | 'corrective';
  }[];
  location: string;
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
}

interface LocationTreeViewProps {
  onLocationClick?: (location: LocationNode) => void;
  onLocationEdit?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationDelete?: (location: LocationNode, event: React.MouseEvent) => void;
  onLocationAdd?: (parentLocation?: LocationNode, event?: React.MouseEvent) => void;
  onMachineClick?: (machine: Machine, event: React.MouseEvent) => void;
  selectedLocationId?: string;
  showActions?: boolean;
  className?: string;
  refreshTrigger?: number; // Add this to trigger refresh
  showMachines?: boolean; // New prop to control machine display
  preventFormSubmit?: boolean; // New prop to prevent form submission
}

const iconMap = {
  'building': Building,
  'building2': Building2,
  'home': Home,
  'factory': Factory,
  'warehouse': Warehouse,
  'store': Store,
  'landmark': Landmark,
  'wrench': Wrench,
  'folder': Folder,
  'map-pin': MapPin,
  'truck': Truck,
};

export default function LocationTreeView({
  onLocationClick,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  onMachineClick,
  selectedLocationId,
  showActions = true,
  className = '',
  refreshTrigger,
  showMachines = false,
  preventFormSubmit = false,
}: LocationTreeViewProps) {
  const { t } = useTranslations();
  const [tree, setTree] = useState<LocationNode[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    location: LocationNode | null;
  }>({ isOpen: false, location: null });

  // Scroll infinite states
  const [rootOffset, setRootOffset] = useState(0);
  const [hasMoreRoot, setHasMoreRoot] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Function to load children for a specific location with pagination
  const loadChildren = async (locationId: string, offset: number = 0, limit: number = 50) => {
    try {
      const response = await fetch(`/api/locations/${locationId}/children?offset=${offset}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.error('Error loading children:', response.statusText);
        return { locations: [], totalItems: 0, hasMore: false };
      }
    } catch (error) {
      console.error('Error loading children:', error);
      return { locations: [], totalItems: 0, hasMore: false };
    }
  };

  // Function to update tree with loaded children (supports pagination)
  const updateTreeWithChildren = (tree: LocationNode[], parentId: string, children: LocationNode[], append: boolean = false, hasMore: boolean = false, offset: number = 0): LocationNode[] => {
    return tree.map(node => {
      if (node._id === parentId) {
        const existingChildren = append && node.children ? node.children : [];
        return {
          ...node,
          children: [...existingChildren, ...children],
          childrenLoaded: true,
          isLoadingChildren: false,
          isLeaf: children.length === 0 && !hasMore,
          childrenOffset: offset + children.length,
          hasMoreChildren: hasMore
        };
      } else if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: updateTreeWithChildren(node.children, parentId, children, append, hasMore, offset)
        };
      }
      return node;
    });
  };

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
      console.log(`Loading more root locations, offset: ${rootOffset}`);
      const response = await fetch(`/api/locations/tree?limit=50&offset=${rootOffset}`);
      if (response.ok) {
        const data = await response.json();
        const newLocations = data.locations || data;
        
        console.log(`Loaded ${newLocations.length} new locations, hasMore: ${data.hasMore}`);
        
        if (newLocations.length > 0) {
          setTree(prevTree => [...prevTree, ...newLocations]);
          setRootOffset(prev => prev + newLocations.length);
          setHasMoreRoot(data.hasMore || false);
        } else {
          setHasMoreRoot(false);
        }
      } else {
        console.error('Error loading more root locations:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading more root locations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [rootOffset, isLoadingMore, hasMoreRoot]);

  // Load location tree with pagination
  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true);
        setRootOffset(0);
        setHasMoreRoot(true);
        const response = await fetch('/api/locations/tree?limit=50&offset=0');
        if (response.ok) {
          const data = await response.json();
          setTree(data.locations || data);
          setRootOffset(data.locations?.length || 0);
          setHasMoreRoot(data.hasMore || false);
          // Don't auto-expand - let user control expansion
        }
      } catch (error) {
        console.error('Error loading location tree:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  // Infinite scroll effect
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
      
      console.log('Scroll debug:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isNearBottom,
        hasMoreRoot,
        isLoadingMore
      });

      if (isNearBottom && hasMoreRoot && !isLoadingMore) {
        console.log('Loading more root locations...');
        loadMoreRootLocations();
      }
    };

    // Add throttling to prevent excessive calls
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    scrollContainer.addEventListener('scroll', throttledHandleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', throttledHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [loadMoreRootLocations, hasMoreRoot, isLoadingMore]);

  // Function to load more children for pagination
  const loadMoreChildren = async (nodeId: string) => {
    const findNode = (nodes: LocationNode[], id: string): LocationNode | null => {
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
      setTree(prevTree => 
        prevTree.map(n => n._id === nodeId ? { ...n, isLoadingChildren: true } : n)
      );

      // Load more children
      const offset = node.childrenOffset || 0;
      const childrenData = await loadChildren(nodeId, offset, 50);
      const children = childrenData.locations || childrenData;
      const hasMore = childrenData.hasMore || false;
      
      // Update tree with additional children
      setTree(prevTree => updateTreeWithChildren(prevTree, nodeId, children, true, hasMore, offset));
    }
  };

  const toggleExpanded = async (nodeId: string) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);
    
    if (!isCurrentlyExpanded) {
      // Expanding - check if we need to load children
      const findNode = (nodes: LocationNode[], id: string): LocationNode | null => {
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
      if (node && node.hasChildren && !node.childrenLoaded && !node.isLoadingChildren) {
        // Mark as loading
        setTree(prevTree => 
          updateTreeWithChildren(prevTree, nodeId, [])
            .map(n => n._id === nodeId ? { ...n, isLoadingChildren: true } : n)
        );

        // Load children
        const childrenData = await loadChildren(nodeId);
        const children = childrenData.locations || childrenData;
        const hasMore = childrenData.hasMore || false;
        const offset = childrenData.offset || 0;
        
        // Update tree with loaded children
        setTree(prevTree => updateTreeWithChildren(prevTree, nodeId, children, false, hasMore, offset));
      }
    }

    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };


  const handleLocationEdit = (location: LocationNode, event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationEdit) {
      onLocationEdit(location, event);
    }
  };

  const handleLocationDelete = (location: LocationNode, event: React.MouseEvent) => {
    if (preventFormSubmit) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (onLocationDelete) {
      onLocationDelete(location, event);
    }
  };

  const handleLocationAdd = (parentLocation: LocationNode | undefined, event: React.MouseEvent) => {
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
      const response = await fetch(`/api/locations/${deleteModal.location._id}`, {
        method: 'DELETE',
      });

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
      console.error('Error deleting location:', error);
      toast.error(t("locations.deleteError"));
    }
  };

  const renderLocationNode = (node: LocationNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node._id);
    const isSelected = selectedLocationId === node._id;
    const hasChildren = node.children && node.children.length > 0;
    const hasMachines = showMachines && node.machines && node.machines.length > 0;
    const isLoadingChildren = node.isLoadingChildren;
    
    // Can expand if has children (loaded or available) or has machines
    const canExpand = hasChildren || hasMachines || node.hasChildren;

    return (
      <div key={node._id} className="select-none">
        {/* Mobile Card Layout */}
        <div className="block  mt-2">
          <div
            className={`bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2 hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[44px] touch-manipulation transition-colors ${
              isSelected ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700' : ''
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
                        ? 'hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                        : 'cursor-default opacity-50'
                    }`}
                    disabled={!canExpand || isLoadingChildren}
                    title={
                      isLoadingChildren
                        ? 'Loading children...'
                        : canExpand
                        ? isExpanded
                          ? 'Click to collapse'
                          : 'Click to expand and load children'
                        : 'No children to load'
                    }
                  >
                    {isLoadingChildren ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
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
                    {getIconComponent(node.icon) || (
                      isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      )
                    )}
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
                  {hasMachines && (
                    <div className="flex items-center">
                      <Wrench className="h-3 w-3 mr-1" />
                      <span>{node.machines.length}</span>
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
                    title={t('locations.addChild')}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t('locations.addChild')}</span>
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={(e) => handleLocationEdit(node, e)}
                    className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
                    title={t('common.edit')}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t('common.edit')}</span>
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="danger"
                    onClick={(e) => handleLocationDelete(node, e)}
                    className="px-2 py-1 text-xs min-h-[32px] touch-manipulation"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t('common.delete')}</span>
                  </FormButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Machines in this location - only show if showMachines is true */}
        {isExpanded && hasMachines && showMachines && (
          <div className="ml-2 sm:ml-4" onClick={(e) => e.stopPropagation()}>
            {/* Mobile Machine Cards */}
            <div className="block space-y-2">
              {node.machines.map((machine) => (
                <div
                  key={machine._id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] touch-manipulation"
                  onClick={(e) => handleMachineClick(machine, e)}
                  title={t('machines.clickToEdit')}
                >
                  <div className="flex items-start space-x-3">
                    <Wrench className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {machine.model.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {machine.model.manufacturer} {machine.model.brand} ({machine.model.year})
                      </div>
                      {machine.maintenanceRanges && machine.maintenanceRanges.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {machine.maintenanceRanges.map((range, index) => (
                            <span key={range._id}>
                              {range.name} - {range.type}
                              {index < machine.maintenanceRanges!.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                {node.children.map((child) => renderLocationNode(child, level + 1))}
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
                          Load more children ({node.childrenCount! - (node.childrenOffset || 0)} remaining)
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
            {t('locations.noLocations')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('locations.startAddingLocation')}
          </p>
        </div>
      ) : (
          <div 
            ref={scrollContainerRef} 
            className="overflow-y-auto max-h-auto"
          >
            {tree.map((node) => renderLocationNode(node))}
            
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
                  {t('common.loadMore')} ({rootOffset} loaded)
                </FormButton>
              </div>
            )}

            {/* Infinite scroll loading indicator */}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-4">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.loadingMore')}...
                </span>
              </div>
            )}
            
            {/* End of list indicator */}
            {!hasMoreRoot && tree.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                {t('common.endOfList')} ({tree.length} total)
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
        title={t('modals.deleteLocation')}
        message={t('modals.deleteLocationMessage')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        itemDetails={deleteModal.location ? {
          name: deleteModal.location.name,
          description: deleteModal.location.description || '',
        } : undefined}
      />
    </div>
  );
}
