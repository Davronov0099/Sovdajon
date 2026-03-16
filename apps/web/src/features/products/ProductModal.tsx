import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { createProductSchema, type CreateProductInput } from '@sardorbek/shared';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/common/MoneyInput';
import { Button } from '@/components/ui/button';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
}

export function ProductModal({ open, onClose, productId }: ProductModalProps) {
  const { t } = useTranslation();
  const isEdit = !!productId;
  const { data: productData } = useProduct(productId ?? '');
  const { data: catData } = useCategories();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();

  const categories = catData?.data ?? [];
  const product = productData?.data;

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
    },
  });

  useEffect(() => {
    if (product && isEdit) {
      reset({
        name: product.name,
        sku: product.sku ?? undefined,
        barcode: product.barcode ?? undefined,
        price: Number(product.price),
        costPrice: Number(product.costPrice),
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit as CreateProductInput['unit'],
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId ?? undefined,
        description: product.description ?? undefined,
      });
    } else if (!isEdit) {
      reset({
        name: '',
        price: 0,
        costPrice: 0,
        stock: 0,
        minStock: 5,
        unit: 'PIECE',
        categoryId: categories[0]?.id ?? '',
      });
    }
  }, [product, isEdit, reset, categories]);

  async function onSubmit(data: CreateProductInput) {
    if (isEdit && productId) {
      await updateMut.mutateAsync({ id: productId, data });
    } else {
      await createMut.mutateAsync(data);
    }
    onClose();
  }

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="name"
            label={t('product.name')}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            id="sku"
            label={t('product.sku')}
            error={errors.sku?.message}
            {...register('sku')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyInput
            id="price"
            label={t('product.price')}
            value={watch('price')}
            onChange={(v) => setValue('price', v)}
            error={errors.price?.message}
          />
          <MoneyInput
            id="costPrice"
            label={t('product.costPrice')}
            value={watch('costPrice')}
            onChange={(v) => setValue('costPrice', v)}
            error={errors.costPrice?.message}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            id="stock"
            label={t('product.stock')}
            type="number"
            error={errors.stock?.message}
            {...register('stock', { valueAsNumber: true })}
          />
          <Input
            id="minStock"
            label="Min stok"
            type="number"
            error={errors.minStock?.message}
            {...register('minStock', { valueAsNumber: true })}
          />
          <div>
            <label htmlFor="unit" className="mb-1.5 block text-sm font-medium text-text-primary">
              {t('product.unit')}
            </label>
            <select
              id="unit"
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              {...register('unit')}
            >
              <option value="PIECE">Dona</option>
              <option value="KG">Kg</option>
              <option value="METER">Metr</option>
              <option value="SET">Komplekt</option>
              <option value="PACK">Pachka</option>
              <option value="BOX">Quti</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-text-primary">
              {t('product.category')}
            </label>
            <select
              id="categoryId"
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
              {...register('categoryId')}
            >
              <option value="">Tanlang</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-sm text-danger-600">{errors.categoryId.message}</p>
            )}
          </div>
          {selectedCategory && selectedCategory.subCategories.length > 0 && (
            <div>
              <label htmlFor="subCategoryId" className="mb-1.5 block text-sm font-medium text-text-primary">
                Sub-kategoriya
              </label>
              <select
                id="subCategoryId"
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm"
                {...register('subCategoryId')}
              >
                <option value="">-</option>
                {selectedCategory.subCategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Input
          id="barcode"
          label={t('product.barcode')}
          {...register('barcode')}
        />

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-text-primary">
            Tavsif
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm placeholder:text-text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
            {...register('description')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
