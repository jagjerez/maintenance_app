"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "@/hooks/useTranslations";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Wrench } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "@/components/Modal";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import BulkDeleteModal from "@/components/BulkDeleteModal";
import YearSelectorModal from "@/components/YearSelectorModal";
import MonthSelectorModal from "@/components/MonthSelectorModal";
import {
  Form,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormButton,
} from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import DataTable from "@/components/DataTable";
import MultiSelect from "@/components/MultiSelect";
import { maintenanceRangeSchema } from "@/lib/validations";
import { formatDateSafe } from "@/lib/utils";

interface Operation {
  _id: string;
  name: string;
  description: string;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  description: string;
  type: 'preventive' | 'corrective';
  operations: Operation[];
  // Planificación para mantenimiento preventivo
  frequency?: 'daily' | 'monthly' | 'yearly';
  startDate?: string;
  startTime?: string;
  daysOfWeek?: number[];
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function MaintenanceRangesPage() {
  const { t } = useTranslations();
  const [maintenanceRanges, setMaintenanceRanges] = useState<
    MaintenanceRange[]
  >([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRange, setEditingRange] = useState<MaintenanceRange | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rangeToDelete, setRangeToDelete] = useState<MaintenanceRange | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective' | ''>('');
  const [frequency, setFrequency] = useState<'daily' | 'monthly' | 'yearly' | ''>('');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [showYearModal, setShowYearModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number | null>(null);
  const [selectedRanges, setSelectedRanges] = useState<MaintenanceRange[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms delay

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(maintenanceRangeSchema),
    defaultValues: {
      operations: [],
    },
  });

  // Fetch maintenance ranges with pagination and search
  const fetchMaintenanceRanges = useCallback(
    async (page = 1, search = "") => {
      try {
        setIsSearching(true);
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
        const response = await fetch(
          `/api/maintenance-ranges?page=${page}&limit=${ITEMS_PER_PAGE}${searchParam}`
        );
        if (response.ok) {
          const data = await response.json();
          setMaintenanceRanges(data.maintenanceRanges || data);
          setTotalPages(
            data.totalPages ||
              Math.ceil(
                (data.maintenanceRanges || data).length / ITEMS_PER_PAGE
              )
          );
          setTotalItems(
            data.totalItems || (data.maintenanceRanges || data).length
          );
        } else {
          toast.error(t("maintenanceRanges.rangeLoadError"));
        }
      } catch (error) {
        console.error("Error fetching maintenance ranges:", error);
        toast.error(t("maintenanceRanges.rangeLoadError"));
      } finally {
        setIsSearching(false);
      }
    },
    [t]
  );

  // Fetch operations for dropdown
  const fetchOperations = useCallback(async () => {
    try {
      const response = await fetch("/api/operations?limit=1000"); // Get all operations for dropdown
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data); // Handle both paginated and non-paginated responses
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      toast.error(t("operations.operationError"));
    }
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMaintenanceRanges(currentPage, debouncedSearchQuery),
        fetchOperations(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, debouncedSearchQuery, fetchMaintenanceRanges, fetchOperations]);

  const onSubmit = async (data: { name: string; description: string }) => {
    try {
      // Validar campos requeridos antes de enviar
      if (!maintenanceType) {
        toast.error(t("maintenanceRanges.typeRequired"));
        return;
      }
      
      if (maintenanceType === 'preventive' && !frequency) {
        toast.error(t("maintenanceRanges.frequencyRequired"));
        return;
      }
      
      // Validar campos específicos según la frecuencia
      if (maintenanceType === 'preventive' && frequency === 'yearly' && !selectedYear) {
        toast.error(t("maintenanceRanges.yearRequired"));
        return;
      }
      
      if (maintenanceType === 'preventive' && frequency === 'monthly' && (!selectedMonth || !selectedMonthYear)) {
        toast.error(t("maintenanceRanges.monthRequired"));
        return;
      }
      
      if (maintenanceType === 'preventive' && frequency === 'daily' && selectedDaysOfWeek.length === 0) {
        toast.error(t("maintenanceRanges.daysRequired"));
        return;
      }
      const url = editingRange
        ? `/api/maintenance-ranges/${editingRange._id}`
        : "/api/maintenance-ranges";
      const method = editingRange ? "PUT" : "POST";

      const requestData: {
        name: string;
        description: string;
        type: 'preventive' | 'corrective';
        operations: string[];
        frequency?: string;
        startDate?: string;
        startTime?: string;
        daysOfWeek?: number[];
      } = {
        ...data,
        type: maintenanceType as 'preventive' | 'corrective',
        operations: selectedOperations,
      };

      // Solo agregar campos de planificación si es preventivo
      if (maintenanceType === 'preventive') {
        requestData.frequency = frequency;
        
        // Construir datos según la frecuencia
        if (frequency === 'yearly') {
          requestData.startDate = `${selectedYear}-01-01`;
        } else if (frequency === 'monthly') {
          requestData.startDate = `${selectedMonthYear}-${selectedMonth!.toString().padStart(2, '0')}-01`;
        } else if (frequency === 'daily') {
          requestData.daysOfWeek = selectedDaysOfWeek;
        }
      }

      console.log('Sending request data:', requestData);
      console.log('Maintenance type:', maintenanceType);
      console.log('Frequency:', frequency);
      console.log('Selected year:', selectedYear);
      console.log('Selected month:', selectedMonth);
      console.log('Selected month year:', selectedMonthYear);
      console.log('Selected days of week:', selectedDaysOfWeek);
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage, debouncedSearchQuery);
        setShowModal(false);
        setEditingRange(null);
        setSelectedOperations([]);
        setMaintenanceType('');
        setFrequency('');
        setSelectedDaysOfWeek([]);
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedMonthYear(null);
        reset();
        toast.success(
          editingRange
            ? t("maintenanceRanges.rangeUpdated")
            : t("maintenanceRanges.rangeCreated")
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        toast.error(errorData.message || t("maintenanceRanges.rangeError"));
      }
    } catch (error) {
      console.error("Error saving maintenance range:", error);
      toast.error(t("maintenanceRanges.rangeError"));
    }
  };

  const handleEdit = (range: MaintenanceRange) => {
    setEditingRange(range);
    setMaintenanceType(range.type);
    setSelectedOperations(
      Array.isArray(range.operations)
        ? range.operations.map((op) => op._id)
        : []
    );
    setFrequency(range.frequency || '');
    setSelectedDaysOfWeek(range.daysOfWeek || []);
    
    // Set selected year if it's a yearly frequency
    if (range.frequency === 'yearly' && range.startDate) {
      const year = new Date(range.startDate).getFullYear();
      setSelectedYear(year);
    } else {
      setSelectedYear(null);
    }
    
    // Set selected month and year if it's a monthly frequency
    if (range.frequency === 'monthly' && range.startDate) {
      const date = new Date(range.startDate);
      setSelectedMonth(date.getMonth() + 1);
      setSelectedMonthYear(date.getFullYear());
    } else {
      setSelectedMonth(null);
      setSelectedMonthYear(null);
    }
    
    reset({
      name: range.name,
      description: range.description,
    });
    setShowModal(true);
  };

  const handleDelete = (range: MaintenanceRange) => {
    setRangeToDelete(range);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!rangeToDelete) return;

    try {
      const response = await fetch(
        `/api/maintenance-ranges/${rangeToDelete._id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage, debouncedSearchQuery);
        toast.success(t("maintenanceRanges.rangeDeleted"));
      } else {
        const errorData = await response.json();

        // Check if it's a validation error (range in use)
        if (response.status === 400 && errorData.workOrdersCount) {
          toast.error(
            t("maintenanceRanges.rangeInUse", {
              count: errorData.workOrdersCount,
              workOrders:
                errorData.workOrdersCount > 1
                  ? t("common.workOrders")
                  : t("common.workOrder"),
            })
          );
        } else {
          toast.error(errorData.message || t("maintenanceRanges.rangeError"));
        }
      }
    } catch (error) {
      console.error("Error deleting maintenance range:", error);
      toast.error(t("maintenanceRanges.rangeError"));
    } finally {
      setShowDeleteModal(false);
      setRangeToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
  };

  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedMonthYear(year);
  };

  const handleBulkDelete = async () => {
    if (selectedRanges.length === 0) return;

    try {
      setIsBulkDeleting(true);
      const response = await fetch('/api/maintenance-ranges/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: selectedRanges.map(range => range._id)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        await fetchMaintenanceRanges(currentPage, debouncedSearchQuery);
        setSelectedRanges([]);
        setShowBulkDeleteModal(false);
      } else {
        const error = await response.json();
        if (error.error === 'Cannot delete maintenance ranges that are being used in work orders') {
          toast.error(
            t("maintenanceRanges.rangeInUse", {
              count: error.workOrdersCount,
              workOrders:
                error.workOrdersCount > 1
                  ? t("common.workOrders")
                  : t("common.workOrder"),
            })
          );
        } else {
          toast.error(error.error || t("maintenanceRanges.rangeError"));
        }
      }
    } catch (error) {
      console.error("Error bulk deleting maintenance ranges:", error);
      toast.error(t("maintenanceRanges.rangeError"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    {
      key: "name" as keyof MaintenanceRange,
      label: t("maintenanceRanges.rangeName"),
    },
    {
      key: "type" as keyof MaintenanceRange,
      label: t("maintenanceRanges.type"),
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
              ? t("maintenanceRanges.preventive")
              : t("maintenanceRanges.corrective")}
          </span>
        );
      },
    },
    {
      key: "description" as keyof MaintenanceRange,
      label: t("maintenanceRanges.description"),
      render: (value: unknown) => (value as string) || "-",
    },
    {
      key: "operations" as keyof MaintenanceRange,
      label: t("maintenanceRanges.operations"),
      render: (value: unknown) => {
        const operations = value as Operation[];
        return operations?.length || 0;
      },
    },
    {
      key: "frequency" as keyof MaintenanceRange,
      label: t("maintenanceRanges.planning"),
      render: (value: unknown, range: MaintenanceRange) => {
        if (range.type === 'corrective') {
          return <span className="text-gray-500 dark:text-gray-400">-</span>;
        }
        
        if (!range.frequency) {
          return <span className="text-gray-500 dark:text-gray-400">-</span>;
        }
        
        let planningText = '';
        switch (range.frequency) {
          case 'daily':
            const dayNames = [
              t("maintenanceRanges.sunday"),
              t("maintenanceRanges.monday"),
              t("maintenanceRanges.tuesday"),
              t("maintenanceRanges.wednesday"),
              t("maintenanceRanges.thursday"),
              t("maintenanceRanges.friday"),
              t("maintenanceRanges.saturday"),
            ];
            const selectedDays = range.daysOfWeek?.map(day => dayNames[day]).join(', ') || '';
            planningText = `${t("maintenanceRanges.daily")}: ${selectedDays}`;
            break;
          case 'monthly':
            planningText = `${t("maintenanceRanges.monthly")}`;
            if (range.startDate) {
              const date = new Date(range.startDate);
              const monthNames = [
                t("maintenanceRanges.january"),
                t("maintenanceRanges.february"),
                t("maintenanceRanges.march"),
                t("maintenanceRanges.april"),
                t("maintenanceRanges.may"),
                t("maintenanceRanges.june"),
                t("maintenanceRanges.july"),
                t("maintenanceRanges.august"),
                t("maintenanceRanges.september"),
                t("maintenanceRanges.october"),
                t("maintenanceRanges.november"),
                t("maintenanceRanges.december"),
              ];
              const monthName = monthNames[date.getMonth()];
              const year = date.getFullYear();
              planningText += ` (${monthName} ${year})`;
            }
            break;
          case 'yearly':
            planningText = `${t("maintenanceRanges.yearly")}`;
            if (range.startDate) {
              planningText += ` (${formatDateSafe(range.startDate)})`;
            }
            if (range.startTime) {
              planningText += ` ${range.startTime}`;
            }
            break;
        }
        
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {planningText}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: "createdAt" as keyof MaintenanceRange,
      label: t("common.createdAt"),
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("maintenanceRanges.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("maintenanceRanges.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRange(null);
              setSelectedOperations([]);
              setMaintenanceType('');
              setFrequency('');
              setSelectedDaysOfWeek([]);
              setSelectedYear(null);
              setSelectedMonth(null);
              setSelectedMonthYear(null);
              reset({
                name: "",
                description: "",
              });
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("maintenanceRanges.newRange")}
          </button>
        </div>
      </div>

      {/* Search and Item Count */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("maintenanceRanges.title")}
            {totalItems !== 1 ? "s" : ""}
          </span>
        </div>
        
        {/* Search Input */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="w-full sm:w-64 px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {isSearching && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={maintenanceRanges}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={(items) => {
              setSelectedRanges(items);
              setShowBulkDeleteModal(true);
            }}
            enableBulkDelete={true}
            selectedItems={selectedRanges}
            onSelectionChange={setSelectedRanges}
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
        className="mt-6"
      />

      {/* Add/Edit Maintenance Range Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRange(null);
          setSelectedOperations([]);
          setMaintenanceType('');
          setFrequency('');
          setSelectedDaysOfWeek([]);
          setSelectedYear(null);
          setSelectedMonth(null);
          setSelectedMonthYear(null);
          reset();
        }}
        title={
          editingRange
            ? t("maintenanceRanges.editRange")
            : t("maintenanceRanges.newRange")
        }
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>{t("maintenanceRanges.rangeName")}</FormLabel>
            <FormInput
              {...register("name")}
              error={errors.name?.message}
              placeholder={t("placeholders.maintenanceRangeName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("maintenanceRanges.description")}</FormLabel>
            <FormTextarea
              {...register("description")}
              error={errors.description?.message}
              placeholder={t("placeholders.maintenanceRangeDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("maintenanceRanges.type")}</FormLabel>
            <select
              value={maintenanceType}
              {...register("type")}
              onChange={(e) => {
                setMaintenanceType(e.target.value as 'preventive' | 'corrective' | '');
                // Limpiar campos de planificación al cambiar tipo
                if (e.target.value !== 'preventive') {
                  setFrequency('');
                  setSelectedDaysOfWeek([]);
                  setSelectedYear(null);
                  setSelectedMonth(null);
                  setSelectedMonthYear(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t("placeholders.selectType")}</option>
              <option value="preventive">{t("maintenanceRanges.preventive")}</option>
              <option value="corrective">{t("maintenanceRanges.corrective")}</option>
            </select>
          </FormGroup>

          {/* Campos de planificación solo para preventivo */}
          {maintenanceType === 'preventive' && (
            <>
              <FormGroup>
                <FormLabel required>{t("maintenanceRanges.frequency")}</FormLabel>
                <select
                  value={frequency}
                  onChange={(e) => {
                    setFrequency(e.target.value as 'daily' | 'monthly' | 'yearly' | '');
                    // Limpiar campos específicos al cambiar frecuencia
                    if (e.target.value !== 'daily') {
                      setSelectedDaysOfWeek([]);
                    }
                    if (e.target.value !== 'yearly') {
                      setSelectedYear(null);
                    }
                    if (e.target.value !== 'monthly') {
                      setSelectedMonth(null);
                      setSelectedMonthYear(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("placeholders.selectFrequency")}</option>
                  <option value="daily">{t("maintenanceRanges.daily")}</option>
                  <option value="monthly">{t("maintenanceRanges.monthly")}</option>
                  <option value="yearly">{t("maintenanceRanges.yearly")}</option>
                </select>
              </FormGroup>

              {/* Días de la semana para frecuencia diaria */}
              {frequency === 'daily' && (
                <FormGroup>
                  <FormLabel required>{t("maintenanceRanges.daysOfWeek")}</FormLabel>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { value: 0, label: t("maintenanceRanges.sunday") },
                      { value: 1, label: t("maintenanceRanges.monday") },
                      { value: 2, label: t("maintenanceRanges.tuesday") },
                      { value: 3, label: t("maintenanceRanges.wednesday") },
                      { value: 4, label: t("maintenanceRanges.thursday") },
                      { value: 5, label: t("maintenanceRanges.friday") },
                      { value: 6, label: t("maintenanceRanges.saturday") },
                    ].map((day) => (
                      <label key={day.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedDaysOfWeek.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDaysOfWeek([...selectedDaysOfWeek, day.value]);
                            } else {
                              setSelectedDaysOfWeek(selectedDaysOfWeek.filter(d => d !== day.value));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </FormGroup>
              )}

              {/* Selector de mes para frecuencia mensual */}
              {frequency === 'monthly' && (
                <FormGroup>
                  <FormLabel required>{t("maintenanceRanges.month")}</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowMonthModal(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {selectedMonth && selectedMonthYear 
                      ? `${t(`maintenanceRanges.${['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][selectedMonth - 1]}`)} ${selectedMonthYear}`
                      : t("maintenanceRanges.selectMonth")
                    }
                  </button>
                </FormGroup>
              )}

              {/* Selector de año para frecuencia anual */}
              {frequency === 'yearly' && (
                <FormGroup>
                  <FormLabel required>{t("maintenanceRanges.year")}</FormLabel>
                  <button
                    type="button"
                    onClick={() => setShowYearModal(true)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {selectedYear ? selectedYear : t("maintenanceRanges.selectYear")}
                  </button>
                </FormGroup>
              )}
            </>
          )}

          <FormGroup>
            <FormLabel>{t("maintenanceRanges.operations")}</FormLabel>
            <MultiSelect
              options={(operations || []).map((op) => ({
                value: op._id,
                label: op.name,
                description: op.description,
              }))}
              selectedValues={selectedOperations}
              onChange={setSelectedOperations}
              placeholder={t("placeholders.selectOperations")}
              error={errors.operations?.message}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("placeholders.operationsHelp")}
            </p>
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingRange(null);
                setSelectedOperations([]);
                setMaintenanceType('');
                setFrequency('');
                setSelectedDaysOfWeek([]);
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedMonthYear(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton type="submit" disabled={isSubmitting} onClick={() => console.log(errors)}>
              {isSubmitting
                ? t("common.saving")
                : editingRange
                ? t("common.update")
                : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={t("modals.confirmDeletion")}
        message={t("modals.deleteMaintenanceRangeMessage")}
        confirmText={t("common.delete")}
        variant="danger"
        itemDetails={
          rangeToDelete
            ? {
                name: rangeToDelete.name,
                description: rangeToDelete.description,
              }
            : undefined
        }
      />

      {/* Year Selector Modal */}
      <YearSelectorModal
        isOpen={showYearModal}
        onClose={() => setShowYearModal(false)}
        onSelectYear={handleYearSelect}
        selectedYear={selectedYear || undefined}
      />

      {/* Month Selector Modal */}
      <MonthSelectorModal
        isOpen={showMonthModal}
        onClose={() => setShowMonthModal(false)}
        onSelectMonth={handleMonthSelect}
        selectedMonth={selectedMonth || undefined}
        selectedYear={selectedMonthYear || undefined}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        selectedCount={selectedRanges.length}
        itemType={t("maintenanceRanges.title")}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
