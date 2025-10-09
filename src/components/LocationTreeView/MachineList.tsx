"use client";

import { Wrench, Eye } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";
import { MachineListProps, Machine } from "./types";
import { MACHINE_STATE_COLORS } from "./constants";

export default function MachineList({
  node,
  level,
  onMachineClick,
  onMachineScroll,
}: MachineListProps) {
  const { t } = useTranslations();

  const handleMachineClick = (machine: Machine, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onMachineClick) {
      onMachineClick(machine, event);
    }
  };

  const getMachineStateColor = (state: string) => {
    return MACHINE_STATE_COLORS[state as keyof typeof MACHINE_STATE_COLORS] || MACHINE_STATE_COLORS.default;
  };

  const getMachineStateText = (state: string) => {
    switch (state) {
      case "active":
        return t("machines.active");
      case "inactive":
        return t("machines.inactive");
      case "maintenance":
        return t("machines.maintenance");
      case "retired":
        return t("machines.retired");
      default:
        return state;
    }
  };

  return (
    <div 
      className="mt-2" 
      style={{ marginLeft: `${level * 12 + 12}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-300 ${
        node.isLoadingMachines ? 'animate-pulse border-blue-300 dark:border-blue-700' : ''
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <Wrench className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("locations.machinesInLocation")}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {node.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {node.isLoadingMachines ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {t("common.loading")}...
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {node.machines.length} {t("machines.machine")}
                {(node.machines.length) !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Machine Details */}
        <div 
          className="max-h-64 overflow-y-auto"
          onScroll={(e) => {
            const container = e.currentTarget;
            onMachineScroll(node._id, container);
          }}
        >
          {/* Skeleton loading for initial load */}
          {node.isLoadingMachines && !node.machinesLoaded && (
            <div className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {t("common.loading")} {t("machines.machine")}s...
                </span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          {node.machines.map((machine) => (
            <div
              key={machine._id}
              className="p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {machine.description}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMachineStateColor(machine.state)}`}
                    >
                      {getMachineStateText(machine.state)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>
                      <span className="font-medium">{t("machines.brand")}:</span> {machine.brand}
                    </p>
                    <p>
                      <span className="font-medium">{t("machines.model")}:</span> {machine.model}
                    </p>
                    <p>
                      <span className="font-medium">{t("machines.series")}:</span> {machine.series}
                    </p>
                    <p>
                      <span className="font-medium">{t("machines.category")}:</span> {machine.category}
                    </p>
                    <p>
                      <span className="font-medium">{t("machines.internalCode")}:</span> {machine.internalCode}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={t("common.viewDetails")}
                    onClick={(e) => handleMachineClick(machine, e)}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator for infinite scroll */}
          {node.isLoadingMachines && (
            <div className="p-4 flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-lg mx-2 mb-2 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {!node.machinesLoaded ? t("common.loading") + "..." : t("common.loadingMore") + "..."}
                </span>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
