'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { formatDate, getStatusColor, getTypeColor } from '@/lib/utils';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { FormGroup, FormLabel, FormSelect, FormButton } from '@/components/Form';
import toast from 'react-hot-toast';

interface WorkOrder {
  _id: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  machine: {
    _id: string;
    location: string;
    model: {
      name: string;
      manufacturer: string;
    };
  };
  maintenanceRange: {
    name: string;
    type: 'preventive' | 'corrective';
  };
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const response = await fetch(`/api/work-orders?${params.toString()}`);
      const data = await response.json();
      setWorkOrders(data);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error('Error al cargar las órdenes de trabajo');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleDelete = async (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedWorkOrder) return;

    try {
      const response = await fetch(`/api/work-orders/${selectedWorkOrder._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Orden de trabajo eliminada correctamente');
        fetchWorkOrders();
      } else {
        toast.error('Error al eliminar la orden de trabajo');
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast.error('Error al eliminar la orden de trabajo');
    } finally {
      setShowDeleteModal(false);
      setSelectedWorkOrder(null);
    }
  };

  const handleStatusChange = async (workOrder: WorkOrder, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const response = await fetch(`/api/work-orders/${workOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          completedDate: newStatus === 'completed' ? new Date().toISOString() : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Estado actualizado correctamente');
        fetchWorkOrders();
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const filteredWorkOrders = workOrders.filter(workOrder => {
    const matchesSearch = workOrder.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workOrder.machine.model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workOrder.machine.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || workOrder.status === statusFilter;
    const matchesType = !typeFilter || workOrder.maintenanceRange.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns = [
    {
      key: 'description' as keyof WorkOrder,
      label: 'Descripción',
      className: 'max-w-xs',
    },
    {
      key: 'machine' as keyof WorkOrder,
      label: 'Máquina',
      render: (value: unknown) => {
        const machine = value as WorkOrder['machine'];
        return (
          <div>
            <div className="font-medium">{machine.model.name}</div>
            <div className="text-gray-500 text-sm">{machine.location}</div>
          </div>
        );
      },
    },
    {
      key: 'maintenanceRange' as keyof WorkOrder,
      label: 'Tipo',
      render: (value: unknown) => {
        const range = value as WorkOrder['maintenanceRange'];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(range.type)}`}>
            {range.type === 'preventive' ? 'Preventivo' : 'Correctivo'}
          </span>
        );
      },
    },
    {
      key: 'status' as keyof WorkOrder,
      label: 'Estado',
      render: (value: unknown, workOrder: WorkOrder) => {
        const status = value as string;
        return (
        <select
          value={status}
          onChange={(e) => handleStatusChange(workOrder, e.target.value as 'pending' | 'in_progress' | 'completed')}
          className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${getStatusColor(status)}`}
        >
          <option value="pending">Pendiente</option>
          <option value="in_progress">En Progreso</option>
          <option value="completed">Completada</option>
        </select>
        );
      },
    },
    {
      key: 'scheduledDate' as keyof WorkOrder,
      label: 'Fecha Programada',
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: 'assignedTo' as keyof WorkOrder,
      label: 'Asignado a',
      render: (value: unknown) => (value as string) || 'Sin asignar',
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
            <h1 className="text-3xl font-bold text-gray-900">Órdenes de Trabajo</h1>
            <p className="mt-2 text-gray-600">
              Gestiona las órdenes de trabajo del sistema
            </p>
          </div>
          <Link
            href="/work-orders/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Filtros
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <FormGroup>
                <FormLabel>Estado</FormLabel>
                <FormSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completada</option>
                </FormSelect>
              </FormGroup>

              <FormGroup>
                <FormLabel>Tipo</FormLabel>
                <FormSelect
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  <option value="preventive">Preventivo</option>
                  <option value="corrective">Correctivo</option>
                </FormSelect>
              </FormGroup>
            </div>
          )}
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <DataTable
            data={filteredWorkOrders}
            columns={columns}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que quieres eliminar esta orden de trabajo?
          </p>
          {selectedWorkOrder && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{selectedWorkOrder.description}</p>
              <p className="text-sm text-gray-500">
                {selectedWorkOrder.machine.model.name} - {selectedWorkOrder.machine.location}
              </p>
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
