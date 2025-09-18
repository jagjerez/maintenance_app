"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { Plus, ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
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

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  brand: string;
  year: number;
}

interface Operation {
  _id: string;
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
  operations: Operation[];
}

interface Machine {
  _id: string;
  model: MachineModel;
  location: string;
  locationId?: string;
  description?: string;
  maintenanceRanges?: MaintenanceRange[];
  operations?: Operation[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MachinesPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState<
    MaintenanceRange[]
  >([]);
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

  // Update maintenanceRanges field when selectedMaintenanceRanges changes
  useEffect(() => {
    setValue("maintenanceRanges", selectedMaintenanceRanges);
  }, [selectedMaintenanceRanges, setValue]);

  // Update operations field when selectedOperations changes
  useEffect(() => {
    setValue("operations", selectedOperations);
  }, [selectedOperations, setValue]);

  // Fetch machines with pagination
  const fetchMachines = useCallback(
    async (page = 1) => {
      try {
        const response = await fetch(
          `/api/machines?page=${page}&limit=${ITEMS_PER_PAGE}`
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
      }
    },
    [t]
  );

  // Fetch machine models
  const fetchMachineModels = useCallback(async () => {
    try {
      const response = await fetch("/api/machine-models");
      if (response.ok) {
        const data = await response.json();
        setMachineModels(data.machineModels || data);
      } else {
        toast.error(t("machineModels.modelError"));
      }
    } catch (error) {
      console.error("Error fetching machine models:", error);
      toast.error(t("machineModels.modelError"));
    }
  }, [t]);

  // Fetch maintenance ranges
  const fetchMaintenanceRanges = useCallback(async () => {
    try {
      const response = await fetch("/api/maintenance-ranges?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setMaintenanceRanges(data.maintenanceRanges || data);
      } else {
        toast.error(t("maintenanceRanges.rangeError"));
      }
    } catch (error) {
      console.error("Error fetching maintenance ranges:", error);
      toast.error(t("maintenanceRanges.rangeError"));
    }
  }, [t]);

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
      setValue("model", machine.model._id);
      setValue("location", machine.location);
      setValue("locationId", machine.locationId || "");
      setValue("description", machine.description || "");
      setValue("properties", machine.properties);

      // Set selected maintenance ranges
      const rangeIds =
        machine.maintenanceRanges?.map((range) => range._id) || [];
      setSelectedMaintenanceRanges(rangeIds);

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

  // Load full machine data and open edit modal
  const loadMachineForEdit = useCallback(
    async (machineId: string) => {
      try {
        const response = await fetch(`/api/machines/${machineId}`);
        if (response.ok) {
          const fullMachine = await response.json();
          handleEdit(fullMachine);
          setShowLocationSelector(false);
        } else {
          toast.error(t("machines.machineLoadError"));
        }
      } catch (error) {
        console.error("Error loading machine:", error);
        toast.error(t("machines.machineLoadError"));
      }
    },
    [t, handleEdit]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMachines(currentPage),
        fetchMachineModels(),
        fetchMaintenanceRanges(),
        fetchOperations(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [
    currentPage,
    fetchMachines,
    fetchMachineModels,
    fetchMaintenanceRanges,
    fetchOperations,
  ]);

  // Check if we should open the modal automatically (from dashboard)
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowModal(true);
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    } else if (searchParams.get("edit")) {
      const machineId = searchParams.get("edit");
      if (machineId && !loading && machineModels.length > 0) {
        loadMachineForEdit(machineId);
        // Clean up the URL parameter
        const url = new URL(window.location.href);
        url.searchParams.delete("edit");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams, loading, machineModels.length, loadMachineForEdit]);

  const onSubmit = async (data: {
    model: string;
    location: string;
    locationId?: string;
    description?: string;
    maintenanceRanges?: string[];
    operations?: string[];
    properties: Record<string, unknown>;
  }) => {
    try {
      if (!selectedLocation) {
        toast.error(t("machines.locationRequired"));
        return;
      }

      const url = editingMachine
        ? `/api/machines/${editingMachine._id}`
        : "/api/machines";
      const method = editingMachine ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          maintenanceRanges: selectedMaintenanceRanges,
          operations: selectedOperations,
        }),
      });

      if (response.ok) {
        toast.success(
          editingMachine
            ? t("machines.machineUpdated")
            : t("machines.machineCreated")
        );
        await fetchMachines(currentPage);
        setShowModal(false);
        setEditingMachine(null);
        setSelectedLocation(null);
        setShowLocationSelector(false);
        setSelectedMaintenanceRanges([]);
        setSelectedOperations([]);
        reset();
      } else {
        const error = await response.json();
        if (error.error === "duplicateModelLocation") {
          toast.error(t("machines.duplicateModelLocation"));
        } else if (error.error === "duplicateMaintenanceRangeType") {
          toast.error(t("machines.duplicateMaintenanceRangeType"));
        } else {
          toast.error(error.error || t("machines.machineError"));
        }
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
        await fetchMachines(currentPage);
      } else {
        toast.error(t("machines.machineError"));
      }
    } catch (error) {
      console.error("Error deleting machine:", error);
      toast.error(t("machines.machineError"));
    } finally {
      setShowDeleteModal(false);
      setMachineToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: "model" as keyof Machine,
      label: t("machines.machineModel"),
      render: (value: Machine[keyof Machine]) => {
        const model = value as Machine["model"];
        if (!model || typeof model === "string") {
          return model || "-";
        }
        return `${model.name} - ${model.manufacturer} ${model.brand} (${model.year})`;
      },
    },
    {
      key: "location" as keyof Machine,
      label: t("machines.location"),
    },
    {
      key: "maintenanceRanges" as keyof Machine,
      label: t("machines.maintenanceRanges"),
      render: (value: Machine[keyof Machine]) => {
        const ranges = value as Machine["maintenanceRanges"];
        if (!ranges || !Array.isArray(ranges)) {
          return "-";
        }
        return ranges
          .map((range) => {
            if (typeof range === "string") {
              return range;
            }
            return range?.name || "-";
          })
          .join(", ");
      },
      hideOnMobile: true,
    },
    {
      key: "createdAt" as keyof Machine,
      label: t("common.createdAt"),
      render: (value: Machine[keyof Machine]) =>
        formatDateSafe(value as string),
      hideOnMobile: true,
    },
  ];

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
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t("machines.title")}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t("machines.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMachine(null);
              setSelectedLocation(null);
              setShowLocationSelector(false);
              setSelectedMaintenanceRanges([]);
              setSelectedOperations([]);
              reset();
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center px-4 py-3 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">{t("machines.newMachine")}</span>
          </button>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("machines.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machines}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
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

      {/* Add/Edit Machine Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMachine(null);
          setSelectedLocation(null);
          setShowLocationSelector(false);
          setSelectedMaintenanceRanges([]);
          setSelectedOperations([]);
          reset();
        }}
        title={
          editingMachine ? t("machines.editMachine") : t("machines.newMachine")
        }
        size="xl"
      >
        <Form
          onSubmit={(e) => {
            handleSubmit(onSubmit)(e);
          }}
        >
          {/* Campos ocultos para valores del formulario */}
          <input type="hidden" {...register("locationId")} />
          <input type="hidden" {...register("maintenanceRanges")} />
          <input type="hidden" {...register("operations")} />

          <FormGroup>
            <FormLabel required>{t("machines.machineModel")}</FormLabel>
            <FormSelect
              {...register("model")}
              error={errors.model?.message}
              disabled={!!editingMachine}
            >
              <option value="">{t("machines.selectModel")}</option>
              {Array.isArray(machineModels) &&
                machineModels.map((model) => (
                  <option key={model._id} value={model._id}>
                    {model.name} - {model.manufacturer} {model.brand} (
                    {model.year})
                  </option>
                ))}
            </FormSelect>
            {editingMachine && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("machines.modelCannotBeChanged")}
              </p>
            )}
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("machines.location")}</FormLabel>
            <div className="space-y-2">
              <div className="flex">
                <input
                  type="text"
                  value={selectedLocation ? selectedLocation.path : ""}
                  placeholder={t("placeholders.machineLocation")}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowLocationSelector(!showLocationSelector)}
                  className="px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {showLocationSelector ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {selectedLocation && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedLocation.path}
                </div>
              )}
              {showLocationSelector && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 h-auto">
                  <LocationTreeView
                    onLocationEdit={() => {
                      // Handle location edit - could navigate to locations page
                    }}
                    onLocationDelete={() => {
                      // Handle location delete - could show confirmation
                    }}
                    onLocationAdd={() => {
                      // Handle location add - could navigate to locations page
                    }}
                    showActions={false}
                    showMachines={false}
                    preventFormSubmit={true}
                    className=""
                    refreshTrigger={0}
                  />
                </div>
              )}
            </div>
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("machines.description")}</FormLabel>
            <FormInput
              {...register("description")}
              error={errors.description?.message}
              placeholder={t("placeholders.machineDescription")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("machines.maintenanceRanges")}</FormLabel>
            <MultiSelect
              options={
                Array.isArray(maintenanceRanges)
                  ? maintenanceRanges.map((range) => ({
                      value: range._id,
                      label: range.name,
                      description: range.description,
                    }))
                  : []
              }
              selectedValues={selectedMaintenanceRanges}
              onChange={setSelectedMaintenanceRanges}
              placeholder={t("machines.selectMaintenanceRanges")}
              hideSelected={true}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("machines.operations")}</FormLabel>
            <MultiSelect
              options={
                Array.isArray(operations)
                  ? operations
                      .filter(
                        (operation) =>
                          !maintenanceRanges
                            .filter((range) =>
                              selectedMaintenanceRanges.includes(range._id)
                            )
                            .some((range) =>
                              range.operations?.some(
                                (op) => op._id === operation._id
                              )
                            )
                      )
                      .map((operation) => ({
                        value: operation._id,
                        label: operation.name,
                        description: operation.description,
                      }))
                  : []
              }
              selectedValues={selectedOperations}
              onChange={setSelectedOperations}
              placeholder={t("machines.selectOperations")}
              hideSelected={true}
            />

            {/* Operations */}
            {(selectedOperations.length > 0 ||
              selectedMaintenanceRanges.length > 0) &&
              (() => {
                const machine = machines;
                if (!machine) return null;

                const automaticOperations: IOperation[] = [];
                const operationIds = new Set<string>();

                // Add operations from all maintenance ranges of the machine
                maintenanceRanges
                  .filter((range) =>
                    selectedMaintenanceRanges.includes(range._id)
                  )
                  .forEach((range) => {
                    if (range.operations) {
                      range.operations.forEach((operation) => {
                        if (
                          operation &&
                          operation._id &&
                          !operationIds.has(operation._id)
                        ) {
                          operationIds.add(operation._id);
                          automaticOperations.push(operation);
                        }
                      });
                    }
                  });

                // Add operations directly from machine
                operations
                  .filter((op) => selectedOperations.includes(op._id))
                  .forEach((operation) => {
                    if (
                      operation &&
                      operation._id &&
                      !operationIds.has(operation._id)
                    ) {
                      operationIds.add(operation._id);
                      automaticOperations.push(operation);
                    }
                  });

                return (
                  <div className="mt-4">
                    <OperationsDisplay
                      operations={operations.filter((op) =>
                        selectedOperations.includes(op._id)
                      )}
                      maintenanceRanges={maintenanceRanges.filter((range) =>
                        selectedMaintenanceRanges.includes(range._id)
                      )}
                      title={t("machines.selectedOperations")}
                      showOrder={false}
                      showMaintenanceRanges={true}
                    />
                  </div>
                );
              })()}
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("machines.customProperties")}</FormLabel>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t("machines.customPropertiesDescription")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FormInput
                  placeholder={t("placeholders.propertyKey")}
                  value={newPropertyKey}
                  onChange={(e) => setNewPropertyKey(e.target.value)}
                />
                <FormInput
                  placeholder={t("placeholders.propertyValue")}
                  value={newPropertyValue}
                  onChange={(e) => setNewPropertyValue(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addCustomProperty}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {t("machines.addProperty")}
                </button>
              </div>
              {Object.keys(watch("properties") || {}).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(watch("properties") || {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                      >
                        <span className="text-sm">
                          <strong>{key}:</strong> {String(value)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCustomProperty(key)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          {t("common.remove")}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingMachine(null);
                setSelectedLocation(null);
                setShowLocationSelector(false);
                setSelectedMaintenanceRanges([]);
                setSelectedOperations([]);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common.saving")
                : editingMachine
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
        message={t("modals.deleteMachineMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          machineToDelete
            ? {
                name:
                  machineToDelete.model &&
                  typeof machineToDelete.model === "object"
                    ? machineToDelete.model.name
                    : machineToDelete.model || "Unknown",
                description:
                  machineToDelete.model &&
                  typeof machineToDelete.model === "object"
                    ? `${machineToDelete.model.manufacturer} ${machineToDelete.model.brand} - ${machineToDelete.location}`
                    : machineToDelete.location,
              }
            : undefined
        }
      />
    </div>
  );
}
