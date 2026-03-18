import { createLazyFileRoute } from '@tanstack/react-router';
import { CustomerDebtsPage } from '@/features/debts/CustomerDebtsPage';

export const Route = createLazyFileRoute('/_auth/debts_/$customerId')({
  component: CustomerDebtsPage,
});
