import { createLazyFileRoute } from '@tanstack/react-router';
import { SupplierDetailPage } from '@/features/suppliers/SupplierDetailPage';

export const Route = createLazyFileRoute('/_auth/suppliers_/$supplierId')({
  component: SupplierDetailPage,
});
