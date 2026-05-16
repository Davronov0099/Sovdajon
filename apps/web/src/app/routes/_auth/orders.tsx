import { createFileRoute } from '@tanstack/react-router';
import { OrdersPage } from '@/features/orders/OrdersPage';

export const Route = createFileRoute('/_auth/orders')({
  component: OrdersPage,
});
