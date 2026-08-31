export type AppErrorCode =
  | 'NETWORK_FAILURE'
  | 'TIMEOUT'
  | 'MALFORMED_RESPONSE'
  | 'SESSION_EXPIRATION'
  | 'BOOKING_CONFLICT'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_FAILURE';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly originalError?: unknown;

  constructor(code: AppErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.originalError = originalError;

    // Ensure correct prototype chain for subclassing built-in Error in TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

