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

interface OperationsDisplayProps {
  operations: Operation[];
  title?: string;
  showOrder?: boolean;
  className?: string;
}

export default function OperationsDisplay({
  operations,
  title = "Operations",
  showOrder = true,
  className = ""
}: OperationsDisplayProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  // All operations are additional operations now
  const additionalOperations = operations;

  // Sort operations by order if available, otherwise by name
  const sortedOperations = [...additionalOperations].sort((a, b) => {
    if (showOrder && a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.name.localeCompare(b.name);
  });

  const totalOperations = sortedOperations.length;

  if (totalOperations === 0) {
    return (
      <div
        className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 ${className}`}
      >
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
          {/* Operations */}
          {totalOperations > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{t("operationsDisplay.operations")}:</strong>
              </div>

              {sortedOperations.map((operation) => (
                <div
                  key={operation._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">
                          {operation.name}
                        </span>
                        {showOrder && operation.order !== undefined && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            #{operation.order}
                          </span>
                        )}
                      </div>
                      {operation.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {operation.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {operation.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
