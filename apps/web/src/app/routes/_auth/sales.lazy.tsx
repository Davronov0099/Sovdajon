import { createLazyFileRoute } from '@tanstack/react-router';
import { SalesPage } from '@/features/sales/SalesPage';

export const Route = createLazyFileRoute('/_auth/sales')({
  component: SalesPage,
});
