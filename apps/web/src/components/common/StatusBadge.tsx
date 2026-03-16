import { cn } from '@/lib/cn';

const variants = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-600',
  neutral: 'bg-surface-tertiary text-text-secondary',
} as const;

interface StatusBadgeProps {
  variant: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ variant, children, className, dot = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-success-500': variant === 'success',
            'bg-warning-500': variant === 'warning',
            'bg-danger-500': variant === 'danger',
            'bg-info-500': variant === 'info',
            'bg-text-muted': variant === 'neutral',
          })}
        />
      )}
      {children}
    </span>
  );
}

// Stock status helper
export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock < 0) return <StatusBadge variant="danger" dot>Manfiy ({stock})</StatusBadge>;
  if (stock === 0) return <StatusBadge variant="danger" dot>Tugagan</StatusBadge>;
  if (stock <= minStock) return <StatusBadge variant="warning" dot>Kam ({stock})</StatusBadge>;
  return <StatusBadge variant="success" dot>{stock}</StatusBadge>;
}
