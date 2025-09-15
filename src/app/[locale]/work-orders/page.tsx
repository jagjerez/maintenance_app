"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
  Settings,
  Wrench,
  MapPin,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { FormButton } from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import MaintenanceWorkModal from "@/components/MaintenanceWorkModal";
import WorkOrderFormModal from "@/components/WorkOrderFormModal";
import WorkOrderDeleteModal from "@/components/WorkOrderDeleteModal";
import { WorkOrderInput } from "@/lib/validations";
import {
  IFilledOperation,
  ILabor,
  IMaterial,
  IWorkOrderImage,
} from "@/models/WorkOrder";
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
  filledOperations: IFilledOperation[];
  labor: ILabor[];
  materials: IMaterial[];
  images: IWorkOrderImage[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function WorkOrdersPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [, setLocations] = useState<Location[]>([]);
  const [operations, setOperations] = useState<IOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMaintenanceWorkModal, setShowMaintenanceWorkModal] =
    useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(
    null
  );
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    workOrder: WorkOrder | null;
  }>({
    isOpen: false,
    workOrder: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
  }, [t]);

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
    fetchOperations,
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

  const onSubmit = async (data: WorkOrderInput) => {
    try {
      const url = editingWorkOrder
        ? `/api/work-orders/${editingWorkOrder._id}`
        : "/api/work-orders";
      const method = editingWorkOrder ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          companyId: session?.user?.companyId,
        }),
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
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    setShowModal(true);
  };

  // Check if work order has maintenance data
  const hasMaintenanceData = (workOrder: WorkOrder) => {
    return (
      (workOrder.filledOperations?.length || 0) > 0 ||
      (workOrder.labor?.length || 0) > 0 ||
      (workOrder.materials?.length || 0) > 0 ||
      (workOrder.images?.length || 0) > 0
    );
  };

  // Check if work order can be deleted
  const canDeleteWorkOrder = (workOrder: WorkOrder) => {
    return (
      (workOrder.status || "pending") === "pending" &&
      !hasMaintenanceData(workOrder)
    );
  };

  const handleDelete = async () => {
    if (!deleteModal.workOrder) return;

    try {
      const response = await fetch(
        `/api/work-orders/${deleteModal.workOrder._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        setDeleteModal({ isOpen: false, workOrder: null });
        toast.success(t("workOrders.workOrderDeleted"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error("Error deleting work order:", error);
      toast.error(t("workOrders.workOrderError"));
    }
  };

  const handlePerformMaintenance = (workOrder: WorkOrder) => {
    // Create a work order with proper structure for the modal
    const workOrderForModal = {
      ...workOrder,
      workOrderLocation: workOrder.location, // Use the location object instead of ID
    };

    setEditingWorkOrder(workOrderForModal);
    setShowMaintenanceWorkModal(true);
  };

  const handleMaintenanceSave = async (data: {
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
    status: "pending" | "in_progress" | "completed";
  }) => {
    if (!editingWorkOrder) return;

    try {
      const response = await fetch(`/api/work-orders/${editingWorkOrder._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editingWorkOrder,
          filledOperations: data.filledOperations,
          labor: data.labor,
          materials: data.materials,
          images: data.images,
          status: data.status,
          completedDate:
            data.status === "completed" ? new Date().toISOString() : undefined,
        }),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("workOrders.title")}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t("workOrders.subtitle")}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("workOrders.title")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("workOrders.subtitle")}
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("workOrders.order")}
            {totalItems !== 1 ? "es" : ""}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingWorkOrder(null);
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t("workOrders.newWorkOrder")}</span>
        </FormButton>
      </div>

      {/* Work Orders List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {workOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("workOrders.noWorkOrders")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("workOrders.startCreatingWorkOrder")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {workOrders.map((workOrder) => (
              <div
                key={workOrder._id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                            {workOrder.customCode || workOrder._id} -{" "}
                            {(workOrder.machines || [])
                              .map((m) => m.model?.name || "Unknown Machine")
                              .join(", ")}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              workOrder.status || "pending"
                            )}`}
                          >
                            {getStatusLabel(workOrder.status || "pending")}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (workOrder.type || "preventive") === "preventive"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                            }`}
                          >
                            {(workOrder.type || "preventive") === "preventive"
                              ? t("workOrders.preventive")
                              : t("workOrders.corrective")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {workOrder.location?.name || "Unknown Location"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {workOrder.description || "No description"}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {workOrder.scheduledDate
                                ? formatDate(workOrder.scheduledDate)
                                : "No date"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Settings className="h-4 w-4" />
                            <span>
                              {workOrder.operations?.length ||
                                0 +
                                  workOrder.machines
                                    .map(
                                      (m) => m.maintenanceRanges?.length || 0
                                    )
                                    .reduce((a, b) => a + b, 0) ||
                                0}{" "}
                              {t("workOrders.operations")}
                            </span>
                          </div>
                          {workOrder.assignedTo && (
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{workOrder.assignedTo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(workOrder.status || "pending") !== "completed" && (
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => handlePerformMaintenance(workOrder)}
                        className="p-2"
                        title={t("workOrders.performMaintenance")}
                      >
                        <Wrench className="h-4 w-4" />
                      </FormButton>
                    )}
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleEdit(workOrder)}
                      className="p-2"
                      title={t("common.edit")}
                    >
                      <Edit className="h-4 w-4" />
                    </FormButton>
                    {canDeleteWorkOrder(workOrder) ? (
                      <FormButton
                        type="button"
                        variant="danger"
                        onClick={() =>
                          setDeleteModal({ isOpen: true, workOrder })
                        }
                        className="p-2"
                        title={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </FormButton>
                    ) : (
                      <FormButton
                        type="button"
                        variant="danger"
                        disabled
                        className="p-2 opacity-50 cursor-not-allowed"
                        title={t("workOrders.workOrderCannotBeDeleted")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </FormButton>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* Add/Edit Work Order Modal */}
      <WorkOrderFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWorkOrder(null);
        }}
        onSubmit={onSubmit}
        editingWorkOrder={editingWorkOrder as WorkOrder | null}
        machines={machines}
        operations={operations}
        companyId={session?.user?.companyId}
      />
      {/* Delete Confirmation Modal */}
      <WorkOrderDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, workOrder: null })}
        onConfirm={handleDelete}
        workOrder={deleteModal.workOrder}
      />

      {/* Maintenance Work Modal */}
      {editingWorkOrder && (
        <MaintenanceWorkModal
          isOpen={showMaintenanceWorkModal}
          onClose={() => {
            setShowMaintenanceWorkModal(false);
            setEditingWorkOrder(null);
          }}
          workOrder={editingWorkOrder}
          onSave={handleMaintenanceSave}
        />
      )}
    </div>
  );
}
