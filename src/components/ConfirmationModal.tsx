'use client';

import Modal from './Modal';
import { FormButton } from './Form';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  itemDetails?: {
    name: string;
    description?: string;
  };
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  itemDetails,
  isLoading = false,
}: ConfirmationModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          icon: '⚠️',
          confirmButtonVariant: 'primary' as const,
        };
      case 'info':
        return {
          icon: 'ℹ️',
          confirmButtonVariant: 'primary' as const,
        };
      default:
        return {
          icon: '🗑️',
          confirmButtonVariant: 'danger' as const,
        };
    }
  };

  const { icon, confirmButtonVariant } = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-300">
              {message}
            </p>
            {itemDetails && (
              <div className="mt-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <p className="font-medium text-gray-900 dark:text-white">
                  {itemDetails.name}
                </p>
                {itemDetails.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {itemDetails.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <FormButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </FormButton>
          <FormButton
            type="button"
            variant={confirmButtonVariant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </FormButton>
        </div>
      </div>
    </Modal>
  );
}
