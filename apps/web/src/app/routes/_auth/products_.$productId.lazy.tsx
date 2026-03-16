import { createLazyFileRoute } from '@tanstack/react-router';
import { ProductDetailPage } from '@/features/products/ProductDetailPage';

export const Route = createLazyFileRoute('/_auth/products_/$productId')({
  component: ProductDetailPage,
});
