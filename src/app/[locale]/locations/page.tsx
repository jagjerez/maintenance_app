"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, MapPin, Folder, Building, Factory, Warehouse, Home, Store, Truck, Wrench, Building2, Landmark } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import BulkDeleteModal from "@/components/BulkDeleteModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormSelect,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import { locationSchema } from "@/lib/validations";
import LocationTreeView from "@/components/LocationTreeView";

const ITEMS_PER_PAGE = 10;

const iconOptions = [
  { value: '', label: 'No Icon', icon: null },
  // Building category
  { value: 'building', label: 'Building', icon: Building },
  { value: 'building2', label: 'Building Complex', icon: Building2 },
  { value: 'home', label: 'House/Home', icon: Home },
  // Company category
  { value: 'factory', label: 'Factory', icon: Factory },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { value: 'store', label: 'Store/Shop', icon: Store },
  { value: 'landmark', label: 'Company Landmark', icon: Landmark },
  // Structure category
  { value: 'wrench', label: 'Workshop/Station', icon: Wrench },
  { value: 'folder', label: 'Department/Section', icon: Folder },
  // Physical Location category
  { value: 'map-pin', label: 'Physical Location', icon: MapPin },
  { value: 'truck', label: 'Loading/Transport Area', icon: Truck },
];

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
    type: "preventive" | "corrective";
  };
  location: string;
}

interface Location {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  path: string;
  level: number;
  isLeaf: boolean;
  parentId?: string;
  machines: Machine[];
  children: Location[];
}

export default function LocationsPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [parentLocations, setParentLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "tree">("tree");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms delay

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(locationSchema),
  });

  // Fetch all locations for list view
  const fetchLocations = useCallback(async (page = 1, search = "") => {
    try {
      setIsSearching(true);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const response = await fetch(
        `/api/locations?page=${page}&limit=${ITEMS_PER_PAGE}${searchParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || data);
        setTotalPages(
          data.totalPages ||
            Math.ceil((data.locations || data).length / ITEMS_PER_PAGE)
        );
        setTotalItems(data.totalItems || (data.locations || data).length);
      } else {
        toast.error(t("locations.locationLoadError"));
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error(t("locations.locationLoadError"));
    } finally {
      setIsSearching(false);
    }
  }, [t]);

  // Fetch all locations for parent selection (optimized - only get root locations for dropdown)
  const fetchAllLocations = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/locations?rootOnly=true&limit=100"
      );
      if (response.ok) {
        const data = await response.json();
        setParentLocations(data.locations || data);
      } else {
        toast.error(t("locations.locationLoadError"));
      }
    } catch (error) {
      console.error("Error fetching all locations:", error);
      toast.error(t("locations.locationLoadError"));
    }
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLocations(currentPage, debouncedSearchQuery), fetchAllLocations()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, debouncedSearchQuery, fetchLocations, fetchAllLocations]);

  const onSubmit = async (data: {
    name: string;
    description?: string;
    icon?: string;
    parentId?: string | null;
  }) => {
    try {
      const url = editingLocation
        ? `/api/locations/${editingLocation._id}`
        : "/api/locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(
          editingLocation
            ? t("locations.locationUpdated")
            : t("locations.locationCreated")
        );
        await fetchLocations(currentPage, debouncedSearchQuery);
        await fetchAllLocations();
        setRefreshTrigger((prev) => prev + 1); // Trigger tree refresh
        setShowModal(false);
        setEditingLocation(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || t("locations.locationError"));
      }
    } catch (error) {
      console.error("Error saving location:", error);
      toast.error(t("locations.locationError"));
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    reset({
      name: location.name,
      description: location.description || "",
      icon: location.icon || "",
      parentId: location.parentId || "",
    });
    setShowModal(true);
  };

  const handleDelete = (location: Location) => {
    setLocationToDelete(location);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;

    try {
      const response = await fetch(`/api/locations/${locationToDelete._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("locations.locationDeleted"));
        await fetchLocations(currentPage, debouncedSearchQuery);
        await fetchAllLocations();
        setRefreshTrigger((prev) => prev + 1); // Trigger tree refresh
      } else {
        const error = await response.json();
        if (error.machinesCount) {
          toast.error(t("locations.cannotDeleteWithMachines"));
        } else if (error.childrenCount) {
          toast.error(t("locations.cannotDeleteWithChildren"));
        } else {
          toast.error(error.message || t("locations.locationError"));
        }
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error(t("locations.locationError"));
    } finally {
      setShowDeleteModal(false);
      setLocationToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleBulkDelete = async () => {
    if (selectedLocations.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const response = await fetch('/api/locations/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedLocations.map(location => location._id)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        await fetchLocations(currentPage, debouncedSearchQuery);
        await fetchAllLocations();
        setRefreshTrigger((prev) => prev + 1);
        setSelectedLocations([]);
        setShowBulkDeleteModal(false);
      } else {
        const error = await response.json();
        if (error.error === 'Cannot delete locations that have children') {
          toast.error(t("locations.cannotDeleteWithChildren"));
        } else if (error.error === 'Cannot delete locations that have machines') {
          toast.error(t("locations.cannotDeleteWithMachines"));
        } else {
          toast.error(error.error || t("locations.locationError"));
        }
      }
    } catch (error) {
      console.error("Error bulk deleting locations:", error);
      toast.error(t("locations.locationError"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const getIconComponent = (iconName?: string) => {
    const option = iconOptions.find(opt => opt.value === iconName);
    if (!option || !option.icon) return null;
    const IconComponent = option.icon;
    return <IconComponent className="w-4 h-4" />;
  };

  const columns = [
    {
      key: "name" as keyof Location,
      label: t("locations.locationName"),
      render: (value: unknown, item: Location) => (
        <div className="flex items-center space-x-2">
          {getIconComponent(item.icon)}
          <span>{value as string}</span>
        </div>
      ),
    },
    {
      key: "description" as keyof Location,
      label: t("locations.description"),
      render: (value: unknown) => (value as string) || "-",
    },
    {
      key: "path" as keyof Location,
      label: t("locations.path"),
    },
    {
      key: "level" as keyof Location,
      label: t("locations.level"),
    },
  ];

  const handleLocationEdit = (location: Location) => {
    handleEdit(location);
  };

  const handleLocationDelete = (location: Location) => {
    handleDelete(location);
  };

  const handleLocationAdd = (parentLocation?: Location) => {
    setEditingLocation(null);
    reset({
      name: "",
      description: "",
      icon: "",
      parentId: parentLocation?._id || "",
    });
    setShowModal(true);
  };

  const handleMachineClick = (machine: Machine) => {
    // Navigate to machines page with edit parameter
    router.push(`/machines?edit=${machine._id}`);
  };

  // Clear search when switching view modes
  const handleViewModeChange = (mode: "list" | "tree") => {
    setViewMode(mode);
    setSearchQuery(""); // Clear search when switching views
    setCurrentPage(1); // Reset to first page
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 sm:w-64 mb-2 animate-pulse"></div>
              <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 sm:w-96 animate-pulse"></div>
            </div>
            <div className="h-10 sm:h-11 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Item Count Indicator Skeleton */}
        <div className="mb-4 sm:mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
            <div className="animate-pulse">
              {/* Mobile view skeleton */}
              <div className="block space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 sm:p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="flex flex-col items-end space-y-1 ml-2">
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("locations.title")}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t("locations.subtitle")}
        </p>
      </div>

      {/* Header with Add Button and View Toggle */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => handleViewModeChange("tree")}
              className={`flex-1 sm:flex-col px-3 py-2 text-sm font-medium rounded-l-md border min-h-[44px] touch-manipulation ${
                viewMode === "tree"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              <Folder className="h-4 w-4 mx-auto sm:mx-0" />
            </button>
            <button
              onClick={() => handleViewModeChange("list")}
              className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b min-h-[44px] touch-manipulation ${
                viewMode === "list"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              }`}
            >
              <MapPin className="h-4 w-4 mx-auto sm:mx-0" />
            </button>
          </div>

          <FormButton
            onClick={() => handleLocationAdd()}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">{t("locations.newLocation")}</span>
          </FormButton>
        </div>
      </div>

      {/* Search and Item Count */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("locations.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
        
        {/* Search Input - Show in both views */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="w-full sm:w-64 px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {isSearching && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === "tree" ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <LocationTreeView
              onLocationEdit={(location) => handleLocationEdit(location)}
              onLocationDelete={(location) => handleLocationDelete(location)}
              onLocationAdd={(parentLocation) => handleLocationAdd(parentLocation)}
              onMachineClick={(machine) => handleMachineClick(machine)}
              showActions={true}
              showMachines={true}
              refreshTrigger={refreshTrigger}
              searchQuery={debouncedSearchQuery}
              className=""
            />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <DataTable
              data={locations}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onBulkDelete={(items) => {
                setSelectedLocations(items);
                setShowBulkDeleteModal(true);
              }}
              enableBulkDelete={true}
              selectedItems={selectedLocations}
              onSelectionChange={setSelectedLocations}
            />
          </div>
        </div>
      )}

      {/* Pagination for list view */}
      {viewMode === "list" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          itemsPerPage={10}
          className="mt-6"
        />
      )}

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingLocation(null);
          reset();
        }}
        title={
          editingLocation
            ? t("locations.editLocation")
            : t("locations.newLocation")
        }
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>{t("locations.locationName")}</FormLabel>
            <FormInput
              {...register("name")}
              error={errors.name?.message}
              placeholder={t("placeholders.locationName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("locations.description")}</FormLabel>
            <FormTextarea
              {...register("description")}
              error={errors.description?.message}
              placeholder={t("placeholders.locationDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("locations.icon")}</FormLabel>
            <FormSelect
              {...register("icon")}
              error={errors.icon?.message}
            >
              {iconOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("locations.parentLocation")}</FormLabel>
            <FormSelect
              {...register("parentId")}
              error={errors.parentId?.message}
            >
              <option value="">{t("locations.selectParentLocation")}</option>
              {parentLocations.map((location) => (
                <option key={location._id} value={location._id}>
                  {"  ".repeat(location.level)}
                  {location.name}
                </option>
              ))}
            </FormSelect>
          </FormGroup>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingLocation(null);
                reset();
              }}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting
                ? t("common.saving")
                : editingLocation
                ? t("common.update")
                : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("modals.confirmDeletion")}
        message={t("modals.deleteLocationMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          locationToDelete
            ? {
                name: locationToDelete.name,
                description: locationToDelete.description || "",
              }
            : undefined
        }
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        selectedCount={selectedLocations.length}
        itemType={t("locations.title")}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
