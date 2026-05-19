import { createLazyFileRoute } from '@tanstack/react-router';
import { ImportsListPage } from '@/features/suppliers/ImportsListPage';

export const Route = createLazyFileRoute('/_auth/suppliers_/imports')({
  component: ImportsListPage,
});
