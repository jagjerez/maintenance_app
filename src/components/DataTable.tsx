"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";
import { Edit, Trash2, Wrench } from "lucide-react";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onMaintenance?: (item: T) => void;
  className?: string;
}

export default function DataTable<T extends { _id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onMaintenance,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslations();

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.noDataAvailable")}
        </p>
      </div>
    );
  }

  // Mobile view - Card layout
  const MobileCard = ({ item }: { item: T }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
      <div className="space-y-3 items-center">
        {columns.map((column, colIndex) => {
          if (column.hideOnMobile) return null;
          return (
            <div key={colIndex} className="flex flex-row items-center">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {column.label}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 ml-2">
                {column.render
                  ? column.render(item[column.key], item)
                  : String(item[column.key] || "")}
              </span>
            </div>
          );
        })}

        {(onEdit || onDelete || onMaintenance) && (
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(item)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="truncate">{t("common.edit")}</span>
                </button>
              )}
              {onMaintenance && (
                <button
                  onClick={() => onMaintenance(item)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                >
                  <Wrench className="h-4 w-4 mr-1" />
                  <span className="truncate">
                    {t("workOrders.performMaintenance")}
                  </span>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  <span className="truncate">{t("common.delete")}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("", className)}>
      {/* Mobile view - Cards */}
      <div className="block">
        {data.map((item) => (
          <MobileCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
}
