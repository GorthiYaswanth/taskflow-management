import React from 'react';
import Button from './Button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  title = 'Confirm Action', 
  description = 'Are you sure you want to proceed?', 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning', // 'warning', 'danger', 'success'
  onCancel, 
  onConfirm, 
  isSubmitting = false 
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          {getIcon()}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">{description}</p>

        <div className="flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting}
          >
            {cancelText}
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={onConfirm}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
