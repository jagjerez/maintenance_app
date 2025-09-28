"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Wrench, Cog, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "@/hooks/useTranslations";
import LocationTreeView from "@/components/LocationTreeView";

interface Stats {
  totalMachines: number;
  totalOperations: number;
  totalLocations: number;
}

export default function Dashboard() {
  const { status } = useSession();
  const router = useRouter();
  const { t } = useTranslations();
  const [stats, setStats] = useState<Stats>({
    totalMachines: 0,
    totalOperations: 0,
    totalLocations: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch stats
      const [machinesRes, operationsRes, locationsRes] =
        await Promise.all([
          fetch("/api/machines"),
          fetch("/api/operations"),
          fetch("/api/locations"),
        ]);

      const [machines, operations, locations] = await Promise.all([
        machinesRes.json(),
        operationsRes.json(),
        locationsRes.json(),
      ]);

      setStats({
        totalMachines: machines.totalItems || 0,
        totalOperations: operations.totalItems || 0,
        totalLocations: locations.totalItems || 0,
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

  if (status === "loading" || loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="animate-pulse">
          <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 sm:w-1/4 mb-4 sm:mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            {[...Array(3)].map((_, i) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("machines.title")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalMachines}
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
                <Cog className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("operations.title")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalOperations}
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
                <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("locations.title")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalLocations}
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
                href="/machines?new=true"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">{t("machines.addMachine")}</span>
              </Link>
              <Link
                href="/operations?new=true"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">{t("operations.addOperation")}</span>
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
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
    </div>
  );
}