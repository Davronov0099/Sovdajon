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
  const curX = useRef(0);
  const curY = useRef(0);
  const swipeDir = useRef<'horizontal' | 'vertical' | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open, onClose]);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = curX.current = e.touches[0]!.clientX;
    startY.current = curY.current = e.touches[0]!.clientY;
    swipeDir.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    curX.current = e.touches[0]!.clientX;
    curY.current = e.touches[0]!.clientY;
    const dx = curX.current - startX.current;
    const dy = curY.current - startY.current;

    if (!swipeDir.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10)
        swipeDir.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      else return;
    }
    if (!sheetRef.current) return;

    if (swipeDir.current === 'vertical' && dy > 0) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = 'none';
    } else if (swipeDir.current === 'horizontal' && dx > 0) {
      sheetRef.current.style.transform = `translateX(${dx}px)`;
      sheetRef.current.style.opacity = `${Math.max(0.3, 1 - dx / 350)}`;
      sheetRef.current.style.transition = 'none';
    }
  }

  function handleTouchEnd() {
    const dx = curX.current - startX.current;
    const dy = curY.current - startY.current;
    const closeDown = swipeDir.current === 'vertical' && dy > 100;
    const closeRight = swipeDir.current === 'horizontal' && dx > 100;

    if ((closeDown || closeRight) && sheetRef.current) {
      sheetRef.current.style.transform = closeDown ? 'translateY(100%)' : 'translateX(110%)';
      if (closeRight) sheetRef.current.style.opacity = '0';
      sheetRef.current.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      setTimeout(onClose, 200);
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.opacity = '';
      sheetRef.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    }
    startX.current = startY.current = curX.current = curY.current = 0;
    swipeDir.current = null;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" data-no-swipe>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
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
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <h3 className="font-semibold text-text-primary">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-2 text-text-muted hover:bg-surface-secondary" aria-label="Yopish">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4" style={{ overscrollBehavior: 'contain' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
