import { createLazyFileRoute } from '@tanstack/react-router';
import { WarehousePage } from '@/features/warehouse/WarehousePage';
export const Route = createLazyFileRoute('/_auth/warehouse')({ component: WarehousePage });
