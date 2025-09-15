'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations';
import { FormGroup, FormLabel } from '@/components/Form';
import MultiSelect from '@/components/MultiSelect';
import { IFilledOperation, IWorkOrder } from '@/models/WorkOrder';
import { IOperation } from '@/models/Operation';
import { IMachine } from '@/models/Machine';

interface WorkOrderOperationsSectionProps {
  workOrderType: string;
  selectedMachines: string[];
  workOrderOperations: IOperation[];
  selectedOperations: string[];
  operations: IOperation[];
  filledOperations: IFilledOperation[];
  machines: IMachine[];
  isFormDisabled: boolean;
  isReadOnly: boolean;
  editingWorkOrder: IWorkOrder;
  onRemoveOperation: (operationId: string) => void;
  onUpdateFilledOperations: (newFilledOperations: IFilledOperation[]) => void;
  onSelectedOperationsChange: (values: string[]) => void;
  hasMaintenanceData: (workOrder: IWorkOrder) => boolean;
}

export default function WorkOrderOperationsSection({
  workOrderType,
  selectedMachines,
  workOrderOperations,
  selectedOperations,
  operations,
  machines,
  isFormDisabled,
  isReadOnly,
  editingWorkOrder,
  onRemoveOperation,
  onSelectedOperationsChange,
  hasMaintenanceData,
}: WorkOrderOperationsSectionProps) {
  const { t } = useTranslations();

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

  return (
    <FormGroup>
      <FormLabel>{t("workOrders.operations")}</FormLabel>
      <div className={`space-y-4 ${isFormDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {!editingWorkOrder && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t("workOrders.cannotEditOperationsInCreateMode")}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t("workOrders.operationsWillBeFilledInMaintenanceModal")}
                </p>
              </div>
            </div>
          </div>
        )}
        
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
                    const machine = machines.find(m => m?._id === machineId);
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

        {/* Additional operations selector - Only in edit mode */}
        {editingWorkOrder && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("workOrders.addAdditionalOperations")}
            </label>
            <MultiSelect
              options={operations
                .filter(op => !workOrderOperations.some(woOp => woOp?._id === op?._id))
                .map(operation => ({
                  value: operation?._id || '',
                  label: operation?.name || 'Unknown Operation',
                  description: operation?.description || 'No description'
                }))}
              selectedValues={selectedOperations}
              onChange={onSelectedOperationsChange}
              placeholder={t("placeholders.selectOperations")}
              disabled={isReadOnly || hasMaintenanceData(editingWorkOrder)}
            />
          </div>
        )}

        {/* Selected additional operations - Only in edit mode */}
        {editingWorkOrder && selectedOperations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("workOrders.additionalOperations")} ({selectedOperations.length})
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedOperations.map(operationId => {
                const operation = operations.find(op => op?._id === operationId);
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
                      onClick={() => onRemoveOperation(operationId)}
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
  );
}
