"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/hooks/useTranslations";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import Modal from "@/components/Modal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormSelect,
  FormButton,
} from "@/components/Form";
import MultiSelect from "@/components/MultiSelect";
import DynamicProperties from "@/components/DynamicProperties";
import LocationTreeView from "@/components/LocationTreeView";
import { workOrderSchema, WorkOrderInput } from "@/lib/validations";
import { IOperation } from "@/models/Operation";

interface Location {
  _id: string;
  name: string;
  description?: string;
}

interface Machine {
  _id: string;
  location: string;
  locationId: string;
  model: {
    name: string;
    manufacturer: string;
  };
  operations?: IOperation[];
  maintenanceRanges?: Array<{
    _id: string;
    name: string;
    type: "preventive" | "corrective";
    operations: IOperation[];
  }>;
}

interface WorkOrder {
  _id: string;
  customCode?: string;
  machines: Machine[];
  location: Location;
  workOrderLocation: Location;
  type: "preventive" | "corrective";
  status: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  maintenanceDescriptionPerMachine?: Record<string, string>;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  operations: IOperation[];
  labor: Array<{
    operatorName: string;
    startTime: string;
    endTime?: string;
    isActive: boolean;
  }>;
  materials: Array<{
    description: string;
    unitType: string;
    quantity: number;
    unit: string;
  }>;
  images: Array<{
    url: string;
    filename: string;
    uploadedAt: string;
    uploadedBy?: string;
  }>;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderInput) => Promise<void>;
  editingWorkOrder: WorkOrder | null;
  machines: Machine[];
  operations: IOperation[];
  companyId?: string;
  isSubmitting?: boolean;
}

export default function WorkOrderFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingWorkOrder,
  machines,
  operations,
  companyId,
  isSubmitting = false,
}: WorkOrderFormModalProps) {
  const { t } = useTranslations();
  const [workOrderType, setWorkOrderType] = useState<string>("");
  const [selectedWorkOrderLocation, setSelectedWorkOrderLocation] =
    useState<string>("");
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [workOrderOperations, setWorkOrderOperations] = useState<IOperation[]>(
    []
  );
  const [customProperties, setCustomProperties] = useState<
    Record<string, unknown>
  >({});
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [
    maintenanceDescriptionPerMachine,
    setMaintenanceDescriptionPerMachine,
  ] = useState<Record<string, string>>({});
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedLocationDisplay, setSelectedLocationDisplay] = useState<{
    _id: string;
    name: string;
    path: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(workOrderSchema),
  });

  const resetForm = useCallback(
    (isCreateMode = true) => {
      setWorkOrderType("");
      setSelectedWorkOrderLocation("");
      setSelectedMachines([]);
      setSelectedOperations([]);
      setWorkOrderOperations([]);
      setCustomProperties({});
      setAvailableMachines([]);
      setMaintenanceDescriptionPerMachine({});
      setShowLocationSelector(false);
      setSelectedLocationDisplay(null);
      // Clear all form values
      setValue("machines", []);
      setValue("operations", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
      setValue("maintenanceDescriptionPerMachine", {});
      setValue("type", "");
      setValue("customCode", "");
      setValue("description", "");
      setValue("maintenanceDescription", "");
      setValue("completedDate", "");
      setValue("assignedTo", "");
      setValue("notes", "");

      // Set default values only in create mode
      if (isCreateMode) {
        const today = new Date().toISOString().split("T")[0];
        setValue("scheduledDate", today);
        setValue("status", "pending");
      } else {
        setValue("scheduledDate", "");
        setValue("status", "pending");
      }
    },
    [setValue]
  );

  // Initialize state when editing a work order
  useEffect(() => {
    if (editingWorkOrder) {
      const machineIds = editingWorkOrder.machines?.map((m) => m._id) || [];
      const operationIds =
        editingWorkOrder.operations?.map((op) => op._id) || [];

      setWorkOrderType(editingWorkOrder.type);
      setSelectedWorkOrderLocation(
        editingWorkOrder.workOrderLocation?._id || ""
      );
      setSelectedMachines(machineIds);
      setSelectedOperations(operationIds);
      setCustomProperties(editingWorkOrder.properties || {});
      setMaintenanceDescriptionPerMachine(
        editingWorkOrder.maintenanceDescriptionPerMachine || {}
      );
      setWorkOrderOperations(editingWorkOrder.operations || []);

      // Set available machines for the work order location
      let availableMachinesList: Machine[] = [];

      if (editingWorkOrder.workOrderLocation) {
        // Get machines from the work order location
        const locationMachines = machines.filter(
          (machine) =>
            machine.locationId === editingWorkOrder.workOrderLocation._id
        );
        availableMachinesList = locationMachines;
      }

      // Always include machines that are already assigned to this work order
      const assignedMachines = machines.filter((machine) =>
        machineIds.includes(machine._id)
      );

      // Combine location machines with assigned machines, removing duplicates
      const combinedMachines: Machine[] = [...availableMachinesList];
      assignedMachines.forEach((assignedMachine) => {
        if (!combinedMachines.some((m) => m._id === assignedMachine._id)) {
          combinedMachines.push(assignedMachine);
        }
      });

      setAvailableMachines(combinedMachines);

      // Set selected location for display
      if (editingWorkOrder.workOrderLocation) {
        setSelectedLocationDisplay({
          _id: editingWorkOrder.workOrderLocation._id,
          name: editingWorkOrder.workOrderLocation.name,
          path: editingWorkOrder.workOrderLocation.name,
        });
      } else {
        setSelectedLocationDisplay(null);
      }

      // Reset form with work order data
      reset({
        customCode: editingWorkOrder.customCode || "",
        type: editingWorkOrder.type,
        status: editingWorkOrder.status,
        description: editingWorkOrder.description,
        maintenanceDescription: editingWorkOrder.maintenanceDescription || "",
        scheduledDate: editingWorkOrder.scheduledDate
          ? editingWorkOrder.scheduledDate.split("T")[0]
          : "",
        completedDate: editingWorkOrder.completedDate
          ? editingWorkOrder.completedDate.split("T")[0]
          : "",
        assignedTo: editingWorkOrder.assignedTo || "",
        notes: editingWorkOrder.notes || "",
        location: editingWorkOrder.location?._id || "",
        workOrderLocation: editingWorkOrder.workOrderLocation?._id || "",
        machines: machineIds,
        operations: operationIds,
        maintenanceDescriptionPerMachine:
          editingWorkOrder.maintenanceDescriptionPerMachine || {},
      });
    } else {
      // Reset form for new work order
      resetForm(true);
    }
  }, [editingWorkOrder, machines, reset, resetForm]);

  // Watch the type field to enable/disable form
  const watchedType = watch("type");

  // Sync selectedLocation with selectedWorkOrderLocation
  useEffect(() => {
    if (selectedWorkOrderLocation) {
      const locationMachines = machines.filter(
        (machine) => machine.locationId === selectedWorkOrderLocation
      );
      setAvailableMachines(locationMachines);
      // Update the location field for validation
      setValue("location", selectedWorkOrderLocation);
      setValue("workOrderLocation", selectedWorkOrderLocation);
      // Clear selected machines when location changes
      setSelectedMachines([]);
      setValue("machines", []);
      // Clear operations when machines change
      setSelectedOperations([]);
      setValue("operations", []);
      setWorkOrderOperations([]);
      // Clear maintenance descriptions per machine
      setMaintenanceDescriptionPerMachine({});
    } else {
      setAvailableMachines([]);
      setSelectedMachines([]);
      setValue("machines", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
    }
  }, [selectedWorkOrderLocation, machines, setValue]);

  // Handle machine selection changes and work order type
  useEffect(() => {
    if (selectedMachines.length > 0 && workOrderType) {
      // Get operations from selected machines based on work order type
      const machineOperations: IOperation[] = [];
      const operationIds = new Set<string>(); // To track unique operation IDs

      selectedMachines.forEach((machineId) => {
        const machine = availableMachines.find((m) => m?._id === machineId);

        // First, add operations from maintenance ranges that match the work order type
        if (machine?.maintenanceRanges) {
          machine.maintenanceRanges.forEach((range) => {
            // Only include maintenance ranges that match the work order type
            if (range?.type === workOrderType && range?.operations) {
              range.operations.forEach((operation) => {
                if (
                  operation &&
                  operation._id &&
                  !operationIds.has(operation._id)
                ) {
                  operationIds.add(operation._id);
                  machineOperations.push(operation);
                }
              });
            }
          });
        }

        // Then, add operations directly from machine ONLY if they don't already exist
        if (machine?.operations) {
          machine.operations.forEach((operation) => {
            if (
              operation &&
              operation._id &&
              !operationIds.has(operation._id)
            ) {
              operationIds.add(operation._id);
              machineOperations.push(operation);
            }
          });
        }
      });

      setWorkOrderOperations(machineOperations);
    } else if (!editingWorkOrder) {
      // Only clear operations if not in edit mode
      setWorkOrderOperations([]);
    }
  }, [selectedMachines, availableMachines, workOrderType, editingWorkOrder]);

  // Update workOrderType when form type changes
  useEffect(() => {
    if (watchedType !== workOrderType) {
      setWorkOrderType(watchedType || "");
    }
  }, [watchedType, workOrderType]);

  // Reset operations and machines when type changes (only in create mode)
  useEffect(() => {
    if (workOrderType && !editingWorkOrder) {
      setWorkOrderOperations([]);
      setSelectedOperations([]);
      setSelectedMachines([]);
      setSelectedWorkOrderLocation("");
      setMaintenanceDescriptionPerMachine({});
      // Clear form values
      setValue("machines", []);
      setValue("operations", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
    }
  }, [workOrderType, editingWorkOrder, setValue]);

  // Use watchedType for form control instead of workOrderType
  // In edit mode, don't disable the form
  const isFormDisabled = !watchedType && !editingWorkOrder;

  // Check if work order is completed and should be read-only
  const isReadOnly = editingWorkOrder?.status === "completed";

  // Check if work order has maintenance data
  const hasMaintenanceData = (workOrder: WorkOrder) => {
    return (
      (workOrder.labor?.length || 0) > 0 ||
      (workOrder.materials?.length || 0) > 0 ||
      (workOrder.images?.length || 0) > 0
    );
  };

  // Check if machines can be changed
  const canChangeMachines = (workOrder: WorkOrder) => {
    return !hasMaintenanceData(workOrder) && workOrder.status !== "completed";
  };

  const handleRemoveOperation = (operationId: string) => {
    setSelectedOperations(
      selectedOperations.filter((id) => id !== operationId)
    );
  };

  const getOperationTypeLabel = (type: string) => {
    // Handle undefined, null, or empty types
    if (!type || type === "undefined" || type === "null") {
      return "Unknown";
    }

    const translationKey = `operations.types.${type}`;
    const translation = t(translationKey);
    // If translation is the same as the key, it means the translation doesn't exist
    if (translation === translationKey) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    return translation;
  };

  const handleFormSubmit = async (data: WorkOrderInput) => {
    await onSubmit({
      ...data,
      location: selectedWorkOrderLocation,
      workOrderLocation: selectedWorkOrderLocation,
      machines: selectedMachines,
      operations: selectedOperations,
      maintenanceDescriptionPerMachine,
      properties: customProperties,
      companyId: companyId || "",
    });
  };

  const handleClose = () => {
    reset();
    resetForm(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        editingWorkOrder
          ? t("workOrders.editWorkOrder")
          : t("workOrders.newWorkOrder")
      }
      size="xl"
    >
      
      <Form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Campo oculto para companyId */}
        <input
          type="hidden"
          {...register("companyId")}
          value={companyId || ""}
        />

        {/* Campo oculto para location */}
        <input type="hidden" {...register("location")} />

        {/* Work Order Information Section (solo en edición) */}
        {editingWorkOrder && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t("workOrders.workOrderInformation")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("workOrders.workOrderId")}
                </label>
                <input
                  type="text"
                  value={editingWorkOrder._id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("workOrders.workOrderCode")}
                </label>
                <input
                  type="text"
                  value={editingWorkOrder.customCode || "N/A"}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("workOrders.workOrderType")}
                </label>
                <input
                  type="text"
                  value={
                    editingWorkOrder.type === "preventive"
                      ? t("workOrders.preventive")
                      : t("workOrders.corrective")
                  }
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("workOrders.workOrderLocationInfo")}
                </label>
                <input
                  type="text"
                  value={
                    editingWorkOrder.workOrderLocation?.name ||
                    editingWorkOrder.location?.name ||
                    "Unknown Location"
                  }
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
              </div>
            </div>

            {/* Hidden fields for form submission */}
            <input type="hidden" value={editingWorkOrder._id} />
            <input
              type="hidden"
              {...register("customCode")}
              value={editingWorkOrder.customCode || ""}
            />
            <input
              type="hidden"
              {...register("type")}
              value={editingWorkOrder.type}
            />
            <input
              type="hidden"
              {...register("location")}
              value={editingWorkOrder.location?._id || ""}
            />
            <input
              type="hidden"
              {...register("workOrderLocation")}
              value={editingWorkOrder.workOrderLocation?._id || ""}
            />
          </div>
        )}

        {!editingWorkOrder && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>{t("workOrders.customCode")}</FormLabel>
              <FormInput
                {...register("customCode")}
                error={errors.customCode?.message}
                placeholder={t("placeholders.customCode")}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel required>{t("workOrders.type")}</FormLabel>
              <FormSelect
                {...register("type", {
                  onChange: (e) => {
                    setWorkOrderType(e.target.value);
                    // In edit mode, don't reset operations when type changes
                    if (!editingWorkOrder) {
                      setWorkOrderOperations([]);
                      setSelectedOperations([]);
                    }
                  },
                })}
                error={errors.type?.message}
                disabled={isReadOnly}
              >
                <option value="">
                  {t("placeholders.selectWorkOrderType")}
                </option>
                <option value="preventive">{t("workOrders.preventive")}</option>
                <option value="corrective">{t("workOrders.corrective")}</option>
              </FormSelect>
            </FormGroup>
          </div>
        )}

        {!editingWorkOrder && (
          <FormGroup>
            <FormLabel required>
              {t("workOrders.workOrderLocationField")}
            </FormLabel>
            <div className="space-y-2">
              <div className="flex">
                <input
                  type="text"
                  value={
                    selectedLocationDisplay ? selectedLocationDisplay.path : ""
                  }
                  placeholder={t("placeholders.selectLocation")}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowLocationSelector(!showLocationSelector)}
                  className="px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isReadOnly}
                >
                  {showLocationSelector ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {selectedLocationDisplay && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Selected:</span>{" "}
                  {selectedLocationDisplay.path}
                </div>
              )}
              {showLocationSelector && !isReadOnly && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 max-h-64 overflow-y-auto">
                  <LocationTreeView
                    onLocationClick={(location) => {
                      setSelectedLocationDisplay({
                        _id: location._id,
                        name: location.name,
                        path: location.path,
                      });
                      setSelectedWorkOrderLocation(location._id);
                      setValue("workOrderLocation", location._id);
                      setValue("location", location._id);
                      setShowLocationSelector(false);
                    }}
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
            {errors.workOrderLocation && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.workOrderLocation.message}
              </p>
            )}
          </FormGroup>
        )}

        {isFormDisabled && !editingWorkOrder && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t("workOrders.selectWorkOrderTypeFirst")}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t("workOrders.selectTypeDescription")}
                </p>
              </div>
            </div>
          </div>
        )}

        <FormGroup>
          <FormLabel required>{t("workOrders.description")}</FormLabel>
          <FormTextarea
            {...register("description")}
            error={errors.description?.message}
            placeholder={t("placeholders.workOrderDescription")}
            rows={3}
            disabled={isFormDisabled || isReadOnly}
          />
        </FormGroup>

        {workOrderType === "corrective" && (
          <FormGroup>
            <FormLabel required>
              {t("workOrders.maintenanceDescription")}
            </FormLabel>
            <FormTextarea
              {...register("maintenanceDescription")}
              error={errors.maintenanceDescription?.message}
              placeholder={t("workOrders.maintenanceDescriptionPlaceholder")}
              rows={3}
              disabled={isFormDisabled || isReadOnly}
            />
          </FormGroup>
        )}

        {/* Maintenance Description per Machine - Only for corrective work orders */}
        {workOrderType === "corrective" && selectedMachines.length > 0 && (
          <FormGroup>
            <FormLabel>
              {t("workOrders.maintenanceDescriptionPerMachine")}
            </FormLabel>
            <div className="space-y-4">
              {selectedMachines.map((machineId) => {
                const machine = availableMachines.find(
                  (m) => m._id === machineId
                );
                if (!machine) return null;

                return (
                  <div
                    key={machineId}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {machine.model?.name || "Unknown Machine"}
                    </label>
                    <FormTextarea
                      value={maintenanceDescriptionPerMachine[machineId] || ""}
                      onChange={(e) => {
                        setMaintenanceDescriptionPerMachine((prev) => ({
                          ...prev,
                          [machineId]: e.target.value,
                        }));
                      }}
                      placeholder={t(
                        "workOrders.maintenanceDescriptionPerMachinePlaceholder"
                      )}
                      rows={2}
                      disabled={isFormDisabled || isReadOnly}
                    />
                  </div>
                );
              })}
            </div>
          </FormGroup>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup>
            <FormLabel required>{t("workOrders.scheduledDate")}</FormLabel>
            <FormInput
              type="date"
              {...register("scheduledDate")}
              error={errors.scheduledDate?.message}
              disabled={isFormDisabled || isReadOnly}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("workOrders.completedDate")}</FormLabel>
            <FormInput
              type="date"
              {...register("completedDate")}
              error={errors.completedDate?.message}
              disabled={isFormDisabled || isReadOnly}
            />
          </FormGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup>
            <FormLabel>{t("common.status")}</FormLabel>
            <FormSelect
              {...register("status")}
              error={errors.status?.message}
              disabled={isFormDisabled || isReadOnly}
            >
              <option value="pending">{t("workOrders.pending")}</option>
              <option value="in_progress">{t("workOrders.inProgress")}</option>
              <option value="completed">{t("workOrders.completed")}</option>
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("workOrders.assignedTo")}</FormLabel>
            <FormInput
              {...register("assignedTo")}
              error={errors.assignedTo?.message}
              placeholder={t("placeholders.technicianName")}
              disabled={isFormDisabled || isReadOnly}
            />
          </FormGroup>
        </div>

        {/* Custom Properties */}
        <FormGroup>
          <FormLabel>{t("workOrders.customProperties")}</FormLabel>
          <div
            className={
              isFormDisabled || isReadOnly
                ? "opacity-50 pointer-events-none"
                : ""
            }
          >
            <DynamicProperties
              properties={Object.entries(customProperties).map(
                ([key, value]) => ({ key, value })
              )}
              onChange={(props) => {
                const newProperties: Record<string, unknown> = {};
                props.forEach((prop) => {
                  newProperties[prop.key] = prop.value;
                });
                setCustomProperties(newProperties);
              }}
            />
          </div>
        </FormGroup>

        <FormGroup>
          <FormLabel>{t("workOrders.notes")}</FormLabel>
          <FormTextarea
            {...register("notes")}
            error={errors.notes?.message}
            placeholder={t("placeholders.additionalNotes")}
            rows={2}
            disabled={isFormDisabled || isReadOnly}
          />
        </FormGroup>

        <FormGroup className="mt-4">
          <FormLabel required>{t("workOrders.machines")}</FormLabel>
          {editingWorkOrder && !canChangeMachines(editingWorkOrder) ? (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {t("workOrders.machinesCannotBeChanged")}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {t(
                      "workOrders.workOrderHasMaintenanceDataCannotChangeMachines"
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : selectedWorkOrderLocation || editingWorkOrder ? (
            <MultiSelect
              options={availableMachines.map((machine) => ({
                value: machine?._id || "",
                label: `${machine?.model?.name || "Unknown Machine"}`,
                description:
                  machine?.model?.manufacturer || "Unknown Manufacturer",
              }))}
              selectedValues={selectedMachines}
              onChange={(values) => {
                setSelectedMachines(values);
                setValue("machines", values);
                // Clear operations when machines change
                setSelectedOperations([]);
                setValue("operations", []);
                setWorkOrderOperations([]);
                // Clear maintenance descriptions per machine
                setMaintenanceDescriptionPerMachine({});
              }}
              placeholder={t("placeholders.selectMachines")}
              error={
                selectedMachines.length === 0 ? t("errors.required") : undefined
              }
              disabled={
                isFormDisabled ||
                isReadOnly ||
                (editingWorkOrder
                  ? !canChangeMachines(editingWorkOrder)
                  : false)
              }
            />
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-orange-200">
                    {t("workOrders.selectLocationToSeeMachines")}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {t("workOrders.selectLocationDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </FormGroup>

        {/* Operations Management */}
        <FormGroup>
          <FormLabel>{t("workOrders.operations")}</FormLabel>
          <div
            className={`space-y-4 ${
              isFormDisabled ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {!editingWorkOrder && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t("workOrders.cannotEditOperationsInCreateMode")}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {t("workOrders.operationsWillBeFilledInMaintenanceModal")}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Operations from machines */}
            {workOrderOperations.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("workOrders.operationsFromMachines")} (
                    {workOrderOperations.length})
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {workOrderType === "preventive"
                      ? t("workOrders.preventive")
                      : t("workOrders.corrective")}{" "}
                    {t("workOrders.type")}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {workOrderOperations
                    .filter(
                      (operation) =>
                        operation && operation._id && operation.name
                    )
                    .map((operation) => {
                      // Determine the source of the operation
                      const isFromMaintenanceRange = selectedMachines.some(
                        (machineId) => {
                          const machine = machines.find(
                            (m) => m?._id === machineId
                          );
                          return machine?.maintenanceRanges?.some(
                            (range) =>
                              range?.type === workOrderType &&
                              range?.operations?.some(
                                (op) => op._id === operation._id
                              )
                          );
                        }
                      );

                      const source = isFromMaintenanceRange
                        ? "maintenanceRange"
                        : "machine";

                      return (
                        <div
                          key={operation._id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            source === "maintenanceRange"
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {operation.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {operation.description}
                            </div>
                            <div
                              className={`text-xs mt-1 ${
                                source === "maintenanceRange"
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {getOperationTypeLabel(operation.type)} •{" "}
                              {source === "maintenanceRange"
                                ? t("workOrders.fromMaintenanceRange")
                                : t("workOrders.fromMachine")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : workOrderType && selectedMachines.length > 0 ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {t("workOrders.noMaintenanceRangesForType")}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t("workOrders.addCustomOperationsInstead")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Additional operations selector - Only in edit mode */}
            {editingWorkOrder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("workOrders.addAdditionalOperations")}
                </label>
                <MultiSelect
                  options={operations
                    .filter(
                      (op) =>
                        !workOrderOperations.some(
                          (woOp) => woOp?._id === op?._id
                        )
                    )
                    .map((operation) => ({
                      value: operation?._id || "",
                      label: operation?.name || "Unknown Operation",
                      description: operation?.description || "No description",
                    }))}
                  selectedValues={selectedOperations}
                  onChange={(values) => {
                    setSelectedOperations(values);
                    setValue("operations", values);
                  }}
                  placeholder={t("placeholders.selectOperations")}
                  disabled={isReadOnly || hasMaintenanceData(editingWorkOrder)}
                />
              </div>
            )}

            {/* Selected additional operations - Only in edit mode */}
            {editingWorkOrder && selectedOperations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("workOrders.additionalOperations")} (
                    {selectedOperations.length})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedOperations.map((operationId) => {
                    const operation = operations.find(
                      (op) => op?._id === operationId
                    );
                    if (!operation) return null;

                    return (
                      <div
                        key={operationId}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {operation.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {operation.description}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {getOperationTypeLabel(operation.type)} •{" "}
                            {t("workOrders.additional")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOperation(operationId)}
                          className="ml-2 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FormGroup>

        {/* Maintenance Data Summary - Show if there's maintenance data */}
        {editingWorkOrder && hasMaintenanceData(editingWorkOrder) && (
          <FormGroup>
            <FormLabel>{t("workOrders.maintenanceDataSummary")}</FormLabel>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {editingWorkOrder.labor.length}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    {t("workOrders.laborHoursCount")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {editingWorkOrder.materials.length}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    {t("workOrders.materialsCount")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {editingWorkOrder.images.length}
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    {t("workOrders.imagesCount")}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {t("workOrders.maintenanceDataExists")}
                </span>
              </div>
            </div>
          </FormGroup>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <FormButton type="button" variant="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </FormButton>
          <FormButton
            type="submit"
            disabled={isSubmitting || isFormDisabled || isReadOnly}
            onClick={() => {
              console.log(errors);
            }}
          >
            {isSubmitting
              ? t("common.saving")
              : editingWorkOrder
              ? t("common.update")
              : t("common.create")}
          </FormButton>
        </div>
      </Form>
    </Modal>
  );
}
