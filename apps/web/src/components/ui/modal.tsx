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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeDir = useRef<'horizontal' | 'vertical' | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  /* ─── Swipe right to close (mobile) ─── */
  function handleTouchStart(e: React.TouchEvent) {
    swipeDir.current = null;
    touchStart.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current || !panelRef.current) return;
    const dx = e.touches[0]!.clientX - touchStart.current.x;
    const dy = e.touches[0]!.clientY - touchStart.current.y;
    if (!swipeDir.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10)
        swipeDir.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      else return;
    }
    if (swipeDir.current === 'horizontal' && dx > 0) {
      panelRef.current.style.transform = `translateX(${dx}px)`;
      panelRef.current.style.opacity = `${Math.max(0.3, 1 - dx / 350)}`;
      panelRef.current.style.transition = 'none';
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current || !panelRef.current) return;
    const dx = e.changedTouches[0]!.clientX - touchStart.current.x;
    if (swipeDir.current === 'horizontal' && dx > 100) {
      panelRef.current.style.transform = 'translateX(110%)';
      panelRef.current.style.opacity = '0';
      panelRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      setTimeout(onClose, 200);
    } else {
      panelRef.current.style.transform = '';
      panelRef.current.style.opacity = '';
      panelRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    }
    touchStart.current = null;
    swipeDir.current = null;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[8vh]" onClick={onClose} data-no-swipe>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
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
        <div className="flex-1 overflow-y-auto px-5 py-4 modal-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
