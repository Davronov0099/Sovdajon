import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage';

export const Route = createLazyFileRoute('/_auth/customers_/$customerId')({
  component: CustomerDetailPage,
});
