import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@sardorbek/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SearchInput } from '@/components/common/SearchInput';
import { useProducts } from '@/hooks/useProducts';
import { useSupplierImport } from '@/hooks/useSuppliers';
import { useCurrencyRate } from '@/hooks/useSettings';

interface ImportItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface SupplierImportModalProps {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}

export function SupplierImportModal({ supplierId, supplierName, onClose }: SupplierImportModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [note, setNote] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const { data: productsData } = useProducts({ search: productSearch, limit: 10 });
  const { data: currencyData } = useCurrencyRate();
  const importMut = useSupplierImport();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = ((productsData as any)?.data as Array<Record<string, unknown>>) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rate: number = ((currencyData as any)?.data?.rate as number) ?? 12800;

  function addProduct(product: Record<string, unknown>) {
    if (items.find((i) => i.productId === product.id)) return;
    setItems([...items, {
      productId: product.id as string,
      productName: product.name as string,
      quantity: 1,
      unitPrice: 0,
    }]);
    setProductSearch('');
  }

  function updateItem(index: number, field: keyof ImportItem, value: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const effectiveRate = currency === 'USD' ? rate : 1;
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice * effectiveRate, 0);

  async function handleSubmit() {
    if (items.length === 0) return;
    await importMut.mutateAsync({
      supplierId,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      currency,
      rate: effectiveRate,
      note: note || undefined,
    });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={`Kirim: ${supplierName}`} size="lg">
      <div className="space-y-4">
        {/* Currency selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-text-primary">Valyuta:</label>
          <div className="flex rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setCurrency('UZS')}
              className={`px-4 py-2 text-sm font-medium ${currency === 'UZS' ? 'bg-primary-600 text-white' : 'text-text-primary hover:bg-surface-secondary'} rounded-l-lg`}
            >
              UZS
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 text-sm font-medium ${currency === 'USD' ? 'bg-primary-600 text-white' : 'text-text-primary hover:bg-surface-secondary'} rounded-r-lg`}
            >
              USD
            </button>
          </div>
          {currency === 'USD' && (
            <span className="text-sm text-text-muted">Kurs: 1$ = {formatCurrency(rate, '')}</span>
          )}
        </div>

        {/* Product Search */}
        <div className="relative">
          <SearchInput value={productSearch} onChange={setProductSearch} placeholder="Mahsulot qidirish..." className="w-full" />
          {productSearch && products.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
              {products.map((p) => (
                <button
                  key={p.id as string}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-secondary"
                >
                  <span className="text-text-primary">{p.name as string}</span>
                  <span className="text-text-muted">{formatCurrency(Number(p.costPrice))}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-secondary text-left">
                  <th className="px-3 py-2">Mahsulot</th>
                  <th className="px-3 py-2 w-24">Miqdor</th>
                  <th className="px-3 py-2 w-32">Narx ({currency})</th>
                  <th className="px-3 py-2 w-32 text-right">Jami (UZS)</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.productId} className="border-b border-border/50">
                    <td className="px-3 py-2 text-text-primary">{item.productName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                        className="w-full rounded border border-border bg-surface px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice * effectiveRate)}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItem(i)} className="min-h-[44px] min-w-[44px] rounded p-2.5 text-text-muted hover:text-danger-600" aria-label={`${item.productName} ni o'chirish`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Total + Note */}
        <div className="flex items-center justify-between rounded-lg bg-surface-secondary p-3">
          <span className="font-medium text-text-primary">Jami:</span>
          <span className="text-xl font-bold text-text-primary">{formatCurrency(total)}</span>
        </div>

        <Input id="import-note" label="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} loading={importMut.isPending} disabled={items.length === 0}>
            <Plus className="h-4 w-4" />
            Kirimni saqlash
          </Button>
        </div>
      </div>
    </Modal>
  );
}
