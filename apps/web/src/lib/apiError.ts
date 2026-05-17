import { HTTPError } from 'ky';

interface ApiErrorBody {
  success: false;
  error: { code?: string; message?: string; details?: Record<string, string[]> };
}

const ERROR_MESSAGES: Record<string, string> = {
  CUSTOMER_PHONE_EXISTS: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan',
  CUSTOMER_NOT_FOUND: 'Mijoz topilmadi',
  CUSTOMER_HAS_ACTIVE_DEBTS: 'Mijozda faol qarz bor — avval qarzni yoping',
  VALIDATION_ERROR: 'Ma\'lumotlar noto\'g\'ri kiritilgan',
  NOT_FOUND: 'Topilmadi',
  RATE_LIMIT_EXCEEDED: 'Juda ko\'p so\'rovlar — biroz kuting',
  INTERNAL_ERROR: 'Server xatosi',
};

function firstDetail(details?: Record<string, string[]>): string | null {
  if (!details) return null;
  for (const [field, msgs] of Object.entries(details)) {
    if (msgs && msgs.length > 0) return `${field}: ${msgs[0]}`;
  }
  return null;
}

export async function extractApiError(err: unknown, fallback = 'Xatolik yuz berdi'): Promise<string> {
  if (err instanceof HTTPError) {
    try {
      const body = (await err.response.clone().json()) as ApiErrorBody;
      const code = body?.error?.code;
      if (code && ERROR_MESSAGES[code]) {
        const detail = firstDetail(body.error.details);
        return detail ? `${ERROR_MESSAGES[code]} — ${detail}` : ERROR_MESSAGES[code];
      }
      const detail = firstDetail(body?.error?.details);
      if (detail) return detail;
      if (body?.error?.message) return body.error.message;
    } catch {
      // body not JSON or unreadable — fall through
    }
    return `${fallback} (${err.response.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
