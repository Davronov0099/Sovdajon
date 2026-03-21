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
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const swipeDirection = useRef<'horizontal' | 'vertical' | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Swipe to close (pastga yoki o'ngga)
  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0]!.clientX;
    startY.current = e.touches[0]!.clientY;
    currentX.current = startX.current;
    currentY.current = startY.current;
    swipeDirection.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    currentX.current = e.touches[0]!.clientX;
    currentY.current = e.touches[0]!.clientY;

    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;

    // Yo'nalishni aniqlash
    if (!swipeDirection.current) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        swipeDirection.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      } else {
        return;
      }
    }

    if (!sheetRef.current) return;

    if (swipeDirection.current === 'vertical' && deltaY > 0) {
      // Pastga swipe
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      sheetRef.current.style.transition = 'none';
    } else if (swipeDirection.current === 'horizontal' && deltaX > 0) {
      // O'ngga swipe
      sheetRef.current.style.transform = `translateX(${deltaX}px)`;
      sheetRef.current.style.opacity = `${Math.max(0.3, 1 - deltaX / 350)}`;
      sheetRef.current.style.transition = 'none';
    }
  }

  function handleTouchEnd() {
    const deltaX = currentX.current - startX.current;
    const deltaY = currentY.current - startY.current;

    const shouldCloseDown = swipeDirection.current === 'vertical' && deltaY > 100;
    const shouldCloseRight = swipeDirection.current === 'horizontal' && deltaX > 100;

    if (shouldCloseDown || shouldCloseRight) {
      if (sheetRef.current) {
        if (shouldCloseDown) {
          sheetRef.current.style.transform = 'translateY(100%)';
        } else {
          sheetRef.current.style.transform = 'translateX(110%)';
          sheetRef.current.style.opacity = '0';
        }
        sheetRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      }
      setTimeout(onClose, 200);
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.opacity = '';
      sheetRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    }

    startX.current = 0;
    startY.current = 0;
    currentX.current = 0;
    currentY.current = 0;
    swipeDirection.current = null;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" data-swipe-overlay data-no-swipe>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl bg-surface shadow-modal animate-slide-up',
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
