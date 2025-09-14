"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { formatDate, getStatusColor, getTypeColor } from "@/lib/utils";
import toast from "react-hot-toast";
import { useTranslations } from "@/hooks/useTranslations";

interface WorkOrder {
  _id: string;
  status: "pending" | "in_progress" | "completed";
  description: string;
  scheduledDate: string;
  machine: {
    _id: string;
    location: string;
    model: {
      name: string;
      manufacturer: string;
    };
  };
  maintenanceRange: {
    name: string;
    type: "preventive" | "corrective";
  };
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
  const { data: session, status } = useSession();
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
      setWorkOrders(workOrdersData.slice(0, 5)); // Show only latest 5

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

      const totalWorkOrders = workOrdersData.length;
      const pendingWorkOrders = workOrdersData.filter(
        (wo: WorkOrder) => wo.status === "pending"
      ).length;
      const inProgressWorkOrders = workOrdersData.filter(
        (wo: WorkOrder) => wo.status === "in_progress"
      ).length;
      const completedWorkOrders = workOrdersData.filter(
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t("navigation.dashboard")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
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

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              {t("dashboard.fastActions")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/work-orders/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("workOrders.addWorkOrder")}
              </Link>
              <Link
                href="/machines?new=true"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("machines.addMachine")}
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
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

      {/* Recent Work Orders */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {t("dashboard.recentWorkOrders")}
            </h3>
            <Link
              href="/work-orders"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
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
                  href="/work-orders/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("workOrders.addWorkOrder")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("workOrders.description")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("workOrders.machine")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("workOrders.status")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t("workOrders.scheduledDate")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {workOrders.map((workOrder) => (
                    <tr
                      key={workOrder._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {workOrder.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">
                            {workOrder.machine.model.name}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {workOrder.machine.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                            workOrder.maintenanceRange.type
                          )}`}
                        >
                          {workOrder.maintenanceRange.type === "preventive"
                            ? t("dashboard.preventive")
                            : t("dashboard.corrective")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(workOrder.scheduledDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
