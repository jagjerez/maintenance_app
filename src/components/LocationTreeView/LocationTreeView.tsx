"use client";

import { useRef } from "react";
import { MapPin, Plus } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { FormButton } from "../Form";
import { ConfirmationModal } from "../ConfirmationModal";
import { LocationTreeViewProps, LocationNode } from "./types";
import { useLocationActions } from "./hooks/useLocationActions";
import { useLocationSearch } from "./hooks/useLocationSearch";
import { useLocationInfiniteScroll } from "./hooks/useLocationInfiniteScroll";
import LocationNodeComponent from "./LocationNode";
import LoadingIndicator from "./LoadingIndicator";

export default function LocationTreeView({
  onLocationClick,
  onLocationEdit,
  onLocationDelete,
  onLocationAdd,
  onMachineClick,
  selectedLocationId,
  showActions = true,
  className = "",
  showMachines = false,
  preventFormSubmit = false,
  // Data props instead of internal API calls
  tree = [],
  loading = false,
  expandedNodes = new Set(),
  onToggleExpanded,
  onLoadMoreChildren,
  onLoadMoreMachines,
  onMachineScroll,
  hasMoreRoot = false,
  isLoadingMore = false,
  onLoadMoreRoot,
}: LocationTreeViewProps) {
  const { t } = useTranslations();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Search functionality
  const { filterChildren } = useLocationSearch(showMachines);

  // Infinite scroll hook
  useLocationInfiniteScroll(
    scrollContainerRef,
    hasMoreRoot,
    isLoadingMore,
    onLoadMoreRoot || (() => {})
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
              {t("locations.noLocations")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("locations.startAddingLocation")}
            </p>
          </div>
        ) : (
          <div ref={scrollContainerRef} className="overflow-y-auto max-h-auto">
            {filterChildren(tree, "").map((node) => (
              <LocationNodeComponent
                key={node._id}
                node={node}
                level={0}
                isExpanded={expandedNodes.has(node._id)}
                isSelected={selectedLocationId === node._id}
                showActions={showActions}
                showMachines={showMachines}
                preventFormSubmit={preventFormSubmit}
                expandedNodes={expandedNodes}
                onToggleExpanded={onToggleExpanded || (() => {})}
                onLocationClick={onLocationClick}
                onLocationEdit={(location, event) => handleLocationEdit(location, event, onLocationEdit, preventFormSubmit)}
                onLocationDelete={(location, event) => handleLocationDelete(location, event, onLocationDelete, preventFormSubmit)}
                onLocationAdd={(parentLocation, event) => handleLocationAdd(parentLocation, event, onLocationAdd, preventFormSubmit)}
                onMachineClick={(machine, event) => handleMachineClick(machine, event, onMachineClick, preventFormSubmit)}
                onLoadMoreChildren={onLoadMoreChildren || (() => {})}
                onLoadMoreMachines={onLoadMoreMachines || (() => {})}
                onMachineScroll={onMachineScroll || (() => {})}
              />
            ))}

            {/* Load more button */}
            {hasMoreRoot && !isLoadingMore && onLoadMoreRoot && (
              <div className="flex justify-center py-4">
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={onLoadMoreRoot}
                  className="px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("common.loadMore")}
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
