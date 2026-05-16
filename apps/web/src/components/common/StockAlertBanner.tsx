import { Link } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import { useLowStockProducts } from '@/hooks/useProducts';

/**
 * Kam qolgan / tugagan mahsulotlar borligi haqida banner.
 * Dashboard yoki Products sahifasining yuqorisida ko'rinadi.
 */
export function StockAlertBanner() {
  const { data } = useLowStockProducts(10);
  const [dismissed, setDismissed] = useState(false);
  const products = data?.data ?? [];

  if (dismissed || products.length === 0) return null;

  const outCount = products.filter((p) => p.stock === 0).length;
  const lowCount = products.filter((p) => p.stock > 0).length;

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 sm:px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-100 text-warning-700">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-warning-900">
          Stock ogohlantirish
        </p>
        <p className="text-[11px] sm:text-xs text-warning-700 mt-0.5">
          {outCount > 0 && (
            <span><strong>{outCount}</strong> ta tugagan</span>
          )}
          {outCount > 0 && lowCount > 0 && <span> · </span>}
          {lowCount > 0 && (
            <span><strong>{lowCount}</strong> ta kam qolgan</span>
          )}
        </p>
      </div>
      <Link
        to="/stock-alerts"
        className="inline-flex items-center gap-0.5 rounded-md bg-warning-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-warning-700 transition-colors shrink-0"
        style={{ minHeight: 'auto' }}
      >
        Ko'rish
        <ChevronRight className="h-3 w-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="text-warning-700/60 hover:text-warning-900 shrink-0"
        title="Yopish"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
