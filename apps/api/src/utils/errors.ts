import type { ErrorCode } from '@sardorbek/shared';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message?: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      success: false as const,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Factory helpers
export function notFound(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 404, message);
}

export function badRequest(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 400, message);
}

export function unauthorized(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 401, message);
}

export function forbidden(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 403, message);
}

export function conflict(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 409, message);
}

export function tooMany(code: ErrorCode, message?: string): AppError {
  return new AppError(code, 429, message);
}

export function validationError(details: Record<string, string[]>): AppError {
  return new AppError('VALIDATION_ERROR', 400, 'Validation error', details);
}
