import { createLazyFileRoute } from '@tanstack/react-router';
import { POSPage } from '@/features/pos/POSPage';

export const Route = createLazyFileRoute('/_auth/pos')({
  component: POSPage,
});
