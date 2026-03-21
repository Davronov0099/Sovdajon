import { useState, useEffect, useCallback } from 'react';
import { X, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NumPadProps {
  onSubmit: (value: number) => void;
  onClose: () => void;
  initialValue?: number;
}

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['C', '0', '⌫'],
] as const;

export function NumPad({ onSubmit, onClose, initialValue = 0 }: NumPadProps) {
  const [display, setDisplay] = useState(String(initialValue));

  function handleKey(key: string) {
    if (key === 'C') {
      setDisplay('0');
    } else if (key === '⌫') {
      setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    } else {
      setDisplay((prev) => (prev === '0' ? key : prev + key));
    }
  }

  const handleConfirm = useCallback(() => {
    const value = parseInt(display) || 1;
    onSubmit(Math.max(1, value));
  }, [display, onSubmit]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKey('⌫');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleKey('C');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleConfirm, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose} data-no-swipe>
      <div
        className="w-72 rounded-2xl bg-surface p-4 shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Miqdor kiritish"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-text-primary">Miqdor</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Display */}
        <div className="mb-3 rounded-lg bg-surface-secondary px-4 py-3 text-right text-3xl font-bold text-text-primary">
          {display}
        </div>

        {/* Keys */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {KEYS.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-xl font-medium text-text-primary transition-colors hover:bg-surface-secondary active:bg-surface-tertiary"
              style={{ minHeight: '48px', minWidth: '48px' }}
              aria-label={key === '⌫' ? 'O\'chirish' : key === 'C' ? 'Tozalash' : key}
            >
              {key === '⌫' ? <Delete className="h-5 w-5" /> : key}
            </button>
          ))}
        </div>

        {/* Confirm */}
        <Button onClick={handleConfirm} className="w-full" size="lg">
          Tasdiqlash
        </Button>
      </div>
    </div>
  );
}
