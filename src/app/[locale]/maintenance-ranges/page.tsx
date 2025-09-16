'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import MultiSelect from '@/components/MultiSelect';
import { maintenanceRangeSchema } from '@/lib/validations';
import { formatDateSafe } from '@/lib/utils';

interface Operation {
  _id: string;
  name: string;
  description: string;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  description: string;
  operations: Operation[];
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function MaintenanceRangesPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [maintenanceRanges, setMaintenanceRanges] = useState<MaintenanceRange[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRange, setEditingRange] = useState<MaintenanceRange | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rangeToDelete, setRangeToDelete] = useState<MaintenanceRange | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);

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

  // Fetch maintenance ranges with pagination
  const fetchMaintenanceRanges = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/maintenance-ranges?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setMaintenanceRanges(data.maintenanceRanges || data);
        setTotalPages(data.totalPages || Math.ceil((data.maintenanceRanges || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.maintenanceRanges || data).length);
      } else {
        toast.error(t("maintenanceRanges.rangeLoadError"));
      }
    } catch (error) {
      console.error('Error fetching maintenance ranges:', error);
      toast.error(t("maintenanceRanges.rangeLoadError"));
    }
  }, [t]);

  // Fetch operations for dropdown
  const fetchOperations = useCallback(async () => {
    try {
      const response = await fetch('/api/operations?limit=1000'); // Get all operations for dropdown
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data); // Handle both paginated and non-paginated responses
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast.error(t("operations.operationError"));
    }
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMaintenanceRanges(currentPage), fetchOperations()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, fetchMaintenanceRanges, fetchOperations]);

  const onSubmit = async (data: { name: string; description: string; companyId: string }) => {
    try {
      const url = editingRange ? `/api/maintenance-ranges/${editingRange._id}` : '/api/maintenance-ranges';
      const method = editingRange ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          operations: selectedOperations,
        }),
      });

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage);
        setShowModal(false);
        setEditingRange(null);
        setSelectedOperations([]);
        reset();
        toast.success(editingRange ? t("maintenanceRanges.rangeUpdated") : t("maintenanceRanges.rangeCreated"));
      } else {
        toast.error(t("maintenanceRanges.rangeError"));
      }
    } catch (error) {
      console.error('Error saving maintenance range:', error);
      toast.error(t("maintenanceRanges.rangeError"));
    }
  };

  const handleEdit = (range: MaintenanceRange) => {
    setEditingRange(range);
    setSelectedOperations(range.operations.map(op => op._id));
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
      const response = await fetch(`/api/maintenance-ranges/${rangeToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage);
        toast.success(t("maintenanceRanges.rangeDeleted"));
      } else {
        const errorData = await response.json();
        
        // Check if it's a validation error (range in use)
        if (response.status === 400 && errorData.workOrdersCount) {
          toast.error(
            t("maintenanceRanges.rangeInUse", { 
              count: errorData.workOrdersCount,
              workOrders: errorData.workOrdersCount > 1 ? t("common.workOrders") : t("common.workOrder")
            })
          );
        } else {
          toast.error(errorData.message || t("maintenanceRanges.rangeError"));
        }
      }
    } catch (error) {
      console.error('Error deleting maintenance range:', error);
      toast.error(t("maintenanceRanges.rangeError"));
    } finally {
      setShowDeleteModal(false);
      setRangeToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: 'name' as keyof MaintenanceRange,
      label: t("maintenanceRanges.rangeName"),
    },
    {
      key: 'description' as keyof MaintenanceRange,
      label: t("maintenanceRanges.description"),
      render: (value: unknown) => (value as string) || '-',
    },
    {
      key: 'operations' as keyof MaintenanceRange,
      label: t("maintenanceRanges.operations"),
      render: (value: unknown) => {
        const operations = value as Operation[];
        return operations?.length || 0;
      },
    },
    {
      key: 'createdAt' as keyof MaintenanceRange,
      label: t("common.createdAt"),
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('maintenanceRanges.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('maintenanceRanges.subtitle')}
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('maintenanceRanges.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('maintenanceRanges.subtitle')}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('maintenanceRanges.title')}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("maintenanceRanges.subtitle")}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRange(null);
              setSelectedOperations([]);
              reset();
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("maintenanceRanges.newRange")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={maintenanceRanges}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
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
          reset();
        }}
        title={editingRange ? t("maintenanceRanges.editRange") : t("maintenanceRanges.newRange")}
        size="xl"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Campo oculto para companyId */}
          <input
            type="hidden"
            {...register('companyId')}
            value={session?.user?.companyId || ''}
          />
          
          <FormGroup>
            <FormLabel required>{t("maintenanceRanges.rangeName")}</FormLabel>
            <FormInput
              {...register('name')}
              error={errors.name?.message}
              placeholder={t("placeholders.maintenanceRangeName")}
            />
          </FormGroup>


          <FormGroup>
            <FormLabel required>{t("maintenanceRanges.description")}</FormLabel>
            <FormTextarea
              {...register('description')}
              error={errors.description?.message}
              placeholder={t("placeholders.maintenanceRangeDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("maintenanceRanges.operations")}</FormLabel>
            <MultiSelect
              options={(operations || []).map(op => ({
                value: op._id,
                label: op.name,
                description: op.description
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
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.saving") : editingRange ? t("common.update") : t("common.create")}
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
        itemDetails={rangeToDelete ? {
          name: rangeToDelete.name,
          description: rangeToDelete.description,
        } : undefined}
      />
    </div>
  );
}