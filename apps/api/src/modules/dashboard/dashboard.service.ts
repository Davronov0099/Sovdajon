import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

const CACHE_TTL = 300; // 5 minutes

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
  return data;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

function parseDateRange(start?: string, end?: string): DateRange {
  const now = new Date();
  const startDate = start ? new Date(start) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = end ? new Date(end) : now;
  return { startDate, endDate };
}

// 1. Summary stats cards (8 ta)
export async function getSummaryStats(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    const [receipts, profitData, discountData, expenses, debts] = await Promise.all([
      // All non-draft receipts with mixedPayments
      prisma.receipt.findMany({
        where: { createdAt: { gte: startDate, lte: endDate }, isDraft: false },
        select: { total: true, paymentMethod: true, mixedPayments: true },
      }),
      // Sof foyda: receipt.total (haqiqiy to'langan) - tan narx (costPrice * qty)
      prisma.$queryRaw<{ revenue: number; cost: number }[]>`
        SELECT
          (SELECT COALESCE(SUM(total), 0)::float FROM "Receipt" WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate} AND "isDraft" = false) AS revenue,
          (SELECT COALESCE(SUM(ri."costPrice" * ri.quantity), 0)::float FROM "ReceiptItem" ri JOIN "Receipt" r ON r.id = ri."receiptId" WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate} AND r."isDraft" = false) AS cost
      `,
      // Jami chegirma
      prisma.receipt.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate }, isDraft: false },
        _sum: { discount: true },
      }),
      // Total expenses
      prisma.expense.aggregate({
        where: { date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
      }),
      // Active debts
      prisma.debt.aggregate({
        where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] } },
        _sum: { remainingAmount: true },
        _count: true,
      }),
    ]);

    // To'lov usullari bo'yicha hisoblash (MIXED dan ham ajratib)
    let totalSales = 0;
    let cash = 0;
    let card = 0;
    let click = 0;
    let debt = 0;

    for (const r of receipts) {
      const receiptTotal = Number(r.total);
      totalSales += receiptTotal;

      if (r.paymentMethod === 'MIXED' && r.mixedPayments) {
        // MIXED: har bir usulni alohida hisoblash
        const payments = r.mixedPayments as { method: string; amount: number }[];
        let mixedSum = 0;
        for (const p of payments) {
          const amt = Number(p.amount) || 0;
          mixedSum += amt;
          if (p.method === 'CASH') cash += amt;
          else if (p.method === 'CARD') card += amt;
          else if (p.method === 'CLICK') click += amt;
          else if (p.method === 'DEBT') debt += amt;
          else if (p.method === 'TRANSFER') card += amt;
        }
        // Qolgan farqni naqd'ga qo'shish
        const diff = receiptTotal - mixedSum;
        if (diff > 0) cash += diff;
      } else {
        // Single payment method
        if (r.paymentMethod === 'CASH') cash += receiptTotal;
        else if (r.paymentMethod === 'CARD') card += receiptTotal;
        else if (r.paymentMethod === 'CLICK') click += receiptTotal;
        else if (r.paymentMethod === 'DEBT') debt += receiptTotal;
        else if (r.paymentMethod === 'TRANSFER') card += receiptTotal;
      }
    }

    // Sof foyda = (sotish narxi - tan narx) - xarajatlar
    const revenue = profitData[0]?.revenue ?? 0;
    const cost = profitData[0]?.cost ?? 0;
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const profit = (revenue - cost) - totalExpenses;

    return {
      totalSales,
      totalCount: receipts.length,
      cash,
      card,
      click,
      debt,
      totalDiscount: Number(discountData._sum.discount ?? 0),
      totalExpenses,
      activeDebts: Number(debts._sum.remainingAmount ?? 0),
      debtCount: debts._count,
      profit,
    };
  });
}

// 2. Sales trend (line chart — daily)
export async function getSalesTrend(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:trend:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ date: string; total: number; count: number }[]>`
      SELECT DATE("createdAt") AS date, SUM(total)::float AS total, COUNT(*)::int AS count
      FROM "Receipt"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate} AND "isDraft" = false
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
  });
}

// 3. Top 10 products
export async function getTopProducts(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:top-products:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ productId: string; productName: string; totalQty: number; totalRevenue: number }[]>`
      SELECT ri."productId", ri."productName",
             SUM(ri.quantity)::int AS "totalQty",
             SUM(ri.total)::float AS "totalRevenue"
      FROM "ReceiptItem" ri
      JOIN "Receipt" r ON r.id = ri."receiptId"
      WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate} AND r."isDraft" = false
      GROUP BY ri."productId", ri."productName"
      ORDER BY "totalRevenue" DESC
      LIMIT 10
    `;
  });
}

// 4. Top 10 customers
export async function getTopCustomers(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:top-customers:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ customerId: string; customerName: string; totalSpent: number; receiptCount: number }[]>`
      SELECT r."customerId", c.name AS "customerName",
             SUM(r.total)::float AS "totalSpent",
             COUNT(*)::int AS "receiptCount"
      FROM "Receipt" r
      JOIN "Customer" c ON c.id = r."customerId"
      WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate}
        AND r."isDraft" = false AND r."customerId" IS NOT NULL
      GROUP BY r."customerId", c.name
      ORDER BY "totalSpent" DESC
      LIMIT 10
    `;
  });
}

// 5. Category sales (donut chart)
export async function getCategorySales(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:category-sales:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ categoryName: string; total: number }[]>`
      SELECT cat.name AS "categoryName", SUM(ri.total)::float AS total
      FROM "ReceiptItem" ri
      JOIN "Receipt" r ON r.id = ri."receiptId"
      JOIN "Product" p ON p.id = ri."productId"
      JOIN "Category" cat ON cat.id = p."categoryId"
      WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate} AND r."isDraft" = false
      GROUP BY cat.name
      ORDER BY total DESC
    `;
  });
}

// 6. Sales by hour (bar chart)
export async function getSalesByHour(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:hourly:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ hour: number; total: number; count: number }[]>`
      SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
             SUM(total)::float AS total, COUNT(*)::int AS count
      FROM "Receipt"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate} AND "isDraft" = false
      GROUP BY hour
      ORDER BY hour ASC
    `;
  });
}

// 7. Profit trend (area chart — daily)
export async function getProfitTrend(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:profit:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ date: string; revenue: number; cost: number; profit: number }[]>`
      SELECT
        d.date,
        d.revenue,
        COALESCE(c.cost, 0) AS cost,
        (d.revenue - COALESCE(c.cost, 0)) AS profit
      FROM (
        SELECT DATE("createdAt") AS date, SUM(total)::float AS revenue
        FROM "Receipt"
        WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate} AND "isDraft" = false
        GROUP BY DATE("createdAt")
      ) d
      LEFT JOIN (
        SELECT DATE(r."createdAt") AS date, SUM(ri."costPrice" * ri.quantity)::float AS cost
        FROM "ReceiptItem" ri
        JOIN "Receipt" r ON r.id = ri."receiptId"
        WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate} AND r."isDraft" = false
        GROUP BY DATE(r."createdAt")
      ) c ON c.date = d.date
      ORDER BY d.date ASC
    `;
  });
}

// 8. Cashier performance (bar chart)
export async function getCashierPerformance(start?: string, end?: string) {
  const { startDate, endDate } = parseDateRange(start, end);
  const cacheKey = `dashboard:cashier:${startDate.toISOString()}:${endDate.toISOString()}`;

  return cached(cacheKey, async () => {
    return prisma.$queryRaw<{ userId: string; userName: string; totalSales: number; receiptCount: number }[]>`
      SELECT r."createdById" AS "userId", u.name AS "userName",
             SUM(r.total)::float AS "totalSales",
             COUNT(*)::int AS "receiptCount"
      FROM "Receipt" r
      JOIN "User" u ON u.id = r."createdById"
      WHERE r."createdAt" >= ${startDate} AND r."createdAt" <= ${endDate} AND r."isDraft" = false
      GROUP BY r."createdById", u.name
      ORDER BY "totalSales" DESC
    `;
  });
}

// Debt aging table
export async function getDebtAging() {
  return cached('dashboard:debt-aging', async () => {
    const now = new Date();
    const days7 = new Date(now); days7.setDate(days7.getDate() - 7);
    const days30 = new Date(now); days30.setDate(days30.getDate() - 30);
    const days90 = new Date(now); days90.setDate(days90.getDate() - 90);

    const [within7, within30, within90, over90] = await Promise.all([
      prisma.debt.aggregate({ where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] }, dueDate: { gte: days7 } }, _sum: { remainingAmount: true }, _count: true }),
      prisma.debt.aggregate({ where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] }, dueDate: { gte: days30, lt: days7 } }, _sum: { remainingAmount: true }, _count: true }),
      prisma.debt.aggregate({ where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] }, dueDate: { gte: days90, lt: days30 } }, _sum: { remainingAmount: true }, _count: true }),
      prisma.debt.aggregate({ where: { status: { in: ['ACTIVE', 'PARTIAL', 'OVERDUE'] }, dueDate: { lt: days90 } }, _sum: { remainingAmount: true }, _count: true }),
    ]);

    return [
      { period: '0-7 kun', amount: Number(within7._sum.remainingAmount ?? 0), count: within7._count },
      { period: '7-30 kun', amount: Number(within30._sum.remainingAmount ?? 0), count: within30._count },
      { period: '30-90 kun', amount: Number(within90._sum.remainingAmount ?? 0), count: within90._count },
      { period: '90+ kun', amount: Number(over90._sum.remainingAmount ?? 0), count: over90._count },
    ];
  });
}
