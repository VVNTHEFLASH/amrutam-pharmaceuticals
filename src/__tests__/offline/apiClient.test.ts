import { apiCache } from '../../services/api/apiCache';
import { apiClient, apiMockConfig } from '../../services/api/apiClient';
import { connectivityService } from '../../services/connectivity';
import { AppError } from '../../types/errors';

describe('apiClient Wrapper', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    apiMockConfig.setMode('SUCCESS');
    apiMockConfig.setLatency(0); // Disable latency for fast testing
    connectivityService.forceConnected(true);
  });

  it('should resolve and cache data successfully under normal SUCCESS conditions', async () => {
    const mockData = { id: 'test-success' };
    const queryFn = jest.fn(() => mockData);

    const result = await apiClient.execute('test-endpoint', queryFn);
    expect(result).toEqual(mockData);
    expect(queryFn).toHaveBeenCalledTimes(1);

    // Verify cache was populated
    const cacheVal = await apiCache.get('test-endpoint');
    expect(cacheVal?.value).toEqual(mockData);
  });

  it('should trigger AppError code TIMEOUT when TIMEOUT simulation is configured', async () => {
    apiMockConfig.setMode('TIMEOUT');
    const queryFn = jest.fn(() => ({}));

    await expect(apiClient.execute('test-timeout', queryFn)).rejects.toThrow(
      new AppError('TIMEOUT', 'API Request timed out on route: test-timeout')
    );
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should trigger AppError code NETWORK_FAILURE when NETWORK_FAILURE simulation is configured', async () => {
    apiMockConfig.setMode('NETWORK_FAILURE');
    const queryFn = jest.fn(() => ({}));

    await expect(apiClient.execute('test-net', queryFn)).rejects.toThrow(
      new AppError('NETWORK_FAILURE', 'API Network failure on route: test-net')
    );
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should trigger AppError code SESSION_EXPIRATION when SESSION_EXPIRED mode is configured', async () => {
    apiMockConfig.setMode('SESSION_EXPIRED');
    const queryFn = jest.fn(() => ({}));

    await expect(apiClient.execute('test-session', queryFn)).rejects.toThrow(
      new AppError('SESSION_EXPIRATION', 'API Session expired on route: test-session')
    );
  });

  it('should trigger AppError code MALFORMED_RESPONSE when MALFORMED response is simulated', async () => {
    apiMockConfig.setMode('MALFORMED');
    const queryFn = jest.fn(() => ({}));

    await expect(apiClient.execute('test-malformed', queryFn)).rejects.toThrow(
      new AppError('MALFORMED_RESPONSE', 'API returned invalid response data structure on route: test-malformed')
    );
  });

  it('should serve from cache when offline connection is detected', async () => {
    const cachedPayload = { offline: 'data' };
    await apiCache.set('test-offline', cachedPayload, 60000);

    // Turn offline
    connectivityService.forceConnected(false);
    const queryFn = jest.fn(() => ({}));

    const result = await apiClient.execute('test-offline', queryFn);
    expect(result).toEqual(cachedPayload);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should throw NETWORK_FAILURE when offline and a cache miss occurs', async () => {
    connectivityService.forceConnected(false);
    const queryFn = jest.fn(() => ({}));

    await expect(apiClient.execute('test-miss', queryFn)).rejects.toThrow(
      /No network connection and cache miss/
    );
  });
});
