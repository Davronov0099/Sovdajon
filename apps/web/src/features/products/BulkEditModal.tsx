import { useState, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useBulkUpdateProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/cn';

interface BulkEditModalProps {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onApplied?: () => void;
}

type FieldKey =
  | 'price'
  | 'costPrice'
  | 'minStock'
  | 'unit'
  | 'categoryId'
  | 'subCategoryId'
  | 'discount1Qty'
  | 'discount1Pct'
  | 'discount2Qty'
  | 'discount2Pct'
  | 'discount3Qty'
  | 'discount3Pct';

const UNITS = ['PIECE', 'KG', 'METER', 'SET', 'PACK', 'BOX'] as const;

export function BulkEditModal({ open, selectedIds, onClose, onApplied }: BulkEditModalProps) {
  const bulkMut = useBulkUpdateProducts();
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  const [enabled, setEnabled] = useState<Record<FieldKey, boolean>>({
    price: false, costPrice: false, minStock: false, unit: false,
    categoryId: false, subCategoryId: false,
    discount1Qty: false, discount1Pct: false,
    discount2Qty: false, discount2Pct: false,
    discount3Qty: false, discount3Pct: false,
  });
  const [values, setValues] = useState<Record<FieldKey, string>>({
    price: '', costPrice: '', minStock: '', unit: 'PIECE',
    categoryId: '', subCategoryId: '',
    discount1Qty: '', discount1Pct: '',
    discount2Qty: '', discount2Pct: '',
    discount3Qty: '', discount3Pct: '',
  });

  const subCategories = (() => {
    if (!values.categoryId) return [];
    const cat = categories.find((c) => c.id === values.categoryId);
    return ((cat as unknown as Record<string, unknown>)?.subCategories as Array<{ id: string; name: string }>) ?? [];
  })();

  const toggleField = (k: FieldKey) => setEnabled((s) => ({ ...s, [k]: !s[k] }));
  const setValue = (k: FieldKey, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const reset = () => {
    setEnabled({
      price: false, costPrice: false, minStock: false, unit: false,
      categoryId: false, subCategoryId: false,
      discount1Qty: false, discount1Pct: false,
      discount2Qty: false, discount2Pct: false,
      discount3Qty: false, discount3Pct: false,
    });
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    if (enabled.price) data.price = Number(values.price) || 0;
    if (enabled.costPrice) data.costPrice = Number(values.costPrice) || 0;
    if (enabled.minStock) data.minStock = parseInt(values.minStock, 10) || 0;
    if (enabled.unit) data.unit = values.unit;
    if (enabled.categoryId && values.categoryId) data.categoryId = values.categoryId;
    if (enabled.subCategoryId) data.subCategoryId = values.subCategoryId || undefined;
    if (enabled.discount1Qty) data.discount1Qty = parseInt(values.discount1Qty, 10) || 0;
    if (enabled.discount1Pct) data.discount1Pct = Number(values.discount1Pct) || 0;
    if (enabled.discount2Qty) data.discount2Qty = parseInt(values.discount2Qty, 10) || 0;
    if (enabled.discount2Pct) data.discount2Pct = Number(values.discount2Pct) || 0;
    if (enabled.discount3Qty) data.discount3Qty = parseInt(values.discount3Qty, 10) || 0;
    if (enabled.discount3Pct) data.discount3Pct = Number(values.discount3Pct) || 0;

    if (Object.keys(data).length === 0) {
      alert('Hech qaysi maydon belgilanmadi');
      return;
    }

    await bulkMut.mutateAsync({ ids: selectedIds, data });
    reset();
    onApplied?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative z-10 bg-surface rounded-2xl shadow-modal w-full max-w-[640px] mx-4 max-h-[90vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Birga tahrirlash</h2>
            <p className="text-xs text-text-muted mt-0.5">
              <span className="font-bold text-primary-600">{selectedIds.length}</span> ta mahsulot tanlandi
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-secondary"
            style={{ minHeight: 'auto', minWidth: 'auto' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-xs text-text-muted">
            Faqat belgilangan ("✓") maydonlar yangilanadi. Boshqalari o'zgartirilmaydi.
          </p>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <BulkField label="Narx (so'm)" enabled={enabled.price} onToggle={() => toggleField('price')}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.price}
                onChange={(e) => setValue('price', e.target.value)}
                disabled={!enabled.price}
                className="input"
                placeholder="0"
              />
            </BulkField>
            <BulkField label="Tan narxi" enabled={enabled.costPrice} onToggle={() => toggleField('costPrice')}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={values.costPrice}
                onChange={(e) => setValue('costPrice', e.target.value)}
                disabled={!enabled.costPrice}
                className="input"
                placeholder="0"
              />
            </BulkField>
          </div>

          {/* Min stock + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <BulkField label="Min. ombor" enabled={enabled.minStock} onToggle={() => toggleField('minStock')}>
              <input
                type="number"
                min={0}
                value={values.minStock}
                onChange={(e) => setValue('minStock', e.target.value)}
                disabled={!enabled.minStock}
                className="input"
                placeholder="5"
              />
            </BulkField>
            <BulkField label="O'lchov" enabled={enabled.unit} onToggle={() => toggleField('unit')}>
              <select
                value={values.unit}
                onChange={(e) => setValue('unit', e.target.value)}
                disabled={!enabled.unit}
                className="input"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </BulkField>
          </div>

          {/* Category + SubCategory */}
          <div className="grid grid-cols-2 gap-3">
            <BulkField label="Kategoriya" enabled={enabled.categoryId} onToggle={() => toggleField('categoryId')}>
              <select
                value={values.categoryId}
                onChange={(e) => { setValue('categoryId', e.target.value); setValue('subCategoryId', ''); }}
                disabled={!enabled.categoryId}
                className="input"
              >
                <option value="">— tanlang —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </BulkField>
            <BulkField label="Sub-kategoriya" enabled={enabled.subCategoryId} onToggle={() => toggleField('subCategoryId')}>
              <select
                value={values.subCategoryId}
                onChange={(e) => setValue('subCategoryId', e.target.value)}
                disabled={!enabled.subCategoryId || subCategories.length === 0}
                className="input"
              >
                <option value="">— yo'q —</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </BulkField>
          </div>

          {/* Discounts */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">3 darajali chegirma</p>
            <div className="space-y-2">
              {[1, 2, 3].map((tier) => {
                const qtyKey = `discount${tier}Qty` as FieldKey;
                const pctKey = `discount${tier}Pct` as FieldKey;
                return (
                  <div key={tier} className="grid grid-cols-2 gap-3">
                    <BulkField label={`Daraja ${tier}: dona dan`} enabled={enabled[qtyKey]} onToggle={() => toggleField(qtyKey)}>
                      <input
                        type="number"
                        min={0}
                        value={values[qtyKey]}
                        onChange={(e) => setValue(qtyKey, e.target.value)}
                        disabled={!enabled[qtyKey]}
                        className="input"
                        placeholder="0"
                      />
                    </BulkField>
                    <BulkField label={`Daraja ${tier}: foiz %`} enabled={enabled[pctKey]} onToggle={() => toggleField(pctKey)}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={values[pctKey]}
                        onChange={(e) => setValue(pctKey, e.target.value)}
                        disabled={!enabled[pctKey]}
                        className="input"
                        placeholder="0"
                      />
                    </BulkField>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
            style={{ minHeight: 'auto', border: '1px solid var(--color-border)' }}
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={bulkMut.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors"
            style={{ minHeight: 'auto' }}
          >
            {bulkMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {selectedIds.length} ta'ga qo'llash
          </button>
        </div>
      </div>
    </div>
  );
}

interface BulkFieldProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function BulkField({ label, enabled, onToggle, children }: BulkFieldProps) {
  return (
    <label className={cn('block', !enabled && 'opacity-50')}>
      <div className="flex items-center gap-1.5 mb-1">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded accent-primary-600 cursor-pointer"
        />
        <span className="text-[11px] font-medium text-text-secondary">{label}</span>
      </div>
      {children}
    </label>
  );
}
