import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, options?: { duration?: number; action?: Toast['action'] }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success-200 bg-success-50 text-success-800',
  error: 'border-danger-200 bg-danger-50 text-danger-800',
  warning: 'border-warning-200 bg-warning-50 text-warning-800',
  info: 'border-primary-200 bg-primary-50 text-primary-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', options?: { duration?: number; action?: Toast['action'] }) => {
      const id = crypto.randomUUID();
      const duration = options?.duration ?? (variant === 'error' ? 5000 : 3000);
      setToasts((prev) => [...prev, { id, message, variant, duration, action: options?.action }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 sm:bottom-6 sm:right-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (!t.duration) return;
    const timer = setTimeout(() => onDismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  const Icon = ICONS[t.variant];

  return (
    <div
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
        'animate-in slide-in-from-right-full duration-300',
        STYLES[t.variant],
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{t.message}</p>
        {t.action && (
          <button
            onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
            className="mt-1 text-sm font-semibold underline"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded p-1 opacity-60 hover:opacity-100"
        aria-label="Yopish"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
