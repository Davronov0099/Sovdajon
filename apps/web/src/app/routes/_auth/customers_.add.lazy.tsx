import { createLazyFileRoute } from '@tanstack/react-router';
import { AddCustomerPage } from '@/features/customers/AddCustomerPage';

export const Route = createLazyFileRoute('/_auth/customers_/add')({
  component: AddCustomerPage,
});
