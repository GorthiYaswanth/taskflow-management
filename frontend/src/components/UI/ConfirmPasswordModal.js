import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';

const ConfirmPasswordModal = ({ isOpen, title = 'Confirm Action', description = 'Please confirm your password to continue.', onCancel, onConfirm, isSubmitting = false, errorMessage = '' }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>

        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(password)}
            disabled={!password || isSubmitting}
            loading={isSubmitting}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPasswordModal;


