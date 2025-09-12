'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { Form, FormGroup, FormLabel, FormInput, FormSelect, FormButton } from '@/components/Form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { machineSchema, MachineInput } from '@/lib/validations';
import toast from 'react-hot-toast';

interface MachineModel {
  _id: string;
  name: string;
  manufacturer: string;
  year: number;
}

interface Machine {
  _id: string;
  location: string;
  model: MachineModel;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(machineSchema),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesRes, modelsRes] = await Promise.all([
        fetch('/api/machines'),
        fetch('/api/machine-models'),
      ]);

      const [machinesData, modelsData] = await Promise.all([
        machinesRes.json(),
        modelsRes.json(),
      ]);

      setMachines(machinesData);
      setMachineModels(modelsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: MachineInput) => {
    try {
      const url = editingMachine ? `/api/machines/${editingMachine._id}` : '/api/machines';
      const method = editingMachine ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingMachine ? 'Máquina actualizada correctamente' : 'Máquina creada correctamente');
        fetchData();
        setShowModal(false);
        setEditingMachine(null);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar la máquina');
      }
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error('Error al guardar la máquina');
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setValue('model', machine.model._id);
    setValue('location', machine.location);
    setValue('properties', machine.properties);
    setShowModal(true);
  };

  const handleDelete = (machine: Machine) => {
    setMachineToDelete(machine);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!machineToDelete) return;

    try {
      const response = await fetch(`/api/machines/${machineToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Máquina eliminada correctamente');
        fetchData();
      } else {
        toast.error('Error al eliminar la máquina');
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast.error('Error al eliminar la máquina');
    } finally {
      setShowDeleteModal(false);
      setMachineToDelete(null);
    }
  };

  const openCreateModal = () => {
    setEditingMachine(null);
    reset();
    setShowModal(true);
  };

  const columns = [
    {
      key: 'model' as keyof Machine,
      label: 'Modelo',
      render: (value: unknown) => {
        const model = value as MachineModel;
        return (
          <div>
            <div className="font-medium">{model.name}</div>
            <div className="text-gray-500 text-sm">{model.manufacturer} - {model.year}</div>
          </div>
        );
      },
    },
    {
      key: 'location' as keyof Machine,
      label: 'Ubicación',
    },
    {
      key: 'properties' as keyof Machine,
      label: 'Propiedades',
      render: (value: unknown) => {
        const properties = value as Record<string, unknown>;
        const count = Object.keys(properties).length;
        return count > 0 ? `${count} propiedades` : 'Sin propiedades';
      },
    },
    {
      key: 'createdAt' as keyof Machine,
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
            <h1 className="text-3xl font-bold text-gray-900">Máquinas</h1>
            <p className="mt-2 text-gray-600">
              Gestiona las máquinas del sistema
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Máquina
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={machines}
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
          setEditingMachine(null);
          reset();
        }}
        title={editingMachine ? 'Editar Máquina' : 'Nueva Máquina'}
        size="md"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <FormLabel required>Modelo</FormLabel>
            <FormSelect
              {...register('model')}
              error={errors.model?.message}
            >
              <option value="">Seleccionar modelo</option>
              {machineModels.map((model) => (
                <option key={model._id} value={model._id}>
                  {model.name} - {model.manufacturer} ({model.year})
                </option>
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel required>Ubicación</FormLabel>
            <FormInput
              {...register('location')}
              error={errors.location?.message}
              placeholder="Ubicación de la máquina"
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
              Cancelar
            </FormButton>
            <FormButton type="submit">
              {editingMachine ? 'Actualizar' : 'Crear'}
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
            ¿Estás seguro de que quieres eliminar esta máquina?
          </p>
          {machineToDelete && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{machineToDelete.model.name}</p>
              <p className="text-sm text-gray-500">{machineToDelete.location}</p>
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
