"use client";

import { useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";
import { ChevronDown, ChevronRight, Settings, Wrench } from "lucide-react";

interface Operation {
  _id: string;
  name: string;
  description: string;
  type?: string;
  order?: number;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  description?: string;
  operations?: Operation[];
}

interface OperationsDisplayProps {
  operations: Operation[];
  maintenanceRanges?: MaintenanceRange[];
  title?: string;
  showOrder?: boolean;
  className?: string;
  showMaintenanceRanges?: boolean;
}

export default function OperationsDisplay({
  operations,
  maintenanceRanges = [],
  title = "Operations",
  showOrder = true,
  className = "",
  showMaintenanceRanges = true,
}: OperationsDisplayProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  // Get all operations from maintenance ranges (automatic operations)
  const automaticOperations: Operation[] = [];
  const operationIds = new Set<string>();

  if (showMaintenanceRanges && maintenanceRanges.length > 0) {
    maintenanceRanges.forEach(range => {
      if (range.operations) {
        range.operations.forEach((operation) => {
          if (operation && operation._id && !operationIds.has(operation._id)) {
            operationIds.add(operation._id);
            automaticOperations.push(operation);
          }
        });
      }
    });
  }

  // Get additional operations (those not in maintenance ranges)
  const additionalOperations = operations.filter(op => !operationIds.has(op._id));

  // Sort operations by order if available, otherwise by name
  const sortedAutomaticOperations = [...automaticOperations].sort((a, b) => {
    if (showOrder && a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  const sortedAdditionalOperations = [...additionalOperations].sort((a, b) => {
    if (showOrder && a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  const getOperationCardStyle = (isAutomatic: boolean) => {
    if (isAutomatic) {
      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100";
    }
    return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100";
  };

  const getOperationIconStyle = (isAutomatic: boolean) => {
    if (isAutomatic) {
      return "text-green-600 dark:text-green-400";
    }
    return "text-blue-600 dark:text-blue-400";
  };

  const totalOperations = sortedAutomaticOperations.length + sortedAdditionalOperations.length;
  
  if (totalOperations === 0 && maintenanceRanges.length === 0) {
    return (
      <div className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 ${className}`}>
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {t("operationsDisplay.noOperationsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            {title} ({totalOperations})
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Maintenance Ranges */}
          {showMaintenanceRanges && maintenanceRanges.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {t("operationsDisplay.title")} ({maintenanceRanges.length})
              </div>
              {maintenanceRanges.map((range) => (
                <div key={range._id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        {range.name}
                      </h4>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {range.operations?.length || 0} {t("operationsDisplay.operation")}{(range.operations?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {range.description && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      {range.description}
                    </p>
                  )}
                  {range.operations && range.operations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        {t("operationsDisplay.operations")}:
                      </p>
                      <div className="space-y-1">
                        {range.operations.map((operation) => (
                          <div key={operation._id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
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
          )}

          {/* All Operations */}
          {totalOperations > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("operationsDisplay.operationsFromMachineAndRange")}:</strong>
              </div>
              
              {/* Automatic operations (from maintenance ranges) */}
              {sortedAutomaticOperations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t("operationsDisplay.automatic")} ({sortedAutomaticOperations.length})
                  </div>
                  {sortedAutomaticOperations.map((operation) => (
                    <div
                      key={operation._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getOperationCardStyle(true)}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 ${getOperationIconStyle(true)}`}>
                          <Settings className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium truncate">
                              {operation.name}
                            </span>
                            {showOrder && operation.order !== undefined && (
                              <span className="text-xs opacity-75">
                                #{operation.order}
                              </span>
                            )}
                          </div>
                          {operation.description && (
                            <p className="text-xs opacity-75 truncate mt-1">
                              {operation.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs opacity-75">
                          {operation.type}
                        </span>
                        <span className="text-xs opacity-75">
                          {t("operationsDisplay.automatic")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Additional operations (manually selected) */}
              {sortedAdditionalOperations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    {t("operationsDisplay.additionalOperations")} ({sortedAdditionalOperations.length})
                  </div>
                  {sortedAdditionalOperations.map((operation) => (
                    <div
                      key={operation._id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${getOperationCardStyle(false)}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 ${getOperationIconStyle(false)}`}>
                          <Settings className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium truncate">
                              {operation.name}
                            </span>
                            {showOrder && operation.order !== undefined && (
                              <span className="text-xs opacity-75">
                                #{operation.order}
                              </span>
                            )}
                          </div>
                          {operation.description && (
                            <p className="text-xs opacity-75 truncate mt-1">
                              {operation.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs opacity-75">
                          {operation.type}
                        </span>
                        <span className="text-xs opacity-75">
                          {t("operationsDisplay.additionalOperations")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}