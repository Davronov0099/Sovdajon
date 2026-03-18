/**
 * Format number as currency: 1234567 → "1 234 567"
 * With suffix: "1 234 567 so'm"
 */
export function formatCurrency(amount: number, suffix = "so'm"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = Math.abs(safe)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const sign = safe < 0 ? '-' : '';
  return suffix ? `${sign}${formatted} ${suffix}` : `${sign}${formatted}`;
}

/**
 * Format number as USD: 123.45 → "$123.45"
 */
export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format date: Date → "14.03.2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format datetime: Date → "14.03.2026 15:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${formatDate(d)} ${hours}:${minutes}`;
}

/**
 * Format phone: "+998901234567" → "+998 90 123-45-67"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10, 12)}`;
  }
  return phone;
}

/**
 * Format receipt number: 42 → "#000042"
 */
export function formatReceiptNumber(num: number): string {
  return `#${String(num).padStart(6, '0')}`;
}

/**
 * Relative time: "3 daqiqa oldin", "1 soat oldin"
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return 'hozirgina';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa oldin`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} soat oldin`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} kun oldin`;
  return formatDate(d);
}
