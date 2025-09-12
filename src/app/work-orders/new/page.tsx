'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workOrderSchema } from '@/lib/validations';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import DynamicProperties from '@/components/DynamicProperties';
import Modal from '@/components/Modal';
import { Plus } from 'lucide-react';
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
}

interface Operation {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number;
  requiredResources: string[];
}

interface MaintenanceRange {
  _id: string;
  name: string;
  type: 'preventive' | 'corrective';
  description: string;
  operations: Operation[];
}

interface WorkOrderFormData {
  machine: string;
  maintenanceRange: string;
  description: string;
  scheduledDate: string;
  assignedTo?: string;
  notes?: string;
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState<MaintenanceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal states for creating new entities
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showMaintenanceRangeModal, setShowMaintenanceRangeModal] = useState(false);
  const [showOperationModal, setShowOperationModal] = useState(false);
  
  // New entity forms
  const [newMachine, setNewMachine] = useState({
    model: '',
    location: '',
    properties: [] as Array<{ key: string; value: string }>,
  });
  const [newMaintenanceRange, setNewMaintenanceRange] = useState({
    name: '',
    type: 'preventive' as 'preventive' | 'corrective',
    description: '',
    operations: [] as string[],
  });
  const [newOperation, setNewOperation] = useState({
    name: '',
    description: '',
    estimatedTime: 0,
    requiredResources: [] as string[],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      scheduledDate: new Date().toISOString().split('T')[0],
    },
  });

  // const selectedMachine = watch('machine');
  // const selectedMaintenanceRange = watch('maintenanceRange');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesRes, rangesRes] = await Promise.all([
        fetch('/api/machines'),
        fetch('/api/maintenance-ranges'),
      ]);

      const [machinesData, rangesData] = await Promise.all([
        machinesRes.json(),
        rangesRes.json(),
      ]);

      setMachines(machinesData);
      setMaintenanceRanges(rangesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: WorkOrderFormData) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success('Orden de trabajo creada correctamente');
        router.push('/work-orders');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al crear la orden de trabajo');
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      toast.error('Error al crear la orden de trabajo');
    } finally {
      setSubmitting(false);
    }
  };

  const createMachine = async () => {
    try {
      // First create the machine model if it doesn't exist
      let modelId = newMachine.model;
      if (!modelId) {
        const modelResponse = await fetch('/api/machine-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Nuevo Modelo',
            manufacturer: 'Fabricante',
            year: new Date().getFullYear(),
          }),
        });
        const modelData = await modelResponse.json();
        modelId = modelData._id;
      }

      // Create the machine
      const machineResponse = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          location: newMachine.location,
          properties: newMachine.properties.reduce((acc, prop) => {
            if (prop.key && prop.value) {
              acc[prop.key] = prop.value;
            }
            return acc;
          }, {} as Record<string, unknown>),
        }),
      });

      if (machineResponse.ok) {
        const machineData = await machineResponse.json();
        setMachines([...machines, machineData]);
        setValue('machine', machineData._id);
        setShowMachineModal(false);
        setNewMachine({ model: '', location: '', properties: [] });
        toast.success('Máquina creada correctamente');
      } else {
        toast.error('Error al crear la máquina');
      }
    } catch (error) {
      console.error('Error creating machine:', error);
      toast.error('Error al crear la máquina');
    }
  };

  const createMaintenanceRange = async () => {
    try {
      const rangeResponse = await fetch('/api/maintenance-ranges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMaintenanceRange,
          operations: newMaintenanceRange.operations,
        }),
      });

      if (rangeResponse.ok) {
        const rangeData = await rangeResponse.json();
        setMaintenanceRanges([...maintenanceRanges, rangeData]);
        setValue('maintenanceRange', rangeData._id);
        setShowMaintenanceRangeModal(false);
        setNewMaintenanceRange({
          name: '',
          type: 'preventive',
          description: '',
          operations: [],
        });
        toast.success('Gama de mantenimiento creada correctamente');
      } else {
        toast.error('Error al crear la gama de mantenimiento');
      }
    } catch (error) {
      console.error('Error creating maintenance range:', error);
      toast.error('Error al crear la gama de mantenimiento');
    }
  };

  const createOperation = async () => {
    try {
      const operationResponse = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOperation),
      });

      if (operationResponse.ok) {
        const operationData = await operationResponse.json();
        setNewMaintenanceRange({
          ...newMaintenanceRange,
          operations: [...newMaintenanceRange.operations, operationData._id],
        });
        setShowOperationModal(false);
        setNewOperation({
          name: '',
          description: '',
          estimatedTime: 0,
          requiredResources: [],
        });
        toast.success('Operación creada correctamente');
      } else {
        toast.error('Error al crear la operación');
      }
    } catch (error) {
      console.error('Error creating operation:', error);
      toast.error('Error al crear la operación');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
        <p className="mt-2 text-gray-600">
          Crea una nueva orden de trabajo para el sistema de mantenimiento
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <Form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-6">
              {/* Machine Selection */}
              <FormGroup>
                <FormLabel required>Máquina</FormLabel>
                <div className="flex gap-2">
                  <FormSelect
                    {...register('machine')}
                    error={errors.machine?.message}
                    className="flex-1"
                  >
                    <option value="">Seleccionar máquina</option>
                    {machines.map((machine) => (
                      <option key={machine._id} value={machine._id}>
                        {machine.model.name} - {machine.location}
                      </option>
                    ))}
                  </FormSelect>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowMachineModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva
                  </FormButton>
                </div>
              </FormGroup>

              {/* Maintenance Range Selection */}
              <FormGroup>
                <FormLabel required>Gama de Mantenimiento</FormLabel>
                <div className="flex gap-2">
                  <FormSelect
                    {...register('maintenanceRange')}
                    error={errors.maintenanceRange?.message}
                    className="flex-1"
                  >
                    <option value="">Seleccionar gama</option>
                    {maintenanceRanges.map((range) => (
                      <option key={range._id} value={range._id}>
                        {range.name} ({range.type === 'preventive' ? 'Preventivo' : 'Correctivo'})
                      </option>
                    ))}
                  </FormSelect>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowMaintenanceRangeModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva
                  </FormButton>
                </div>
              </FormGroup>

              {/* Description */}
              <FormGroup>
                <FormLabel required>Descripción</FormLabel>
                <FormTextarea
                  {...register('description')}
                  error={errors.description?.message}
                  rows={3}
                  placeholder="Describe la orden de trabajo..."
                />
              </FormGroup>

              {/* Scheduled Date */}
              <FormGroup>
                <FormLabel required>Fecha Programada</FormLabel>
                <FormInput
                  type="date"
                  {...register('scheduledDate')}
                  error={errors.scheduledDate?.message}
                />
              </FormGroup>

              {/* Assigned To */}
              <FormGroup>
                <FormLabel>Asignado a</FormLabel>
                <FormInput
                  {...register('assignedTo')}
                  error={errors.assignedTo?.message}
                  placeholder="Nombre del técnico asignado"
                />
              </FormGroup>

              {/* Notes */}
              <FormGroup>
                <FormLabel>Notas</FormLabel>
                <FormTextarea
                  {...register('notes')}
                  error={errors.notes?.message}
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </FormGroup>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <FormButton
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancelar
              </FormButton>
              <FormButton
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Crear Orden'}
              </FormButton>
            </div>
          </Form>
        </div>
      </div>

      {/* Create Machine Modal */}
      <Modal
        isOpen={showMachineModal}
        onClose={() => setShowMachineModal(false)}
        title="Crear Nueva Máquina"
        size="lg"
      >
        <div className="space-y-4">
          <FormGroup>
            <FormLabel required>Ubicación</FormLabel>
            <FormInput
              value={newMachine.location}
              onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
              placeholder="Ubicación de la máquina"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Modelo de Máquina</FormLabel>
            <FormSelect
              value={newMachine.model}
              onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
            >
              <option value="">Seleccionar modelo existente</option>
              {/* This would be populated with existing models */}
            </FormSelect>
          </FormGroup>

          <DynamicProperties
            properties={newMachine.properties}
            onChange={(properties) => setNewMachine({ ...newMachine, properties })}
          />

          <div className="flex justify-end space-x-3">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setShowMachineModal(false)}
            >
              Cancelar
            </FormButton>
            <FormButton
              type="button"
              onClick={createMachine}
            >
              Crear Máquina
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Create Maintenance Range Modal */}
      <Modal
        isOpen={showMaintenanceRangeModal}
        onClose={() => setShowMaintenanceRangeModal(false)}
        title="Crear Nueva Gama de Mantenimiento"
        size="lg"
      >
        <div className="space-y-4">
          <FormGroup>
            <FormLabel required>Nombre</FormLabel>
            <FormInput
              value={newMaintenanceRange.name}
              onChange={(e) => setNewMaintenanceRange({ ...newMaintenanceRange, name: e.target.value })}
              placeholder="Nombre de la gama"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Tipo</FormLabel>
            <FormSelect
              value={newMaintenanceRange.type}
              onChange={(e) => setNewMaintenanceRange({ ...newMaintenanceRange, type: e.target.value as 'preventive' | 'corrective' })}
            >
              <option value="preventive">Preventivo</option>
              <option value="corrective">Correctivo</option>
            </FormSelect>
          </FormGroup>

          <FormGroup>
            <FormLabel required>Descripción</FormLabel>
            <FormTextarea
              value={newMaintenanceRange.description}
              onChange={(e) => setNewMaintenanceRange({ ...newMaintenanceRange, description: e.target.value })}
              placeholder="Descripción de la gama"
              rows={3}
            />
          </FormGroup>

          <div className="flex justify-end space-x-3">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setShowMaintenanceRangeModal(false)}
            >
              Cancelar
            </FormButton>
            <FormButton
              type="button"
              onClick={createMaintenanceRange}
            >
              Crear Gama
            </FormButton>
          </div>
        </div>
      </Modal>

      {/* Create Operation Modal */}
      <Modal
        isOpen={showOperationModal}
        onClose={() => setShowOperationModal(false)}
        title="Crear Nueva Operación"
        size="md"
      >
        <div className="space-y-4">
          <FormGroup>
            <FormLabel required>Nombre</FormLabel>
            <FormInput
              value={newOperation.name}
              onChange={(e) => setNewOperation({ ...newOperation, name: e.target.value })}
              placeholder="Nombre de la operación"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Descripción</FormLabel>
            <FormTextarea
              value={newOperation.description}
              onChange={(e) => setNewOperation({ ...newOperation, description: e.target.value })}
              placeholder="Descripción de la operación"
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>Tiempo Estimado (minutos)</FormLabel>
            <FormInput
              type="number"
              value={newOperation.estimatedTime}
              onChange={(e) => setNewOperation({ ...newOperation, estimatedTime: parseInt(e.target.value) || 0 })}
              placeholder="Tiempo en minutos"
            />
          </FormGroup>

          <div className="flex justify-end space-x-3">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setShowOperationModal(false)}
            >
              Cancelar
            </FormButton>
            <FormButton
              type="button"
              onClick={createOperation}
            >
              Crear Operación
            </FormButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
