import { haversineDistance } from '@sardorbek/shared';
import type { CheckInInput } from '@sardorbek/shared';
import { prisma } from '../../config/database.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { createAuditLog } from '../../utils/auditLog.js';

export async function checkIn(userId: string, input: CheckInInput) {
  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await prisma.attendance.findFirst({
    where: {
      userId,
      checkIn: { gte: today, lt: tomorrow },
    },
  });

  if (existing) {
    throw badRequest('ATTENDANCE_ALREADY_CHECKED_IN');
  }

  // GPS validation — check distance from nearest store
  const stores = await prisma.storeLocation.findMany();
  let isInRange = false;

  if (stores.length > 0) {
    for (const store of stores) {
      const distance = haversineDistance(input.lat, input.lng, store.lat, store.lng);
      if (distance <= store.radius) {
        isInRange = true;
        break;
      }
    }
    if (!isInRange) {
      throw badRequest('ATTENDANCE_OUT_OF_RANGE');
    }
  }

  // QR token validation (optional extra check)
  if (input.qrToken) {
    const store = await prisma.storeLocation.findUnique({
      where: { qrToken: input.qrToken },
    });
    if (!store) {
      throw badRequest('ATTENDANCE_OUT_OF_RANGE');
    }
  }

  // Determine status — late if after work start time (from settings, default 9:00)
  const now = new Date();
  const workStartSetting = await prisma.setting.findUnique({ where: { key: 'workStartHour' } });
  const workStartHour = workStartSetting ? Number(workStartSetting.value) : 9;
  const lateThreshold = new Date(now);
  lateThreshold.setHours(workStartHour, 0, 0, 0);
  const status = now > lateThreshold ? 'LATE' : 'PRESENT';

  const attendance = await prisma.attendance.create({
    data: {
      userId,
      checkIn: now,
      status,
      lat: input.lat,
      lng: input.lng,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  return attendance;
}

export async function checkOut(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await prisma.attendance.findFirst({
    where: {
      userId,
      checkIn: { gte: today, lt: tomorrow },
      checkOut: null,
    },
  });

  if (!attendance) {
    throw badRequest('ATTENDANCE_NOT_CHECKED_IN');
  }

  const now = new Date();
  // Half day if less than 4 hours worked
  const hoursWorked = (now.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
  const newStatus = hoursWorked < 4 ? 'HALF_DAY' : attendance.status;

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOut: now,
      status: newStatus,
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
    },
  });

  return updated;
}

export async function getTodayAttendance() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [records, allUsers] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: today, lt: tomorrow } },
      include: { user: { select: { id: true, name: true, role: true, avatar: true } } },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.user.findMany({
      where: { isActive: true, isDeleted: false },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const checkedInIds = new Set(records.map((r) => r.userId));
  const present = records.filter((r) => r.status === 'PRESENT');
  const late = records.filter((r) => r.status === 'LATE');
  const checkedOut = records.filter((r) => r.checkOut !== null);
  const absent = allUsers.filter((u) => !checkedInIds.has(u.id));

  return {
    records,
    stats: {
      total: allUsers.length,
      present: present.length,
      late: late.length,
      checkedOut: checkedOut.length,
      absent: absent.length,
    },
    absentUsers: absent,
  };
}

export async function getUserAttendance(userId: string, month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum) throw badRequest('VALIDATION_ERROR');

  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59);

  const records = await prisma.attendance.findMany({
    where: {
      userId,
      checkIn: { gte: startDate, lte: endDate },
    },
    orderBy: { checkIn: 'asc' },
  });

  // Calculate summary
  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === 'PRESENT').length;
  const lateDays = records.filter((r) => r.status === 'LATE').length;
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;

  let totalHours = 0;
  for (const r of records) {
    if (r.checkOut) {
      totalHours += (r.checkOut.getTime() - r.checkIn.getTime()) / (1000 * 60 * 60);
    }
  }

  return {
    records,
    summary: {
      totalDays,
      presentDays,
      lateDays,
      halfDays,
      totalHours: Math.round(totalHours * 10) / 10,
    },
  };
}

// Store Location CRUD
export async function getStoreLocations() {
  return prisma.storeLocation.findMany();
}

export async function createStoreLocation(input: { name: string; lat: number; lng: number; radius: number }, userId: string) {
  const location = await prisma.storeLocation.create({ data: input });
  await createAuditLog({ action: 'CREATE', entity: 'StoreLocation', entityId: location.id, userId });
  return location;
}

export async function updateStoreLocation(id: string, input: Partial<{ name: string; lat: number; lng: number; radius: number }>, userId: string) {
  const existing = await prisma.storeLocation.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND');

  const updated = await prisma.storeLocation.update({ where: { id }, data: input });
  await createAuditLog({ action: 'UPDATE', entity: 'StoreLocation', entityId: id, userId });
  return updated;
}

export async function deleteStoreLocation(id: string, userId: string) {
  const existing = await prisma.storeLocation.findUnique({ where: { id } });
  if (!existing) throw notFound('NOT_FOUND');

  await prisma.storeLocation.delete({ where: { id } });
  await createAuditLog({ action: 'DELETE', entity: 'StoreLocation', entityId: id, userId });
}
