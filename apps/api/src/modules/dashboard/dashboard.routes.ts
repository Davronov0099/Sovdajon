import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../plugins/auth.js';
import * as dashboard from './dashboard.service.js';
import { z } from 'zod';

const dateRangeQuery = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [requireRole('ADMIN')];

  app.get('/summary', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getSummaryStats(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/sales-trend', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getSalesTrend(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/top-products', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getTopProducts(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/top-customers', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getTopCustomers(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/category-sales', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getCategorySales(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/hourly', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getSalesByHour(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/profit-trend', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getProfitTrend(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/cashier-performance', { preHandler }, async (request, reply) => {
    const { startDate, endDate } = request.query as z.infer<typeof dateRangeQuery>;
    const data = await dashboard.getCashierPerformance(startDate, endDate);
    reply.send({ success: true, data });
  });

  app.get('/debt-aging', { preHandler }, async (_request, reply) => {
    const data = await dashboard.getDebtAging();
    reply.send({ success: true, data });
  });
}
