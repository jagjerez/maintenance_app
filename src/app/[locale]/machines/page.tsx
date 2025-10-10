"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/hooks/useTranslations";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import BulkDeleteModal from "@/components/BulkDeleteModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import SearchInput from "@/components/SearchInput";
import SearchableSelectWithAdd from "@/components/SearchableSelectWithAdd";
import LocationTreeSelect from "@/components/LocationTreeSelect";

// Schema according to PlantUML structure
import { formatDateSafe } from "@/lib/utils";
import { machineSchema } from "@/lib/validations";

// Type definitions
interface Machine {
  _id: string;
  internalCode: string;
  description: string;
  brand: string;
  model: string;
  series: string;
  category: string;
  locationId?: string;
  rootId?: string;
  characteristics: Record<string, string>;
  state: 'active' | 'inactive' | 'maintenance' | 'retired';
  deletedAt?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}



const ITEMS_PER_PAGE = 10;

export default function MachinesPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [characteristics, setCharacteristics] = useState<Record<string, string>>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});
  const [locationNamesLoaded, setLocationNamesLoaded] = useState(false);
  const [resolvedLocations, setResolvedLocations] = useState<Record<string, string>>({});

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      description: "",
      brand: "",
      model: "",
      series: "",
      category: "",
      locationId: "",
      characteristics: {},
      state: "active",
    },
  });

  // Data fetching functions
  const fetchMachines = useCallback(
    async (page = 1, search = "", signal?: AbortSignal) => {
      try {
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
        const response = await fetch(
          `/api/machines?page=${page}&limit=${ITEMS_PER_PAGE}${searchParam}`,
          { signal }
        );
        if (response.ok) {
          const data = await response.json();
          const machines = data.machines || data;
          setMachines(machines);
          setTotalPages(
            data.totalPages ||
              Math.ceil(machines.length / ITEMS_PER_PAGE)
          );
          setTotalItems(data.totalItems || machines.length);
          
          // Load location names for display
          await loadLocationNames();
        } else {
          toast.error(t("machines.machineLoadError"));
        }
      } catch (error) {
        // Don't show error if request was aborted
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error("Error fetching machines:", error);
        toast.error(t("machines.machineLoadError"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  // Function to resolve location name from ID
  const resolveLocationName = useCallback(async (locationId: string): Promise<string> => {
    if (!locationId || locationId === "null" || locationId === "undefined") {
      return "-";
    }

    // First check if we already have it in our map
    if (locationNames[locationId]) {
      return locationNames[locationId];
    }

    // If not found, try to fetch it directly
    try {
      const response = await fetch(`/api/locations/${locationId}`);
      if (response.ok) {
        const location = await response.json();
        
        // Build the full path
        let fullPath = location.name;
        if (location.path && location.path !== `/${location.name}`) {
          fullPath = location.path;
        }
        
        // Update our map for future use
        setLocationNames(prev => ({
          ...prev,
          [locationId]: fullPath
        }));
        
        return fullPath;
      }
    } catch (error) {
      console.error("Error resolving location:", error);
    }

    return "-";
  }, [locationNames]);

  // Fetch location names for display
  const loadLocationNames = useCallback(async () => {
    try {
      const response = await fetch('/api/locations/tree');
      if (response.ok) {
        const data = await response.json();
        const locations = data.locations || [];
        
        // Create a flat map of all locations with their names
        const locationMap: Record<string, string> = {};
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const flattenLocations = (locations: any[], parentPath = '') => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          locations.forEach((location: any) => {
            const fullPath = parentPath ? `${parentPath}/${location.name}` : location.name;
            locationMap[location._id] = fullPath;
            
            if (location.children && location.children.length > 0) {
              flattenLocations(location.children, fullPath);
            }
          });
        };
        
        flattenLocations(locations);
        setLocationNames(locationMap);
        setLocationNamesLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching location names:", error);
    }
  }, []);


  // Load data on component mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load location names first
        await loadLocationNames();
        // Then load machines
        await fetchMachines(currentPage, searchQuery);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPage, fetchMachines, searchQuery, loadLocationNames]);


  // Form submission
  const onSubmit = async (data: {
    description: string;
    brand: string;
    model: string;
    series: string;
    category: string;
    locationId?: string | null;
    rootId?: string | null;
    characteristics: Record<string, string>;
    state: string;
  }) => {
    try {
      
      const formValues = {
        description: data.description,
        brand: data.brand,
        model: data.model,
        series: data.series,
        category: data.category,
        locationId: data.locationId,
        rootId: selectedRootId,
        characteristics: data.characteristics,
        state: data.state,
      };
      
      const url = editingMachine ? `/api/machines/${editingMachine._id}` : "/api/machines";
      const method = editingMachine ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      if (response.ok) {
        await response.json();
        
        await fetchMachines(currentPage, searchQuery);
        setShowModal(false);
        setEditingMachine(null);
        reset();
        setSelectedCategory(null);
        setSelectedLocation(null);
        toast.success(
          editingMachine
            ? t("machines.machineUpdated")
            : t("machines.machineCreated")
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error saving machine:", error);
      toast.error(t("machines.machineError"));
    }
  };

  // Edit handler
  const handleEdit = useCallback((machine: Machine) => {
    setEditingMachine(machine);
    reset({
      description: machine.description,
      brand: machine.brand,
      model: machine.model,
      series: machine.series,
      category: machine.category,
      locationId: machine.locationId || "",
      characteristics: machine.characteristics || {},
      state: machine.state,
    });
    
    // Set characteristics and selections
    setCharacteristics(machine.characteristics || {});
    setSelectedCategory(machine.category || null);
    setSelectedLocation(machine.locationId || null);
    setSelectedRootId(machine.rootId || null);
    
    setShowModal(true);
  }, [reset]);

  // Handle edit parameter from URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    console.log('Edit ID from URL:', editId);
    console.log('Machines loaded:', machines.length);
    console.log('Loading state:', loading);
    
    if (editId && !loading) {
      const machineToEdit = machines.find(machine => machine._id === editId);
      console.log('Machine found in current list:', machineToEdit);
      
      if (machineToEdit) {
        console.log('Opening edit modal for machine:', machineToEdit.description);
        handleEdit(machineToEdit);
        // Clean up the URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('edit');
        router.replace(newUrl.pathname + newUrl.search);
      } else {
        console.log('Machine not found in current list, fetching specific machine...');
        // Fetch the specific machine data
        const fetchSpecificMachine = async () => {
          try {
            const response = await fetch(`/api/machines/${editId}`);
            if (response.ok) {
              const machineData = await response.json();
              console.log('Fetched machine data:', machineData);
              handleEdit(machineData);
              // Clean up the URL parameter
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('edit');
              router.replace(newUrl.pathname + newUrl.search);
            } else {
              console.error('Failed to fetch machine:', response.statusText);
              toast.error(t("machines.machineLoadError"));
            }
          } catch (error) {
            console.error('Error fetching specific machine:', error);
            toast.error(t("machines.machineLoadError"));
          }
        };
        
        fetchSpecificMachine();
      }
    }
  }, [searchParams, machines, router, handleEdit, loading, t]);

  // Delete handlers
  const handleDelete = (machine: Machine) => {
    setMachineToDelete(machine);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!machineToDelete) return;

    try {
      const response = await fetch(`/api/machines/${machineToDelete._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchMachines(currentPage, searchQuery);
        toast.success(t("machines.machineDeleted"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast.error(t("machines.machineError"));
    } finally {
      setShowDeleteModal(false);
      setMachineToDelete(null);
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedMachines.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const response = await fetch('/api/machines/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedMachines.map(machine => machine._id)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || t("machines.machineDeleted"));
        await fetchMachines(currentPage, searchQuery);
        setSelectedMachines([]);
        setShowBulkDeleteModal(false);
      } else {
        const error = await response.json();
        toast.error(error.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error bulk deleting machines:", error);
      toast.error(t("machines.machineError"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = useCallback((query: string, signal?: AbortSignal) => {
    const previousQuery = searchQuery;
    setSearchQuery(query);
    
    // Only reset to page 1 if the search query actually changed
    if (query !== previousQuery) {
      setCurrentPage(1);
      fetchMachines(1, query, signal);
    }
  }, [fetchMachines, searchQuery]);


  // Characteristics handlers
  const addCharacteristic = () => {
    const newKey = `new_characteristic_${Date.now()}`;
    const updatedCharacteristics = { ...characteristics, [newKey]: "" };
    setCharacteristics(updatedCharacteristics);
    setValue("characteristics", updatedCharacteristics);
  };

  const updateCharacteristic = (key: string, value: string) => {
    const updatedCharacteristics = { ...characteristics, [key]: value };
    setCharacteristics(updatedCharacteristics);
    setValue("characteristics", updatedCharacteristics);
  };

  const removeCharacteristic = (key: string) => {
    const updatedCharacteristics = { ...characteristics };
    delete updatedCharacteristics[key];
    setCharacteristics(updatedCharacteristics);
    setValue("characteristics", updatedCharacteristics);
  };

  // Table configuration
  const columns = [
    {
      key: "description" as keyof Machine,
      label: t("machines.description"),
    },
    {
      key: "brand" as keyof Machine,
      label: t("machines.brand"),
    },
    {
      key: "model" as keyof Machine,
      label: t("machines.model"),
    },
    {
      key: "series" as keyof Machine,
      label: t("machines.series"),
    },
    {
      key: "category" as keyof Machine,
      label: t("machines.category"),
    },
    {
      key: "locationId" as keyof Machine,
      label: t("machines.location"),
      render: (value: unknown) => {
        const locationId = String(value || "");
        
        if (!locationNamesLoaded) {
          return "Loading...";
        }
        
        if (!locationId || locationId === "null" || locationId === "undefined") {
          return "-";
        }
        
        // Check if we have it in our resolved locations
        if (resolvedLocations[locationId]) {
          return resolvedLocations[locationId];
        }
        
        // Check if we have it in our location names map
        if (locationNames[locationId]) {
          return locationNames[locationId];
        }
        
        // If not found, trigger async resolution
        if (locationId && !resolvedLocations[locationId]) {
          resolveLocationName(locationId).then(resolvedName => {
            setResolvedLocations(prev => ({
              ...prev,
              [locationId]: resolvedName
            }));
          });
          return "Resolving...";
        }
        
        return "-";
      },
    },
    {
      key: "state" as keyof Machine,
      label: t("machines.state"),
    },
    {
      key: "createdAt" as keyof Machine,
      label: t("common.createdAt"),
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];


  // Loading state
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("machines.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("machines.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMachine(null);
              reset({
                description: "",
                brand: "",
                model: "",
                series: "",
                category: "",
                locationId: "",
                rootId: "",
                characteristics: {},
                state: "active",
              });
              setCharacteristics({});
              setEditingKeys({});
              setSelectedCategory(null);
              setSelectedLocation(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("machines.addMachine")}
          </button>
        </div>
      </div>

      {/* Search and Item Count */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("machines.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
        
        {/* Search Input */}
        <div className="flex items-center space-x-2">
          <SearchInput
            placeholder={t("common.search")}
            value={searchQuery}
            onSearch={handleSearch}
            onSearchingChange={setIsSearching}
            delay={500}
            className="w-full sm:w-64 px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          {isSearching && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machines}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={(items) => {
              setSelectedMachines(items);
              setShowBulkDeleteModal(true);
            }}
            enableBulkDelete={true}
            selectedItems={selectedMachines}
            onSelectionChange={setSelectedMachines}
          />
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        className="mt-6"
      />

      {/* Add/Edit Machine Modal - Mobile First Design */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMachine(null);
          reset();
          setCharacteristics({});
          setEditingKeys({});
          setSelectedCategory(null);
          setSelectedLocation(null);
        }}
        title={
          editingMachine
            ? t("machines.editMachine")
            : t("machines.addMachine")
        }
        size="xl"
        className="max-h-[95vh] overflow-hidden"
      >
        <div className="max-h-[calc(95vh-6rem)]">
          <Form onSubmit={handleSubmit(onSubmit)}>
            {/* Mobile-First Form Layout - Single Column Always */}
            <div className="space-y-6">
              {/* Machine Information Card */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Wrench className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  {t("machines.machine")} {t("common.information")}
                </h3>
                
                <div className="space-y-4">

                  <FormGroup>
                    <FormLabel required>{t("machines.description")}</FormLabel>
                    <FormInput
                      {...register("description")}
                      error={errors.description?.message}
                      placeholder={t("placeholders.machineDescription")}
                      className="text-base"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>{t("machines.brand")}</FormLabel>
                    <FormInput
                      {...register("brand")}
                      error={errors.brand?.message}
                      placeholder={t("placeholders.brand")}
                      className="text-base"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>{t("machines.model")}</FormLabel>
                    <FormInput
                      {...register("model")}
                      error={errors.model?.message}
                      placeholder={t("placeholders.model")}
                      className="text-base"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>{t("machines.series")}</FormLabel>
                    <FormInput
                      {...register("series")}
                      error={errors.series?.message}
                      placeholder={t("placeholders.series")}
                      className="text-base"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>{t("machines.category")}</FormLabel>
                    <SearchableSelectWithAdd
                      value={selectedCategory}
                      onChange={(value) => {
                        setSelectedCategory(value);
                        setValue("category", value || "");
                      }}
                      fetchOptions={async (search, offset, limit) => {
                        try {
                          const response = await fetch(`/api/machines/categories`);
                          if (response.ok) {
                            const data = await response.json();
                            const categories = data.categories || [];
                            const filtered = search 
                              ? categories.filter((cat: string) => 
                                  cat.toLowerCase().includes(search.toLowerCase())
                                )
                              : categories;
                            
                            return {
                              options: filtered.slice(offset, offset + limit).map((cat: string) => ({
                                _id: cat,
                                name: cat,
                              })),
                              hasMore: offset + limit < filtered.length,
                              totalItems: filtered.length,
                            };
                          }
                          return { options: [], hasMore: false };
                        } catch (error) {
                          console.error("Error fetching categories:", error);
                          return { options: [], hasMore: false };
                        }
                      }}
                      placeholder={t("placeholders.category")}
                      addNewText={t("common.addNew")}
                      error={errors.category?.message}
                      className="text-base"
                      searchable={true}
                      clearable={true}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{t("machines.location")}</FormLabel>
                    {/* Hidden input for form registration */}
                    <input
                      type="hidden"
                      {...register("locationId")}
                    />
                    <LocationTreeSelect
                      value={selectedLocation}
                      onChange={(value, option, rootId) => {
                        setSelectedLocation(value);
                        setSelectedRootId(rootId || null);
                        setValue("locationId", value || "");
                      }}
                      placeholder={t("placeholders.location")}
                      error={errors.locationId?.message}
                      className="text-base"
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel required>{t("machines.state")}</FormLabel>
                    <div className="relative">
                      <select
                        {...register("state")}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base min-h-[48px] appearance-none cursor-pointer bg-white dark:bg-gray-700"
                      >
                        <option value="active">{t("machines.active")}</option>
                        <option value="inactive">{t("machines.inactive")}</option>
                        <option value="maintenance">{t("machines.maintenance")}</option>
                        <option value="retired">{t("machines.retired")}</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </FormGroup>
                </div>
              </div>

              {/* Characteristics Section - Mobile First */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                    <Plus className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                    {t("machines.characteristics")}
                  </h3>
                  <button
                    type="button"
                    onClick={addCharacteristic}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("machines.addCharacteristic")}
                  </button>
                </div>

                {Object.keys(characteristics).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Wrench className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                    <p className="text-sm font-medium">{t("machines.noCharacteristics")}</p>
                    <p className="text-xs mt-1">Toca el botón de arriba para agregar una</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(characteristics).map(([key, value], index) => (
                      <div key={`${key}-${index}`} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        {/* Characteristic Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {index + 1}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {t("machines.characteristic")} {index + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCharacteristic(key)}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                            title={t("common.remove")}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Characteristic Fields */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              {t("machines.characteristicCode")} *
                            </label>
                            <input
                              type="text"
                              value={editingKeys[key] !== undefined ? editingKeys[key] : key}
                              onChange={(e) => {
                                setEditingKeys(prev => ({
                                  ...prev,
                                  [key]: e.target.value
                                }));
                              }}
                              onBlur={(e) => {
                                const newKey = e.target.value.trim();
                                if (newKey && newKey !== key) {
                                  const newCharacteristics = { ...characteristics };
                                  delete newCharacteristics[key];
                                  newCharacteristics[newKey] = value;
                                  setCharacteristics(newCharacteristics);
                                  setValue("characteristics", newCharacteristics);
                                }
                                // Clear the editing state
                                setEditingKeys(prev => {
                                  const newEditingKeys = { ...prev };
                                  delete newEditingKeys[key];
                                  return newEditingKeys;
                                });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base min-h-[48px]"
                              placeholder={t("placeholders.characteristicCode")}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              {t("machines.characteristicValue")} *
                            </label>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateCharacteristic(key, e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base min-h-[48px]"
                              placeholder={t("placeholders.characteristicValue")}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions - Mobile First */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 mt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col gap-3">
                <FormButton 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t("common.saving")}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Wrench className="h-5 w-5 mr-2" />
                      {editingMachine ? t("common.update") : t("common.create")}
                    </div>
                  )}
                </FormButton>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditingMachine(null);
                    reset();
                    setCharacteristics({});
                    setEditingKeys({});
                  }}
                  className="w-full min-h-[48px] text-base font-medium border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                >
                  {t("common.cancel")}
                </FormButton>
              </div>
            </div>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("modals.confirmDeletion")}
        message={t("modals.deleteMachineMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          machineToDelete
            ? {
                name: machineToDelete.internalCode,
                description: `${machineToDelete.brand} ${machineToDelete.model} - ${machineToDelete.description}`,
              }
            : undefined
        }
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        selectedCount={selectedMachines.length}
        itemType={t("machines.title")}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}