export const UZ_PREFIX = '+998';
export const UZ_PHONE_MAX_DIGITS = 9;
export const UZ_PHONE_FULL_LENGTH = UZ_PREFIX.length + UZ_PHONE_MAX_DIGITS;

export function extractUzDigits(input: string): string {
  const cleaned = input.replace(/\D/g, '');
  const withoutCountry = cleaned.startsWith('998') ? cleaned.slice(3) : cleaned;
  return withoutCountry.slice(0, UZ_PHONE_MAX_DIGITS);
}

export function formatUzPhoneDisplay(digits: string): string {
  const d = extractUzDigits(digits);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 2));
  if (d.length > 2) parts.push(d.slice(2, 5));
  if (d.length > 5) parts.push(d.slice(5, 7));
  if (d.length > 7) parts.push(d.slice(7, 9));
  return parts.length === 0 ? `${UZ_PREFIX} ` : `${UZ_PREFIX} ${parts.join(' ')}`;
}

export function toRawUzPhone(digits: string): string {
  return `${UZ_PREFIX}${extractUzDigits(digits)}`;
}

export function isValidUzPhone(digits: string): boolean {
  return extractUzDigits(digits).length === UZ_PHONE_MAX_DIGITS;
}
