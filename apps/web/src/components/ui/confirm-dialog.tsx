import { useState, type ReactNode } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  icon?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  variant = 'danger',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  }

  const iconElement = icon ?? (
    variant === 'danger' ? (
      <Trash2 className="h-6 w-6 text-danger-600" />
    ) : (
      <AlertTriangle className="h-6 w-6 text-warning-600" />
    )
  );

  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
          variant === 'danger' ? 'bg-danger-50' : 'bg-warning-50'
        }`}>
          {iconElement}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="mb-6 text-sm text-text-secondary">{description}</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isLoading || loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            loading={isLoading || loading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
