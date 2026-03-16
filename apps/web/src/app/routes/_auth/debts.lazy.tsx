import { createLazyFileRoute } from '@tanstack/react-router';
import { DebtsPage } from '@/features/debts/DebtsPage';

export const Route = createLazyFileRoute('/_auth/debts')({
  component: DebtsPage,
});
