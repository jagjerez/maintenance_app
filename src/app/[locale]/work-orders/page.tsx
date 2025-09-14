'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Edit, Trash2, FileText, Calendar, User, AlertCircle, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { Pagination } from '@/components/Pagination';
import MultiSelect from '@/components/MultiSelect';
import DynamicProperties from '@/components/DynamicProperties';
import FilledOperationsManager from '@/components/FilledOperationsManager';
import { workOrderSchema, WorkOrderInput } from '@/lib/validations';
import { IFilledOperation } from '@/models/WorkOrder';
import { IOperation } from '@/models/Operation';

interface Machine {
  _id: string;
  location: string;
  model: {
    name: string;
    manufacturer: string;
  };
  operations?: IOperation[];
  maintenanceRanges?: Array<{
    _id: string;
    name: string;
    type: 'preventive' | 'corrective';
    operations: IOperation[];
  }>;
}

interface WorkOrder {
  _id: string;
  customCode?: string;
  machines: Machine[];
  type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  operations: IOperation[];
  filledOperations: IFilledOperation[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 10;

export default function WorkOrdersPage() {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operations, setOperations] = useState<IOperation[]>([]);
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
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<string[]>([]);
  const [workOrderOperations, setWorkOrderOperations] = useState<IOperation[]>([]);
  const [filledOperations, setFilledOperations] = useState<IFilledOperation[]>([]);
  const [customProperties, setCustomProperties] = useState<Record<string, unknown>>({});
  const [workOrderType, setWorkOrderType] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(workOrderSchema),
  });


  // Watch the type field to enable/disable form
  const watchedType = watch('type');

  // Fetch work orders with pagination
  const fetchWorkOrders = async (page = 1) => {
    try {
      const response = await fetch(`/api/work-orders?page=${page}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.workOrders || data);
        setTotalPages(data.totalPages || Math.ceil((data.workOrders || data).length / ITEMS_PER_PAGE));
        setTotalItems(data.totalItems || (data.workOrders || data).length);
      } else {
        toast.error(t("workOrders.workOrderLoadError"));
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
      toast.error(t("workOrders.workOrderLoadError"));
    }
  };

  // Fetch machines and operations for dropdowns
  const fetchMachines = async () => {
    try {
      const response = await fetch('/api/machines');
      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines || data);
      } else {
        toast.error(t("machines.machineLoadError"));
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error(t("machines.machineLoadError"));
    }
  };

  const fetchOperations = async () => {
    try {
      const response = await fetch('/api/operations');
      if (response.ok) {
        const data = await response.json();
        setOperations(data.operations || data);
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
      await Promise.all([fetchWorkOrders(currentPage), fetchMachines(), fetchOperations()]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, fetchWorkOrders, fetchMachines, fetchOperations]);

  // Check if we should open the modal automatically (from dashboard)
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingWorkOrder(null);
      reset();
      resetForm(true);
      setShowModal(true);
      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, loading, machines.length, operations.length, reset]);

  // Handle machine selection changes and work order type
  useEffect(() => {
    if (selectedMachines.length > 0 && workOrderType) {
      // Get operations from selected machines based on work order type
      const machineOperations: IOperation[] = [];
      const operationIds = new Set<string>(); // To track unique operation IDs
      
      selectedMachines.forEach(machineId => {
        const machine = machines.find(m => m._id === machineId);
        
        // First, add operations from maintenance ranges that match the work order type
        if (machine?.maintenanceRanges) {
          machine.maintenanceRanges.forEach(range => {
            // Only include maintenance ranges that match the work order type
            if (range?.type === workOrderType && range?.operations) {
              range.operations.forEach(operation => {
                if (operation && operation._id && !operationIds.has(operation._id)) {
                  operationIds.add(operation._id);
                  machineOperations.push(operation);
                }
              });
            }
          });
        }
        
        // Then, add operations directly from machine ONLY if they don't already exist
        if (machine?.operations) {
          machine.operations.forEach(operation => {
            if (operation && operation._id && !operationIds.has(operation._id)) {
              operationIds.add(operation._id);
              machineOperations.push(operation);
            }
          });
        }
      });
      
      setWorkOrderOperations(machineOperations);
    } else if (!editingWorkOrder) {
      // Only clear operations if not in edit mode
      setWorkOrderOperations([]);
    }
  }, [selectedMachines, machines, workOrderType, editingWorkOrder, setValue]);

  // Update workOrderType when form type changes
  useEffect(() => {
    if (watchedType !== workOrderType) {
      setWorkOrderType(watchedType || '');
    }
  }, [watchedType, workOrderType]);

  // Reset operations and machines when type changes (only in create mode)
  useEffect(() => {
    if (workOrderType && !editingWorkOrder) {
      setWorkOrderOperations([]);
      setSelectedOperations([]);
      setFilledOperations([]);
      setSelectedMachines([]);
      // Clear form values
      setValue('machines', []);
      setValue('operations', []);
    }
  }, [workOrderType, setValue, editingWorkOrder, setSelectedMachines, setSelectedOperations, setWorkOrderOperations, setFilledOperations]);

  // Use watchedType for form control instead of workOrderType
  // In edit mode, don't disable the form
  const isFormDisabled = !watchedType && !editingWorkOrder;


  const onSubmit = async (data: WorkOrderInput) => {
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
          machines: selectedMachines,
          operations: selectedOperations,
          filledOperations,
          properties: customProperties,
          companyId: session?.user?.companyId,
        }),
      });

      if (response.ok) {
        await fetchWorkOrders(currentPage);
        setShowModal(false);
        setEditingWorkOrder(null);
        reset();
        resetForm(false);
        toast.success(editingWorkOrder ? t("workOrders.workOrderUpdated") : t("workOrders.workOrderCreated"));
      } else {
        toast.error(t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error('Error saving work order:', error);
      toast.error(t("workOrders.workOrderError"));
    }
  };

  const resetForm = (isCreateMode = true) => {
    setWorkOrderType('');
    setSelectedMachines([]);
    setSelectedOperations([]);
    setWorkOrderOperations([]);
    setFilledOperations([]);
    setCustomProperties({});
    // Clear all form values
    setValue('machines', []);
    setValue('operations', []);
    setValue('type', 'preventive');
    setValue('customCode', '');
    setValue('description', '');
    setValue('completedDate', '');
    setValue('assignedTo', '');
    setValue('notes', '');
    
    // Set default values only in create mode
    if (isCreateMode) {
      const today = new Date().toISOString().split('T')[0];
      setValue('scheduledDate', today);
      setValue('status', 'pending');
    } else {
      setValue('scheduledDate', '');
      setValue('status', 'pending');
    }
  };

  const handleRemoveOperation = (operationId: string) => {
    setSelectedOperations(selectedOperations.filter(id => id !== operationId));
    // Also remove from filled operations if it was filled
    setFilledOperations(filledOperations.filter(filled => filled.operationId !== operationId));
  };

  const handleUpdateFilledOperations = (newFilledOperations: IFilledOperation[]) => {
    setFilledOperations(newFilledOperations);
  };

  const handleEdit = (workOrder: WorkOrder) => {
    setEditingWorkOrder(workOrder);
    
    // Get machine IDs and operation IDs
    const machineIds = workOrder.machines.map(m => m._id);
    const operationIds = workOrder.operations.map(op => op._id);
    
    reset({
      customCode: workOrder.customCode || '',
      type: workOrder.type,
      status: workOrder.status,
      description: workOrder.description,
      scheduledDate: workOrder.scheduledDate.split('T')[0],
      completedDate: workOrder.completedDate ? workOrder.completedDate.split('T')[0] : '',
      assignedTo: workOrder.assignedTo || '',
      notes: workOrder.notes || '',
      machines: machineIds,
      operations: operationIds,
    });
    
    // Set the state for the new fields
    setWorkOrderType(workOrder.type);
    setSelectedMachines(machineIds);
    setSelectedOperations(operationIds);
    setFilledOperations(workOrder.filledOperations || []);
    setCustomProperties(workOrder.properties || {});
    
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
        toast.success(t("workOrders.workOrderDeleted"));
      } else {
        toast.error(t("workOrders.workOrderError"));
      }
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast.error(t("workOrders.workOrderError"));
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
        return t("workOrders.pending");
      case 'in_progress':
        return t("workOrders.inProgress");
      case 'completed':
        return t("workOrders.completed");
      default:
        return status;
    }
  };

  const getOperationTypeLabel = (type: string) => {
    // Handle undefined, null, or empty types
    if (!type || type === 'undefined' || type === 'null') {
      return 'Unknown';
    }
    
    const translationKey = `operations.types.${type}`;
    const translation = t(translationKey);
    // If translation is the same as the key, it means the translation doesn't exist
    if (translation === translationKey) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
    return translation;
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
            {t("workOrders.subtitle")}
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
          {t("workOrders.subtitle")}
        </p>
      </div>

      {/* Header with Add Button */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totalItems} {t("workOrders.order")}{totalItems !== 1 ? 'es' : ''}
          </span>
        </div>
        <FormButton
          onClick={() => {
            setEditingWorkOrder(null);
            reset();
            resetForm(true);
            setShowModal(true);
          }}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>{t("workOrders.newWorkOrder")}</span>
        </FormButton>
      </div>

      {/* Work Orders List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {workOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("workOrders.noWorkOrders")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("workOrders.startCreatingWorkOrder")}
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
                            {workOrder.customCode || workOrder._id} - {workOrder.machines.map(m => m.model.name).join(', ')}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workOrder.status)}`}>
                            {getStatusLabel(workOrder.status)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            workOrder.type === 'preventive' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                          }`}>
                            {workOrder.type === 'preventive' ? t("workOrders.preventive") : t("workOrders.corrective")}
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
                            <Settings className="h-4 w-4" />
                            <span>{workOrder.operations.length} {t("workOrders.operations")}</span>
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
          resetForm(false);
        }}
        title={editingWorkOrder ? t("workOrders.editWorkOrder") : t("workOrders.newWorkOrder")}
        size="lg"
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Campo oculto para companyId */}
          <input
            type="hidden"
            {...register('companyId')}
            value={session?.user?.companyId || ''}
          />
          
          {/* Work Order ID (solo en edición) */}
          {editingWorkOrder && (
            <FormGroup>
              <FormLabel>{t("workOrders.workOrderId")}</FormLabel>
              <FormInput
                value={editingWorkOrder._id}
                disabled
                className="bg-gray-100 dark:bg-gray-700"
              />
            </FormGroup>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>{t("workOrders.customCode")}</FormLabel>
              <FormInput
                {...register('customCode')}
                error={errors.customCode?.message}
                placeholder={t("placeholders.customCode")}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel required>{t("workOrders.type")}</FormLabel>
              <FormSelect
                {...register('type', {
                  onChange: (e) => {
                    setWorkOrderType(e.target.value);
                    // In edit mode, don't reset operations when type changes
                    if (!editingWorkOrder) {
                      setWorkOrderOperations([]);
                      setSelectedOperations([]);
                      setFilledOperations([]);
                    }
                  }
                })}
                error={errors.type?.message}
                disabled={editingWorkOrder?.status === 'completed'}
              >
                <option value="">{t("placeholders.selectWorkOrderType")}</option>
                <option value="preventive">{t("workOrders.preventive")}</option>
                <option value="corrective">{t("workOrders.corrective")}</option>
              </FormSelect>
            </FormGroup>
          </div>

          {isFormDisabled && !editingWorkOrder && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t("workOrders.selectTypeFirst")}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {t("workOrders.selectTypeDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <FormGroup>
            <FormLabel required>{t("workOrders.machines")}</FormLabel>
            <MultiSelect
              options={machines.map(machine => ({
                value: machine._id,
                label: `${machine.model.name} - ${machine.location}`,
                description: machine.model.manufacturer
              }))}
              selectedValues={selectedMachines}
              onChange={(values) => {
                setSelectedMachines(values);
                setValue('machines', values);
              }}
              placeholder={t("placeholders.selectMachines")}
              error={selectedMachines.length === 0 ? t("errors.required") : undefined}
              disabled={isFormDisabled}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel required>{t("workOrders.description")}</FormLabel>
            <FormTextarea
              {...register('description')}
              error={errors.description?.message}
              placeholder={t("placeholders.workOrderDescription")}
              rows={3}
              disabled={isFormDisabled}
            />
          </FormGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel required>{t("workOrders.scheduledDate")}</FormLabel>
              <FormInput
                type="date"
                {...register('scheduledDate')}
                error={errors.scheduledDate?.message}
                disabled={isFormDisabled}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{t("workOrders.completedDate")}</FormLabel>
              <FormInput
                type="date"
                {...register('completedDate')}
                error={errors.completedDate?.message}
                disabled={isFormDisabled}
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup>
              <FormLabel>{t("common.status")}</FormLabel>
              <FormSelect
                {...register('status')}
                error={errors.status?.message}
                disabled={isFormDisabled}
              >
                <option value="pending">{t("workOrders.pending")}</option>
                <option value="in_progress">{t("workOrders.inProgress")}</option>
                <option value="completed">{t("workOrders.completed")}</option>
              </FormSelect>
            </FormGroup>

            <FormGroup>
              <FormLabel>{t("workOrders.assignedTo")}</FormLabel>
              <FormInput
                {...register('assignedTo')}
                error={errors.assignedTo?.message}
                placeholder={t("placeholders.technicianName")}
                disabled={isFormDisabled}
              />
            </FormGroup>
          </div>

          {/* Operations Management */}
          <FormGroup>
            <FormLabel>{t("workOrders.operations")}</FormLabel>
            <div className={`space-y-4 ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Operations from machines */}
              {workOrderOperations.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("workOrders.operationsFromMachines")} ({workOrderOperations.length})
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {workOrderType === 'preventive' ? t("workOrders.preventive") : t("workOrders.corrective")} {t("workOrders.type")}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {workOrderOperations
                      .filter(operation => operation && operation._id && operation.name)
                      .map((operation) => {
                        // Determine the source of the operation
                        const isFromMaintenanceRange = selectedMachines.some(machineId => {
                          const machine = machines.find(m => m._id === machineId);
                          return machine?.maintenanceRanges?.some(range => 
                            range?.type === workOrderType && 
                            range?.operations?.some(op => op._id === operation._id)
                          );
                        });
                        
                        
                        const source = isFromMaintenanceRange ? 'maintenanceRange' : 'machine';
                        
                        return (
                          <div
                            key={operation._id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              source === 'maintenanceRange' 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {operation.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {operation.description}
                              </div>
                              <div className={`text-xs mt-1 ${
                                source === 'maintenanceRange' 
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {getOperationTypeLabel(operation.type)} • {
                                  source === 'maintenanceRange' 
                                    ? t("workOrders.fromMaintenanceRange")
                                    : t("workOrders.fromMachine")
                                }
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : workOrderType && selectedMachines.length > 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        {t("workOrders.noMaintenanceRangesForType")}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        {t("workOrders.addCustomOperationsInstead")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Additional operations selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("workOrders.addAdditionalOperations")}
                </label>
                <MultiSelect
                  options={operations
                    .filter(op => !workOrderOperations.some(woOp => woOp._id === op._id))
                    .map(operation => ({
                      value: operation._id,
                      label: operation.name,
                      description: operation.description
                    }))}
                  selectedValues={selectedOperations}
                  onChange={(values) => {
                    setSelectedOperations(values);
                    setValue('operations', values);
                  }}
                  placeholder={t("placeholders.selectOperations")}
                />
              </div>

              {/* Selected additional operations */}
              {selectedOperations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("workOrders.additionalOperations")} ({selectedOperations.length})
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedOperations.map(operationId => {
                      const operation = operations.find(op => op._id === operationId);
                      if (!operation) return null;
                      
                      return (
                        <div
                          key={operationId}
                          className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {operation.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {operation.description}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                              {getOperationTypeLabel(operation.type)} • {t("workOrders.additional")}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOperation(operationId)}
                            className="ml-2 p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </FormGroup>

          {/* Filled Operations Manager */}
          {(workOrderOperations.length > 0 || selectedOperations.length > 0) && (
            <FormGroup>
              <FilledOperationsManager
                operations={[
                  ...workOrderOperations,
                  ...selectedOperations.map(id => operations.find(op => op._id === id)).filter(Boolean) as IOperation[]
                ]}
                filledOperations={filledOperations}
                onUpdateFilledOperations={handleUpdateFilledOperations}
                disabled={editingWorkOrder?.status === 'completed'}
              />
            </FormGroup>
          )}

          {/* Custom Properties */}
          <FormGroup>
            <FormLabel>{t("workOrders.customProperties")}</FormLabel>
            <div className={isFormDisabled ? 'opacity-50 pointer-events-none' : ''}>
              <DynamicProperties
                properties={Object.entries(customProperties).map(([key, value]) => ({ key, value }))}
                onChange={(props) => {
                  const newProperties: Record<string, unknown> = {};
                  props.forEach(prop => {
                    newProperties[prop.key] = prop.value;
                  });
                  setCustomProperties(newProperties);
                }}
              />
            </div>
          </FormGroup>

          <FormGroup>
            <FormLabel>{t("workOrders.notes")}</FormLabel>
            <FormTextarea
              {...register('notes')}
              error={errors.notes?.message}
              placeholder={t("placeholders.additionalNotes")}
              rows={2}
              disabled={isFormDisabled}
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
              {t("common.cancel")}
            </FormButton>
            <FormButton
              type="submit"
              disabled={isSubmitting || isFormDisabled}
            >
              {isSubmitting ? t("common.saving") : editingWorkOrder ? t("common.update") : t("common.create")}
            </FormButton>
          </div>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, workOrder: null })}
        onConfirm={handleDelete}
        title={t("modals.deleteWorkOrder")}
        message={t("modals.deleteWorkOrderMessage")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        variant="danger"
        itemDetails={deleteModal.workOrder ? {
          name: `${deleteModal.workOrder.customCode || deleteModal.workOrder._id} - ${deleteModal.workOrder.machines.map(m => m.model.name).join(', ')}`,
          description: deleteModal.workOrder.description,
        } : undefined}
      />
    </div>
  );
}