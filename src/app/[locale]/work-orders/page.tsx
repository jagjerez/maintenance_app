"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import { Plus, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import MaintenanceWorkModalUpdated from "@/components/MaintenanceWorkModalUpdated";
import WorkOrderFormModal from "@/components/WorkOrderFormModal";
import WorkOrderDeleteModal from "@/components/WorkOrderDeleteModal";
import {
  IFilledOperation,
  ILabor,
  IMaterial,
  IWorkOrderImage,
} from "@/models/WorkOrder";
import { IOperation } from "@/models/Operation";
import { formatDateSafe } from "@/lib/utils";

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

// Interfaces for backend data structure
interface PopulatedMachine {
  _id: string;
  model: {
    name: string;
    manufacturer: string;
  };
  location: string;
  locationId: string;
  description?: string;
  maintenanceRanges?: string[];
  operations?: string[];
  properties: Record<string, unknown>;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface PopulatedOperation {
  _id: string;
  name: string;
  description: string;
  type: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface PopulatedMaintenanceRange {
  _id: string;
  name: string;
  description: string;
  operations: PopulatedOperation[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderMachine {
  machineId: string | PopulatedMachine;
  maintenanceRangeIds?: (string | PopulatedMaintenanceRange)[];
  operations?: (string | PopulatedOperation)[];
  filledOperations?: IFilledOperation[];
  images?: IWorkOrderImage[];
  maintenanceDescription?: string;
  _id: string;
}

interface WorkOrder {
  _id: string;
  customCode?: string;
  machines: WorkOrderMachine[];
  workOrderLocation: Location;
  type: "preventive" | "corrective";
  status: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  images: IWorkOrderImage[];
  labor?: ILabor[];
  materials?: IMaterial[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Interface for modals that expect the old structure with location
interface WorkOrderMachineForModal {
  machineId: string;
  maintenanceRangeIds?: string[];
  operations?: string[];
  filledOperations?: IFilledOperation[];
  images?: IWorkOrderImage[];
  maintenanceDescription?: string;
  _id: string;
}

interface WorkOrderForModal {
  _id: string;
  customCode?: string;
  machines: WorkOrderMachineForModal[];
  workOrderLocation: Location;
  type: "preventive" | "corrective";
  status: "pending" | "in_progress" | "completed";
  description: string;
  maintenanceDescription?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  images: IWorkOrderImage[];
  labor?: ILabor[];
  materials?: IMaterial[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Helper functions to extract IDs from populated objects
const extractMachineId = (machineId: string | PopulatedMachine): string => {
  return typeof machineId === 'string' ? machineId : machineId._id;
};

const extractMaintenanceRangeIds = (ranges: (string | PopulatedMaintenanceRange)[]): string[] => {
  return ranges.map(range => typeof range === 'string' ? range : range._id);
};

const extractOperationIds = (operations: (string | PopulatedOperation)[]): string[] => {
  return operations.map(op => typeof op === 'string' ? op : op._id);
};

const ITEMS_PER_PAGE = 10;

export default function WorkOrdersPage() {
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [, setLocations] = useState<Location[]>([]);
  const [operations, setOperations] = useState<IOperation[]>([]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceWorkModal, setShowMaintenanceWorkModal] =
    useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrderForModal | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<WorkOrderForModal | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Fetch work orders with pagination
  const fetchWorkOrders = useCallback(
    async (page = 1) => {
      try {
        const response = await fetch(
          `/api/work-orders?page=${page}&limit=${ITEMS_PER_PAGE}`
        );
        if (response.ok) {
          const data = await response.json();
          setWorkOrders(data.workOrders || data);
          setTotalPages(
            data.totalPages ||
              Math.ceil((data.workOrders || data).length / ITEMS_PER_PAGE)
          );
          setTotalItems(data.totalItems || (data.workOrders || data).length);
        } else {
          toast.error(t("workOrders.workOrderLoadError"));
        }
      } catch (error) {
        console.error("Error fetching work orders:", error);
        toast.error(t("workOrders.workOrderLoadError"));
      }
    },
    [t]
  );

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || data);
      } else {
        toast.error(t("locations.locationLoadError"));
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error(t("locations.locationLoadError"));
    }
  }, [t]);

  // Fetch machines and operations for dropdowns
  const fetchMachines = useCallback(async () => {
    try {
      const response = await fetch("/api/machines");
      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines || data);
      } else {
        toast.error(t("machines.machineLoadError"));
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast.error(t("machines.machineLoadError"));
    }
  }, [t]);

  const fetchOperations = useCallback(async () => {
    try {
      const response = await fetch("/api/operations");
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data);
      } else {
        toast.error(t("operations.operationLoadError"));
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      toast.error(t("operations.operationLoadError"));
    }
  }, [t])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchWorkOrders(currentPage),
        fetchLocations(),
        fetchMachines(),
        fetchOperations(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [
    currentPage,
    fetchWorkOrders,
    fetchLocations,
    fetchMachines,
    fetchOperations
  ]);

  // Check if we should open the modal automatically (from dashboard)
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setEditingWorkOrder(null);
      setShowModal(true);
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      const url = editingWorkOrder
        ? `/api/work-orders/${editingWorkOrder._id}`
        : "/api/work-orders";
      const method = editingWorkOrder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        setShowModal(false);
        setEditingWorkOrder(null);
        toast.success(
          editingWorkOrder
            ? t("workOrders.workOrderUpdated")
            : t("workOrders.workOrderCreated")
        );
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error("Error saving work order:", error);
      toast.error(t("workOrders.workOrderError"));
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (workOrder: WorkOrder) => {
    // Convert WorkOrder to the format expected by the modal
    const workOrderForModal: WorkOrderForModal = {
      ...workOrder,
      machines: Array.isArray(workOrder.machines)
        ? workOrder.machines.map((workOrderMachine) => ({
            machineId: extractMachineId(workOrderMachine.machineId),
            maintenanceRangeIds: workOrderMachine.maintenanceRangeIds 
              ? extractMaintenanceRangeIds(workOrderMachine.maintenanceRangeIds)
              : [],
            operations: workOrderMachine.operations 
              ? extractOperationIds(workOrderMachine.operations)
              : [],
            filledOperations: workOrderMachine.filledOperations || [],
            images: workOrderMachine.images || [],
            maintenanceDescription: workOrderMachine.maintenanceDescription,
            _id: workOrderMachine._id,
          }))
        : [],
    };
    setEditingWorkOrder(workOrderForModal);
    setShowModal(true);
  };



  const handleDelete = (workOrder: WorkOrder) => {
    const workOrderForModal: WorkOrderForModal = {
      ...workOrder,
      machines: Array.isArray(workOrder.machines)
        ? workOrder.machines.map((workOrderMachine) => ({
            machineId: extractMachineId(workOrderMachine.machineId),
            maintenanceRangeIds: workOrderMachine.maintenanceRangeIds 
              ? extractMaintenanceRangeIds(workOrderMachine.maintenanceRangeIds)
              : [],
            operations: workOrderMachine.operations 
              ? extractOperationIds(workOrderMachine.operations)
              : [],
            filledOperations: workOrderMachine.filledOperations || [],
            images: workOrderMachine.images || [],
            maintenanceDescription: workOrderMachine.maintenanceDescription,
            _id: workOrderMachine._id,
          }))
        : [],
    };
    setWorkOrderToDelete(workOrderForModal);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!workOrderToDelete) return;

    try {
      const response = await fetch(
        `/api/work-orders/${workOrderToDelete._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        toast.success(t("workOrders.workOrderDeleted"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error("Error deleting work order:", error);
      toast.error(t("workOrders.workOrderError"));
    } finally {
      setShowDeleteModal(false);
      setWorkOrderToDelete(null);
    }
  };

  const handleMaintenanceSave = async (data: {
    machines?: any[];
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
    status: "pending" | "in_progress" | "completed";
  }) => {
    if (!editingWorkOrder) return;

    try {
      // Update the work order with maintenance data
      const updatedWorkOrder = {
        ...editingWorkOrder,
        workOrderLocation: editingWorkOrder.workOrderLocation._id, // Send only the ID, not the object
        images: data.images,
        status: data.status,
        completedDate:
          data.status === "completed" ? new Date().toISOString() : undefined,
        labor: data.labor,
        materials: data.materials,
        // Update machines with their specific data if provided
        ...(data.machines && { machines: data.machines }),
        // Note: filledOperations are now stored per machine in the new structure
        // This would need to be handled differently based on which machine the maintenance was performed on
      };

      const response = await fetch(`/api/work-orders/${editingWorkOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedWorkOrder),
      });

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        setShowMaintenanceWorkModal(false);
        setEditingWorkOrder(null);
        toast.success(t("workOrders.workOrderUpdated"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error("Error saving maintenance data:", error);
      toast.error(t("workOrders.workOrderError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: "customCode" as keyof WorkOrder,
      label: t("workOrders.code"),
      render: (value: unknown, workOrder: WorkOrder) => {
        return workOrder.customCode || workOrder._id;
      },
    },
    {
      key: "machines" as keyof WorkOrder,
      label: t("workOrders.machines"),
      render: (value: unknown, workOrder: WorkOrder) => {
        const workOrderMachines = workOrder.machines || [];
        return (
          workOrderMachines
            .map((workOrderMachine) => {
              // Handle both string and populated object cases
              if (typeof workOrderMachine.machineId === 'string') {
                const machine = machines.find(
                  (m) => m._id === workOrderMachine.machineId
                );
                return machine?.model?.name || "Unknown Machine";
              } else {
                // machineId is populated object
                return workOrderMachine.machineId.model?.name || "Unknown Machine";
              }
            })
            .join(", ") || "-"
        );
      },
    },
    {
      key: "workOrderLocation" as keyof WorkOrder,
      label: t("workOrders.location"),
      render: (value: unknown) => {
        const location = value as Location;
        return location?.name || "Unknown Location";
      },
    },
    {
      key: "type" as keyof WorkOrder,
      label: t("workOrders.type"),
      render: (value: unknown) => {
        const type = value as string;
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              type === "preventive"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
            }`}
          >
            {type === "preventive"
              ? t("workOrders.preventive")
              : t("workOrders.corrective")}
          </span>
        );
      },
    },
    {
      key: "status" as keyof WorkOrder,
      label: t("workOrders.status"),
      render: (value: unknown) => {
        const status = value as string;
        const getStatusColor = (status: string) => {
          switch (status) {
            case "pending":
              return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
            case "in_progress":
              return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
            case "completed":
              return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
            default:
              return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
          }
        };
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
              status
            )}`}
          >
            {getStatusLabel(status)}
          </span>
        );
      },
    },
    {
      key: "scheduledDate" as keyof WorkOrder,
      label: t("workOrders.scheduledDate"),
      render: (value: unknown) => {
        const date = value as string;
        return date ? formatDateSafe(date) : "-";
      },
      hideOnMobile: true,
    },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("workOrders.pending");
      case "in_progress":
        return t("workOrders.inProgress");
      case "completed":
        return t("workOrders.completed");
      default:
        return status;
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t("workOrders.title")}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {t("workOrders.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingWorkOrder(null);
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">{t("workOrders.newWorkOrder")}</span>
          </button>
        </div>
      </div>

      {/* Item Count Indicator */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("workOrders.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-4">
            <DataTable
              data={workOrders}
              columns={columns}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMaintenance={(workOrder: WorkOrder) => {
                const workOrderForModal: WorkOrderForModal = {
                  ...workOrder,
                  workOrderLocation: workOrder.workOrderLocation, // Keep the object for display purposes
                  machines: Array.isArray(workOrder.machines)
                    ? workOrder.machines.map((workOrderMachine: WorkOrderMachine) => ({
                        machineId: extractMachineId(workOrderMachine.machineId),
                        maintenanceRangeIds: workOrderMachine.maintenanceRangeIds 
                          ? extractMaintenanceRangeIds(workOrderMachine.maintenanceRangeIds)
                          : [],
                        operations: workOrderMachine.operations 
                          ? extractOperationIds(workOrderMachine.operations)
                          : [],
                        filledOperations: workOrderMachine.filledOperations || [],
                        images: workOrderMachine.images || [],
                        maintenanceDescription: workOrderMachine.maintenanceDescription,
                        _id: workOrderMachine._id,
                      }))
                    : [],
                };
                setEditingWorkOrder(workOrderForModal);
                setShowMaintenanceWorkModal(true);
              }}
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
        className="mt-4 sm:mt-6"
      />

      {/* Add/Edit Work Order Modal */}
      <WorkOrderFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWorkOrder(null);
        }}
        onSubmit={onSubmit}
        editingWorkOrder={editingWorkOrder}
        machines={machines}
        operations={operations}
        isSubmitting={isSubmitting}
      />
      {/* Delete Confirmation Modal */}
      <WorkOrderDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        workOrder={workOrderToDelete}
      />

      {/* Maintenance Work Modal */}
      {editingWorkOrder && (
        <MaintenanceWorkModalUpdated
          isOpen={showMaintenanceWorkModal}
          onClose={() => {
            setShowMaintenanceWorkModal(false);
            setEditingWorkOrder(null);
          }}
          workOrder={editingWorkOrder}
          onSave={handleMaintenanceSave}
          operations={operations}
        />
      )}
    </div>
  );
}
