import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomersPage } from '@/features/customers/CustomersPage';

export const Route = createLazyFileRoute('/_auth/customers')({
  component: CustomersPage,
});
