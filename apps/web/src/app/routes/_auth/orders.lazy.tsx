import { createLazyFileRoute } from '@tanstack/react-router';
import { OrdersPage } from '@/features/orders/OrdersPage';
export const Route = createLazyFileRoute('/_auth/orders')({ component: OrdersPage });
