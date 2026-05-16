import { createFileRoute } from '@tanstack/react-router';
import { ReceiptsPage } from '@/features/receipts/ReceiptsPage';

export const Route = createFileRoute('/_auth/receipts')({
  component: ReceiptsPage,
});
