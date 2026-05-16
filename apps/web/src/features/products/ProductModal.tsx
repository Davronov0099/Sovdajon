import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProductSchema, type CreateProductInput } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ImageUploader } from '@/components/common/ImageUploader';

// Ro'yxatdan kelgan mahsulot ma'lumoti
export interface ProductData {
  id: string;
  name: string;
  price: string;
  costPrice: string;
  minSellingPrice: string | null;
  wholesalePrice: string | null;
  stock: number;
  minStock: number;
  unit: string;
  categoryId: string;
  subCategoryId: string | null;
  description: string | null;
  images?: string[];
  [key: string]: unknown;
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

  const categories = catData?.data ?? [];

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
      minSellingPrice: undefined,
      wholesalePrice: undefined,
      stock: 0,
      minStock: 5,
      unit: 'PIECE',
      categoryId: '',
    },
  });

  const costPrice = watch('costPrice');
  const price = watch('price');
  const minSellingPrice = watch('minSellingPrice');
  const wholesalePrice = watch('wholesalePrice');

  // Modal ochilganda — darhol ma'lumotni to'ldirish
  useEffect(() => {
    if (!open) return;

    if (product) {
      reset({
        name: product.name,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        minSellingPrice: product.minSellingPrice != null ? Number(product.minSellingPrice) : undefined,
        wholesalePrice: product.wholesalePrice != null ? Number(product.wholesalePrice) : undefined,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit as CreateProductInput['unit'],
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId ?? undefined,
        description: product.description ?? undefined,
      });
      setImages(product.images ?? []);
    } else {
      reset({
        name: '',
        price: 0,
        costPrice: 0,
        minSellingPrice: undefined,
        wholesalePrice: undefined,
        stock: 0,
        minStock: 5,
        unit: 'PIECE',
        categoryId: categories[0]?.id ?? '',
      });
      setImages([]);
    }
  }, [open, product, reset, categories]);

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

  function fmtMoney(v: number | undefined | null): string {
    if (v == null || v === 0) return '';
    return v > 0 ? v.toLocaleString('uz-UZ') : '';
  }
  function parseMoney(s: string): number {
    return parseInt(s.replace(/[^0-9]/g, '')) || 0;
  }

  // Foyda/margin hisoblash (dona narxi vs tan narxi)
  const profitPerUnit = (price || 0) - (costPrice || 0);
  const marginPct = costPrice > 0 ? Math.round((profitPerUnit / costPrice) * 100) : 0;

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
            <Input id="name" label="Mahsulot nomi *" error={errors.name?.message} {...register('name')} />
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
            <label htmlFor="categoryId" className="mb-1 block text-[12px] font-medium text-text-secondary">Kategoriya *</label>
            <select id="categoryId" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm" {...register('categoryId')}>
              <option value="">Tanlang</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {errors.categoryId && <p className="mt-0.5 text-[11px] text-danger-600">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label htmlFor="subCategoryId" className="mb-1 block text-[12px] font-medium text-text-secondary">Bo'lim</label>
            <select id="subCategoryId" className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm" disabled={!selectedCategory || selectedCategory.subCategories.length === 0} value={watch('subCategoryId') ?? ''} onChange={(e) => setValue('subCategoryId', e.target.value || undefined)}>
              <option value="">—</option>
              {selectedCategory?.subCategories.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
        </div>

        {/* Narxlar bloki */}
        <div className="rounded-lg p-3 bg-surface-secondary/40" style={{ border: '1px solid var(--color-border-subtle)' }}>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Narxlar (so'm)</p>

          {/* Tan narxi */}
          <div className="mb-2">
            <label className="mb-1 block text-[12px] font-medium text-text-secondary">Tan narxi *</label>
            <input
              type="text"
              inputMode="numeric"
              value={fmtMoney(costPrice)}
              onChange={(e) => setValue('costPrice', parseMoney(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none"
            />
          </div>

          {/* 3 sotuv narxi: Min, Optom, Dona */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-text-secondary">Min sotuv narxi</label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtMoney(minSellingPrice ?? null)}
                onChange={(e) => {
                  const v = parseMoney(e.target.value);
                  setValue('minSellingPrice', v > 0 ? v : undefined);
                }}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-text-secondary">Optom narxi</label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtMoney(wholesalePrice ?? null)}
                onChange={(e) => {
                  const v = parseMoney(e.target.value);
                  setValue('wholesalePrice', v > 0 ? v : undefined);
                }}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-text-secondary">Dona narxi *</label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtMoney(price)}
                onChange={(e) => setValue('price', parseMoney(e.target.value))}
                placeholder="0"
                className="w-full rounded-lg border border-primary-300 bg-primary-50/30 px-3 py-2.5 text-sm font-semibold tabular-nums focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Foyda hisobi */}
          {costPrice > 0 && price > 0 && (
            <div className="mt-2 flex items-center gap-3 text-[11px]">
              <span className="text-text-muted">Foyda (dona):</span>
              <span className={profitPerUnit >= 0 ? 'text-success-600 font-semibold' : 'text-danger-600 font-semibold'}>
                {fmtMoney(profitPerUnit) || '0'} so'm ({marginPct}%)
              </span>
            </div>
          )}
        </div>

        {/* Miqdori */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="stock"
            label="Miqdori"
            type="number"
            error={errors.stock?.message}
            {...register('stock', { valueAsNumber: true })}
          />
          <Input
            id="minStock"
            label="Min zaxira"
            type="number"
            error={errors.minStock?.message}
            {...register('minStock', { valueAsNumber: true })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Bekor qilish</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Saqlash</Button>
        </div>
      </form>
    </Modal>
  );
}
