'use client';

import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useTranslations } from '@/hooks/useTranslations';
import { IFilledOperation, ILabor, IMaterial, IWorkOrderImage } from '@/models/WorkOrder';

interface Location {
  _id: string;
  name: string;
  description?: string;
}


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
  location: Location;
  workOrderLocation: Location;
  type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  maintenanceDescription?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
  images: IWorkOrderImage[];
  labor?: ILabor[];
  materials?: IMaterial[];
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
    return (workOrder.labor?.length || 0) > 0 || 
           (workOrder.materials?.length || 0) > 0 || 
           (workOrder.images?.length || 0) > 0 ||
           workOrder.machines.some(machine => 
             (machine.filledOperations?.length || 0) > 0 ||
             (machine.images?.length || 0) > 0
           );
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
        name: `${workOrder.customCode || workOrder._id} - ${workOrder.machines.length} machine(s)`,
        description: workOrder.description || 'No description',
      } : undefined}
    />
  );
}
