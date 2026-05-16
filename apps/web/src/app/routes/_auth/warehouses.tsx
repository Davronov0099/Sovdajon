import { createFileRoute } from '@tanstack/react-router';
import { WarehousesPage } from '@/features/warehouses/WarehousesPage';

export const Route = createFileRoute('/_auth/warehouses')({
  component: WarehousesPage,
});
