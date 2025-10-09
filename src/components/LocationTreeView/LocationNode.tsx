"use client";

import { ChevronRight, ChevronDown, Folder, FolderOpen, Wrench } from "lucide-react";
import { FormButton } from "../Form";
import { Plus } from "lucide-react";
import { LocationNodeProps } from "./types";
import { iconMap } from "./constants";
import LocationActions from "./LocationActions";
import MachineList from "./MachineList";
import LoadingIndicator from "./LoadingIndicator";

export default function LocationNode({
  node,
  level,
  isExpanded,
  isSelected,
  showActions,
  showMachines,
  preventFormSubmit,
  onToggleExpanded,
  onLocationClick,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  onMachineClick,
  onLoadMoreChildren,
  onLoadMoreMachines,
  onMachineScroll,
}: LocationNodeProps) {

  const hasChildren = node.children && node.children.length > 0;
  const isLoadingChildren = node.isLoadingChildren;

  // Can expand if has children (loaded or available) or has machines
  const canExpand = hasChildren || node.hasMachines || node.hasChildren;

  const getIconComponent = (iconName?: string) => {
    if (!iconName || !iconMap[iconName as keyof typeof iconMap]) {
      return null;
    }
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return <IconComponent className="w-4 h-4" />;
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLocationClick) {
      onLocationClick(node);
    }
  };

  return (
    <div className="select-none">
      {/* Mobile Card Layout */}
      <div className="block mt-2">
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
                    onToggleExpanded(node._id);
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
                  onClick={handleLocationClick}
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
              <LocationActions
                node={node}
                onLocationEdit={onLocationEdit}
                onLocationDelete={onLocationDelete}
                onLocationAdd={onLocationAdd}
                preventFormSubmit={preventFormSubmit}
              />
            )}
          </div>
        </div>
      </div>

      {/* Machines in this location - only show if showMachines is true */}
      {isExpanded && showMachines && (node.hasMachines || node.isLoadingMachines) && node.machines.length > 0 && (
        <MachineList
          node={node}
          level={level}
          onMachineClick={onMachineClick}
          onMachineScroll={onMachineScroll}
        />
      )}

      {/* Children */}
      {isExpanded && (
        <div>
          {isLoadingChildren ? (
            <div className="ml-6 p-2 text-sm text-gray-500 dark:text-gray-400">
              <LoadingIndicator
                isLoading={true}
                message="Loading children..."
                size="sm"
                variant="inline"
              />
            </div>
          ) : hasChildren ? (
            <>
              {node.children.map((child) => (
                <LocationNode
                  key={child._id}
                  node={child}
                  level={level + 1}
                  isExpanded={false} // This will be managed by parent
                  isSelected={false} // This will be managed by parent
                  showActions={showActions}
                  showMachines={showMachines}
                  preventFormSubmit={preventFormSubmit}
                  onToggleExpanded={onToggleExpanded}
                  onLocationClick={onLocationClick}
                  onLocationEdit={onLocationEdit}
                  onLocationDelete={onLocationDelete}
                  onLocationAdd={onLocationAdd}
                  onMachineClick={onMachineClick}
                  onLoadMoreChildren={onLoadMoreChildren}
                  onLoadMoreMachines={onLoadMoreMachines}
                  onMachineScroll={onMachineScroll}
                />
              ))}
              {/* Load More Button */}
              {node.hasMoreChildren && (
                <div className="ml-6 p-2">
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => onLoadMoreChildren(node._id)}
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
                        {node.childrenCount! - (node.childrenOffset || 0)} remaining)
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
}
