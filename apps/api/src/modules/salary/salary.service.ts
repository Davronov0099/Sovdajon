import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

export async function listSalaries(month: string) {
  const salaries = await prisma.salary.findMany({
    where: { month },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });
  return salaries;
}

export async function getSalary(id: string) {
  const salary = await prisma.salary.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, role: true, phone: true } },
    },
  });
  if (!salary) throw notFound('NOT_FOUND', 'Oylik topilmadi');
  return salary;
}

export async function calculateAll(month: string, userId: string) {
  const users = await prisma.user.findMany({
    where: { isActive: true, isDeleted: false },
    include: { salarySettings: true },
  });

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);
  const userIds = users.map((u) => u.id);

  // BATCH: Barcha ma'lumotlarni bir vaqtda olish (N+1 yo'q)
  const [existingSalaries, allKpiAssignments, salesByUser, advancesByUser, finesByUser] = await Promise.all([
    // 1. Mavjud oyliklar
    prisma.salary.findMany({ where: { month, userId: { in: userIds } } }),
    // 2. KPI assignments + records + templates (bitta query)
    prisma.kpiAssignment.findMany({
      where: { month, userId: { in: userIds } },
      include: { template: true, records: true },
    }),
    // 3. Sotuv summasi (groupBy)
    prisma.$queryRaw<{ createdById: string; total: number }[]>`
      SELECT "createdById", SUM(total)::float AS total
      FROM "Receipt"
      WHERE "createdById" = ANY(${userIds}::uuid[])
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
        AND "isDraft" = false
      GROUP BY "createdById"
    `,
    // 4. Avanslar (groupBy)
    prisma.$queryRaw<{ userId: string; total: number }[]>`
      SELECT "userId", SUM(amount)::float AS total
      FROM "Advance"
      WHERE "userId" = ANY(${userIds}::uuid[])
        AND status = 'APPROVED'
        AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY "userId"
    `,
    // 5. Jarimalar (groupBy)
    prisma.$queryRaw<{ userId: string; total: number }[]>`
      SELECT "userId", SUM(amount)::float AS total
      FROM "Fine"
      WHERE "userId" = ANY(${userIds}::uuid[]) AND month = ${month}
      GROUP BY "userId"
    `,
  ]);

  // Build lookup maps
  const salaryMap = new Map(existingSalaries.map((s) => [s.userId, s]));
  const kpiMap = new Map<string, typeof allKpiAssignments>();
  for (const a of allKpiAssignments) {
    const list = kpiMap.get(a.userId) ?? [];
    list.push(a);
    kpiMap.set(a.userId, list);
  }
  const salesMap = new Map(salesByUser.map((s) => [s.createdById, s.total]));
  const advancesMap = new Map(advancesByUser.map((a) => [a.userId, a.total]));
  const finesMap = new Map(finesByUser.map((f) => [f.userId, f.total]));

  const results: { userId: string; name: string; total: number; status: string }[] = [];

  for (const user of users) {
    const existing = salaryMap.get(user.id);

    if (existing?.status === 'PAID') {
      results.push({ userId: user.id, name: user.name, total: Number(existing.total), status: 'PAID' });
      continue;
    }

    const settings = user.salarySettings;
    const baseSalary = settings ? Number(settings.baseSalary) : 0;
    const salesPercent = settings ? Number(settings.salesPercent) : 0;

    // Sales bonus
    const salesTotal = salesMap.get(user.id) ?? 0;
    const salesBonus = Math.round(salesTotal * (salesPercent / 100));

    // KPI bonus
    let kpiBonus = 0;
    const userKpi = kpiMap.get(user.id) ?? [];
    for (const assignment of userKpi) {
      const totalValue = assignment.records.reduce((sum, r) => sum + Number(r.value), 0);
      const targetValue = Number(assignment.template.targetValue);
      const achievementPercent = targetValue > 0 ? Math.min((totalValue / targetValue) * 100, 100) : 0;
      kpiBonus += Math.round((achievementPercent / 100) * Number(assignment.template.bonusAmount));
    }

    const advances = advancesMap.get(user.id) ?? 0;
    const fines = finesMap.get(user.id) ?? 0;

    // Formula: total = base + kpiBonus + salesBonus - advances - fines
    const total = Math.max(0, baseSalary + kpiBonus + salesBonus - advances - fines);

    const status = existing ? 'RECALCULATED' : 'CALCULATED';

    await prisma.salary.upsert({
      where: { userId_month: { userId: user.id, month } },
      create: {
        userId: user.id,
        month,
        base: new Prisma.Decimal(baseSalary),
        kpiBonus: new Prisma.Decimal(kpiBonus),
        salesBonus: new Prisma.Decimal(salesBonus),
        advances: new Prisma.Decimal(advances),
        fines: new Prisma.Decimal(fines),
        total: new Prisma.Decimal(total),
        status,
      },
      update: {
        base: new Prisma.Decimal(baseSalary),
        kpiBonus: new Prisma.Decimal(kpiBonus),
        salesBonus: new Prisma.Decimal(salesBonus),
        advances: new Prisma.Decimal(advances),
        fines: new Prisma.Decimal(fines),
        total: new Prisma.Decimal(total),
        status,
      },
    });

    results.push({ userId: user.id, name: user.name, total, status });
  }

  await createAuditLog({
    action: 'SALARY_CALCULATE',
    entity: 'Salary',
    entityId: month,
    userId,
    newData: { month, count: results.length },
  });

  return results;
}

export async function paySalary(id: string, userId: string) {
  const salary = await prisma.salary.findUnique({ where: { id } });
  if (!salary) throw notFound('NOT_FOUND', 'Oylik topilmadi');
  if (salary.status === 'PAID') throw badRequest('SALARY_ALREADY_PAID');

  const updated = await prisma.salary.update({
    where: { id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Mark approved advances as PAID
  await prisma.advance.updateMany({
    where: {
      userId: salary.userId,
      status: 'APPROVED',
      createdAt: {
        gte: new Date(salary.month + '-01'),
        lt: new Date(new Date(salary.month + '-01').setMonth(new Date(salary.month + '-01').getMonth() + 1)),
      },
    },
    data: { status: 'PAID' },
  });

  await createAuditLog({
    action: 'SALARY_PAY',
    entity: 'Salary',
    entityId: id,
    userId,
    newData: { total: Number(salary.total), month: salary.month },
  });

  return updated;
}

export async function cancelSalary(id: string, userId: string) {
  const salary = await prisma.salary.findUnique({ where: { id } });
  if (!salary) throw notFound('NOT_FOUND', 'Oylik topilmadi');
  if (salary.status === 'PAID') throw badRequest('SALARY_ALREADY_PAID');

  const updated = await prisma.salary.update({
    where: { id },
    data: { status: 'DRAFT' },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'Salary',
    entityId: id,
    userId,
    newData: { status: 'DRAFT', month: salary.month },
  });

  return updated;
}

// Salary Settings
export async function getSalarySetting(userId: string) {
  return prisma.salarySetting.findUnique({ where: { userId } });
}

export async function upsertSalarySetting(input: { userId: string; baseSalary: number; salesPercent: number }, adminUserId: string) {
  const setting = await prisma.salarySetting.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      baseSalary: new Prisma.Decimal(input.baseSalary),
      salesPercent: new Prisma.Decimal(input.salesPercent),
    },
    update: {
      baseSalary: new Prisma.Decimal(input.baseSalary),
      salesPercent: new Prisma.Decimal(input.salesPercent),
    },
  });

  await createAuditLog({
    action: 'UPDATE',
    entity: 'SalarySetting',
    entityId: setting.id,
    userId: adminUserId,
    newData: { baseSalary: input.baseSalary, salesPercent: input.salesPercent },
  });

  return setting;
}
