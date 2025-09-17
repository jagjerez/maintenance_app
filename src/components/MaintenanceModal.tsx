'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { useTranslations } from '@/hooks/useTranslations';
import { 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Upload, 
  CheckCircle, 
  Clock, 
  User, 
  Package, 
  Image as ImageIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { Form, FormGroup, FormLabel, FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { IFilledOperation, ILabor, IMaterial, IWorkOrderImage } from '@/models/WorkOrder';
import { IOperation } from '@/models/Operation';
import Image from 'next/image';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: {
    _id: string;
    customCode?: string;
    type: 'preventive' | 'corrective';
    status: 'pending' | 'in_progress' | 'completed';
    description: string;
    maintenanceDescription?: string;
    operations: IOperation[];
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
  };
  onSave: (data: {
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
    status: 'pending' | 'in_progress' | 'completed';
  }) => Promise<void>;
}

interface LaborFormData {
  operatorName: string;
}

interface MaterialFormData {
  description: string;
  unitType: string;
  quantity: number;
  unit: string;
}

const UNIT_TYPES = [
  { value: 'cm', label: 'Centimeters' },
  { value: 'cm3', label: 'Cubic Centimeters' },
  { value: 'mm', label: 'Millimeters' },
  { value: 'm', label: 'Meters' },
  { value: 'm2', label: 'Square Meters' },
  { value: 'm3', label: 'Cubic Meters' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'g', label: 'Grams' },
  { value: 'l', label: 'Liters' },
  { value: 'ml', label: 'Milliliters' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'units', label: 'Units' },
];

export default function MaintenanceModal({ isOpen, onClose, workOrder, onSave }: MaintenanceModalProps) {
  const { t } = useTranslations();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'operations' | 'labor' | 'materials' | 'images'>('operations');
  const [filledOperations, setFilledOperations] = useState<IFilledOperation[]>(workOrder.filledOperations || []);
  const [labor, setLabor] = useState<ILabor[]>(workOrder.labor || []);
  const [materials, setMaterials] = useState<IMaterial[]>(workOrder.materials || []);
  const [images, setImages] = useState<IWorkOrderImage[]>(workOrder.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);

  const laborForm = useForm<LaborFormData>({
    defaultValues: {
      operatorName: '',
    },
  });

  const materialForm = useForm<MaterialFormData>({
    defaultValues: {
      description: '',
      unitType: 'pcs',
      quantity: 1,
      unit: 'units',
    },
  });

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFilledOperations(workOrder.filledOperations || []);
      setLabor(workOrder.labor || []);
      setMaterials(workOrder.materials || []);
      setImages(workOrder.images || []);
      setActiveTab('operations');
      setShowLaborForm(false);
      setShowMaterialForm(false);
    }
  }, [isOpen, workOrder]);

  const handleOperationValueChange = (operationId: string, value: unknown, description?: string) => {
    const existingIndex = filledOperations.findIndex(fo => fo.operationId === operationId);
    const newFilledOperation: IFilledOperation = {
      operationId,
      operation: workOrder.operations.find(op => op._id === operationId)!,
      value,
      description,
      filledAt: new Date(),
      filledBy: session?.user?.name || 'Unknown',
    };

    if (existingIndex >= 0) {
      setFilledOperations(prev => 
        prev.map((fo, index) => index === existingIndex ? newFilledOperation : fo)
      );
    } else {
      setFilledOperations(prev => [...prev, newFilledOperation]);
    }
  };

  const handleStartLabor = (data: LaborFormData) => {
    const newLabor: ILabor = {
      operatorName: data.operatorName,
      startTime: new Date().toISOString(),
      isActive: true,
    };
    setLabor(prev => [...prev, newLabor]);
    setShowLaborForm(false);
    laborForm.reset();
    toast.success(t('workOrders.laborStarted'));
  };

  const handleStopLabor = (index: number) => {
    setLabor(prev => 
      prev.map((l, i) => 
        i === index ? { ...l, endTime: new Date().toISOString(), isActive: false } : l
      )
    );
    toast.success(t('workOrders.laborStopped'));
  };

  const handleAddMaterial = (data: MaterialFormData) => {
    const newMaterial: IMaterial = {
      description: data.description,
      unitType: data.unitType,
      quantity: data.quantity,
      unit: data.unit,
    };
    setMaterials(prev => [...prev, newMaterial]);
    setShowMaterialForm(false);
    materialForm.reset();
    toast.success(t('workOrders.materialAdded'));
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload to Vercel Blob or another service
    // For now, we'll create a mock URL
    const mockUrl = URL.createObjectURL(file);
    const newImage: IWorkOrderImage = {
      url: mockUrl,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session?.user?.name || 'Unknown',
    };
    setImages(prev => [...prev, newImage]);
    toast.success(t('workOrders.imageUploaded'));
  };

  const handleFinishWorkOrder = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        filledOperations,
        labor,
        materials,
        images,
        status: 'completed',
      });
      toast.success(t('workOrders.workOrderCompleted'));
      onClose();
    } catch (error) {
      toast.error(t('workOrders.workOrderError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMaintenanceData = filledOperations.length > 0 || labor.length > 0 || materials.length > 0 || images.length > 0;
  const isCompleted = workOrder.status === 'completed';
  const canEdit = !isCompleted;

  const getOperationValue = (operationId: string): string | readonly string[] | number | undefined => {
    const filled = filledOperations.find(fo => fo.operationId === operationId);
    return filled?.value as string | readonly string[] | number | undefined;
  };

  const getOperationDescription = (operationId: string) => {
    const filled = filledOperations.find(fo => fo.operationId === operationId);
    return filled?.description || '';
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const totalLaborHours = labor.reduce((total, l) => {
    const start = new Date(l.startTime);
    const end = l.endTime ? new Date(l.endTime) : new Date();
    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workOrders.maintenanceModal')}
      size="xl"
    >
      <div className="space-y-6">
        {/* Work Order Info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('workOrders.workOrderInfo')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.workOrderId')}:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{workOrder.customCode || workOrder._id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.type')}:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {workOrder.type === 'preventive' ? t('workOrders.preventive') : t('workOrders.corrective')}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.status')}:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {workOrder.status === 'pending' ? t('workOrders.pending') : 
                 workOrder.status === 'in_progress' ? t('workOrders.inProgress') : 
                 t('workOrders.completed')}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.description')}:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{workOrder.description}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'operations', label: t('workOrders.operations'), icon: CheckCircle },
              { id: 'labor', label: t('workOrders.laborTracking'), icon: Clock },
              { id: 'materials', label: t('workOrders.materialsUsed'), icon: Package },
              { id: 'images', label: t('workOrders.images'), icon: ImageIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'operations' | 'labor' | 'materials' | 'images')}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('workOrders.operations')}
            </h3>
            {workOrder.operations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('workOrders.noOperations')}
              </div>
            ) : (
              <div className="space-y-4">
                {workOrder.operations.map((operation) => (
                  <div key={operation._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{operation.name}</h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {operation.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{operation.description}</p>
                    
                    {canEdit ? (
                      <div className="space-y-3">
                        <div>
                          <FormLabel>{t('workOrders.operationValue')}</FormLabel>
                          <FormInput
                            type={operation.type === 'boolean' ? 'checkbox' : 
                                  operation.type === 'date' ? 'date' :
                                  operation.type === 'time' ? 'time' :
                                  operation.type === 'datetime' ? 'datetime-local' : 'text'}
                            value={getOperationValue(operation._id)}
                            onChange={(e) => handleOperationValueChange(
                              operation._id, 
                              operation.type === 'boolean' ? e.target.checked : e.target.value
                            )}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <FormLabel>{t('workOrders.operationDescription')}</FormLabel>
                          <FormTextarea
                            value={getOperationDescription(operation._id)}
                            onChange={(e) => handleOperationValueChange(
                              operation._id, 
                              getOperationValue(operation._id),
                              e.target.value
                            )}
                            rows={2}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.operationValue')}:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {getOperationValue(operation._id) || t('workOrders.notFilled')}
                          </span>
                        </div>
                        {getOperationDescription(operation._id) && (
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('workOrders.operationDescription')}:</span>
                            <span className="ml-2 text-gray-900 dark:text-white">{getOperationDescription(operation._id)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Labor Tab */}
        {activeTab === 'labor' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('workOrders.laborTracking')}
              </h3>
              {canEdit && (
                <FormButton
                  type="button"
                  onClick={() => setShowLaborForm(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('workOrders.addLabor')}</span>
                </FormButton>
              )}
            </div>

            {/* Labor Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{t('workOrders.totalHours')}:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">{totalLaborHours.toFixed(2)}h</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{t('workOrders.activeLabor')}:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">
                    {labor.filter(l => l.isActive).length}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">{t('workOrders.completedLabor')}:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">
                    {labor.filter(l => !l.isActive).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Labor List */}
            {labor.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('workOrders.noLaborData')}
              </div>
            ) : (
              <div className="space-y-3">
                {labor.map((l, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{l.operatorName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(l.startTime).toLocaleString()} - {l.endTime ? new Date(l.endTime).toLocaleString() : t('workOrders.inProgress')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(new Date(l.startTime), l.endTime ? new Date(l.endTime) : undefined)}
                        </span>
                        {l.isActive && canEdit && (
                          <FormButton
                            type="button"
                            variant="secondary"
                            onClick={() => handleStopLabor(index)}
                            className="flex items-center space-x-1"
                          >
                            <Square className="h-4 w-4" />
                            <span>{t('workOrders.stopLabor')}</span>
                          </FormButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Labor Form */}
            {showLaborForm && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('workOrders.addLabor')}</h4>
                <Form onSubmit={laborForm.handleSubmit(handleStartLabor)}>
                  <FormGroup>
                    <FormLabel required>{t('workOrders.operatorName')}</FormLabel>
                    <FormInput
                      {...laborForm.register('operatorName', { required: true })}
                      placeholder={t('workOrders.operatorName')}
                    />
                  </FormGroup>
                  <div className="flex justify-end space-x-3">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => setShowLaborForm(false)}
                    >
                      {t('common.cancel')}
                    </FormButton>
                    <FormButton
                      type="submit"
                      className="flex items-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>{t('workOrders.startTime')}</span>
                    </FormButton>
                  </div>
                </Form>
              </div>
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('workOrders.materialsUsed')}
              </h3>
              {canEdit && (
                <FormButton
                  type="button"
                  onClick={() => setShowMaterialForm(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('workOrders.addMaterial')}</span>
                </FormButton>
              )}
            </div>

            {materials.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('workOrders.noMaterialsData')}
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{material.description}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {material.quantity} {material.unit} ({t(`workOrders.unitTypes.${material.unitType}`)})
                        </div>
                      </div>
                      {canEdit && (
                        <FormButton
                          type="button"
                          variant="danger"
                          onClick={() => handleRemoveMaterial(index)}
                          className="p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </FormButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Material Form */}
            {showMaterialForm && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('workOrders.addMaterial')}</h4>
                <Form onSubmit={materialForm.handleSubmit(handleAddMaterial)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormGroup>
                      <FormLabel required>{t('workOrders.materialDescription')}</FormLabel>
                      <FormInput
                        {...materialForm.register('description', { required: true })}
                        placeholder={t('workOrders.materialDescription')}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel required>{t('workOrders.unitType')}</FormLabel>
                      <FormSelect
                        {...materialForm.register('unitType', { required: true })}
                      >
                        {UNIT_TYPES.map(unit => (
                          <option key={unit.value} value={unit.value}>
                            {t(`workOrders.unitTypes.${unit.value}`)}
                          </option>
                        ))}
                      </FormSelect>
                    </FormGroup>
                    <FormGroup>
                      <FormLabel required>{t('workOrders.quantity')}</FormLabel>
                      <FormInput
                        type="number"
                        min="0"
                        step="0.01"
                        {...materialForm.register('quantity', { required: true, valueAsNumber: true })}
                      />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel required>{t('workOrders.unit')}</FormLabel>
                      <FormInput
                        {...materialForm.register('unit', { required: true })}
                        placeholder={t('workOrders.unit')}
                      />
                    </FormGroup>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => setShowMaterialForm(false)}
                    >
                      {t('common.cancel')}
                    </FormButton>
                    <FormButton type="submit">
                      {t('workOrders.addMaterial')}
                    </FormButton>
                  </div>
                </Form>
              </div>
            )}
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('workOrders.images')}
              </h3>
              {canEdit && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <FormButton
                    type="button"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{t('workOrders.uploadImage')}</span>
                  </FormButton>
                </div>
              )}
            </div>

            {images.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('workOrders.noImagesData')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <Image 
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-300"
                        >
                          <ImageIcon className="h-6 w-6" />
                        </a>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {image.filename}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {hasMaintenanceData && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>{t('workOrders.maintenanceDataExists')}</span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <FormButton
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              {t('common.close')}
            </FormButton>
            {canEdit && (
              <FormButton
                type="button"
                onClick={handleFinishWorkOrder}
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{t('workOrders.finishWorkOrder')}</span>
              </FormButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
