import { AppError } from '@/types/errors';

export type ApiMockMode = 'SUCCESS' | 'NETWORK_FAILURE' | 'TIMEOUT' | 'MALFORMED' | 'SESSION_EXPIRED';

class ApiMockConfig {
  private mode: ApiMockMode = 'SUCCESS';
  private latencyMs: number = 300;

  public setMode(mode: ApiMockMode): void {
    this.mode = mode;
  }

  public getMode(): ApiMockMode {
    return this.mode;
  }

  public setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  public getLatency(): number {
    return this.latencyMs;
  }
}

export const apiMockConfig = new ApiMockConfig();

export const apiClient = {
  async execute<T>(endpoint: string, queryFn: () => T): Promise<T> {
    const mode = apiMockConfig.getMode();
    const latency = apiMockConfig.getLatency();

    // 1. Latency simulation
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    // 2. Deterministic mock failure modes
    switch (mode) {
      case 'NETWORK_FAILURE':
        throw new AppError('NETWORK_FAILURE', `API Network failure on route: ${endpoint}`);
      case 'TIMEOUT':
        throw new AppError('TIMEOUT', `API Request timed out on route: ${endpoint}`);
      case 'SESSION_EXPIRED':
        throw new AppError('SESSION_EXPIRATION', `API Session expired on route: ${endpoint}`);
      case 'MALFORMED':
        throw new AppError('MALFORMED_RESPONSE', `API returned invalid response data structure on route: ${endpoint}`);
      case 'SUCCESS':
      default:
        break;
    }

    try {
      const data = queryFn();
      if (data === undefined || data === null) {
        throw new Error('Empty response');
      }
      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'UNKNOWN_FAILURE',
        `API request failed with error: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  },
};
