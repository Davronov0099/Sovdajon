import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, QrCode } from 'lucide-react';
import { formatCurrency, formatDate } from '@sardorbek/shared';
import { useProduct } from '@/hooks/useProducts';
import { StockBadge } from '@/components/common/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRef } from 'react';

interface PriceHistoryEntry {
  id: string;
  oldPrice: string;
  newPrice: string;
  reason: string;
  createdAt: string;
}

interface ProductWithHistory {
  priceHistory?: PriceHistoryEntry[];
  [key: string]: unknown;
}

export function ProductDetailPage() {
  const { productId } = useParams({ strict: false });
  const { t } = useTranslation();
  const { data, isLoading } = useProduct(productId ?? '');
  const qrRef = useRef<HTMLDivElement>(null);

  const rawProduct = data?.data;
  const product = rawProduct as (typeof rawProduct & ProductWithHistory) | undefined;

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-text-muted">
        <Package className="mb-4 h-16 w-16" />
        <p className="text-lg font-medium">{t('common.noData')}</p>
      </div>
    );
  }

  const qrUrl = `${window.location.origin}/products/${product.id}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/products"
          className="rounded-lg p-2 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">{product.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Images */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            {product.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {product.images.map((img, i) => (
                  <img key={i} src={img} alt={`${product.name} - ${i + 1}`} className="h-48 w-full rounded-lg object-cover" />
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-surface-secondary">
                <Package className="h-20 w-20 text-text-muted" />
              </div>
            )}
          </div>

          {/* Price History */}
          {product.priceHistory && product.priceHistory.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-3 font-semibold text-text-primary">Narx tarixi</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2">Sana</th>
                    <th className="pb-2">Eski narx</th>
                    <th className="pb-2">Yangi narx</th>
                    <th className="pb-2">Sabab</th>
                  </tr>
                </thead>
                <tbody>
                  {product.priceHistory.map((ph) => (
                    <tr key={ph.id} className="border-b border-border/50">
                      <td className="py-2">{formatDate(ph.createdAt)}</td>
                      <td className="py-2">{formatCurrency(Number(ph.oldPrice))}</td>
                      <td className="py-2 font-medium">{formatCurrency(Number(ph.newPrice))}</td>
                      <td className="py-2 text-text-muted">{ph.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info + QR */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('product.price')}</dt>
                <dd className="font-bold text-text-primary">{formatCurrency(Number(product.price))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('product.costPrice')}</dt>
                <dd className="text-text-primary">{formatCurrency(Number(product.costPrice))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Foyda</dt>
                <dd className="font-medium text-success-600">
                  {formatCurrency(Number(product.price) - Number(product.costPrice))}
                </dd>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('product.stock')}</dt>
                <dd><StockBadge stock={product.stock} minStock={product.minStock} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('product.unit')}</dt>
                <dd className="text-text-primary">{product.unit}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">{t('product.category')}</dt>
                <dd className="text-text-primary">{product.category.name}</dd>
              </div>
            </dl>
          </div>

          {/* QR Code */}
          <div className="rounded-xl border border-border bg-surface p-4 text-center" ref={qrRef}>
            <QrCode className="mx-auto mb-2 h-32 w-32 text-text-primary" />
            <p className="text-xs text-text-muted">QR kod: {qrUrl}</p>
            <p className="mt-1 text-xs text-text-muted">(qrcode.react integratsiyasi Faza 3 da)</p>
          </div>

          {product.description && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 font-semibold text-text-primary">Tavsif</h3>
              <p className="text-sm text-text-secondary">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
