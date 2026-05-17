import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomerLocationPage } from '@/features/customers/CustomerLocationPage';

export const Route = createLazyFileRoute('/_auth/customers_/$customerId_/location')({
  component: CustomerLocationPage,
});
