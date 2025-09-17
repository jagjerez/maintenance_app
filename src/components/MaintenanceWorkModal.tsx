'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { Plus, Trash2, StopCircle, Wrench, Users, Package, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '@/components/Modal';
import { FormLabel, FormInput, FormSelect, FormButton } from '@/components/Form';
import ImageUpload from '@/components/ImageUpload';
import { IFilledOperation, ILabor, IMaterial, IWorkOrderImage, UnitType } from '@/models/WorkOrder';

interface WorkOrderMachine {
  machineId: string;
  maintenanceRangeIds?: string[]; // Múltiples maintenance ranges
  operations?: string[];
  filledOperations?: IFilledOperation[];
  images?: IWorkOrderImage[];
  maintenanceDescription?: string;
}

interface WorkOrder {
  _id: string;
  customCode?: string;
  machines: WorkOrderMachine[];
  workOrderLocation: {
    _id: string;
    name: string;
  };
  type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  maintenanceDescription?: string;
  images: IWorkOrderImage[];
  labor?: ILabor[];
  materials?: IMaterial[];
}

interface MaintenanceWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onSave: (data: {
    filledOperations: IFilledOperation[];
    labor: ILabor[];
    materials: IMaterial[];
    images: IWorkOrderImage[];
    status: 'pending' | 'in_progress' | 'completed';
  }) => Promise<void>;
}

const UNIT_TYPES: UnitType[] = ['cm', 'cm3', 'mm', 'm', 'm2', 'm3', 'kg', 'g', 'l', 'ml', 'pcs', 'units'];

export default function MaintenanceWorkModal({ isOpen, onClose, workOrder, onSave }: MaintenanceWorkModalProps) {
  const { t } = useTranslations();
  const [filledOperations, setFilledOperations] = useState<IFilledOperation[]>([]);
  const [labor, setLabor] = useState<ILabor[]>([]);
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [images, setImages] = useState<IWorkOrderImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize data when work order changes
  useEffect(() => {
    if (workOrder) {
      // filledOperations are now at machine level, not work order level
      setFilledOperations([]);
      setLabor(workOrder.labor || []);
      setMaterials(workOrder.materials || []);
      setImages(workOrder.images || []);
    }
  }, [workOrder]);

  // Operations are now managed at machine level, not work order level

  const handleAddLabor = () => {
    const newLabor: ILabor = {
      operatorName: '',
      startTime: new Date().toISOString(),
      endTime: undefined,
      isActive: true,
    };
    setLabor([...labor, newLabor]);
    
    // Show notification that work order status will change to in_progress
    toast.success(t("workOrders.workOrderStatusChanged"));
  };

  const handleUpdateLabor = (index: number, field: keyof ILabor, value: unknown) => {
    const newLabor = [...labor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    setLabor(newLabor);
  };

  const handleStopLabor = (index: number) => {
    const newLabor = [...labor];
    newLabor[index] = {
      ...newLabor[index],
      endTime: new Date().toISOString(),
      isActive: false,
    };
    setLabor(newLabor);
    toast.success(t("workOrders.laborEntryStopped"));
  };

  const handleAddMaterial = () => {
    const newMaterial: IMaterial = {
      description: '',
      unitType: 'pcs',
      quantity: 0,
      unit: 'pcs',
    };
    setMaterials([...materials, newMaterial]);
  };

  const handleUpdateMaterial = (index: number, field: keyof IMaterial, value: unknown) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    
    // If unitType changes, update the unit field as well
    if (field === 'unitType') {
      newMaterials[index].unit = value as string;
    }
    
    setMaterials(newMaterials);
  };

  const handleRemoveMaterial = (index: number) => {
    const newMaterials = materials.filter((_, i) => i !== index);
    setMaterials(newMaterials);
  };

  const handleImageUpload = (image: {
    url: string;
    filename: string;
    uploadedAt: Date;
    uploadedBy?: string;
  }) => {
    const newImage: IWorkOrderImage = {
      url: image.url,
      filename: image.filename,
      uploadedAt: image.uploadedAt.toISOString(),
      uploadedBy: image.uploadedBy,
    };
    setImages([...images, newImage]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    if (!workOrder) return;

    setIsSubmitting(true);
    try {
      // Check if any labor is active and stop it
      const updatedLabor = labor.map(l => 
        l.isActive ? { ...l, endTime: new Date(), isActive: false } : l
      );

      const newStatus = workOrder.status === 'pending' ? 'in_progress' : workOrder.status;
      
      await onSave({
        filledOperations,
        labor: updatedLabor as ILabor[],
        materials,
        images,
        status: newStatus as 'pending' | 'in_progress' | 'completed',
      });

      toast.success(t("workOrders.workOrderUpdated"));
      onClose();
    } catch (error) {
      console.error('Error saving maintenance data:', error);
      toast.error(t("workOrders.workOrderError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishWorkOrder = async () => {
    if (!workOrder) return;

    setIsSubmitting(true);
    try {
      // Stop all active labor
      const updatedLabor = labor.map(l => 
        l.isActive ? { ...l, endTime: new Date(), isActive: false } : l
      );

      await onSave({
        filledOperations,
        labor: updatedLabor as ILabor[],
        materials,
        images,
        status: 'completed',
      });

      toast.success(t("workOrders.workOrderCompletedSuccessfully"));
      onClose();
    } catch (error) {
      console.error('Error finishing work order:', error);
      toast.error(t("workOrders.workOrderError"));
    } finally {
      setIsSubmitting(false);
    }
  };


  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateLaborHours = (laborEntry: ILabor) => {
    if (!laborEntry.endTime) return 0;
    const start = new Date(laborEntry.startTime);
    const end = new Date(laborEntry.endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 100) / 100;
  };

  const totalLaborHours = labor.reduce((total, l) => total + calculateLaborHours(l), 0);

  if (!workOrder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("workOrders.performMaintenanceWork")}
      size="xl"
    >
      <div className="space-y-6">
        {/* Work Order Info */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {workOrder.customCode || workOrder._id} - {workOrder.machines?.length || 0} machine(s)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {workOrder.workOrderLocation?.name || 'Unknown Location'} • {workOrder.type === 'preventive' ? t("workOrders.preventive") : t("workOrders.corrective")}
          </p>
        </div>

        {/* Operations Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            {t("workOrders.fillOperations")}
          </h3>
          
          {workOrder.machines.length === 0 ? (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t("workOrders.noOperationsToFill")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workOrder.machines.map((machine) => (
                <div key={machine.machineId} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Machine {machine.machineId}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {machine.operations?.length || 0} operations
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Operations are now managed at machine level
                  </p>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Operations are now managed at the machine level in the work order form.
                        This maintenance modal will be updated to work with the new structure.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labor Tracking Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Users className="h-5 w-5 mr-2" />
              {t("workOrders.laborTracking")}
            </h3>
            <FormButton
              type="button"
              onClick={handleAddLabor}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t("workOrders.addLaborEntry")}</span>
            </FormButton>
          </div>

          {labor.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("workOrders.noLaborRecorded")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {labor.map((laborEntry, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <FormLabel>{t("workOrders.operatorName")}</FormLabel>
                      <FormInput
                        value={laborEntry.operatorName}
                        onChange={(e) => handleUpdateLabor(index, 'operatorName', e.target.value)}
                        placeholder={t("placeholders.technicianName")}
                      />
                    </div>
                    
                    <div>
                      <FormLabel>{t("workOrders.startTime")}</FormLabel>
                      <FormInput
                        type="datetime-local"
                        value={new Date(laborEntry.startTime).toISOString().slice(0, 16)}
                        onChange={(e) => {
                          const newTime = new Date(e.target.value);
                          handleUpdateLabor(index, 'startTime', newTime);
                        }}
                      />
                    </div>
                    
                    <div>
                      <FormLabel>{t("workOrders.endTime")}</FormLabel>
                      <div className="flex space-x-2">
                        <FormInput
                          type="datetime-local"
                          value={laborEntry.endTime ? new Date(laborEntry.endTime).toISOString().slice(0, 16) : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const newTime = new Date(e.target.value);
                              handleUpdateLabor(index, 'endTime', newTime);
                            }
                          }}
                          disabled={laborEntry.isActive}
                        />
                        {laborEntry.isActive && (
                          <FormButton
                            type="button"
                            variant="secondary"
                            onClick={() => handleStopLabor(index)}
                            className="px-3"
                          >
                            <StopCircle className="h-4 w-4" />
                          </FormButton>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        laborEntry.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {laborEntry.isActive ? t("workOrders.isActive") : t("workOrders.completed")}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(new Date(laborEntry.startTime))}
                        {laborEntry.endTime && ` - ${formatDateTime(new Date(laborEntry.endTime))}`}
                      </span>
                      {laborEntry.endTime && (
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {calculateLaborHours(laborEntry)}h
                        </span>
                      )}
                    </div>
                    
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => setLabor(labor.filter((_, i) => i !== index))}
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                </div>
              ))}
              
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t("workOrders.totalLaborHours")}
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {totalLaborHours}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Materials Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Package className="h-5 w-5 mr-2" />
              {t("workOrders.materialsUsed")}
            </h3>
            <FormButton
              type="button"
              onClick={handleAddMaterial}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t("workOrders.addMaterialEntry")}</span>
            </FormButton>
          </div>

          {materials.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("workOrders.noMaterialsUsed")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {materials.map((material, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <FormLabel>{t("workOrders.materialDescription")}</FormLabel>
                      <FormInput
                        value={material.description}
                        onChange={(e) => handleUpdateMaterial(index, 'description', e.target.value)}
                        placeholder={t("placeholders.operationDescription")}
                      />
                    </div>
                    
                    <div>
                      <FormLabel>{t("workOrders.unitType")}</FormLabel>
                      <FormSelect
                        value={material.unitType}
                        onChange={(e) => handleUpdateMaterial(index, 'unitType', e.target.value)}
                      >
                        {UNIT_TYPES.map(unit => (
                          <option key={unit} value={unit}>
                            {t(`workOrders.unitTypes.${unit}`)}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                    
                    <div>
                      <FormLabel>{t("workOrders.quantity")}</FormLabel>
                      <FormInput
                        type="number"
                        value={material.quantity}
                        onChange={(e) => handleUpdateMaterial(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {material.quantity} {t(`workOrders.unitTypes.${material.unitType}`)}
                    </span>
                    
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => handleRemoveMaterial(index)}
                      className="p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              {t("workOrders.workOrderImages")}
            </h3>
          </div>

          {/* Image Upload Component */}
          <div className="mb-6">
            <ImageUpload
              onImageUpload={handleImageUpload}
              disabled={workOrder.status === 'completed'}
            />
          </div>

          {/* Uploaded Images */}
          {images.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("workOrders.noImagesUploaded")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                    <FormButton
                      type="button"
                      variant="danger"
                      onClick={() => handleRemoveImage(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                      disabled={workOrder.status === 'completed'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </FormButton>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {image.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(new Date(image.uploadedAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-600">
          <FormButton
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t("common.cancel")}
          </FormButton>
          
          <div className="flex space-x-3">
            <FormButton
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("common.saving") : t("common.save")}
            </FormButton>
            
            {workOrder.status !== 'completed' && (
              <FormButton
                type="button"
                variant="primary"
                onClick={handleFinishWorkOrder}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t("workOrders.finishWorkOrder")}
              </FormButton>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
