export interface SalaryResult {
  userId: string;
  name: string;
  total: number;
  status: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  totalHours: number;
}

export interface KpiProgress {
  totalValue: number;
  progressPercent: number;
  earnedBonus: number;
}
