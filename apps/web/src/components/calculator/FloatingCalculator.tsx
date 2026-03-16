import { useState, useRef, useCallback } from 'react';
import { Calculator, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';
const CALC_KEYS = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', '='],
] as const;

export function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  function handleKey(key: string) {
    if (key >= '0' && key <= '9' || key === '.') {
      setDisplay((d) => d === '0' && key !== '.' ? key : d + key);
    } else if (key === 'C') {
      setDisplay('0');
      setPrev(null);
      setOp(null);
    } else if (key === '⌫') {
      setDisplay((d) => d.length > 1 ? d.slice(0, -1) : '0');
    } else if (key === '%') {
      setDisplay(String(parseFloat(display) / 100));
    } else if (['+', '-', '×', '÷'].includes(key)) {
      setPrev(parseFloat(display));
      setOp(key);
      setDisplay('0');
    } else if (key === '=') {
      if (prev !== null && op) {
        const current = parseFloat(display);
        let result = 0;
        if (op === '+') result = prev + current;
        if (op === '-') result = prev - current;
        if (op === '×') result = prev * current;
        if (op === '÷') result = current !== 0 ? prev / current : 0;
        setDisplay(String(Math.round(result * 100) / 100));
        setPrev(null);
        setOp(null);
      }
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    }

    function handleMouseUp() {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 sm:bottom-4"
        aria-label="Kalkulyator"
      >
        <Calculator className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 w-64 rounded-2xl bg-surface shadow-modal"
      style={{ left: position.x, top: position.y }}
    >
      {/* Draggable header */}
      <div
        className="flex cursor-grab items-center justify-between rounded-t-2xl bg-primary-600 px-3 py-2 text-white active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4" />
          <span className="text-sm font-medium">Kalkulyator</span>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-primary-700" aria-label="Yopish">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Display */}
      <div className="px-3 py-2">
        <div className="rounded-lg bg-surface-secondary px-3 py-2 text-right text-2xl font-bold text-text-primary">
          {display}
        </div>
      </div>

      {/* Keys */}
      <div className="grid grid-cols-4 gap-1 px-3 pb-3">
        {CALC_KEYS.flat().map((key, i) => (
          <button
            key={`${key}-${i}`}
            onClick={() => handleKey(key)}
            className={cn(
              'flex h-11 items-center justify-center rounded-lg text-base font-medium transition-colors',
              ['+', '-', '×', '÷', '='].includes(key)
                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                : key === 'C' || key === '⌫'
                  ? 'bg-danger-50 text-danger-600 hover:bg-danger-100'
                  : 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary',
            )}
            aria-label={key}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

