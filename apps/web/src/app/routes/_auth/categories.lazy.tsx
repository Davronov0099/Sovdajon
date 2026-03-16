import { createLazyFileRoute } from '@tanstack/react-router';
import { CategoriesPage } from '@/features/categories/CategoriesPage';

export const Route = createLazyFileRoute('/_auth/categories')({
  component: CategoriesPage,
});
