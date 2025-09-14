'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, MapPin, Wrench } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormSelect, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { machineSchema } from '@/lib/validations';

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  brand: string;
  year: number;
}

interface Machine {
  _id: string;
  model: {
    _id: string;
    name: string;
    manufacturer: string;
    brand: string;
    year: number;
  };
  location: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MachinesPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; machine: Machine | null }>({
    isOpen: false,
    machine: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const ITEMS_PER_PAGE = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(machineSchema),
    defaultValues: {
      properties: {},
    },
  });

  // Fetch machines with pagination
  const fetchMachines = useCallback(async (page = 1) => {
    try {
      const response = await fetch(`/api/machines?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines || data);
        setTotalPages(data.totalPages || Math.ceil((data.machines || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.machines || data).length);
      } else {
        toast.error(t("machines.machineLoadError"));
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error(t("machines.machineLoadError"));
    }
  }, [t]);

  // Fetch machine models
  const fetchMachineModels = useCallback(async () => {
    try {
      const response = await fetch('/api/machine-models');
      if (response.ok) {
        const data = await response.json();
        setMachineModels(data);
      } else {
        toast.error(t("machineModels.modelError"));
      }
    } catch (error) {
      console.error('Error fetching machine models:', error);
      toast.error(t("machineModels.modelError"));
    }
  }, [t]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMachines(currentPage), fetchMachineModels()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, fetchMachines, fetchMachineModels]);

  // Check if we should open the modal automatically (from dashboard)
  useEffect(() => {
    if (searchParams.get('new') === 'true' && !loading && machineModels.length > 0) {
      setShowModal(true);
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, loading, machineModels.length]);

  const onSubmit = async (data: { model: string; location: string; properties: Record<string, unknown>; companyId: string }) => {
    try {
      if (!session?.user?.companyId) {
        toast.error(t("machines.companyError"));
        return;
      }

      const url = editingMachine ? `/api/machines/${editingMachine._id}` : '/api/machines';
      const method = editingMachine ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyId: session?.user?.companyId,
        }),
      });

      if (response.ok) {
        toast.success(editingMachine ? t("machines.machineUpdated") : t("machines.machineCreated"));
        await fetchMachines(currentPage);
        setShowModal(false);
        setEditingMachine(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || t("machines.machineError"));
      }
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error(t("machines.machineError"));
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    reset({
      model: machine.model._id,
      location: machine.location,
      properties: machine.properties,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.machine) return;

    try {
      const response = await fetch(`/api/machines/${deleteModal.machine._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t("machines.machineDeleted"));
        await fetchMachines(currentPage);
        setDeleteModal({ isOpen: false, machine: null });
      } else {
        toast.error(t("machines.machineError"));
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast.error(t("machines.machineError"));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('machines.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t("machines.subtitle")}
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('machines.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("machines.subtitle")}
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Wrench className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("common.machine")}{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingMachine(null);
            reset();
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t("machines.newMachine")}</span>
        </FormButton>
      </div>

      {/* Machines List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {machines.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("machines.noMachines")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("machines.startAddingMachine")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {machines.map((machine) => (
              <div key={machine._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Wrench className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                          {machine.model.name}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">{machine.model.manufacturer}</span>
                            <span>•</span>
                            <span>{machine.model.brand}</span>
                            <span>•</span>
                            <span>{machine.model.year}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{machine.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => handleEdit(machine)}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </FormButton>
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteModal({ isOpen: true, machine })}
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

      {/* Add/Edit Machine Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingMachine(null);
          reset();
        }}
        title={editingMachine ? t("machines.editMachine") : t("machines.newMachine")}
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
            <FormLabel required>{t("machines.machineModel")}</FormLabel>
            <FormSelect
              {...register('model')}
              error={errors.model?.message}
            >
              <option value="">{t("machines.selectModel")}</option>
              {machineModels.map((model) => (
                <option key={model._id} value={model._id}>
                  {model.name} - {model.manufacturer} {model.brand} ({model.year})
                </option>
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("machines.location")}</FormLabel>
            <FormInput
              {...register('location')}
              error={errors.location?.message}
              placeholder={t("placeholders.machineLocation")}
            />
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingMachine(null);
                reset();
              }}
            >
              {t("common.cancel")}
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.saving") : editingMachine ? t("common.update") : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, machine: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteMachine")}
        message={t("modals.deleteMachineMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={deleteModal.machine ? {
          name: deleteModal.machine.model.name,
          description: `${deleteModal.machine.model.manufacturer} ${deleteModal.machine.model.brand} - ${deleteModal.machine.location}`,
        } : undefined}
      />
    </div>
  );
}