'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, Clock, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { operationSchema } from '@/lib/validations';

interface Operation {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number;
  requiredResources: string[];
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function OperationsPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; operation: Operation | null }>({
    isOpen: false,
    operation: null,
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
    resolver: zodResolver(operationSchema),
    defaultValues: {
      requiredResources: [],
    },
  });

  // Fetch operations with pagination
  const fetchOperations = async (page = 1) => {
    try {
      const response = await fetch(`/api/operations?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data);
        setTotalPages(data.totalPages || Math.ceil((data.operations || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.operations || data).length);
      } else {
        toast.error(t("operations.operationLoadError"));
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast.error(t("operations.operationLoadError"));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchOperations(currentPage);
      setLoading(false);
    };
    loadData();
  }, [currentPage]);

  const onSubmit = async (data: { name: string; description: string; estimatedTime: number; requiredResources: string[]; companyId: string }) => {
    try {
      const url = editingOperation ? `/api/operations/${editingOperation._id}` : '/api/operations';
      const method = editingOperation ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          requiredResources: data.requiredResources,
          companyId: session?.user?.companyId,
        }),
      });

      if (response.ok) {
        await fetchOperations(currentPage);
        setShowModal(false);
        setEditingOperation(null);
        reset();
        toast.success(editingOperation ? t("operations.operationUpdated") : t("operations.operationCreated"));
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error('Error saving operation:', error);
      toast.error(t("operations.operationError"));
    }
  };

  const handleEdit = (operation: Operation) => {
    setEditingOperation(operation);
    reset({
      name: operation.name,
      description: operation.description,
      estimatedTime: operation.estimatedTime,
      requiredResources: operation.requiredResources,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.operation) return;

    try {
      const response = await fetch(`/api/operations/${deleteModal.operation._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchOperations(currentPage);
        setDeleteModal({ isOpen: false, operation: null });
        toast.success(t("operations.operationDeleted"));
      } else {
        toast.error(t("operations.operationError"));
      }
    } catch (error) {
      console.error('Error deleting operation:', error);
      toast.error(t("operations.operationError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('operations.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('operations.subtitle')}
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('operations.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('operations.subtitle')}
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("operations.operation")}{totalItems !== 1 ? 'es' : ''}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingOperation(null);
            reset();
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t("operations.newOperation")}</span>
        </FormButton>
      </div>

      {/* Operations List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {operations.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("operations.noOperations")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("operations.startAddingOperation")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {operations.map((operation) => (
              <div key={operation._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {operation.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {operation.description}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{operation.estimatedTime} min</span>
                          </div>
                          {operation.requiredResources.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <span>{t("operations.resources")}: {operation.requiredResources.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleEdit(operation)}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </FormButton>
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteModal({ isOpen: true, operation })}
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

      {/* Add/Edit Operation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingOperation(null);
          reset();
        }}
        title={editingOperation ? t("operations.editOperation") : t("operations.newOperation")}
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
            <FormLabel required>{t("operations.operationName")}</FormLabel>
            <FormInput
              {...register('name')}
              error={errors.name?.message}
              placeholder={t("placeholders.operationName")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("operations.description")}</FormLabel>
            <FormTextarea
              {...register('description')}
              error={errors.description?.message}
              placeholder={t("placeholders.operationDescription")}
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("operations.estimatedTime")}</FormLabel>
            <FormInput
              type="number"
              {...register('estimatedTime', { valueAsNumber: true })}
              error={errors.estimatedTime?.message}
              placeholder={t("placeholders.estimatedTimeMinutes")}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("operations.requiredResources")}</FormLabel>
            <FormInput
              {...register('requiredResources')}
              error={errors.requiredResources?.message}
              placeholder={t("placeholders.requiredResources")}
            />
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingOperation(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.saving") : editingOperation ? t("common.update") : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, operation: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteOperation")}
        message={t("modals.deleteOperationMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={deleteModal.operation ? {
          name: deleteModal.operation.name,
          description: deleteModal.operation.description,
        } : undefined}
      />
    </div>
  );
}