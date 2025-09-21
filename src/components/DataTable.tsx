"use client";

import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/useTranslations";
import { Edit, Trash2, Wrench, Check } from "lucide-react";

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
  onBulkDelete?: (items: T[]) => void;
  className?: string;
  enableBulkDelete?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
}

export default function DataTable<T extends { _id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onMaintenance,
  onBulkDelete,
  className,
  enableBulkDelete = false,
  selectedItems = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const { t } = useTranslations();
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Sincronizar el estado isSelectAll cuando cambien selectedItems o data
  useEffect(() => {
    if (selectedItems.length === 0) {
      setIsSelectAll(false);
    } else if (selectedItems.length === data.length && data.length > 0) {
      setIsSelectAll(true);
    } else {
      setIsSelectAll(false);
    }
  }, [selectedItems, data]);

  const handleSelectAll = () => {
    if (isSelectAll) {
      onSelectionChange?.([]);
      setIsSelectAll(false);
    } else {
      onSelectionChange?.(data);
      setIsSelectAll(true);
    }
  };

  const handleSelectItem = (item: T) => {
    const isSelected = selectedItems.some(selected => selected._id === item._id);
    let newSelection: T[];
    
    if (isSelected) {
      newSelection = selectedItems.filter(selected => selected._id !== item._id);
    } else {
      newSelection = [...selectedItems, item];
    }
    
    onSelectionChange?.(newSelection);
    // El estado isSelectAll se actualizará automáticamente por el useEffect
  };

  const isItemSelected = (item: T) => {
    return selectedItems.some(selected => selected._id === item._id);
  };

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
        {/* Selection checkbox for mobile */}
        {enableBulkDelete && (
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isItemSelected(item)}
                onChange={() => handleSelectItem(item)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t("common.select")}
              </span>
            </label>
          </div>
        )}

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
      {/* Select all button */}
      {enableBulkDelete && data.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handleSelectAll}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Check className="h-4 w-4 mr-2" />
            {isSelectAll ? t("common.deselectAll") : t("common.selectAll")}
          </button>
          {selectedItems.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {selectedItems.length} {t("common.selected")}
            </span>
          )}
        </div>
      )}

      {/* Bulk actions header */}
      {enableBulkDelete && selectedItems.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {selectedItems.length} {t("common.selected")}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onSelectionChange?.([])}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                {t("common.clearSelection")}
              </button>
              {onBulkDelete && (
                <button
                  onClick={() => onBulkDelete(selectedItems)}
                  className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t("common.deleteSelected")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile view - Cards */}
      <div className="block">
        {data.map((item) => (
          <MobileCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  );
}
