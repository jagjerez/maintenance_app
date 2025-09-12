'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Form, FormGroup, FormLabel, FormInput, FormButton } from '@/components/Form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { machineModelSchema, MachineModelInput } from '@/lib/validations';
import toast from 'react-hot-toast';

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  year: number;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MachineModelsPage() {
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<MachineModel | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<MachineModel | null>(null);

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
    fetchMachineModels();
  }, []);

  const fetchMachineModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/machine-models');
      const data = await response.json();
      setMachineModels(data);
    } catch (error) {
      console.error('Error fetching machine models:', error);
      toast.error('Error al cargar los modelos de máquina');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MachineModelInput) => {
    try {
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
        fetchMachineModels();
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
    setValue('year', model.year);
    setValue('properties', model.properties);
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
        fetchMachineModels();
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
      key: 'year' as keyof MachineModel,
      label: 'Año',
    },
    {
      key: 'properties' as keyof MachineModel,
      label: 'Propiedades',
      render: (value: unknown) => {
        const properties = value as Record<string, unknown>;
        const count = Object.keys(properties).length;
        return count > 0 ? `${count} propiedades` : 'Sin propiedades';
      },
    },
    {
      key: 'createdAt' as keyof MachineModel,
      label: 'Creado',
      render: (value: unknown) => new Date(value as string).toLocaleDateString('es-ES'),
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
            <h1 className="text-3xl font-bold text-gray-900">Modelos de Máquina</h1>
            <p className="mt-2 text-gray-600">
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

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machineModels}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

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
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que quieres eliminar este modelo de máquina?
          </p>
          {modelToDelete && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{modelToDelete.name}</p>
              <p className="text-sm text-gray-500">{modelToDelete.manufacturer} - {modelToDelete.year}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </FormButton>
            <FormButton
              type="button"
              variant="danger"
              onClick={confirmDelete}
            >
              Eliminar
            </FormButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
