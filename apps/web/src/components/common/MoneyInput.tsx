import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  suffix?: string;
  label?: string;
  error?: string;
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, suffix = "so'm", label, error, id, className, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      const num = parseFloat(raw);
      onChange(isNaN(num) ? 0 : num);
    }

    const displayValue = typeof value === 'number' && value > 0
      ? value.toLocaleString('uz-UZ')
      : value;

    return (
      <div>
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            className={cn(
              'w-full rounded-lg border bg-surface px-4 py-3 pr-14 text-sm text-text-primary',
              'placeholder:text-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
              error ? 'border-danger-500' : 'border-border',
              className,
            )}
            aria-invalid={!!error}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
            {suffix}
          </span>
        </div>
        {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };
