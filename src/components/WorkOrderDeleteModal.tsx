'use client';

import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useTranslations } from '@/hooks/useTranslations';
import { IOperation } from '@/models/Operation';
import { IFilledOperation, ILabor, IMaterial, IWorkOrderImage } from '@/models/WorkOrder';

interface Location {
  _id: string;
  name: string;
  description?: string;
}

interface Machine {
  _id: string;
  location: string;
  locationId: string;
  model: {
    name: string;
    manufacturer: string;
  };
}

interface WorkOrder {
  _id: string;
  customCode?: string;
  machines: Machine[];
  location: Location;
  workOrderLocation: Location;
  type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  maintenanceDescription?: string;
  maintenanceDescriptionPerMachine?: Record<string, string>;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  operations: IOperation[];
  filledOperations: IFilledOperation[];
  labor: ILabor[];
  materials: IMaterial[];
  images: IWorkOrderImage[];
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface WorkOrderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  workOrder: WorkOrder | null;
}

export default function WorkOrderDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  workOrder,
}: WorkOrderDeleteModalProps) {
  const { t } = useTranslations();

  // Check if work order has maintenance data
  const hasMaintenanceData = (workOrder: WorkOrder) => {
    return (workOrder.filledOperations?.length || 0) > 0 || 
           (workOrder.labor?.length || 0) > 0 || 
           (workOrder.materials?.length || 0) > 0 || 
           (workOrder.images?.length || 0) > 0;
  };

  // Check if work order can be deleted
  const canDeleteWorkOrder = (workOrder: WorkOrder) => {
    return (workOrder.status || 'pending') === 'pending' && !hasMaintenanceData(workOrder);
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("modals.deleteWorkOrder")}
      message={workOrder && !canDeleteWorkOrder(workOrder) 
        ? t("workOrders.workOrderCannotBeDeleted")
        : t("modals.deleteWorkOrderMessage")
      }
      confirmText={t("common.delete")}
      cancelText={t("common.cancel")}
      variant="danger"
      itemDetails={workOrder ? {
        name: `${workOrder.customCode || workOrder._id} - ${(workOrder.machines || []).map(m => m.model?.name || 'Unknown Machine').join(', ')}`,
        description: workOrder.description || 'No description',
      } : undefined}
    />
  );
}
