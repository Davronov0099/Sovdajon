import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeDirection = useRef<'horizontal' | 'vertical' | null>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  /* ─── Swipe-to-close (mobile) ─── */
  function handleTouchStart(e: React.TouchEvent) {
    swipeDirection.current = null;
    touchStart.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
      time: Date.now(),
    };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || !panelRef.current) return;

    const deltaX = e.touches[0]!.clientX - touchStart.current.x;
    const deltaY = e.touches[0]!.clientY - touchStart.current.y;

    // Yo'nalishni aniqlash
    if (!swipeDirection.current) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        swipeDirection.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      } else {
        return;
      }
    }

    // Faqat o'ngga swipe — modal yopilishi uchun
    if (swipeDirection.current === 'horizontal' && deltaX > 0) {
      panelRef.current.style.transform = `translateX(${deltaX}px)`;
      panelRef.current.style.opacity = `${Math.max(0.3, 1 - deltaX / 350)}`;
      panelRef.current.style.transition = 'none';
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current || !panelRef.current) return;

    const deltaX = e.changedTouches[0]!.clientX - touchStart.current.x;
    const elapsed = Date.now() - touchStart.current.time;
    const velocity = Math.abs(deltaX) / elapsed;

    const shouldClose = swipeDirection.current === 'horizontal' && deltaX > 0 &&
      (deltaX > 100 || (velocity > 0.5 && deltaX > 30));

    if (shouldClose) {
      // Animatsiya bilan yopish
      panelRef.current.style.transform = 'translateX(110%)';
      panelRef.current.style.opacity = '0';
      panelRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      setTimeout(onClose, 200);
    } else {
      // Joyiga qaytarish
      panelRef.current.style.transform = '';
      panelRef.current.style.opacity = '';
      panelRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    }

    touchStart.current = null;
    swipeDirection.current = null;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh]"
      onClick={onClose}
      data-swipe-overlay
      data-no-swipe
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 w-full mx-4 rounded-2xl bg-surface shadow-modal animate-scale-in',
          sizeMap[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-secondary hover:text-text-primary transition-colors"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 modal-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
