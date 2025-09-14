'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import { workOrderSchema } from '@/lib/validations';

interface Machine {
  _id: string;
  location: string;
  model: {
    name: string;
    manufacturer: string;
  };
}

interface MaintenanceRange {
  _id: string;
  name: string;
  type: 'preventive' | 'corrective';
}

interface WorkOrder {
  _id: string;
  machine: Machine;
  maintenanceRange: MaintenanceRange;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function WorkOrdersPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [maintenanceRanges, setMaintenanceRanges] = useState<MaintenanceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; workOrder: WorkOrder | null }>({
    isOpen: false,
    workOrder: null,
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
    resolver: zodResolver(workOrderSchema),
  });

  // Fetch work orders with pagination
  const fetchWorkOrders = async (page = 1) => {
    try {
      const response = await fetch(`/api/work-orders?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.workOrders || data);
        setTotalPages(data.totalPages || Math.ceil((data.workOrders || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.workOrders || data).length);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    }
  };

  // Fetch machines and maintenance ranges for dropdowns
  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/machines');
      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines || data);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchMaintenanceRanges = async () => {
    try {
      const response = await fetch('/api/maintenance-ranges');
      if (response.ok) {
        const data = await response.json();
        setMaintenanceRanges(data.maintenanceRanges || data);
      }
    } catch (error) {
      console.error('Error fetching maintenance ranges:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkOrders(currentPage), fetchMachines(), fetchMaintenanceRanges()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage]);

  const onSubmit = async (data: any) => {
    try {
      const url = editingWorkOrder ? `/api/work-orders/${editingWorkOrder._id}` : '/api/work-orders';
      const method = editingWorkOrder ? 'PUT' : 'POST';

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
        await fetchWorkOrders(currentPage);
        setShowModal(false);
        setEditingWorkOrder(null);
        reset();
      }
    } catch (error) {
      console.error('Error saving work order:', error);
    }
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    reset({
      machine: workOrder.machine._id,
      maintenanceRange: workOrder.maintenanceRange._id,
      status: workOrder.status,
      description: workOrder.description,
      scheduledDate: workOrder.scheduledDate.split('T')[0],
      completedDate: workOrder.completedDate ? workOrder.completedDate.split('T')[0] : '',
      assignedTo: workOrder.assignedTo || '',
      notes: workOrder.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.workOrder) return;

    try {
      const response = await fetch(`/api/work-orders/${deleteModal.workOrder._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        setDeleteModal({ isOpen: false, workOrder: null });
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('workOrders.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestiona las órdenes de trabajo del sistema
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('workOrders.title')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gestiona las órdenes de trabajo del sistema
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} orden{totalItems !== 1 ? 'es' : ''}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingWorkOrder(null);
            reset();
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Orden</span>
        </FormButton>
      </div>

      {/* Work Orders List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {workOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No hay órdenes de trabajo
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comienza agregando una nueva orden de trabajo al sistema.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {workOrders.map((workOrder) => (
              <div key={workOrder._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                            {workOrder.machine.model.name} - {workOrder.machine.location}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                            {getStatusLabel(workOrder.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {workOrder.description}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(workOrder.scheduledDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>{workOrder.maintenanceRange.name}</span>
                          </div>
                          {workOrder.assignedTo && (
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{workOrder.assignedTo}</span>
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
                      onClick={() => handleEdit(workOrder)}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </FormButton>
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => setDeleteModal({ isOpen: true, workOrder })}
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

      {/* Add/Edit Work Order Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingWorkOrder(null);
          reset();
        }}
        title={editingWorkOrder ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
        size="lg"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Campo oculto para companyId */}
          <input
            type="hidden"
            {...register('companyId')}
            value={session?.user?.companyId || ''}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Máquina</FormLabel>
              <FormSelect
                {...register('machine')}
                error={errors.machine?.message}
              >
                <option value="">Selecciona una máquina</option>
                {machines.map((machine) => (
                  <option key={machine._id} value={machine._id}>
                    {machine.model.name} - {machine.location}
                  </option>
                ))}
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel required>Rango de Mantenimiento</FormLabel>
              <FormSelect
                {...register('maintenanceRange')}
                error={errors.maintenanceRange?.message}
              >
                <option value="">Selecciona un rango</option>
                {maintenanceRanges.map((range) => (
                  <option key={range._id} value={range._id}>
                    {range.name} ({range.type === 'preventive' ? 'Preventivo' : 'Correctivo'})
                  </option>
                ))}
              </FormSelect>
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel required>Descripción</FormLabel>
            <FormTextarea
              {...register('description')}
              error={errors.description?.message}
              placeholder="Descripción de la orden de trabajo"
              rows={3}
            />
          </FormGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>Fecha Programada</FormLabel>
              <FormInput
                type="date"
                {...register('scheduledDate')}
                error={errors.scheduledDate?.message}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>Fecha de Completado</FormLabel>
              <FormInput
                type="date"
                {...register('completedDate')}
                error={errors.completedDate?.message}
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>Estado</FormLabel>
              <FormSelect
                {...register('status')}
                error={errors.status?.message}
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel>Asignado a</FormLabel>
              <FormInput
                {...register('assignedTo')}
                error={errors.assignedTo?.message}
                placeholder="Nombre del técnico"
              />
            </FormGroup>
          </div>

          <FormGroup>
            <FormLabel>Notas</FormLabel>
            <FormTextarea
              {...register('notes')}
              error={errors.notes?.message}
              placeholder="Notas adicionales"
              rows={2}
            />
          </FormGroup>

          <div className="flex justify-end space-x-3 mt-6">
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingWorkOrder(null);
                reset();
              }}
            >
              Cancelar
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : editingWorkOrder ? 'Actualizar' : 'Crear'}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, workOrder: null })}
        onConfirm={handleDelete}
        title="Eliminar Orden de Trabajo"
        message="¿Estás seguro de que quieres eliminar esta orden de trabajo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        itemDetails={deleteModal.workOrder ? {
          name: `${deleteModal.workOrder.machine.model.name} - ${deleteModal.workOrder.machine.location}`,
          description: deleteModal.workOrder.description,
        } : undefined}
      />
    </div>
  );
}