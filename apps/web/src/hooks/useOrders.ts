import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product: { id: string; name: string; price: string; costPrice: string; stock: number };
}

interface Order {
  id: string;
  number: number;
  status: string;
  total: string;
  note: string | null;
  customerId: string | null;
  customer: { id: string; name: string; phone: string } | null;
  createdBy: { id: string; name: string } | null;
  items: OrderItem[];
  createdAt: string;
}

interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('limit', '50');
      return api.get(`orders?${params.toString()}`).json<OrdersResponse>();
    },
    refetchInterval: 10_000, // Har 10s yangilash
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`orders/${id}/status`, { json: { status } }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
