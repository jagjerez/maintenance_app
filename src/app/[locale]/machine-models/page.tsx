'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { machineModelSchema } from '@/lib/validations';
import { formatDateSafe } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useTranslations } from '@/hooks/useTranslations';

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  brand: string;
  year: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function MachineModelsPage() {
  const { data: session } = useSession();
  const { t } = useTranslations();
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<MachineModel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<MachineModel | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(machineModelSchema),
  });

  useEffect(() => {
    fetchMachineModels(currentPage);
  }, [currentPage]);

  const fetchMachineModels = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/machine-models?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setMachineModels(data.machineModels || data);
        setTotalPages(data.totalPages || Math.ceil((data.machineModels || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.machineModels || data).length);
      } else {
        toast.error('Error al cargar los modelos de máquinas');
      }
    } catch (error) {
      console.error('Error fetching machine models:', error);
      toast.error('Error al cargar los modelos de máquinas');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: { name: string; manufacturer: string; brand: string; year: number; companyId: string; }) => {
    try {
      if (!session?.user?.companyId) {
        toast.error('No se pudo obtener la información de la empresa');
        return;
      }

      const url = editingModel ? `/api/machine-models/${editingModel._id}` : '/api/machine-models';
      const method = editingModel ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingModel ? 'Modelo actualizado correctamente' : 'Modelo creado correctamente');
        fetchMachineModels(currentPage);
        setShowModal(false);
        setEditingModel(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar el modelo');
      }
    } catch (error) {
      console.error('Error saving machine model:', error);
      toast.error('Error al guardar el modelo');
    }
  };

  const handleEdit = (model: MachineModel) => {
    setEditingModel(model);
    setValue('name', model.name);
    setValue('manufacturer', model.manufacturer);
    setValue('brand', model.brand);
    setValue('year', model.year);
    setShowModal(true);
  };

  const handleDelete = (model: MachineModel) => {
    setModelToDelete(model);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;

    try {
      const response = await fetch(`/api/machine-models/${modelToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Modelo eliminado correctamente');
        fetchMachineModels(currentPage);
      } else {
        toast.error('Error al eliminar el modelo');
      }
    } catch (error) {
      console.error('Error deleting machine model:', error);
      toast.error('Error al eliminar el modelo');
    } finally {
      setShowDeleteModal(false);
      setModelToDelete(null);
    }
  };

  const openCreateModal = () => {
    setEditingModel(null);
    reset();
    setShowModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns = [
    {
      key: 'name' as keyof MachineModel,
      label: 'Nombre',
    },
    {
      key: 'manufacturer' as keyof MachineModel,
      label: 'Fabricante',
    },
    {
      key: 'brand' as keyof MachineModel,
      label: 'Marca',
    },
    {
      key: 'year' as keyof MachineModel,
      label: 'Año',
    },
    {
      key: 'createdAt' as keyof MachineModel,
      label: 'Creado',
      render: (value: unknown) => formatDateSafe(value as string),
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('machineModels.title')}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Gestiona los modelos de máquinas del sistema
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Modelo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machineModels}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingModel(null);
          reset();
        }}
        title={editingModel ? 'Editar Modelo' : 'Nuevo Modelo'}
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
            <FormLabel required>Nombre</FormLabel>
            <FormInput
              {...register('name')}
              error={errors.name?.message}
              placeholder="Nombre del modelo"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Fabricante</FormLabel>
            <FormInput
              {...register('manufacturer')}
              error={errors.manufacturer?.message}
              placeholder="Nombre del fabricante"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Marca</FormLabel>
            <FormInput
              {...register('brand')}
              error={errors.brand?.message}
              placeholder="Marca del fabricante"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Año</FormLabel>
            <FormInput
              type="number"
              {...register('year', { valueAsNumber: true })}
              error={errors.year?.message}
              placeholder="Año de fabricación"
            />
          </FormGroup>


          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingModel(null);
                reset();
              }}
            >
              Cancelar
            </FormButton>
            <FormButton type="submit">
              {editingModel ? 'Actualizar' : 'Crear'}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar este modelo de máquina?"
        confirmText="Eliminar"
        variant="danger"
        itemDetails={modelToDelete ? {
          name: modelToDelete.name,
          description: `${modelToDelete.manufacturer} - ${modelToDelete.year}`
        } : undefined}
      />
    </div>
  );
}
