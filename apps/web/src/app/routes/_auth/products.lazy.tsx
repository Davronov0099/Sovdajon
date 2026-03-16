import { createLazyFileRoute } from '@tanstack/react-router';
import { ProductsPage } from '@/features/products/ProductsPage';

export const Route = createLazyFileRoute('/_auth/products')({
  component: ProductsPage,
});
