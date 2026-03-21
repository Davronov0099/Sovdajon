import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'sm' | 'md' | 'lg' | 'full';
}

const HEIGHT_MAP = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[80vh]',
  full: 'max-h-[95vh]',
};

export function BottomSheet({ open, onClose, title, children, height = 'lg' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Swipe down to close
  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0]!.clientY;
  }

  function handleTouchMove(e: React.TouchEvent) {
    currentY.current = e.touches[0]!.clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  }

  function handleTouchEnd() {
    const diff = currentY.current - startY.current;
    if (diff > 100) {
      onClose();
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startY.current = 0;
    currentY.current = 0;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-surface shadow-modal transition-transform duration-200',
          HEIGHT_MAP[height],
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-surface-secondary" aria-label="Yopish">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
