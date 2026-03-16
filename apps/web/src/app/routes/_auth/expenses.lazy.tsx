import { createLazyFileRoute } from '@tanstack/react-router';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';

export const Route = createLazyFileRoute('/_auth/expenses')({
  component: ExpensesPage,
});
