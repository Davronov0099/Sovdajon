import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomerMapPage } from '@/features/customers/CustomerMapPage';

export const Route = createLazyFileRoute('/_auth/customers_/map')({
  component: CustomerMapPage,
});
