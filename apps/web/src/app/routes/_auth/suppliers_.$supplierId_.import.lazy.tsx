import { createLazyFileRoute } from '@tanstack/react-router';
import { SupplierImportPage } from '@/features/suppliers/SupplierImportPage';

export const Route = createLazyFileRoute('/_auth/suppliers_/$supplierId_/import')({
  component: SupplierImportPage,
});
