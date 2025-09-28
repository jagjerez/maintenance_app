"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import BulkDeleteModal from "@/components/BulkDeleteModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import { machineCreateSchema } from "@/lib/validations";
import LocationTreeView from "@/components/LocationTreeView";
import MultiSelect from "@/components/MultiSelect";
import OperationsDisplay from "@/components/OperationsDisplay";
import { IOperation } from "@/models/Operation";
import { formatDateSafe } from "@/lib/utils";

interface Operation {
  _id: string;
  internalCode: string;
  name: string;
  description: string;
  type: "text" | "date" | "time" | "datetime" | "boolean" | "number";
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  description: string;
  type: 'preventive' | 'corrective';
  operations: Operation[];
}

interface Machine {
  _id: string;
  name: string;
  manufacturer: string;
  brand: string;
  year: number;
  location: string;
  locationId?: string;
  description?: string;
  operations?: Operation[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MachinesPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    _id: string;
    name: string;
    path: string;
  } | null>(null);
  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");
  const [selectedMaintenanceRanges, setSelectedMaintenanceRanges] = useState<
    string[]
  >([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<'preventive' | 'corrective' | ''>('');
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms delay

  const ITEMS_PER_PAGE = 10;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(machineCreateSchema),
    defaultValues: {
      properties: {},
    },
  });

  // Custom properties handlers
  const addCustomProperty = () => {
    if (newPropertyKey.trim() && newPropertyValue.trim()) {
      const currentProperties = watch("properties") || {};
      setValue("properties", {
        ...currentProperties,
        [newPropertyKey.trim()]: newPropertyValue.trim(),
      });
      setNewPropertyKey("");
      setNewPropertyValue("");
    }
  };

  const removeCustomProperty = (key: string) => {
    const currentProperties = watch("properties") || {};
    const newProperties = { ...currentProperties };
    delete newProperties[key];
    setValue("properties", newProperties);
  };

  // Update form values when selectedLocation changes
  useEffect(() => {
    if (selectedLocation) {
      setValue("location", selectedLocation.path);
      setValue("locationId", selectedLocation._id);
    }
  }, [selectedLocation, setValue]);


  // Update operations field when selectedOperations changes
  useEffect(() => {
    setValue("operations", selectedOperations);
  }, [selectedOperations, setValue]);

  // Fetch machines with pagination and search
  const fetchMachines = useCallback(
    async (page = 1, search = "") => {
      try {
        setIsSearching(true);
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
        const response = await fetch(
          `/api/machines?page=${page}&limit=${ITEMS_PER_PAGE}${searchParam}`
        );
        if (response.ok) {
          const data = await response.json();
          setMachines(data.machines || data);
          setTotalPages(
            data.totalPages ||
              Math.ceil((data.machines || data).length / ITEMS_PER_PAGE)
          );
          setTotalItems(data.totalItems || (data.machines || data).length);
        } else {
          toast.error(t("machines.machineLoadError"));
        }
      } catch (error) {
        console.error("Error fetching machines:", error);
        toast.error(t("machines.machineLoadError"));
      } finally {
        setIsSearching(false);
      }
    },
    [t]
  );


  // Fetch operations
  const fetchOperations = useCallback(async () => {
    try {
      const response = await fetch("/api/operations?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data);
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      toast.error(t("operations.operationError"));
    }
  }, [t]);

  const handleEdit = useCallback(
    (machine: Machine) => {
      setEditingMachine(machine);

      // Set form values using setValue
      setValue("name", machine.name);
      setValue("manufacturer", machine.manufacturer);
      setValue("brand", machine.brand);
      setValue("year", machine.year);
      setValue("location", machine.location);
      setValue("locationId", machine.locationId || "");
      setValue("description", machine.description || "");
      setValue("properties", machine.properties);

      // Set default maintenance type
      setSelectedMaintenanceType('preventive');

      // Set selected operations
      const operationIds =
        machine.operations?.map((operation) => operation._id) || [];
      setSelectedOperations(operationIds);

      // Set selected location if machine has locationId
      if (machine.locationId) {
        setSelectedLocation({
          _id: machine.locationId,
          name: machine.location,
          path: machine.location,
        });
      } else {
        setSelectedLocation(null);
      }

      setShowModal(true);
    },
    [setValue]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMachines(currentPage, debouncedSearchQuery),
        fetchOperations(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearchQuery]);

  const onSubmit = async (data: {
    name: string;
    manufacturer: string;
    brand: string;
    year: number;
    location: string;
    locationId?: string;
    description?: string;
    operations?: string[];
    properties: Record<string, unknown>;
  }) => {
    try {
      const url = editingMachine ? `/api/machines/${editingMachine._id}` : "/api/machines";
      const method = editingMachine ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (editingMachine) {
          toast.success(t("machines.machineUpdated"));
        } else {
          toast.success(t("machines.machineCreated"));
        }
        setShowModal(false);
        setEditingMachine(null);
        reset();
        setSelectedLocation(null);
        setSelectedOperations([]);
        setSelectedMaintenanceType('');
        await fetchMachines(currentPage, debouncedSearchQuery);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error saving machine:", error);
      toast.error(t("machines.machineError"));
    }
  };

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
        toast.success(t("machines.machineDeleted"));
        setShowDeleteModal(false);
        setMachineToDelete(null);
        await fetchMachines(currentPage, debouncedSearchQuery);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast.error(t("machines.machineError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleBulkDelete = async () => {
    if (selectedMachines.length === 0) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch("/api/machines/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          machineIds: selectedMachines.map((machine) => machine._id),
        }),
      });

      if (response.ok) {
        toast.success(t("machines.machineDeleted"));
        setShowBulkDeleteModal(false);
        setSelectedMachines([]);
        await fetchMachines(currentPage, debouncedSearchQuery);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error bulk deleting machines:", error);
      toast.error(t("machines.machineError"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleNewMachine = () => {
    setEditingMachine(null);
    reset();
    setSelectedLocation(null);
    setSelectedMaintenanceRanges([]);
    setSelectedOperations([]);
    setSelectedMaintenanceType('');
    setShowModal(true);
  };


  const columns = [
    {
      key: "name",
      label: t("machines.machineName"),
      render: (machine: Machine) => (
        <div className="flex items-center space-x-3">
          <Wrench className="h-5 w-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {machine.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {machine.manufacturer} {machine.brand} ({machine.year})
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: t("machines.location"),
      render: (machine: Machine) => (
        <span className="text-gray-900 dark:text-white">{machine.location}</span>
      ),
    },
    {
      key: "createdAt",
      label: t("common.createdAt"),
      render: (machine: Machine) => (
        <span className="text-gray-500 dark:text-gray-400">
          {formatDateSafe(machine.createdAt)}
        </span>
      ),
    },
  ];

  const actions = [
    {
      label: t("common.edit"),
      onClick: handleEdit,
      className: "text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300",
    },
    {
      label: t("common.delete"),
      onClick: handleDelete,
      className: "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("machines.title")}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t("machines.subtitle")}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("common.search")}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {selectedMachines.length > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                  >
                    {t("common.deleteSelected")} ({selectedMachines.length})
                  </button>
                )}
                <button
                  onClick={handleNewMachine}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("machines.addMachine")}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            {machines.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t("machines.noMachines")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("machines.startAddingMachine")}
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleNewMachine}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("machines.addMachine")}
                  </button>
                </div>
              </div>
            ) : (
              <DataTable
                data={machines}
                columns={columns}
                actions={actions}
                selectedItems={selectedMachines}
                onSelectionChange={setSelectedMachines}
                loading={isSearching}
              />
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Machine Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMachine(null);
          reset();
          setSelectedLocation(null);
          setSelectedOperations([]);
          setSelectedMaintenanceType('');
        }}
        title={editingMachine ? t("machines.editMachine") : t("machines.addMachine")}
        size="lg"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup>
              <FormLabel htmlFor="name">{t("machines.machineName")} *</FormLabel>
              <FormInput
                id="name"
                {...register("name")}
                placeholder={t("placeholders.machineName")}
                error={errors.name?.message}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="manufacturer">{t("common.manufacturer")} *</FormLabel>
              <FormInput
                id="manufacturer"
                {...register("manufacturer")}
                placeholder={t("placeholders.manufacturerName")}
                error={errors.manufacturer?.message}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="brand">{t("common.brand")} *</FormLabel>
              <FormInput
                id="brand"
                {...register("brand")}
                placeholder={t("placeholders.manufacturerBrand")}
                error={errors.brand?.message}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="year">{t("common.year")} *</FormLabel>
              <FormInput
                id="year"
                type="number"
                {...register("year", { valueAsNumber: true })}
                placeholder={t("placeholders.manufacturingYear")}
                error={errors.year?.message}
              />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel htmlFor="location">{t("machines.location")} *</FormLabel>
            <div className="flex space-x-2">
              <FormInput
                id="location"
                {...register("location")}
                placeholder={t("placeholders.machineLocation")}
                error={errors.location?.message}
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowLocationSelector(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                {t("common.select")}
              </button>
            </div>
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="description">{t("machines.description")}</FormLabel>
            <FormInput
              id="description"
              {...register("description")}
              placeholder={t("placeholders.machineDescription")}
              error={errors.description?.message}
            />
          </FormGroup>


          {selectedMaintenanceType === 'preventive' && (
            <FormGroup>
              <FormLabel>{t("machines.operations")}</FormLabel>
              <MultiSelect
                options={operations.map((operation) => ({
                  value: operation._id,
                  label: operation.name,
                }))}
                selectedValues={selectedOperations}
                onChange={setSelectedOperations}
                placeholder={t("machines.selectOperations")}
                error={errors.operations?.message}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("machines.operations")}
              </p>
            </FormGroup>
          )}

          {selectedMaintenanceType === 'corrective' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t("machines.correctiveMaintenance")}
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>{t("machines.correctiveMaintenanceDescription")}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingMachine(null);
                reset();
                setSelectedLocation(null);
                setSelectedOperations([]);
                setSelectedMaintenanceType('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              {t("common.cancel")}
            </button>
            <FormButton
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? t("common.saving") : editingMachine ? t("common.update") : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Location Selector Modal */}
      <Modal
        isOpen={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        title={t("machines.location")}
        size="lg"
      >
        <LocationTreeView
          onLocationSelect={(location) => {
            setSelectedLocation(location);
            setShowLocationSelector(false);
          }}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("machines.deleteMachine")}
        message={t("modals.deleteMachineMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        type="danger"
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        itemType={t("machines.machine")}
        itemCount={selectedMachines.length}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}