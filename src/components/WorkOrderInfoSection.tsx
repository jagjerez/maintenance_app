'use client';

import { useTranslations } from '@/hooks/useTranslations';
import { IOperation } from '@/models/Operation';
import { IFilledOperation, IMaterial, IWorkOrderImage } from '@/models/WorkOrder';
import { ILabor } from '@/models/WorkOrder';

interface Location {
  _id: string;
  name: string;
  description?: string;
}

interface WorkOrder {
  _id: string;
  customCode?: string;
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

interface WorkOrderInfoSectionProps {
  workOrder: WorkOrder;
}

export default function WorkOrderInfoSection({ workOrder }: WorkOrderInfoSectionProps) {
  const { t } = useTranslations();

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("workOrders.workOrderInformation")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("workOrders.workOrderId")}
          </label>
          <input
            type="text"
            value={workOrder._id}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("workOrders.workOrderCode")}
          </label>
          <input
            type="text"
            value={workOrder.customCode || 'N/A'}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("workOrders.workOrderType")}
          </label>
          <input
            type="text"
            value={workOrder.type === 'preventive' ? t("workOrders.preventive") : t("workOrders.corrective")}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("workOrders.workOrderLocationInfo")}
          </label>
          <input
            type="text"
            value={workOrder.workOrderLocation?.name || workOrder.location?.name || 'Unknown Location'}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
