import { createLazyFileRoute } from '@tanstack/react-router';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';

export const Route = createLazyFileRoute('/_auth/suppliers')({
  component: SuppliersPage,
});
