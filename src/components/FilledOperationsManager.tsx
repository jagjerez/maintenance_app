'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/hooks/useTranslations';
import { FormInput, FormTextarea, FormSelect, FormButton } from '@/components/Form';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { IFilledOperation } from '@/models/WorkOrder';
import { IOperation } from '@/models/Operation';

interface FilledOperationsManagerProps {
  operations: IOperation[];
  filledOperations: IFilledOperation[];
  onUpdateFilledOperations: (filledOps: IFilledOperation[]) => void;
  disabled?: boolean;
}

export default function FilledOperationsManager({
  operations,
  filledOperations,
  onUpdateFilledOperations,
  disabled = false,
}: FilledOperationsManagerProps) {
  const { t } = useTranslations();
  const [editingOperation, setEditingOperation] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<unknown>('');
  const [tempDescription, setTempDescription] = useState('');

  const getOperationById = (id: string) => {
    return operations.find(op => op._id === id);
  };

  const getFilledOperation = (operationId: string) => {
    return filledOperations.find(filled => filled.operationId === operationId);
  };

  const handleFillOperation = (operationId: string) => {
    const operation = getOperationById(operationId);
    if (!operation) return;

    const existingFilled = getFilledOperation(operationId);
    setEditingOperation(operationId);
    setTempValue(existingFilled?.value || getDefaultValue(operation.type));
    setTempDescription(existingFilled?.description || '');
  };

  const handleSaveOperation = () => {
    if (!editingOperation) return;

    const operation = getOperationById(editingOperation);
    if (!operation) return;

    const newFilledOperation: IFilledOperation = {
      operationId: editingOperation,
      operation,
      value: tempValue,
      description: tempDescription,
      filledAt: new Date(),
      filledBy: 'current-user', // TODO: Get from session
    };

    const existingIndex = filledOperations.findIndex(filled => filled.operationId === editingOperation);
    const newFilledOperations = [...filledOperations];

    if (existingIndex >= 0) {
      newFilledOperations[existingIndex] = newFilledOperation;
    } else {
      newFilledOperations.push(newFilledOperation);
    }

    onUpdateFilledOperations(newFilledOperations);
    setEditingOperation(null);
    setTempValue('');
    setTempDescription('');
  };

  const handleCancelEdit = () => {
    setEditingOperation(null);
    setTempValue('');
    setTempDescription('');
  };

  const handleRemoveOperation = (operationId: string) => {
    const newFilledOperations = filledOperations.filter(filled => filled.operationId !== operationId);
    onUpdateFilledOperations(newFilledOperations);
  };

  const getDefaultValue = (type: string) => {
    switch (type) {
      case 'boolean':
        return false;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'time':
        return new Date().toTimeString().split(' ')[0].substring(0, 5);
      case 'datetime':
        return new Date().toISOString().slice(0, 16);
      default:
        return '';
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

  const formatValue = (value: unknown, type: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'boolean':
        return value ? t('common.yes') : t('common.no');
      case 'date':
        return value ? new Date(value as string).toLocaleDateString(undefined) : '-';
      case 'time':
        return String(value);
      case 'datetime':
        return value ? new Date(value as string).toLocaleString(undefined) : '-';
      default:
        return String(value);
    }
  };

  const renderInput = (operation: IOperation, value: unknown, onChange: (value: unknown) => void) => {
    switch (operation.type) {
      case 'boolean':
        return (
          <FormSelect value={value ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')}>
            <option value="false">{t('common.no')}</option>
            <option value="true">{t('common.yes')}</option>
          </FormSelect>
        );
      case 'date':
        return (
          <FormInput
            type="date"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'time':
        return (
          <FormInput
            type="time"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'datetime':
        return (
          <FormInput
            type="datetime-local"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <FormInput
            type="text"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("placeholders.operationValue")}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
        {t("workOrders.filledOperations")}
      </h4>
      
      {operations.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("workOrders.noOperations")}
        </p>
      ) : (
        <div className="space-y-3">
          {operations
            .filter(operation => operation && operation._id && operation.name)
            .map((operation) => {
            const filled = getFilledOperation(operation._id);
            const isEditing = editingOperation === operation._id;

            return (
              <div
                key={operation._id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {operation.name}
                    </h5>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {operation.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <FormButton
                          type="button"
                          variant="secondary"
                          onClick={handleSaveOperation}
                          disabled={disabled}
                        >
                          <Check className="h-4 w-4" />
                        </FormButton>
                        <FormButton
                          type="button"
                          variant="danger"
                          onClick={handleCancelEdit}
                          disabled={disabled}
                        >
                          <X className="h-4 w-4" />
                        </FormButton>
                      </>
                    ) : (
                      <>
                        <FormButton
                          type="button"
                          variant="secondary"
                          onClick={() => handleFillOperation(operation._id)}
                          disabled={disabled}
                        >
                          <Edit3 className="h-4 w-4" />
                        </FormButton>
                        {filled && (
                          <FormButton
                            type="button"
                            variant="danger"
                            onClick={() => handleRemoveOperation(operation._id)}
                            disabled={disabled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </FormButton>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("workOrders.operationValue")}
                      </label>
                      {renderInput(operation, tempValue, setTempValue)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t("workOrders.operationDescription")}
                      </label>
                      <FormTextarea
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value)}
                        placeholder={t("placeholders.operationDescription")}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : filled ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("workOrders.operationValue")}:
                      </span>
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        {formatValue(filled.value, operation.type)}
                      </span>
                    </div>
                    {filled.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t("workOrders.operationDescription")}:
                        </span>
                        <span className="ml-2 text-sm text-gray-900 dark:text-white">
                          {filled.description}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.filledAt")}: {new Date(filled.filledAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t("workOrders.notFilled")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
