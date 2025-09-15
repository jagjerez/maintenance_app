'use client';

import { useTranslations } from '@/hooks/useTranslations';
import { FormGroup, FormLabel } from '@/components/Form';

interface WorkOrder {
  filledOperations: any[];
  labor: any[];
  materials: any[];
  images: any[];
}

interface MaintenanceDataSummaryProps {
  workOrder: WorkOrder;
}

export default function MaintenanceDataSummary({ workOrder }: MaintenanceDataSummaryProps) {
  const { t } = useTranslations();

  return (
    <FormGroup>
      <FormLabel>{t("workOrders.maintenanceDataSummary")}</FormLabel>
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {workOrder.filledOperations.length}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {t("workOrders.filledOperationsCount")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {workOrder.labor.length}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {t("workOrders.laborHoursCount")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {workOrder.materials.length}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {t("workOrders.materialsCount")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {workOrder.images.length}
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              {t("workOrders.imagesCount")}
            </div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <span className="text-sm text-blue-600 dark:text-blue-400">
            {t("workOrders.maintenanceDataExists")}
          </span>
        </div>
      </div>
    </FormGroup>
  );
}
