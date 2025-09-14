'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, List, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { maintenanceRangeSchema } from '@/lib/validations';

interface Operation {
  _id: string;
  name: string;
  description: string;
}

interface MaintenanceRange {
  _id: string;
  name: string;
  type: 'preventive' | 'corrective';
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
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; range: MaintenanceRange | null }>({
    isOpen: false,
    range: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
  const fetchMaintenanceRanges = async (page = 1) => {
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
  };

  // Fetch operations for dropdown
  const fetchOperations = async () => {
    try {
      const response = await fetch('/api/operations');
      if (response.ok) {
        const data = await response.json();
        setOperations(data);
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast.error(t("operations.operationError"));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMaintenanceRanges(currentPage), fetchOperations()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage]);

  const onSubmit = async (data: { name: string; type: string; description: string; operations: string[]; companyId: string }) => {
    try {
      const url = editingRange ? `/api/maintenance-ranges/${editingRange._id}` : '/api/maintenance-ranges';
      const method = editingRange ? 'PUT' : 'POST';

      // Operations is already an array
      const operationsArray = data.operations || [];

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          operations: operationsArray,
          companyId: session?.user?.companyId,
        }),
      });

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage);
        setShowModal(false);
        setEditingRange(null);
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
    reset({
      name: range.name,
      type: range.type,
      description: range.description,
      operations: range.operations.map(op => op.name),
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.range) return;

    try {
      const response = await fetch(`/api/maintenance-ranges/${deleteModal.range._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchMaintenanceRanges(currentPage);
        setDeleteModal({ isOpen: false, range: null });
        toast.success(t("maintenanceRanges.rangeDeleted"));
      } else {
        toast.error(t("maintenanceRanges.rangeError"));
      }
    } catch (error) {
      console.error('Error deleting maintenance range:', error);
      toast.error(t("maintenanceRanges.rangeError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTypeColor = (type: string) => {
    return type === 'preventive' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const getTypeLabel = (type: string) => {
    return type === 'preventive' ? t("maintenanceRanges.preventive") : t("maintenanceRanges.corrective");
  };

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

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <List className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("maintenanceRanges.range")}{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingRange(null);
            reset();
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t("maintenanceRanges.newRange")}</span>
        </FormButton>
      </div>

      {/* Maintenance Ranges List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {maintenanceRanges.length === 0 ? (
          <div className="text-center py-12">
            <List className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("maintenanceRanges.noRanges")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("maintenanceRanges.startAddingRange")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {maintenanceRanges.map((range) => (
              <div key={range._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <List className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                            {range.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(range.type)}`}>
                            {getTypeLabel(range.type)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {range.description}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Wrench className="h-4 w-4" />
                            <span>{range.operations.length} {t("maintenanceRanges.operationsCount")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleEdit(range)}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </FormButton>
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteModal({ isOpen: true, range })}
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          reset();
        }}
        title={editingRange ? t("maintenanceRanges.editRange") : t("maintenanceRanges.newRange")}
        size="md"
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
            <FormLabel required>{t("maintenanceRanges.type")}</FormLabel>
            <FormSelect
              {...register('type')}
              error={errors.type?.message}
            >
              <option value="">{t("maintenanceRanges.selectType")}</option>
              <option value="preventive">{t("maintenanceRanges.preventive")}</option>
              <option value="corrective">{t("maintenanceRanges.corrective")}</option>
            </FormSelect>
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
            <FormInput
              {...register('operations')}
              error={errors.operations?.message}
              placeholder={t("placeholders.operationNames")}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("placeholders.operationNamesHelp")}
            </p>
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingRange(null);
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
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, range: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteMaintenanceRange")}
        message={t("modals.deleteMaintenanceRangeMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={deleteModal.range ? {
          name: deleteModal.range.name,
          description: deleteModal.range.description,
        } : undefined}
      />
    </div>
  );
}