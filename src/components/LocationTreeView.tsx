'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, MapPin, Wrench, Plus, Edit, Trash2, Folder, FolderOpen } from 'lucide-react';
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
  maintenanceRange?: {
    _id: string;
    name: string;
    type: 'preventive' | 'corrective';
  };
  location: string;
}

interface LocationNode {
  _id: string;
  name: string;
  description?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  machines: Machine[];
  children: LocationNode[];
}

interface LocationTreeViewProps {
  onLocationSelect?: (location: LocationNode) => void;
  onMachineSelect?: (machine: Machine) => void;
  onLocationEdit?: (location: LocationNode) => void;
  onLocationDelete?: (location: LocationNode) => void;
  onLocationAdd?: (parentLocation?: LocationNode) => void;
  selectedLocationId?: string;
  selectedMachineId?: string;
  showActions?: boolean;
  className?: string;
  refreshTrigger?: number; // Add this to trigger refresh
}

export default function LocationTreeView({
  onLocationSelect,
  onMachineSelect,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  selectedLocationId,
  selectedMachineId,
  showActions = true,
  className = '',
  refreshTrigger,
}: LocationTreeViewProps) {
  const { t } = useTranslations();
  const [tree, setTree] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    location: LocationNode | null;
  }>({ isOpen: false, location: null });

  // Load location tree
  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/locations/tree');
        if (response.ok) {
          const data = await response.json();
          setTree(data);
          // Auto-expand first level
          if (data.length > 0) {
            setExpandedNodes(new Set(data.map((node: LocationNode) => node._id)));
          }
        }
      } catch (error) {
        console.error('Error loading location tree:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTree();
  }, [refreshTrigger]); // Add refreshTrigger as dependency

  const toggleExpanded = (nodeId: string) => {
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

  const handleLocationClick = (location: LocationNode) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleMachineClick = (machine: Machine) => {
    if (onMachineSelect) {
      onMachineSelect(machine);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.location || !onLocationDelete) return;

    try {
      const response = await fetch(`/api/locations/${deleteModal.location._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t("locations.deleteSuccess"));
        onLocationDelete(deleteModal.location);
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
    const hasMachines = node.machines && node.machines.length > 0;

    return (
      <div key={node._id} className="select-none">
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpanded(node._id)}
            className="mr-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            disabled={!hasChildren && !hasMachines}
          >
            {hasChildren || hasMachines ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          {/* Location Icon */}
          <div className="mr-2">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Folder className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </div>

          {/* Location Name */}
          <div
            className="flex-1 flex items-center"
            onClick={() => handleLocationClick(node)}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {node.name}
            </span>
            {node.description && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                - {node.description}
              </span>
            )}
          </div>

          {/* Machine Count */}
          {hasMachines && (
            <div className="flex items-center mr-2 text-xs text-gray-500 dark:text-gray-400">
              <Wrench className="h-3 w-3 mr-1" />
              <span>{node.machines.length}</span>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex items-center space-x-1">
              <FormButton
                type="button"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onLocationAdd) onLocationAdd(node);
                }}
                className="p-1 text-xs"
                title={t('locations.addChild')}
              >
                <Plus className="h-3 w-3" />
              </FormButton>
              <FormButton
                type="button"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onLocationEdit) onLocationEdit(node);
                }}
                className="p-1 text-xs"
                title={t('common.edit')}
              >
                <Edit className="h-3 w-3" />
              </FormButton>
              <FormButton
                type="button"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModal({ isOpen: true, location: node });
                }}
                className="p-1 text-xs"
                title={t('common.delete')}
              >
                <Trash2 className="h-3 w-3" />
              </FormButton>
            </div>
          )}
        </div>

        {/* Machines in this location */}
        {isExpanded && hasMachines && (
          <div className="ml-4">
            {node.machines.map((machine) => (
              <div
                key={machine._id}
                className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedMachineId === machine._id ? 'bg-green-100 dark:bg-green-900' : ''
                }`}
                style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                onClick={() => handleMachineClick(machine)}
              >
                <Wrench className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {machine.model.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {machine.model.manufacturer} {machine.model.brand} ({machine.model.year})
                  </div>
                  {machine.maintenanceRange && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {machine.maintenanceRange.name} - {machine.maintenanceRange.type}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderLocationNode(child, level + 1))}
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
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
          <div className="max-h-96 overflow-y-auto">
            {tree.map((node) => renderLocationNode(node))}
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
