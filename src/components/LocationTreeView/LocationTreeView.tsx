"use client";

import { useRef, useCallback } from "react";
import { MapPin, Plus } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { FormButton } from "../Form";
import { ConfirmationModal } from "../ConfirmationModal";
import { LocationTreeViewProps, LocationNode } from "./types";
import { useLocationTree } from "./hooks/useLocationTree";
import { useLocationActions } from "./hooks/useLocationActions";
import { useLocationPagination } from "./hooks/useLocationPagination";
import { useLocationSearch } from "./hooks/useLocationSearch";
import { useLocationInfiniteScroll, useLocationDataLoading } from "./hooks/useLocationInfiniteScroll";
import { useLocationExpansion } from "./hooks/useLocationExpansion";
import LocationNodeComponent from "./LocationNode";
import LoadingIndicator from "./LoadingIndicator";
import { PAGINATION_LIMITS } from "./constants";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Main tree state and operations
  const {
    tree,
    setTree,
    loading,
    setLoading,
    expandedNodes,
    setExpandedNodes,
    loadingMachinesRef,
    rootOffset,
    setRootOffset,
    hasMoreRoot,
    setHasMoreRoot,
    isLoadingMore,
    setIsLoadingMore,
    loadChildren,
    loadMachines,
    normalizeNode,
    updateTreeWithMachines,
    updateTreeWithChildren,
  } = useLocationTree();

  // Location actions (edit, delete, add)
  const {
    deleteModal,
    setDeleteModal,
    handleLocationEdit,
    handleLocationDelete,
    handleLocationAdd,
    handleMachineClick,
    handleDelete,
  } = useLocationActions();

  // Pagination and infinite scroll
  const { loadMoreChildren, loadMoreMachines, handleMachineScroll } = useLocationPagination(
    tree,
    setTree,
    loadChildren,
    loadMachines,
    updateTreeWithChildren,
    updateTreeWithMachines,
    normalizeNode,
    loadingMachinesRef
  );

  // Search functionality
  const { filterChildren } = useLocationSearch(showMachines);

  // Data loading
  useLocationDataLoading(
    refreshTrigger,
    searchQuery,
    setLoading,
    setRootOffset,
    setHasMoreRoot,
    setTree,
    setExpandedNodes,
    normalizeNode
  );

  // Infinite scroll for root locations
  const loadMoreRootLocations = useCallback(async () => {
    if (isLoadingMore || !hasMoreRoot) return;

    try {
      setIsLoadingMore(true);
      
      // Use search API if there's a search query, otherwise use regular tree API
      const apiUrl = searchQuery 
        ? `/api/locations/search-tree?search=${encodeURIComponent(searchQuery)}&limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=${rootOffset}`
        : `/api/locations/tree?limit=${PAGINATION_LIMITS.ROOT_LOCATIONS}&offset=${rootOffset}`;
        
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
  }, [isLoadingMore, hasMoreRoot, searchQuery, rootOffset, normalizeNode, setTree, setRootOffset, setHasMoreRoot, setExpandedNodes]);

  // Infinite scroll hook
  useLocationInfiniteScroll(
    scrollContainerRef,
    hasMoreRoot,
    isLoadingMore,
    loadMoreRootLocations
  );

  // Expansion functionality
  const { toggleExpanded } = useLocationExpansion(
    tree,
    setTree,
    expandedNodes,
    setExpandedNodes,
    loadChildren,
    loadMachines,
    updateTreeWithChildren,
    updateTreeWithMachines,
    normalizeNode,
    showMachines
  );

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <LoadingIndicator
          isLoading={true}
          variant="skeleton"
        />
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
            {filterChildren(tree, searchQuery).map((node) => (
              <LocationNodeComponent
                key={node._id}
                node={node}
                level={0}
                isExpanded={expandedNodes.has(node._id)}
                isSelected={selectedLocationId === node._id}
                showActions={showActions}
                showMachines={showMachines}
                preventFormSubmit={preventFormSubmit}
                onToggleExpanded={toggleExpanded}
                onLocationClick={onLocationClick}
                onLocationEdit={(location, event) => handleLocationEdit(location, event, onLocationEdit, preventFormSubmit)}
                onLocationDelete={(location, event) => handleLocationDelete(location, event, onLocationDelete, preventFormSubmit)}
                onLocationAdd={(parentLocation, event) => handleLocationAdd(parentLocation, event, onLocationAdd, preventFormSubmit)}
                onMachineClick={(machine, event) => handleMachineClick(machine, event, onMachineClick, preventFormSubmit)}
                onLoadMoreChildren={loadMoreChildren}
                onLoadMoreMachines={loadMoreMachines}
                onMachineScroll={handleMachineScroll}
              />
            ))}

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
              <LoadingIndicator
                isLoading={true}
                message={t("common.loadingMore") + "..."}
                size="md"
              />
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
