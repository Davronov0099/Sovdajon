import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign } from 'lucide-react';
import { createProductSchema, type CreateProductInput } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useUsdRateStore } from '@/stores/usdRate';
import { ImageUploader } from '@/components/common/ImageUploader';

// Ro'yxatdan kelgan mahsulot ma'lumoti
export interface ProductData {
  id: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  minStock: number;
  unit: string;
  categoryId: string;
  subCategoryId: string | null;
  description: string | null;
  images?: string[];
  [key: string]: unknown; // discount1Qty, dollarRate, etc.
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductData | null; // null = yangi mahsulot
}

export function ProductModal({ open, onClose, product }: ProductModalProps) {
  const isEdit = !!product;
  const { data: catData } = useCategories();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const usdRate = useUsdRateStore((s) => s.rate);

  const categories = catData?.data ?? [];

  const [costUsd, setCostUsd] = useState(0);
  const [markupPct, setMarkupPct] = useState(0);
  const [images, setImages] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'PIECE',
      categoryId: '',
      discount1Qty: 0, discount1Pct: 0,
      discount2Qty: 0, discount2Pct: 0,
      discount3Qty: 0, discount3Pct: 0,
    },
  });

  const costPrice = watch('costPrice');
  const price = watch('price');

  // Modal ochilganda — darhol ma'lumotni to'ldirish (API kutilmaydi)
  useEffect(() => {
    if (!open) return;

    if (product) {
      const cp = Number(product.price);
      const cost = Number(product.costPrice);
      const rate = Number(product.dollarRate) || usdRate;
      reset({
        name: product.name,
        price: cp,
        costPrice: cost,
        dollarRate: rate,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit as CreateProductInput['unit'],
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId ?? undefined,
        description: product.description ?? undefined,
        discount1Qty: Number(product.discount1Qty) || 0,
        discount1Pct: Number(product.discount1Pct) || 0,
        discount2Qty: Number(product.discount2Qty) || 0,
        discount2Pct: Number(product.discount2Pct) || 0,
        discount3Qty: Number(product.discount3Qty) || 0,
        discount3Pct: Number(product.discount3Pct) || 0,
      });
      setCostUsd(cost > 0 && rate > 0 ? Math.round((cost / rate) * 100) / 100 : 0);
      setMarkupPct(cost > 0 ? Math.round(((cp - cost) / cost) * 100 * 10) / 10 : 0);
      setImages(product.images ?? []);
    } else {
      reset({
        name: '', price: 0, costPrice: 0, dollarRate: usdRate,
        stock: 0, minStock: 5, unit: 'PIECE',
        categoryId: categories[0]?.id ?? '',
        discount1Qty: 0, discount1Pct: 0,
        discount2Qty: 0, discount2Pct: 0,
        discount3Qty: 0, discount3Pct: 0,
      });
      setCostUsd(0);
      setMarkupPct(0);
      setImages([]);
    }
  }, [open, product, reset, categories, usdRate]);

  function handleCostUsdChange(usd: number) {
    setCostUsd(usd);
    const uzs = Math.round(usd * usdRate);
    setValue('costPrice', uzs);
    setValue('dollarRate', usdRate);
    if (uzs > 0 && markupPct > 0) setValue('price', Math.round(uzs * (1 + markupPct / 100)));
  }

  function handleCostUzsChange(uzs: number) {
    setValue('costPrice', uzs);
    setCostUsd(usdRate > 0 ? Math.round((uzs / usdRate) * 100) / 100 : 0);
    setValue('dollarRate', usdRate);
    if (uzs > 0 && markupPct > 0) setValue('price', Math.round(uzs * (1 + markupPct / 100)));
  }

  function handleMarkupChange(pct: number) {
    setMarkupPct(pct);
    if (costPrice > 0) setValue('price', Math.round(costPrice * (1 + pct / 100)));
  }

  function handlePriceChange(p: number) {
    setValue('price', p);
    if (costPrice > 0) setMarkupPct(Math.round(((p - costPrice) / costPrice) * 100 * 10) / 10);
  }

  async function onSubmit(data: CreateProductInput) {
    if (!data.description) data.description = undefined;
    data.images = images;
    if (isEdit && product) {
      await updateMut.mutateAsync({ id: product.id, data });
    } else {
      await createMut.mutateAsync(data);
    }
    onClose();
  }

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  function fmtMoney(v: number): string {
    return v > 0 ? v.toLocaleString('uz-UZ') : '';
  }
  function parseMoney(s: string): number {
    return parseInt(s.replace(/[^0-9]/g, '')) || 0;
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Rasm + Birlik/Nomi */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <ImageUploader images={images} onChange={setImages} maxImages={8} />
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="unit" className="mb-1 block text-[12px] font-medium text-text-secondary">Birlik</label>
              <select id="unit" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm" {...register('unit')}>
                <option value="PIECE">Dona</option>
                <option value="KG">Kilogram</option>
                <option value="METER">Metr</option>
                <option value="SET">Komplekt</option>
                <option value="PACK">Pachka</option>
                <option value="BOX">Quti</option>
              </select>
            </div>
            <Input id="name" label="Nomi" error={errors.name?.message} {...register('name')} />
          </div>
        </div>

        {/* Izoh */}
        <div>
          <label htmlFor="description" className="mb-1 block text-[12px] font-medium text-text-secondary">Izoh</label>
          <textarea id="description" rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm placeholder:text-text-muted focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none resize-none" {...register('description')} />
        </div>

        {/* Kategoriya + Bo'lim */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="categoryId" className="mb-1 block text-[12px] font-medium text-text-secondary">Kategoriya</label>
            <select id="categoryId" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm" {...register('categoryId')}>
              <option value="">Tanlang</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {errors.categoryId && <p className="mt-0.5 text-[11px] text-danger-600">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label htmlFor="subCategoryId" className="mb-1 block text-[12px] font-medium text-text-secondary">Bo'lim</label>
            <select id="subCategoryId" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm" disabled={!selectedCategory || selectedCategory.subCategories.length === 0} value={watch('subCategoryId') ?? ''} onChange={(e) => setValue('subCategoryId', e.target.value || undefined)}>
              <option value="">-</option>
              {selectedCategory?.subCategories.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
        </div>

        {/* Tan narx (USD + UZS) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-text-secondary">Tan narxi (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input type="number" step="0.01" min="0" value={costUsd || ''} onChange={(e) => handleCostUsdChange(Number(e.target.value) || 0)} placeholder="0.00" className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-text-secondary">Tan narxi (UZS)</label>
            <input type="text" inputMode="numeric" value={fmtMoney(costPrice)} onChange={(e) => handleCostUzsChange(parseMoney(e.target.value))} placeholder="0" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none" />
          </div>
        </div>

        {/* Sotish narxi */}
        <div>
          <label className="mb-1 block text-[12px] font-medium text-text-secondary">Sotish narxi</label>
          <div className="flex gap-2">
            <div className="relative w-24 shrink-0">
              <input type="number" min="0" max="10000" step="0.1" value={markupPct || ''} onChange={(e) => handleMarkupChange(Number(e.target.value) || 0)} placeholder="0" className="w-full rounded-lg border border-border bg-surface pl-3 pr-7 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none" />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] text-text-muted font-medium pointer-events-none">%</span>
            </div>
            <input type="text" inputMode="numeric" value={fmtMoney(price)} onChange={(e) => handlePriceChange(parseMoney(e.target.value))} placeholder="0" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none" />
          </div>
        </div>

        {/* Chegirma sozlamalari */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)' }} className="pt-3">
          <label className="block text-[12px] font-medium text-text-secondary mb-2">Chegirma sozlamalari (ixtiyoriy)</label>
          <div className="mb-2 p-2.5 rounded-lg bg-emerald-50" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-[11px] font-semibold text-emerald-800 mb-1.5">1-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Min miqdor</label>
                <input type="number" min="0" placeholder="10" {...register('discount1Qty', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-emerald-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Chegirma %</label>
                <input type="number" min="0" max="100" placeholder="5" {...register('discount1Pct', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-emerald-400 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="mb-2 p-2.5 rounded-lg bg-blue-50" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-[11px] font-semibold text-blue-800 mb-1.5">2-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Min miqdor</label>
                <input type="number" min="0" placeholder="50" {...register('discount2Qty', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Chegirma %</label>
                <input type="number" min="0" max="100" placeholder="10" {...register('discount2Pct', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-blue-400 focus:outline-none" />
              </div>
            </div>
          </div>
          <div className="mb-2 p-2.5 rounded-lg bg-violet-50" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <p className="text-[11px] font-semibold text-violet-800 mb-1.5">3-chegirma</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Min miqdor</label>
                <input type="number" min="0" placeholder="100" {...register('discount3Qty', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-violet-400 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-text-muted mb-0.5">Chegirma %</label>
                <input type="number" min="0" max="100" placeholder="15" {...register('discount3Pct', { valueAsNumber: true })} className="w-full rounded border border-border bg-surface px-2 py-1.5 text-[13px] focus:ring-1 focus:ring-violet-400 focus:outline-none" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-text-muted">Masalan: 10 dona olsa 5%, 50 dona olsa 10% chegirma</p>
        </div>

        {/* Miqdor */}
        <Input id="stock" label="Miqdor" type="number" error={errors.stock?.message} {...register('stock', { valueAsNumber: true })} />

        {/* Actions */}
        <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Bekor qilish</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Saqlash</Button>
        </div>
      </form>
    </Modal>
  );
}
