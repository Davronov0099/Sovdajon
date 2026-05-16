import { createFileRoute } from '@tanstack/react-router';
import { WarehouseDetailPage } from '@/features/warehouses/WarehouseDetailPage';

export const Route = createFileRoute('/_auth/warehouses_/$warehouseId')({
  component: WarehouseDetailPage,
});
