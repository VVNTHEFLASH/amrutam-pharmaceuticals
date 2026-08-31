import { getErrorMessage, AppError } from '@/types/errors';

describe('Error Handling Helper tests', () => {
  it('returns message from Error object', () => {
    const error = new Error('Test standard message');
    expect(getErrorMessage(error)).toBe('Test standard message');
  });

  it('returns message from AppError object', () => {
    const error = new AppError('NETWORK_FAILURE', 'Sync connectivity failure');
    expect(getErrorMessage(error)).toBe('Sync connectivity failure');
  });

  it('returns the string when input is a string', () => {
    const errorStr = 'Self-contained string error';
    expect(getErrorMessage(errorStr)).toBe('Self-contained string error');
  });

  it('returns fallback translation when input is unknown', () => {
    const fallback = 'Custom fallback error';
    expect(getErrorMessage(null, fallback)).toBe(fallback);
    expect(getErrorMessage(undefined, fallback)).toBe(fallback);
    expect(getErrorMessage(12345, fallback)).toBe(fallback);
    expect(getErrorMessage({}, fallback)).toBe(fallback);
  });

  it('uses default fallback if no custom fallback provided', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
  });
});
