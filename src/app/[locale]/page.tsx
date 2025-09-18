"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, AlertCircle, CheckCircle, Clock, MapPin } from "lucide-react";
import { formatDate, getStatusColor, getTypeColor } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslations } from "@/hooks/useTranslations";
import LocationTreeView from "@/components/LocationTreeView";

interface WorkOrder {
  _id: string;
  customCode?: string;
  status: "pending" | "in_progress" | "completed";
  type: "preventive" | "corrective";
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  machines: Array<{
    _id: string;
    location: string;
    model: {
      name: string;
      manufacturer: string;
    };
  }>;
  operations?: Array<{
    _id: string;
    name: string;
  }>;
  filledOperations?: Array<{
    operationId: string;
    value: unknown;
    description?: string;
    filledAt: string;
    filledBy?: string;
  }>;
  properties?: Record<string, unknown>;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalWorkOrders: number;
  pendingWorkOrders: number;
  inProgressWorkOrders: number;
  completedWorkOrders: number;
  totalMachines: number;
  totalModels: number;
  totalMaintenanceRanges: number;
  totalOperations: number;
}

export default function Dashboard() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslations();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalWorkOrders: 0,
    pendingWorkOrders: 0,
    inProgressWorkOrders: 0,
    completedWorkOrders: 0,
    totalMachines: 0,
    totalModels: 0,
    totalMaintenanceRanges: 0,
    totalOperations: 0,
  });
  const [loading, setLoading] = useState(true);


  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch work orders
      const workOrdersResponse = await fetch("/api/work-orders");
      if (!workOrdersResponse.ok) {
        throw new Error(t("errors.fetchWorkOrdersFailed"));
      }
      const workOrdersData = await workOrdersResponse.json();
      setWorkOrders(workOrdersData.workOrders?.slice(0, 5) || []); // Show only latest 5

      // Fetch stats
      const [machinesRes, modelsRes, rangesRes, operationsRes] =
        await Promise.all([
          fetch("/api/machines"),
          fetch("/api/machine-models"),
          fetch("/api/maintenance-ranges"),
          fetch("/api/operations"),
        ]);

      const [machines, models, ranges, operations] = await Promise.all([
        machinesRes.json(),
        modelsRes.json(),
        rangesRes.json(),
        operationsRes.json(),
      ]);

      const workOrders = workOrdersData.workOrders || [];
      const totalWorkOrders = workOrders.length;
      const pendingWorkOrders = workOrders.filter(
        (wo: WorkOrder) => wo.status === "pending"
      ).length;
      const inProgressWorkOrders = workOrders.filter(
        (wo: WorkOrder) => wo.status === "in_progress"
      ).length;
      const completedWorkOrders = workOrders.filter(
        (wo: WorkOrder) => wo.status === "completed"
      ).length;

      setStats({
        totalWorkOrders,
        pendingWorkOrders,
        inProgressWorkOrders,
        completedWorkOrders,
        totalMachines: machines.length,
        totalModels: models.length,
        totalMaintenanceRanges: ranges.length,
        totalOperations: operations.length,
      });
    } catch (error) {
      console.error(t("errors.fetchDashboardDataError"), error);
      toast.error(t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status, router, fetchDashboardData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 sm:w-1/4 mb-4 sm:mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow"
              >
                <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
              <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3 sm:mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="h-10 sm:h-11 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 sm:h-11 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg shadow">
              <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3 sm:mb-4"></div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t("navigation.dashboard")}
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("workOrders.title")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("workOrders.pending")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.pendingWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("workOrders.inProgress")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.inProgressWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("workOrders.completed")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.completedWorkOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions and System Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              {t("dashboard.fastActions")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/work-orders?new=true"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">{t("workOrders.addWorkOrder")}</span>
              </Link>
              <Link
                href="/machines?new=true"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">{t("machines.addMachine")}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              {t("dashboard.systemSummary")}
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("machines.title")}
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.totalMachines}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("machineModels.title")}
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.totalModels}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("maintenanceRanges.title")}
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.totalMaintenanceRanges}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("operations.title")}
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats.totalOperations}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Location Tree */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              <MapPin className="h-5 w-5 inline mr-2" />
              {t("locations.title")}
            </h3>
            <Link
              href="/locations"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 self-start sm:self-auto"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 h-auto max-h-64 sm:max-h-80 overflow-y-auto">
            <LocationTreeView
              onMachineClick={(machine) => {
                // Navigate to machines page with edit parameter
                router.push(`/machines?edit=${machine._id}`);
              }}
              showActions={false}
              showMachines={true}
              className="max-h-64 sm:max-h-80 lg:max-h-96"
              refreshTrigger={0}
            />
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {t("dashboard.recentWorkOrders")}
            </h3>
            <Link
              href="/work-orders"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 self-start sm:self-auto"
            >
              {t("workOrders.viewAll")}
            </Link>
          </div>

          {workOrders.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t("workOrders.noWorkOrders")}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("workOrders.startCreatingWorkOrder")}
              </p>
              <div className="mt-6">
                <Link
                  href="/work-orders?new=true"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="truncate">{t("workOrders.addWorkOrder")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((workOrder) => (
                <div
                  key={workOrder._id}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {workOrder.description}
                      </h4>
                      <div className="flex flex-col items-end space-y-1 ml-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                            workOrder.type
                          )}`}
                        >
                          {workOrder.type === "preventive"
                            ? t("dashboard.preventive")
                            : t("dashboard.corrective")}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            workOrder.status
                          )}`}
                        >
                          {getStatusIcon(workOrder.status)}
                          <span className="ml-1">
                            {workOrder.status === "pending"
                              ? t("workOrders.pending")
                              : workOrder.status === "in_progress"
                              ? t("workOrders.inProgress")
                              : t("workOrders.completed")}
                          </span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Máquinas:</strong>
                      </div>
                      {workOrder.machines?.map((machine) => (
                        <div 
                          key={machine._id}
                          className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 bg-white dark:bg-gray-800 rounded border"
                          onClick={() => router.push(`/machines?edit=${machine._id}`)}
                          title={t('machines.clickToEdit')}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {machine.model?.name || 'Unknown Model'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {machine.location}
                          </div>
                        </div>
                      )) || (
                        <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-white dark:bg-gray-800 rounded border">
                          No machines assigned
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <strong>Fecha programada:</strong> {formatDate(workOrder.scheduledDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
