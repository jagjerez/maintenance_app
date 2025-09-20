"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Plus,
  Trash2,
  StopCircle,
  Wrench,
  Users,
  Package,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  User,
  IdCard,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import {
  FormLabel,
  FormInput,
  FormSelect,
  FormButton,
  FormTextarea,
} from "@/components/Form";
import ImageUpload from "@/components/ImageUpload";
import SignaturePad from "@/components/SignaturePad";
import {
  formatDateTime,
  createUTCDateFromLocalInput,
  createLocalDateFromUTC,
} from "@/lib/utils";
import {
  IFilledOperation,
  ILabor,
  IMaterial,
  IWorkOrderImage,
  ISignatureData,
  IClientSignatureData,
  UnitType,
} from "@/models/WorkOrder";
import { IOperation } from "@/models/Operation";

// Interfaces for the updated modal
interface WorkOrderMachineForModal {
  machineId: string;
  maintenanceRangeIds?: string[];
  operations?: string[];
  filledOperations?: IFilledOperation[];
  images?: IWorkOrderImage[];
  maintenanceDescription?: string;
  _id?: string; // Make optional for updates
}

// Extended interface for filled operations with machine context
interface IFilledOperationWithMachine
  extends Omit<IFilledOperation, "filledAt"> {
  machineId: string;
  filledAt: string; // Use string for ISO date format
}

// Extended interface for work order images with machine context
interface IWorkOrderImageWithMachine extends IWorkOrderImage {
  machineId?: string;
}

interface WorkOrderForModal {
  _id: string;
  customCode?: string;
  machines: WorkOrderMachineForModal[];
  workOrderLocation: {
    _id: string;
    name: string;
  };
  type: "preventive" | "corrective";
  status: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  images: IWorkOrderImage[];
  labor?: ILabor[];
  materials?: IMaterial[];
  operatorSignature?: ISignatureData;
  clientSignature?: IClientSignatureData;
}

interface MaintenanceWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrderForModal | null;
  onSave: (data: {
    machines?: WorkOrderMachineForModal[];
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
    status: "pending" | "in_progress" | "completed";
    operatorSignature?: ISignatureData | null;
    clientSignature?: IClientSignatureData | null;
  }) => Promise<void>;
  operations: IOperation[];
}

const UNIT_TYPES: UnitType[] = [
  "cm",
  "cm3",
  "mm",
  "m",
  "m2",
  "m3",
  "kg",
  "g",
  "l",
  "ml",
  "pcs",
  "units",
];

export default function MaintenanceWorkModalUpdated({
  isOpen,
  onClose,
  workOrder,
  onSave,
  operations,
}: MaintenanceWorkModalProps) {
  const { t } = useTranslations();
  const [filledOperations, setFilledOperations] = useState<
    IFilledOperationWithMachine[]
  >([]);
  const [labor, setLabor] = useState<ILabor[]>([]);
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [images, setImages] = useState<IWorkOrderImageWithMachine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New states for features
  const [showMachineSection, setShowMachineSection] = useState(true);
  const [operatorSignature, setOperatorSignature] = useState<ISignatureData | null>(null);
  const [clientSignature, setClientSignature] = useState<IClientSignatureData | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");

  // Initialize data when work order changes
  useEffect(() => {
    if (workOrder) {
      // Collect all filled operations from all machines with machine context
      const allFilledOperations: IFilledOperationWithMachine[] = [];
      const allImages: IWorkOrderImageWithMachine[] = [];

      workOrder.machines.forEach((machine) => {
        if (machine.filledOperations) {
          const operationsWithMachine = machine.filledOperations.map((op) => ({
            ...op,
            machineId: machine.machineId,
            filledAt:
              typeof op.filledAt === "string"
                ? op.filledAt
                : new Date(op.filledAt).toISOString(),
          }));
          allFilledOperations.push(...operationsWithMachine);
        }

        // Collect images from each machine with machine context
        if (machine.images) {
          const imagesWithMachine = machine.images.map((img) => ({
            ...img,
            machineId: machine.machineId,
          }));
          allImages.push(...imagesWithMachine);
        }
      });

      setFilledOperations(allFilledOperations);
      setLabor(workOrder.labor || []);
      setMaterials(workOrder.materials || []);
      // Use images from work order level first, then add machine images
      const workOrderImages = (workOrder.images || []).map((img) => ({
        ...img,
        machineId: undefined,
      }));
      const combinedImages = [...workOrderImages, ...allImages];
      console.log("Initializing images:", combinedImages);
      setImages(combinedImages);

      // Load saved signatures
      console.log("Work order signatures in modal initialization:", {
        operatorSignature: workOrder.operatorSignature,
        clientSignature: workOrder.clientSignature
      });
      
      if (workOrder.operatorSignature) {
        console.log("Setting operator signature:", workOrder.operatorSignature);
        setOperatorSignature(workOrder.operatorSignature);
        setOperatorName(workOrder.operatorSignature.operatorName);
        setOperatorId(workOrder.operatorSignature.operatorId);
      }
      
      if (workOrder.clientSignature) {
        console.log("Setting client signature:", workOrder.clientSignature);
        setClientSignature(workOrder.clientSignature);
        setClientName(workOrder.clientSignature.clientName);
        setClientId(workOrder.clientSignature.clientId);
      }
    }
  }, [workOrder]);

  const handleAddLabor = () => {
    const newLabor: ILabor = {
      operatorName: "",
      startTime: new Date().toISOString(),
      endTime: undefined,
      isActive: true,
    };
    setLabor([...labor, newLabor]);

    // Show notification that work order status will change to in_progress
    toast.success(t("workOrders.workOrderStatusChanged"));
  };

  const handleUpdateLabor = (
    index: number,
    field: keyof ILabor,
    value: unknown
  ) => {
    const newLabor = [...labor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setLabor(newLabor);
  };

  const handleStopLabor = (index: number) => {
    const newLabor = [...labor];
    newLabor[index] = {
      ...newLabor[index],
      endTime: new Date().toISOString(),
      isActive: false,
    };
    setLabor(newLabor);
    toast.success(t("workOrders.laborEntryStopped"));
  };

  const handleAddMaterial = () => {
    const newMaterial: IMaterial = {
      description: "",
      unitType: "pcs",
      quantity: 0,
      unit: "pcs",
    };
    setMaterials([...materials, newMaterial]);
  };

  const handleUpdateMaterial = (
    index: number,
    field: keyof IMaterial,
    value: unknown
  ) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };

    // If unitType changes, update the unit field as well
    if (field === "unitType") {
      newMaterials[index].unit = value as string;
    }

    setMaterials(newMaterials);
  };

  const handleRemoveMaterial = (index: number) => {
    const newMaterials = materials.filter((_, i) => i !== index);
    setMaterials(newMaterials);
  };

  const handleImageUpload = (
    image: {
      url: string;
      filename: string;
      uploadedAt: Date;
      uploadedBy?: string;
    },
    machineId?: string
  ) => {
    const newImage: IWorkOrderImageWithMachine = {
      url: image.url,
      filename: image.filename,
      uploadedAt: image.uploadedAt.toISOString(),
      uploadedBy: image.uploadedBy,
      machineId: machineId,
    };
    setImages([...images, newImage]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleFillOperation = (
    operationId: string,
    machineId: string,
    value: unknown,
    description?: string
  ) => {
    const existingIndex = filledOperations.findIndex(
      (op) => op.operationId === operationId && op.machineId === machineId
    );

    const operation = operations.find((o) => o._id === operationId);
    const newFilledOperation: IFilledOperationWithMachine = {
      operationId,
      machineId,
      value,
      description,
      filledBy: "current-user", // This should come from auth context
      filledAt: new Date().toISOString(),
      operation: operation || ({} as IOperation),
    };

    if (existingIndex >= 0) {
      // Update existing operation
      const newFilledOperations = [...filledOperations];
      newFilledOperations[existingIndex] = newFilledOperation;
      setFilledOperations(newFilledOperations);
    } else {
      // Add new operation
      setFilledOperations([...filledOperations, newFilledOperation]);
    }
  };

  const handleSubmit = async () => {
    if (!workOrder) return;

    setIsSubmitting(true);
    try {
      // Check if any labor is active and stop it
      const updatedLabor = labor.map((l) =>
        l.isActive ? { ...l, endTime: new Date(), isActive: false } : l
      );

      const newStatus =
        workOrder.status === "pending" ? "in_progress" : workOrder.status;

      // Group filled operations by machine
      const filledOperationsByMachine: {
        [machineId: string]: IFilledOperation[];
      } = {};
      filledOperations.forEach((op) => {
        if (!filledOperationsByMachine[op.machineId]) {
          filledOperationsByMachine[op.machineId] = [];
        }
        filledOperationsByMachine[op.machineId].push({
          operationId: op.operationId,
          value: op.value,
          description: op.description,
          filledAt: new Date(op.filledAt), // Convert string back to Date for API
          filledBy: op.filledBy,
          operation:
            operations.find((o) => o._id === op.operationId) ||
            ({} as IOperation),
        });
      });

      // Group images by machine (work order level images will be kept at work order level)
      const workOrderLevelImages = images.filter((img) => !img.machineId);
      const machineImages: { [machineId: string]: IWorkOrderImage[] } = {};
      images.forEach((img) => {
        if (img.machineId) {
          if (!machineImages[img.machineId]) {
            machineImages[img.machineId] = [];
          }
          machineImages[img.machineId].push({
            url: img.url,
            filename: img.filename,
            uploadedAt: img.uploadedAt,
            uploadedBy: img.uploadedBy,
          });
        }
      });

      // Update machines with their specific maintenance data only
      const updatedMachines = workOrder.machines.map((machine) => ({
        machineId: machine.machineId, // Only send the ID to identify which machine
        filledOperations: filledOperationsByMachine[machine.machineId] || [],
        images: machineImages[machine.machineId] || [],
      }));

      const saveData = {
        machines: updatedMachines as WorkOrderMachineForModal[],
        filledOperations: [], // Keep empty as we're now using machine-level filledOperations
        labor: updatedLabor as ILabor[],
        materials,
        images: workOrderLevelImages,
        status: newStatus as "pending" | "in_progress" | "completed",
        operatorSignature,
        clientSignature,
      };
      
      console.log("Sending data to onSave:", saveData);
      console.log("Operator signature in save data:", saveData.operatorSignature);
      console.log("Client signature in save data:", saveData.clientSignature);
      
      await onSave(saveData);

      toast.success(t("workOrders.workOrderUpdated"));
      onClose();
    } catch (error) {
      console.error("Error saving maintenance data:", error);
      toast.error(t("workOrders.workOrderError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishWorkOrder = async () => {
    if (!workOrder) return;

    setIsSubmitting(true);
    try {
      // Stop all active labor
      const updatedLabor = labor.map((l) =>
        l.isActive ? { ...l, endTime: new Date(), isActive: false } : l
      );

      // Group filled operations by machine
      const filledOperationsByMachine: {
        [machineId: string]: IFilledOperation[];
      } = {};
      filledOperations.forEach((op) => {
        if (!filledOperationsByMachine[op.machineId]) {
          filledOperationsByMachine[op.machineId] = [];
        }
        filledOperationsByMachine[op.machineId].push({
          operationId: op.operationId,
          value: op.value,
          description: op.description,
          filledAt: new Date(op.filledAt), // Convert string back to Date for API
          filledBy: op.filledBy,
          operation:
            operations.find((o) => o._id === op.operationId) ||
            ({} as IOperation),
        });
      });

      // Group images by machine (work order level images will be kept at work order level)
      const workOrderLevelImages = images.filter((img) => !img.machineId);
      const machineImages: { [machineId: string]: IWorkOrderImage[] } = {};
      images.forEach((img) => {
        if (img.machineId) {
          if (!machineImages[img.machineId]) {
            machineImages[img.machineId] = [];
          }
          machineImages[img.machineId].push({
            url: img.url,
            filename: img.filename,
            uploadedAt: img.uploadedAt,
            uploadedBy: img.uploadedBy,
          });
        }
      });

      // Update machines with their specific maintenance data only
      const updatedMachines = workOrder.machines.map((machine) => ({
        machineId: machine.machineId, // Only send the ID to identify which machine
        filledOperations: filledOperationsByMachine[machine.machineId] || [],
        images: machineImages[machine.machineId] || [],
      }));

      const finishData = {
        machines: updatedMachines as WorkOrderMachineForModal[],
        filledOperations: [], // Keep empty as we're now using machine-level filledOperations
        labor: updatedLabor as ILabor[],
        materials,
        images: workOrderLevelImages,
        status: "completed" as "pending" | "in_progress" | "completed",
        operatorSignature,
        clientSignature,
      };
      
      console.log("Sending finish data to onSave:", finishData);
      console.log("Operator signature in finish data:", finishData.operatorSignature);
      console.log("Client signature in finish data:", finishData.clientSignature);
      
      await onSave(finishData);

      toast.success(t("workOrders.workOrderCompletedSuccessfully"));
      onClose();
    } catch (error) {
      console.error("Error finishing work order:", error);
      toast.error(t("workOrders.workOrderError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the global formatDateTime function from utils
  // const formatDateTime = (date: Date | string) => { ... } // Removed local implementation

  const calculateLaborHours = (laborEntry: ILabor) => {
    if (!laborEntry.endTime) return 0;
    try {
      const start = new Date(laborEntry.startTime);
      const end = new Date(laborEntry.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }

      return (
        Math.round(
          ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 100
        ) / 100
      );
    } catch (error) {
      console.error("Error calculating labor hours:", error);
      return 0;
    }
  };

  const totalLaborHours = labor.reduce(
    (total, l) => total + calculateLaborHours(l),
    0
  );

  // New functions for signatures and validation
  const handleOperatorSignature = (signatureData: string) => {
    const signature = {
      operatorName,
      operatorId,
      signature: signatureData,
      signedAt: new Date().toISOString(),
    };
    console.log("Setting operator signature:", signature);
    setOperatorSignature(signature);
    toast.success(t("workOrders.operatorSignatureSaved"));
  };

  const handleClientSignature = (signatureData: string) => {
    const signature = {
      clientName,
      clientId,
      signature: signatureData,
      signedAt: new Date().toISOString(),
    };
    console.log("Setting client signature:", signature);
    setClientSignature(signature);
    toast.success(t("workOrders.clientSignatureSaved"));
  };

  const clearOperatorSignature = () => {
    setOperatorSignature(null);
  };

  const clearClientSignature = () => {
    setClientSignature(null);
  };

  // Check if all operations are completed
  const areAllOperationsCompleted = () => {
    if (!workOrder) return false;
    
    for (const machine of workOrder.machines) {
      const machineOperations = operations.filter((op) =>
        machine.operations?.includes(op._id)
      );
      
      for (const operation of machineOperations) {
        const filledOp = filledOperations.find(
          (op) =>
            op.operationId === operation._id &&
            op.machineId === machine.machineId
        );
        
        if (!filledOp || filledOp.value === null || filledOp.value === undefined || filledOp.value === "") {
          return false;
        }
      }
    }
    
    return true;
  };

  const handleFinishWorkOrderWithValidation = async () => {
    if (!areAllOperationsCompleted()) {
      toast.error("Debe completar todas las operaciones antes de finalizar la orden");
      return;
    }

    if (!operatorSignature) {
      toast.error("Debe agregar la firma del operario antes de finalizar");
      return;
    }

    await handleFinishWorkOrder();
    setShowSummary(true);
  };

  if (!workOrder) return null;

  // Summary view
  if (showSummary) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Resumen de Orden de Trabajo ${t("workOrders.completed")}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Work Order Info */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-medium text-green-900 dark:text-green-200 mb-2 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {workOrder.customCode || workOrder._id} - {t("workOrders.completedWorkOrder")}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {workOrder.workOrderLocation?.name || t("workOrders.unknownLocation")} •{" "}
              {workOrder.type === "preventive" ? t("workOrders.preventive") : t("workOrders.corrective")}
            </p>
          </div>

          {/* Operations Summary - Only for preventive maintenance */}
          {workOrder.type === "preventive" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                {t("workOrders.operationsPerformed")}
              </h3>
              <div className="space-y-4">
                {workOrder.machines.map((machine) => {
                  const machineOperations = operations.filter((op) =>
                    machine.operations?.includes(op._id)
                  );
                  return (
                    <div key={machine.machineId} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t("workOrders.machine")} {machine.machineId}
                      </h4>
                      <div className="space-y-2">
                        {machineOperations.map((operation) => {
                          const filledOp = filledOperations.find(
                            (op) => op.operationId === operation._id && op.machineId === machine.machineId
                          );
                          return (
                            <div key={operation._id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">{operation.name}</h5>
                                  {operation.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{operation.description}</p>
                                  )}
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  {t("workOrders.completed")}
                                </span>
                              </div>
                              {filledOp && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>{t("workOrders.value")}:</strong> {filledOp.value?.toString()}
                                  </p>
                                  {filledOp.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <strong>Descripción:</strong> {filledOp.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {t("workOrders.completed")} el: {formatDateTime(filledOp.filledAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labor Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {t("workOrders.laborSummary")}
            </h3>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t("workOrders.totalHoursWorked")}
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {totalLaborHours}h
                </span>
              </div>
            </div>
          </div>

          {/* Materials Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t("workOrders.materialsUsed")}
            </h3>
            <div className="space-y-2">
              {materials.map((material, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {material.description}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {material.quantity} {t(`workOrders.unitTypes.${material.unitType}`)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Signature */}
          {operatorSignature && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t("workOrders.operatorSignature")}
              </h3>
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.operatorName")}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{operatorSignature.operatorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.operatorId")}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{operatorSignature.operatorId}</p>
                  </div>
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <Image 
                    src={operatorSignature.signature} 
                    alt={t("workOrders.operatorSignature")} 
                    width={300}
                    height={150}
                    className="max-w-full h-auto"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {t("workOrders.signedOn")}: {formatDateTime(operatorSignature.signedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Client Signature Section - Only show when work order is completed */}
          {(workOrder.status as string) === "completed" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <IdCard className="h-5 w-5 mr-2" />
                {t("workOrders.clientSignature")}
              </h3>
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <FormLabel>{t("workOrders.clientName")}</FormLabel>
                    <FormInput
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={t("workOrders.clientNamePlaceholder")}
                    />
                  </div>
                  <div>
                    <FormLabel>{t("workOrders.clientId")}</FormLabel>
                    <FormInput
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder={t("workOrders.operatorIdPlaceholder")}
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <FormLabel>{t("workOrders.clientSignatureLabel")}</FormLabel>
                  <div className="w-full overflow-x-auto">
                    <SignaturePad
                      onSave={handleClientSignature}
                      onClear={clearClientSignature}
                      width={Math.min(300, window?.innerWidth - 100 || 300)}
                      height={150}
                      className="w-full"
                    />
                  </div>
                </div>

                {clientSignature && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                      {t("workOrders.clientSignatureSaved")}
                    </p>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                      <Image 
                        src={clientSignature.signature} 
                        alt={t("workOrders.clientSignature")} 
                        width={300}
                        height={150}
                        className="max-w-full h-auto"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {t("workOrders.signedOn")}: {formatDateTime(clientSignature.signedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-600">
            <FormButton type="button" variant="primary" onClick={onClose}>
              {t("common.close")}
            </FormButton>
          </div>
        </div>
      </Modal>
    );
  }

  // Show read-only view when completed
  if (workOrder?.status === "completed") {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${t("workOrders.performMaintenanceWork")} - ${t("workOrders.completedWorkOrder")}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Work Order Info */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-medium text-green-900 dark:text-green-200 mb-2 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {workOrder.customCode || workOrder._id} - {t("workOrders.completedWorkOrder")}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {workOrder.workOrderLocation?.name || t("workOrders.unknownLocation")} •{" "}
              {workOrder.type === "preventive" ? t("workOrders.preventive") : t("workOrders.corrective")}
            </p>
          </div>

          {/* Operations Summary - Read Only - Only for preventive maintenance */}
          {workOrder.type === "preventive" && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Wrench className="h-5 w-5 mr-2" />
                {t("workOrders.operationsPerformed")}
              </h3>
              <div className="space-y-4">
                {workOrder.machines.map((machine) => {
                  const machineOperations = operations.filter((op) =>
                    machine.operations?.includes(op._id)
                  );
                  return (
                    <div key={machine.machineId} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        {t("workOrders.machine")} {machine.machineId}
                      </h4>
                      <div className="space-y-2">
                        {machineOperations.map((operation) => {
                          const filledOp = filledOperations.find(
                            (op) => op.operationId === operation._id && op.machineId === machine.machineId
                          );
                          return (
                            <div key={operation._id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">{operation.name}</h5>
                                  {operation.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{operation.description}</p>
                                  )}
                                </div>
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  {t("workOrders.completed")}
                                </span>
                              </div>
                              {filledOp && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>{t("workOrders.value")}:</strong> {filledOp.value?.toString()}
                                  </p>
                                  {filledOp.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <strong>Descripción:</strong> {filledOp.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {t("workOrders.completed")} el: {formatDateTime(filledOp.filledAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labor Summary - Read Only */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {t("workOrders.laborSummary")}
            </h3>
            <div className="space-y-4">
              {labor.map((laborEntry, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.operator")}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{laborEntry.operatorName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.startTime")}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(laborEntry.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.endTime")}</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {laborEntry.endTime ? formatDateTime(laborEntry.endTime) : t("workOrders.inProgress")}
                      </p>
                    </div>
                  </div>
                  {laborEntry.endTime && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>{t("workOrders.hoursWorked")}:</strong> {calculateLaborHours(laborEntry)}h
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {labor.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {t("workOrders.totalHoursWorked")}
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {totalLaborHours}h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Materials Summary - Read Only */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t("workOrders.materialsUsed")}
            </h3>
            <div className="space-y-2">
              {materials.map((material, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {material.description}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {material.quantity} {t(`workOrders.unitTypes.${material.unitType}`)}
                    </span>
                  </div>
                </div>
              ))}
              {materials.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t("workOrders.noMaterialsUsed")}</p>
              )}
            </div>
          </div>

          {/* Images Summary - Read Only */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              {t("workOrders.workOrderImages")}
            </h3>
            {(() => {
              const workOrderImages = images.filter((img) => !img.machineId);
              return workOrderImages.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t("workOrders.noImagesUploaded")}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workOrderImages.map((image, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                      <Image
                        src={image.url}
                        alt={image.filename}
                        width={300}
                        height={192}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {image.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDateTime(image.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Operator Signature - Read Only */}
          {operatorSignature && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t("workOrders.operatorSignature")}
              </h3>
              <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.operatorName")}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{operatorSignature.operatorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t("workOrders.operatorId")}</p>
                    <p className="font-medium text-gray-900 dark:text-white">{operatorSignature.operatorId}</p>
                  </div>
                </div>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <Image 
                    src={operatorSignature.signature} 
                    alt={t("workOrders.operatorSignature")} 
                    width={300}
                    height={150}
                    className="max-w-full h-auto"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {t("workOrders.signedOn")}: {formatDateTime(operatorSignature.signedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Client Signature - Editable when completed */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <IdCard className="h-5 w-5 mr-2" />
              {t("workOrders.clientSignature")}
            </h3>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <FormLabel>{t("workOrders.clientName")}</FormLabel>
                  <FormInput
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t("workOrders.clientNamePlaceholder")}
                    disabled={false}
                  />
                </div>
                <div>
                  <FormLabel>{t("workOrders.clientId")}</FormLabel>
                  <FormInput
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={t("workOrders.operatorIdPlaceholder")}
                    disabled={false}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <FormLabel>{t("workOrders.clientSignatureLabel")}</FormLabel>
                <div className="w-full overflow-x-auto">
                  <SignaturePad
                    onSave={handleClientSignature}
                    onClear={clearClientSignature}
                    width={Math.min(300, window?.innerWidth - 100 || 300)}
                    height={150}
                    className="w-full"
                    disabled={false}
                  />
                </div>
              </div>

              {clientSignature && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    {t("workOrders.clientSignatureSaved")}
                  </p>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <Image 
                      src={clientSignature.signature} 
                      alt={t("workOrders.clientSignature")} 
                      width={300}
                      height={150}
                      className="max-w-full h-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {t("workOrders.signedOn")}: {formatDateTime(clientSignature.signedAt)}
                  </p>
                </div>
              )}

              {/* Save button for client signature */}
              <div className="mt-4 flex justify-end">
                <FormButton
                  type="button"
                  variant="primary"
                  onClick={async () => {
                    if (!clientName.trim() || !clientId.trim()) {
                      toast.error("Por favor complete el nombre y ID del cliente");
                      return;
                    }
                    if (!clientSignature) {
                      toast.error("Por favor agregue la firma del cliente");
                      return;
                    }
                    
                    try {
                      // Update only the client signature using the dedicated endpoint
                      const response = await fetch(`/api/work-orders/${workOrder._id}/client-signature`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(clientSignature),
                      });

                      if (response.ok) {
                        await response.json();
                        toast.success(t("workOrders.clientSignatureSaved"));
                        // Refresh the work order data
                        window.location.reload();
                      } else {
                        const errorData = await response.json();
                        toast.error(errorData.error || t("workOrders.workOrderError"));
                      }
                    } catch (error) {
                      console.error("Error saving client signature:", error);
                      toast.error(t("workOrders.workOrderError"));
                    }
                  }}
                  disabled={!clientName.trim() || !clientId.trim() || !clientSignature}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t("common.save")} {t("workOrders.clientSignature")}
                </FormButton>
              </div>
            </div>
          </div>

          {/* Action Buttons - Only Close */}
          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-600">
            <FormButton type="button" variant="primary" onClick={onClose}>
              {t("common.close")}
            </FormButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("workOrders.performMaintenanceWork")}
      size="xl"
    >
      <div className="space-y-6">
        {/* Work Order Info */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {workOrder.customCode || workOrder._id} -{" "}
            {workOrder.machines?.length || 0} {t("workOrders.machinesCount")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {workOrder.workOrderLocation?.name ||
              t("workOrders.unknownLocation")}{" "}
            •{" "}
            {workOrder.type === "preventive"
              ? t("workOrders.preventive")
              : t("workOrders.corrective")}
          </p>
        </div>


        {/* Machine Section Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 gap-3">
          <div className="flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-medium text-blue-900 dark:text-blue-200">
              Sección de {t("workOrders.machine")}s y Operaciones
            </h3>
          </div>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => setShowMachineSection(!showMachineSection)}
            className="flex items-center justify-center space-x-2 w-full sm:w-auto"
          >
            {showMachineSection ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Ocultar</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Mostrar</span>
              </>
            )}
          </FormButton>
        </div>

        {/* Operations Section */}
        {showMachineSection && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Wrench className="h-5 w-5 mr-2" />
              {t("workOrders.fillOperations")}
            </h3>

            {workOrder.machines.length === 0 ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("workOrders.noOperationsToFill")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workOrder.machines.map((machine) => {
                const machineOperations = operations.filter((op) =>
                  machine.operations?.includes(op._id)
                );

                return (
                  <div
                    key={machine.machineId}
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Machine {machine.machineId}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {workOrder.type === "preventive" 
                          ? `${machineOperations.length} operations`
                          : t("workOrders.correctiveMaintenance")
                        }
                      </span>
                    </div>

                    {workOrder.type === "corrective" ? (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center space-x-2 mb-2">
                          <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <h5 className="font-medium text-orange-900 dark:text-orange-100">
                            {t("workOrders.correctiveMaintenance")}
                          </h5>
                        </div>
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          {t("workOrders.correctiveMaintenanceDescription")}
                        </p>
                        {machine.maintenanceDescription && (
                          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>{t("workOrders.description")}:</strong> {machine.maintenanceDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : machineOperations.length === 0 ? (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {t("workOrders.noOperationsAssigned")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {machineOperations.map((operation) => {
                          const filledOp = filledOperations.find(
                            (op) =>
                              op.operationId === operation._id &&
                              op.machineId === machine.machineId
                          );

                          return (
                            <div
                              key={operation._id}
                              className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    {operation.name}
                                  </h5>
                                  {operation.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {operation.description}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    filledOp
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                                  }`}
                                >
                                  {filledOp
                                    ? t("workOrders.completed")
                                    : t("workOrders.pending")}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {operation.type === "boolean" ? (
                                  <div className="flex items-center space-x-2">
                                    <FormButton
                                      type="button"
                                      variant={
                                        filledOp?.value
                                          ? "primary"
                                          : "secondary"
                                      }
                                      onClick={() =>
                                        handleFillOperation(
                                          operation._id,
                                          machine.machineId,
                                          !filledOp?.value
                                        )
                                      }
                                      className="flex items-center space-x-2"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      <span>
                                        {filledOp?.value
                                          ? t("workOrders.completed")
                                          : t("workOrders.markComplete")}
                                      </span>
                                    </FormButton>
                                  </div>
                                ) : operation.type === "time" ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <FormInput
                                      type="number"
                                      placeholder={t(
                                        "workOrders.timeInMinutes"
                                      )}
                                      value={filledOp?.value?.toString() || ""}
                                      onChange={(e) =>
                                        handleFillOperation(
                                          operation._id,
                                          machine.machineId,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                    <FormInput
                                      placeholder="Description (optional)"
                                      value={filledOp?.description || ""}
                                      onChange={(e) =>
                                        handleFillOperation(
                                          operation._id,
                                          machine.machineId,
                                          filledOp?.value || 0,
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <FormTextarea
                                      placeholder={t(
                                        "workOrders.enterValueOrDescription"
                                      )}
                                      value={filledOp?.value?.toString() || ""}
                                      onChange={(e) =>
                                        handleFillOperation(
                                          operation._id,
                                          machine.machineId,
                                          e.target.value
                                        )
                                      }
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Images Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                          <Camera className="h-5 w-5 mr-2" />
                          {t("workOrders.workOrderImages")}
                        </h3>
                      </div>

                      {/* Image Upload Component */}
                      <div className="mb-6">
                        <ImageUpload
                           onImageUpload={(image) =>
                            handleImageUpload(image, machine.machineId)
                          }
                          disabled={(workOrder.status as string) === "completed"}
                          multiple={true}
                          maxFiles={5}
                          className="w-full"
                        />
                      </div>

                      {/* Uploaded Images - Machine Level */}
                      {(() => {
                        const machineImages = images.filter(
                          (img) => img.machineId === machine.machineId
                        );
                        return machineImages.length === 0 ? (
                          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t("workOrders.noImagesUploaded")}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {t("workOrders.showingImagesCount", {
                                count: machineImages.length,
                              })}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {machineImages.map((image, index) => {
                                const globalIndex = images.findIndex(
                                  (img) =>
                                    img.url === image.url && img.machineId === machine.machineId
                                );
                                console.log(
                                  `Rendering machine image ${index}:`,
                                  image
                                );
                                return (
                                  <div
                                    key={index}
                                    className="relative group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                                  >
                                    <Image
                                      src={image.url}
                                      alt={image.filename}
                                      width={300}
                                      height={192}
                                      className="w-full h-48 object-cover"
                                      onError={(e) => {
                                        console.error(
                                          "Image load error:",
                                          e
                                        );
                                        console.error(
                                          "Failed URL:",
                                          image.url
                                        );
                                      }}
                                      onLoad={() => {
                                        console.log(
                                          "Image loaded successfully:",
                                          image.url
                                        );
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 ">
                                      <FormButton
                                        type="button"
                                        variant="danger"
                                        onClick={() =>
                                          handleRemoveImage(globalIndex)
                                        }
                                        className="p-2"
                                        disabled={
                                          (workOrder.status as string) === "completed"
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </FormButton>
                                    </div>
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        {image.filename}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {formatDateTime(image.uploadedAt)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        )}

        {/* Labor Tracking Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {t("workOrders.laborTracking")}
            </h3>
            <FormButton
              type="button"
              onClick={handleAddLabor}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t("workOrders.addLaborEntry")}</span>
            </FormButton>
          </div>

          {labor.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("workOrders.noLaborRecorded")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {labor.map((laborEntry, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <FormLabel>{t("workOrders.operatorName")}</FormLabel>
                      <FormInput
                        value={laborEntry.operatorName}
                        onChange={(e) =>
                          handleUpdateLabor(
                            index,
                            "operatorName",
                            e.target.value
                          )
                        }
                        placeholder={t("placeholders.technicianName")}
                      />
                    </div>

                    <div>
                      <FormLabel>{t("workOrders.startTime")}</FormLabel>
                      <FormInput
                        type="datetime-local"
                        value={createLocalDateFromUTC(laborEntry.startTime)}
                        onChange={(e) => {
                          const utcTime = createUTCDateFromLocalInput(
                            e.target.value
                          );
                          handleUpdateLabor(index, "startTime", utcTime);
                        }}
                      />
                    </div>

                    <div>
                      <FormLabel>{t("workOrders.endTime")}</FormLabel>
                      <div className="flex space-x-2">
                        <FormInput
                          type="datetime-local"
                          value={
                            laborEntry.endTime
                              ? createLocalDateFromUTC(laborEntry.endTime)
                              : ""
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              const utcTime = createUTCDateFromLocalInput(
                                e.target.value
                              );
                              handleUpdateLabor(index, "endTime", utcTime);
                            }
                          }}
                          disabled={laborEntry.isActive}
                        />
                        {laborEntry.isActive && (
                          <FormButton
                            type="button"
                            variant="secondary"
                            onClick={() => handleStopLabor(index)}
                            className="px-3"
                          >
                            <StopCircle className="h-4 w-4" />
                          </FormButton>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span
                        className={`text-sm px-2 py-1 rounded-full ${
                          laborEntry.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                      >
                        {laborEntry.isActive
                          ? t("workOrders.isActive")
                          : t("workOrders.completed")}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(laborEntry.startTime)}
                        {laborEntry.endTime &&
                          ` - ${formatDateTime(laborEntry.endTime)}`}
                      </span>
                      {laborEntry.endTime && (
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {calculateLaborHours(laborEntry)}h
                        </span>
                      )}
                    </div>

                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() =>
                        setLabor(labor.filter((_, i) => i !== index))
                      }
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                </div>
              ))}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t("workOrders.totalLaborHours")}
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totalLaborHours}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t("workOrders.materialsUsed")}
            </h3>
            <FormButton
              type="button"
              onClick={handleAddMaterial}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t("workOrders.addMaterialEntry")}</span>
            </FormButton>
          </div>

          {materials.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("workOrders.noMaterialsUsed")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <FormLabel>
                        {t("workOrders.materialDescription")}
                      </FormLabel>
                      <FormInput
                        value={material.description}
                        onChange={(e) =>
                          handleUpdateMaterial(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder={t("placeholders.operationDescription")}
                      />
                    </div>

                    <div>
                      <FormLabel>{t("workOrders.unitType")}</FormLabel>
                      <FormSelect
                        value={material.unitType}
                        onChange={(e) =>
                          handleUpdateMaterial(
                            index,
                            "unitType",
                            e.target.value
                          )
                        }
                      >
                        {UNIT_TYPES.map((unit) => (
                          <option key={unit} value={unit}>
                            {t(`workOrders.unitTypes.${unit}`)}
                          </option>
                        ))}
                      </FormSelect>
                    </div>

                    <div>
                      <FormLabel>{t("workOrders.quantity")}</FormLabel>
                      <FormInput
                        type="number"
                        value={material.quantity}
                        onChange={(e) =>
                          handleUpdateMaterial(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {material.quantity}{" "}
                      {t(`workOrders.unitTypes.${material.unitType}`)}
                    </span>

                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => handleRemoveMaterial(index)}
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              {t("workOrders.workOrderImages")}
            </h3>
          </div>

          {/* Image Upload Component */}
          <div className="mb-6">
            <ImageUpload
              onImageUpload={handleImageUpload}
              disabled={false}
              multiple={true}
              maxFiles={10}
              className="w-full"
            />
          </div>

          {/* Uploaded Images - Work Order Level Only */}
          {(() => {
            const workOrderImages = images.filter((img) => !img.machineId);
            return workOrderImages.length === 0 ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("workOrders.noImagesUploaded")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("workOrders.showingImagesCount", {
                    count: workOrderImages.length,
                  })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workOrderImages.map((image, index) => {
                    const globalIndex = images.findIndex(
                      (img) => img.url === image.url && !img.machineId
                    );
                    console.log(`Rendering work order image ${index}:`, image);
                    return (
                      <div
                        key={index}
                        className="relative group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600"
                      >
                        <Image
                          src={image.url}
                          alt={image.filename}
                          width={300}
                          height={192}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error("Image load error:", e);
                            console.error("Failed URL:", image.url);
                          }}
                          onLoad={() => {
                            console.log(
                              "Image loaded successfully:",
                              image.url
                            );
                          }}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FormButton
                            type="button"
                            variant="danger"
                            onClick={() => handleRemoveImage(globalIndex)}
                            className="p-2"
                            disabled={(workOrder.status as string) === "completed"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </FormButton>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {image.filename}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDateTime(image.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Operator Signature Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            {t("workOrders.operatorSignature")}
          </h3>
          <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <FormLabel>{t("workOrders.operatorName")} del {t("workOrders.operator")}</FormLabel>
                <FormInput
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder={t("workOrders.operatorSignaturePlaceholder")}
                />
              </div>
              <div>
                <FormLabel>{t("workOrders.operatorId")} del {t("workOrders.operator")}</FormLabel>
                <FormInput
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder={t("workOrders.operatorIdPlaceholder")}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <FormLabel>{t("workOrders.operatorSignatureLabel")}</FormLabel>
              <div className="w-full overflow-x-auto">
                <SignaturePad
                  onSave={handleOperatorSignature}
                  onClear={clearOperatorSignature}
                  width={Math.min(300, window?.innerWidth - 100 || 300)}
                  height={150}
                  className="w-full"
                />
              </div>
            </div>

            {operatorSignature && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                  {t("workOrders.operatorSignatureSaved")}
                </p>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                  <Image 
                    src={operatorSignature.signature} 
                    alt={t("workOrders.operatorSignature")} 
                    width={300}
                    height={150}
                    className="max-w-full h-auto"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {t("workOrders.signedOn")}: {formatDateTime(operatorSignature.signedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Client Signature Section - Only show when work order is completed */}
        {(workOrder.status as string) === "completed" && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <IdCard className="h-5 w-5 mr-2" />
              {t("workOrders.clientSignature")}
            </h3>
            <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <FormLabel>{t("workOrders.clientName")}</FormLabel>
                  <FormInput
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={t("workOrders.clientNamePlaceholder")}
                    disabled={(workOrder.status as string) === "completed"}
                  />
                </div>
                <div>
                  <FormLabel>{t("workOrders.clientId")}</FormLabel>
                  <FormInput
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={t("workOrders.operatorIdPlaceholder")}
                    disabled={(workOrder.status as string) === "completed"}
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <FormLabel>{t("workOrders.clientSignatureLabel")}</FormLabel>
                <div className="w-full overflow-x-auto">
                  <SignaturePad
                    onSave={handleClientSignature}
                    onClear={clearClientSignature}
                    width={Math.min(300, window?.innerWidth - 100 || 300)}
                    height={150}
                    className="w-full"
                    disabled={(workOrder.status as string) === "completed"}
                  />
                </div>
              </div>

              {clientSignature && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    {t("workOrders.clientSignatureSaved")}
                  </p>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800">
                    <Image 
                      src={clientSignature.signature} 
                      alt={t("workOrders.clientSignature")} 
                      width={300}
                      height={150}
                      className="max-w-full h-auto"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {t("workOrders.signedOn")}: {formatDateTime(clientSignature.signedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-gray-200 dark:border-gray-600 gap-3">
          <FormButton 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            {t("common.cancel")}
          </FormButton>

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 order-1 sm:order-2">
            <FormButton
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? t("common.saving") : t("common.save")}
            </FormButton>

            {true && (
              <FormButton
                type="button"
                variant="primary"
                onClick={handleFinishWorkOrderWithValidation}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
              >
                {t("workOrders.finishWorkOrder")}
              </FormButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
