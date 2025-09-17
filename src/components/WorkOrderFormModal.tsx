"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/hooks/useTranslations";
import { AlertCircle, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
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
import { workOrderCreateSchema } from "@/lib/validations";
import { IOperation } from "@/models/Operation";

type WorkOrderFormData = {
  customCode?: string;
  location: string;
  workOrderLocation: string;
  type: "preventive" | "corrective" | "";
  status?: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  properties: Record<string, unknown>;
  machines: Array<{
    machineId: string;
    maintenanceRangeIds?: string[];
    operations?: string[];
    filledOperations?: Array<{
      operationId: string;
      value: unknown;
      description?: string;
      filledBy?: string;
    }>;
    images?: Array<{
      url: string;
      filename: string;
      uploadedAt: string;
      uploadedBy?: string;
    }>;
    maintenanceDescription?: string;
  }>;
  images?: Array<{
    url: string;
    filename: string;
    uploadedAt: string;
    uploadedBy?: string;
  }>;
  labor?: Array<{
    operatorName: string;
    startTime: string;
    endTime?: string;
    isActive: boolean;
  }>;
  materials?: Array<{
    description: string;
    unitType: string;
    quantity: number;
    unit: string;
  }>;
};

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
    operations: IOperation[];
  }>;
}

interface WorkOrderMachine {
  machineId: string;
  maintenanceRangeIds?: string[]; // Múltiples maintenance ranges
  operations?: string[];
  filledOperations?: Array<{
    operationId: string;
    value: unknown;
    description?: string;
    filledBy?: string;
  }>;
  images?: Array<{
    url: string;
    filename: string;
    uploadedAt: string;
    uploadedBy?: string;
  }>;
  maintenanceDescription?: string;
}

interface WorkOrderForModal {
  _id: string;
  customCode?: string;
  machines: WorkOrderMachine[];
  location: Location;
  workOrderLocation: Location;
  type: "preventive" | "corrective";
  status: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  images: Array<{
    url: string;
    filename: string;
    uploadedAt: string;
    uploadedBy?: string;
  }>;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for compatibility
  operations?: IOperation[];
  filledOperations?: Array<{
    operationId: string;
    value: unknown;
    description?: string;
    filledBy?: string;
  }>;
  labor?: Array<{
    operatorName: string;
    startTime: string;
    endTime?: string;
    isActive: boolean;
  }>;
  materials?: Array<{
    description: string;
    unitType: string;
    quantity: number;
    unit: string;
  }>;
}

interface WorkOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  editingWorkOrder: WorkOrderForModal | null;
  machines: Machine[];
  operations: IOperation[];
  maintenanceRanges: Array<{
    _id: string;
    name: string;
    operations: IOperation[];
  }>;
  isSubmitting?: boolean;
}

export default function WorkOrderFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingWorkOrder,
  machines,
  operations,
  isSubmitting = false,
}: WorkOrderFormModalProps) {
  const { t } = useTranslations();
  const [workOrderType, setWorkOrderType] = useState<string>("");
  const [selectedWorkOrderLocation, setSelectedWorkOrderLocation] =
    useState<string>("");
  const [workOrderMachines, setWorkOrderMachines] = useState<
    WorkOrderMachine[]
  >([]);
  const [customProperties, setCustomProperties] = useState<
    Record<string, unknown>
  >({});
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([]);
  const [isResettingType, setIsResettingType] = useState(false);
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
    resolver: zodResolver(workOrderCreateSchema),
  });

  const resetForm = useCallback(
    (isCreateMode = true) => {
      setWorkOrderType("");
      setSelectedWorkOrderLocation("");
      setWorkOrderMachines([]);
      setCustomProperties({});
      setAvailableMachines([]);
      setShowLocationSelector(false);
      setSelectedLocationDisplay(null);
      setIsResettingType(false);
      // Clear all form values
      setValue("machines", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
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
      setWorkOrderType(editingWorkOrder.type);
      setSelectedWorkOrderLocation(
        editingWorkOrder.workOrderLocation?._id || ""
      );
      setWorkOrderMachines(editingWorkOrder.machines || []);
      setCustomProperties(editingWorkOrder.properties || {});

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
        editingWorkOrder.machines.some(
          (woMachine) => woMachine.machineId === machine._id
        )
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
        machines: (editingWorkOrder.machines || []).map((m) => ({
          machineId: m.machineId,
          maintenanceRangeIds: m.maintenanceRangeIds || [],
          operations: m.operations || [],
          filledOperations: m.filledOperations || [],
          images: m.images || [],
          maintenanceDescription: m.maintenanceDescription,
        })),
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
    // Don't interfere when resetting type
    if (isResettingType) return;

    if (selectedWorkOrderLocation) {
      const locationMachines = machines.filter(
        (machine) => machine.locationId === selectedWorkOrderLocation
      );
      setAvailableMachines(locationMachines);
      // Update the location field for validation
      setValue("location", selectedWorkOrderLocation);
      setValue("workOrderLocation", selectedWorkOrderLocation);
      // Clear selected machines when location changes
      setWorkOrderMachines([]);
      setValue("machines", []);
    } else {
      setAvailableMachines([]);
      setWorkOrderMachines([]);
      setValue("machines", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
    }
  }, [selectedWorkOrderLocation, machines, setValue, isResettingType]);

  // Sync workOrderMachines with form field whenever it changes
  useEffect(() => {
    setValue(
      "machines",
      workOrderMachines.map((m) => ({
        machineId: m.machineId,
        maintenanceRangeIds: m.maintenanceRangeIds || [],
        operations: m.operations || [],
        filledOperations: m.filledOperations || [],
        images: m.images || [],
        maintenanceDescription: m.maintenanceDescription,
      }))
    );
  }, [workOrderMachines, setValue]);

  // Update workOrderType when form type changes
  useEffect(() => {
    if (watchedType !== workOrderType) {
      setWorkOrderType(watchedType || "");
    }
  }, [watchedType, workOrderType]);

  // Reset operations and machines when type changes
  useEffect(() => {
    if (workOrderType) {
      setIsResettingType(true);
      setWorkOrderMachines([]);
      setSelectedWorkOrderLocation("");
      // Clear form values
      setValue("machines", []);
      setValue("location", "");
      setValue("workOrderLocation", "");
      // Reset the flag after a short delay
      setTimeout(() => setIsResettingType(false), 100);
    }
  }, [workOrderType, setValue]);

  useEffect(() => {
    if (isSubmitting) {
      resetForm(true);
    }
  }, [isSubmitting, resetForm]);

  // Use watchedType for form control instead of workOrderType
  // In edit mode, don't disable the form
  const isFormDisabled = !watchedType && !editingWorkOrder;

  // Check if work order is completed and should be read-only
  const isReadOnly = editingWorkOrder?.status === "completed";

  const addMachine = (machineId: string) => {
    const machine = availableMachines.find((m) => m._id === machineId);
    if (!machine) return;

    // Get automatic operations from maintenance ranges and machine operations
    const automaticOperations: string[] = [];
    const operationIds = new Set<string>();

    // Add operations from all maintenance ranges of the machine
    if (machine.maintenanceRanges) {
      machine.maintenanceRanges.forEach((range) => {
        if (range.operations) {
          range.operations.forEach((operation) => {
            if (
              operation &&
              operation._id &&
              !operationIds.has(operation._id)
            ) {
              operationIds.add(operation._id);
              automaticOperations.push(operation._id);
            }
          });
        }
      });
    }

    // Add operations directly from machine
    if (machine.operations) {
      machine.operations.forEach((operation) => {
        if (operation && operation._id && !operationIds.has(operation._id)) {
          operationIds.add(operation._id);
          automaticOperations.push(operation._id);
        }
      });
    }

    const newWorkOrderMachine: WorkOrderMachine = {
      machineId,
      maintenanceRangeIds:
        machine.maintenanceRanges?.map((range) => range._id) || [],
      operations: automaticOperations,
      filledOperations: [],
      images: [],
    };

    const updatedMachines = [...workOrderMachines, newWorkOrderMachine];
    setWorkOrderMachines(updatedMachines);

    // Update the form field
    setValue(
      "machines",
      updatedMachines.map((m) => ({
        machineId: m.machineId,
        maintenanceRangeIds: m.maintenanceRangeIds || [],
        operations: m.operations || [],
        filledOperations: m.filledOperations || [],
        images: m.images || [],
        maintenanceDescription: m.maintenanceDescription,
      }))
    );
  };

  const removeMachine = (machineId: string) => {
    const updatedMachines = workOrderMachines.filter(
      (m) => m.machineId !== machineId
    );
    setWorkOrderMachines(updatedMachines);

    // Update the form field
    setValue(
      "machines",
      updatedMachines.map((m) => ({
        machineId: m.machineId,
        maintenanceRangeIds: m.maintenanceRangeIds || [],
        operations: m.operations || [],
        filledOperations: m.filledOperations || [],
        images: m.images || [],
        maintenanceDescription: m.maintenanceDescription,
      }))
    );
  };

  const updateMachineOperations = (machineId: string, operations: string[]) => {
    const updatedMachines = workOrderMachines.map((m) =>
      m.machineId === machineId ? { ...m, operations } : m
    );
    setWorkOrderMachines(updatedMachines);

    // Update the form field
    setValue(
      "machines",
      updatedMachines.map((m) => ({
        machineId: m.machineId,
        maintenanceRangeIds: m.maintenanceRangeIds || [],
        operations: m.operations || [],
        filledOperations: m.filledOperations || [],
        images: m.images || [],
        maintenanceDescription: m.maintenanceDescription,
      }))
    );
  };

  const updateMachineMaintenanceDescription = (
    machineId: string,
    description: string
  ) => {
    const updatedMachines = workOrderMachines.map((m) =>
      m.machineId === machineId
        ? { ...m, maintenanceDescription: description }
        : m
    );
    setWorkOrderMachines(updatedMachines);

    // Update the form field
    setValue(
      "machines",
      updatedMachines.map((m) => ({
        machineId: m.machineId,
        maintenanceRangeIds: m.maintenanceRangeIds || [],
        operations: m.operations || [],
        filledOperations: m.filledOperations || [],
        images: m.images || [],
        maintenanceDescription: m.maintenanceDescription,
      }))
    );
  };

  const handleFormSubmit = async (data: WorkOrderFormData) => {
    // The data.machines should already be properly formatted from the useEffect
    await onSubmit({
      ...data,
      location: selectedWorkOrderLocation,
      workOrderLocation: selectedWorkOrderLocation,
      properties: customProperties,
    });
  };

  const handleClose = () => {
    reset();
    resetForm(true);
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
        {/* Campo oculto para location */}
        <input type="hidden" {...register("location")} />

        {/* Campo oculto para machines */}
        <input type="hidden" {...register("machines")} />

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
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 h-auto">
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
                    onLocationEdit={() => {}}
                    onLocationDelete={() => {}}
                    onLocationAdd={() => {}}
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

        {/* Machines Management */}
        <FormGroup className="mt-4 w-full">
          <FormLabel required>{t("workOrders.machines")}</FormLabel>
          {selectedWorkOrderLocation || editingWorkOrder ? (
            <div className="space-y-4">
              {/* Add Machine Selector */}
              <div className="w-full">
                <FormSelect
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addMachine(e.target.value);
                      // Reset the select value after adding
                      e.target.value = "";
                    }
                  }}
                  className="w-full"
                  disabled={isFormDisabled || isReadOnly}
                >
                  <option value="">{t("workOrders.selectMachineToAdd")}</option>
                  {availableMachines
                    .filter(
                      (machine) =>
                        !workOrderMachines.some(
                          (wm) => wm.machineId === machine._id
                        )
                    )
                    .map((machine) => (
                      <option key={machine._id} value={machine._id}>
                        {machine.model?.name || "Unknown Machine"} -{" "}
                        {machine.model?.manufacturer || "Unknown Manufacturer"}
                      </option>
                    ))}
                </FormSelect>
              </div>

              {/* Selected Machines */}
              {workOrderMachines.map((workOrderMachine) => {
                const machine = machines.find(
                  (m) => m._id === workOrderMachine.machineId
                );
                if (!machine) return null;

                return (
                  <div
                    key={workOrderMachine.machineId}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {machine.model?.name || "Unknown Machine"}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {machine.model?.manufacturer ||
                            "Unknown Manufacturer"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          removeMachine(workOrderMachine.machineId)
                        }
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        disabled={isReadOnly}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Maintenance Ranges Information - Only for preventive */}
                    {workOrderType === "preventive" &&
                      (() => {
                        const machine = machines.find(
                          (m) => m._id === workOrderMachine.machineId
                        );
                        if (
                          !machine ||
                          !machine.maintenanceRanges ||
                          machine.maintenanceRanges.length === 0
                        ) {
                          return (
                            <div className="mb-4">
                              <FormLabel>
                                {t("workOrders.maintenanceRange")}
                              </FormLabel>
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  No maintenance ranges configured for this
                                  machine.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="mb-4">
                            <FormLabel>
                              {t("workOrders.maintenanceRange")}
                            </FormLabel>
                            <div className="space-y-3">
                              {machine.maintenanceRanges.map((range) => (
                                <div
                                  key={range._id}
                                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                                      {range.name}
                                    </h4>
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                      {range.operations?.length || 0} operations
                                    </span>
                                  </div>
                                  {/* Description not available in current type */}
                                  {range.operations &&
                                    range.operations.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                          Operations:
                                        </p>
                                        <div className="space-y-1">
                                          {range.operations.map((operation) => (
                                            <div
                                              key={operation._id}
                                              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                                            >
                                              <div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {operation.name}
                                                </span>
                                                {operation.description && (
                                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    {operation.description}
                                                  </p>
                                                )}
                                              </div>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {operation.type}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Operations - Only for preventive */}
                    {workOrderType === "preventive" &&
                      (() => {
                        const machine = machines.find(
                          (m) => m._id === workOrderMachine.machineId
                        );
                        if (!machine) return null;

                        const automaticOperations: IOperation[] = [];
                        const operationIds = new Set<string>();

                        // Add operations from all maintenance ranges of the machine
                        if (machine.maintenanceRanges) {
                          machine.maintenanceRanges.forEach((range) => {
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
                        }

                        // Add operations directly from machine
                        if (machine.operations) {
                          machine.operations.forEach((operation) => {
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

                        // Get additional operations (from workOrderMachine.operations that are not automatic)
                        const additionalOperationIds =
                          workOrderMachine.operations?.filter(
                            (opId) => !operationIds.has(opId)
                          ) || [];

                        const additionalOperations = additionalOperationIds
                          .map((opId) =>
                            operations.find((op) => op._id === opId)
                          )
                          .filter(Boolean) as IOperation[];

                        const allOperations = [
                          ...automaticOperations,
                          ...additionalOperations,
                        ];

                        return (
                          <div className="mb-4">
                            <FormLabel>{t("workOrders.operations")}</FormLabel>
                            <div className="space-y-3">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>
                                  All operations (automatic + additional):
                                </strong>
                              </div>
                              {allOperations.length > 0 ? (
                                <div className="space-y-2">
                                  {/* Automatic operations */}
                                  {automaticOperations.map((operation) => (
                                    <div
                                      key={operation._id}
                                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                                    >
                                      <div>
                                        <span className="font-medium text-green-900 dark:text-green-100">
                                          {operation.name}
                                        </span>
                                        {operation.description && (
                                          <p className="text-xs text-green-700 dark:text-green-300">
                                            {operation.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-green-600 dark:text-green-400">
                                          {operation.type}
                                        </span>
                                        <span className="text-xs text-green-600 dark:text-green-400">
                                          Auto
                                        </span>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Additional operations */}
                                  {additionalOperations.map((operation) => (
                                    <div
                                      key={operation._id}
                                      className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                                    >
                                      <div>
                                        <span className="font-medium text-blue-900 dark:text-blue-100">
                                          {operation.name}
                                        </span>
                                        {operation.description && (
                                          <p className="text-xs text-blue-700 dark:text-blue-300">
                                            {operation.description}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                          {operation.type}
                                        </span>
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                          Additional
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentOps =
                                              workOrderMachine.operations || [];
                                            updateMachineOperations(
                                              workOrderMachine.machineId,
                                              currentOps.filter(
                                                (id) => id !== operation._id
                                              )
                                            );
                                          }}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                          disabled={isReadOnly}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    No operations found for this machine.
                                  </p>
                                </div>
                              )}

                              {/* Additional operations selector */}
                              {(() => {
                                const machine = machines.find(
                                  (m) => m._id === workOrderMachine.machineId
                                );
                                if (!machine) return null;

                                const availableAdditionalOps =
                                  operations.filter((operation) => {
                                    const isFromMachine =
                                      machine.operations?.some(
                                        (op) => op._id === operation._id
                                      );
                                    const isFromRange =
                                      machine.maintenanceRanges?.some((range) =>
                                        range.operations?.some(
                                          (op) => op._id === operation._id
                                        )
                                      );

                                    return !isFromMachine && !isFromRange;
                                  });

                                // Only show if there are additional operations available
                                if (availableAdditionalOps.length === 0)
                                  return null;

                                return (
                                  <div className="mt-4">
                                    <div className="mb-2">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Additional Operations:
                                      </span>
                                    </div>

                                    <MultiSelect
                                      options={availableAdditionalOps.map(
                                        (operation) => ({
                                          value: operation._id,
                                          label: operation.name,
                                          description: operation.description,
                                        })
                                      )}
                                      selectedValues={
                                        workOrderMachine.operations?.filter(
                                          (opId) => {
                                            const isFromMachine =
                                              machine.operations?.some(
                                                (op) => op._id === opId
                                              );
                                            const isFromRange =
                                              machine.maintenanceRanges?.some(
                                                (range) =>
                                                  range.operations?.some(
                                                    (op) => op._id === opId
                                                  )
                                              );

                                            return (
                                              !isFromMachine && !isFromRange
                                            );
                                          }
                                        ) || []
                                      }
                                      onChange={(values) => {
                                        const machineOperations: string[] = [];
                                        const operationIds = new Set<string>();

                                        // Add operations from all maintenance ranges of the machine
                                        if (machine.maintenanceRanges) {
                                          machine.maintenanceRanges.forEach(
                                            (range) => {
                                              if (range.operations) {
                                                range.operations.forEach(
                                                  (operation) => {
                                                    if (
                                                      operation &&
                                                      operation._id &&
                                                      !operationIds.has(
                                                        operation._id
                                                      )
                                                    ) {
                                                      operationIds.add(
                                                        operation._id
                                                      );
                                                      machineOperations.push(
                                                        operation._id
                                                      );
                                                    }
                                                  }
                                                );
                                              }
                                            }
                                          );
                                        }

                                        // Add operations directly from machine
                                        if (machine.operations) {
                                          machine.operations.forEach(
                                            (operation) => {
                                              if (
                                                operation &&
                                                operation._id &&
                                                !operationIds.has(operation._id)
                                              ) {
                                                operationIds.add(operation._id);
                                                machineOperations.push(
                                                  operation._id
                                                );
                                              }
                                            }
                                          );
                                        }

                                        // Combine with additional operations
                                        const allOperations = [
                                          ...machineOperations,
                                          ...values,
                                        ];
                                        updateMachineOperations(
                                          workOrderMachine.machineId,
                                          allOperations
                                        );
                                      }}
                                      placeholder="Select additional operations..."
                                      disabled={isReadOnly}
                                      hideSelected={true}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Maintenance Description - Only for corrective */}
                    {workOrderType === "corrective" && (
                      <div className="mb-4">
                        <FormLabel>
                          {t("workOrders.maintenanceDescription")}
                        </FormLabel>
                        <FormTextarea
                          value={workOrderMachine.maintenanceDescription || ""}
                          onChange={(e) =>
                            updateMachineMaintenanceDescription(
                              workOrderMachine.machineId,
                              e.target.value
                            )
                          }
                          placeholder={t(
                            "workOrders.maintenanceDescriptionPlaceholder"
                          )}
                          rows={3}
                          disabled={isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {workOrderMachines.length === 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {t("workOrders.noMachinesSelected")}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        {t("workOrders.selectAtLeastOneMachine")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
