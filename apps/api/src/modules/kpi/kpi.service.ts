import { Prisma } from '@prisma/client';
import type { CreateKpiTemplateInput, CreateKpiAssignmentInput, CreateKpiRecordInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { notFound, badRequest } from '../../utils/errors.js';

// Templates
export async function listTemplates() {
  return prisma.kpiTemplate.findMany({ orderBy: { name: 'asc' } });
}

export async function createTemplate(input: CreateKpiTemplateInput) {
  return prisma.kpiTemplate.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      targetValue: new Prisma.Decimal(input.targetValue),
      unit: input.unit,
      bonusAmount: new Prisma.Decimal(input.bonusAmount),
    },
  });
}

export async function updateTemplate(id: string, input: Partial<CreateKpiTemplateInput>) {
  const existing = await prisma.kpiTemplate.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND', 'KPI shablon topilmadi');

  const data: Prisma.KpiTemplateUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.targetValue !== undefined) data.targetValue = new Prisma.Decimal(input.targetValue);
  if (input.unit !== undefined) data.unit = input.unit;
  if (input.bonusAmount !== undefined) data.bonusAmount = new Prisma.Decimal(input.bonusAmount);

  return prisma.kpiTemplate.update({ where: { id }, data });
}

export async function deleteTemplate(id: string) {
  const existing = await prisma.kpiTemplate.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND');

  const assignmentCount = await prisma.kpiAssignment.count({ where: { templateId: id } });
  if (assignmentCount > 0) {
    throw badRequest('VALIDATION_ERROR', 'Bu shablonga tayinlanmalar bor — avval o\'chiring');
  }

  await prisma.kpiTemplate.delete({ where: { id } });
}

// Assignments
export async function listAssignments(query: { month?: string; userId?: string }) {
  const where: Prisma.KpiAssignmentWhereInput = {
    ...(query.month && { month: query.month }),
    ...(query.userId && { userId: query.userId }),
  };

  return prisma.kpiAssignment.findMany({
    where,
    include: {
      template: true,
      user: { select: { id: true, name: true, role: true } },
      records: { orderBy: { date: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAssignment(input: CreateKpiAssignmentInput) {
  // Check unique
  const existing = await prisma.kpiAssignment.findUnique({
    where: {
      templateId_userId_month: {
        templateId: input.templateId,
        userId: input.userId,
        month: input.month,
      },
    },
  });
  if (existing) throw badRequest('VALIDATION_ERROR', 'Bu KPI allaqachon tayinlangan');

  return prisma.kpiAssignment.create({
    data: input,
    include: {
      template: true,
      user: { select: { id: true, name: true } },
    },
  });
}

export async function deleteAssignment(id: string) {
  const existing = await prisma.kpiAssignment.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND');

  // Delete records first, then assignment
  await prisma.kpiRecord.deleteMany({ where: { assignmentId: id } });
  await prisma.kpiAssignment.delete({ where: { id } });
}

// Records
export async function getAssignmentRecords(assignmentId: string) {
  const assignment = await prisma.kpiAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      template: true,
      user: { select: { id: true, name: true } },
      records: { orderBy: { date: 'desc' } },
    },
  });
  if (!assignment) throw notFound('NOT_FOUND');

  // Calculate progress
  const totalValue = assignment.records.reduce((sum, r) => sum + Number(r.value), 0);
  const targetValue = Number(assignment.template.targetValue);
  const progressPercent = targetValue > 0 ? Math.min((totalValue / targetValue) * 100, 100) : 0;
  const earnedBonus = Math.round((progressPercent / 100) * Number(assignment.template.bonusAmount));

  return {
    ...assignment,
    totalValue,
    progressPercent: Math.round(progressPercent),
    earnedBonus,
  };
}

export async function createRecord(input: CreateKpiRecordInput, userId: string) {
  const assignment = await prisma.kpiAssignment.findUnique({ where: { id: input.assignmentId } });
  if (!assignment) throw notFound('NOT_FOUND', 'KPI tayinlanma topilmadi');

  return prisma.kpiRecord.create({
    data: {
      assignmentId: input.assignmentId,
      value: new Prisma.Decimal(input.value),
      userId,
    },
  });
}
