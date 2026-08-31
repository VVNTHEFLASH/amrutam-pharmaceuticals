import { productRepository } from '../../services/repositories/productRepository';
import { useShop } from '../../features/shop/hooks/useShop';

jest.mock('../../services/repositories/productRepository');

let mockEffectCallbacks: (() => void)[] = [];
let mockHookIndex = 0;
let mockStateStore: any[] = [];

const resetMockHooks = () => {
  mockHookIndex = 0;
  mockStateStore = [];
  mockEffectCallbacks = [];
};

jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    useState: jest.fn((init) => {
      const index = mockHookIndex++;
      if (mockStateStore[index] === undefined) {
        mockStateStore[index] = typeof init === 'function' ? init() : init;
      }
      const setter = jest.fn((update) => {
        if (typeof update === 'function') {
          mockStateStore[index] = update(mockStateStore[index]);
        } else {
          mockStateStore[index] = update;
        }
      });
      return [mockStateStore[index], setter];
    }),
    useEffect: jest.fn((cb) => {
      mockEffectCallbacks.push(cb);
    }),
    useCallback: jest.fn((cb) => cb),
  };
});

describe('useShop Hook Infinite Scroll & Query Resets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockHooks();
  });

  it('should query productRepository page-by-page and append results', async () => {
    const mockRes1 = {
      items: [
        { id: '1', name: 'Product 1', price: 100, rating: 4, category: 'Wellness' }
      ],
      metadata: { totalCount: 2, totalPages: 2 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValueOnce(mockRes1);

    mockHookIndex = 0;
    const res = useShop();

    for (const cb of mockEffectCallbacks) await cb();

    mockHookIndex = 0;
    const updatedRes = useShop();

    expect(updatedRes.products).toEqual(mockRes1.items);
    expect(updatedRes.hasMore).toBe(true);

    updatedRes.loadMore();

    const mockRes2 = {
      items: [
        { id: '2', name: 'Product 2', price: 200, rating: 5, category: 'Wellness' }
      ],
      metadata: { totalCount: 2, totalPages: 2 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValueOnce(mockRes2);

    mockHookIndex = 0;
    useShop();

    mockEffectCallbacks = [];
    mockHookIndex = 0;
    const finalRes = useShop();
    for (const cb of mockEffectCallbacks) await cb();

    mockHookIndex = 0;
    const postSyncRes = useShop();
    
    expect(postSyncRes.products).toEqual([
      ...mockRes1.items,
      ...mockRes2.items
    ]);
    expect(postSyncRes.hasMore).toBe(false);
  });

  it('should reset products and load page 1 when filter change is triggered', async () => {
    const mockRes = {
      items: [
        { id: '3', name: 'Product 3', price: 300, rating: 4.5, category: 'Wellness' }
      ],
      metadata: { totalCount: 1, totalPages: 1 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValue(mockRes);

    mockHookIndex = 0;
    const res = useShop();
    res.updateFilters({ search: 'NewSearch' });

    mockHookIndex = 0;
    const updated = useShop();

    expect(updated.filters.page).toBe(1);
    expect(updated.filters.search).toBe('NewSearch');
  });

  it('should ignore duplicate concurrent loadMore calls using inFlight guard', async () => {
    mockHookIndex = 0;
    const res = useShop();
    
    // Call loadMore twice in a row
    res.loadMore();
    res.loadMore();

    mockHookIndex = 0;
    const updated = useShop();
    // page should only be increased by 1 (i.e. to 2), not twice to 3
    expect(updated.filters.page).toBe(2);
  });

  it('should clear products list immediately when resetFilters or updateFilters is called', async () => {
    let resolve1: any;
    const promise1 = new Promise((r) => { resolve1 = r; });
    (productRepository.getProducts as jest.Mock).mockReturnValueOnce(promise1);

    mockHookIndex = 0;
    const res = useShop();
    
    // Initial fetch completion
    const p1 = mockEffectCallbacks[0]();
    const mockRes = {
      items: [{ id: '1', name: 'Product 1' }],
      metadata: { totalCount: 1, totalPages: 1 }
    };
    resolve1(mockRes);
    await p1;

    mockHookIndex = 0;
    const rendered1 = useShop();
    expect(rendered1.products).toEqual(mockRes.items);

    // Now update filters
    let resolve2: any;
    const promise2 = new Promise((r) => { resolve2 = r; });
    (productRepository.getProducts as jest.Mock).mockReturnValueOnce(promise2);

    mockEffectCallbacks = [];
    rendered1.updateFilters({ search: 'Filtered' });
    
    mockHookIndex = 0;
    useShop(); // Render 2 to register the new effect callback
    
    // Run effect callback (which starts Request 2)
    const p2 = mockEffectCallbacks[0]();
    
    mockHookIndex = 0;
    const rendered3 = useShop(); // Render 3 to check state
    // Ensure products is cleared immediately inside fetchProducts
    expect(rendered3.products).toEqual([]);

    // Cleanup: resolve and await request 2 to not cause state updates after test
    resolve2(mockRes);
    await p2;
  });

  it('should avoid appending duplicate product IDs', async () => {
    const mockRes1 = {
      items: [{ id: '1', name: 'Product 1' }],
      metadata: { totalCount: 2, totalPages: 2 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValueOnce(mockRes1);

    mockHookIndex = 0;
    let res = useShop();
    for (const cb of mockEffectCallbacks) await cb();

    mockHookIndex = 0;
    res = useShop();
    expect(res.products).toEqual(mockRes1.items);

    // Let the second page return same item (duplicate ID 1)
    const mockRes2 = {
      items: [{ id: '1', name: 'Product 1 Same' }, { id: '2', name: 'Product 2' }],
      metadata: { totalCount: 2, totalPages: 2 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValueOnce(mockRes2);

    res.loadMore();
    
    mockEffectCallbacks = [];
    mockHookIndex = 0;
    res = useShop();
    for (const cb of mockEffectCallbacks) await cb();

    mockHookIndex = 0;
    res = useShop();
    
    // Ensure duplicate ID '1' is merged/deduplicated (only 2 distinct products)
    expect(res.products).toHaveLength(2);
    expect(res.products[0].id).toBe('1');
    expect(res.products[1].id).toBe('2');
  });

  it('should reject stale query responses when filters change rapidly', async () => {
    let resolve1: any, resolve2: any;
    const promise1 = new Promise((r) => { resolve1 = r; });
    const promise2 = new Promise((r) => { resolve2 = r; });

    (productRepository.getProducts as jest.Mock)
      .mockReturnValueOnce(promise1)
      .mockReturnValueOnce(promise2);

    // Request 1 starts
    mockHookIndex = 0;
    let res = useShop();
    const effect1 = mockEffectCallbacks[0];
    const p1 = effect1(); // Kick off Request 1 to set its queryId to 1

    // Filter changes before request 1 completes
    mockEffectCallbacks = [];
    res.updateFilters({ search: 'New' });
    mockHookIndex = 0;
    res = useShop();
    const effect2 = mockEffectCallbacks[0];
    const p2 = effect2(); // Kick off Request 2 to set its queryId to 2

    // Now resolve Request 1 with old data
    const mockRes1 = {
      items: [{ id: 'old', name: 'Old Product' }],
      metadata: { totalCount: 1, totalPages: 1 }
    };
    resolve1(mockRes1);
    await p1; // executes first fetch's asynchronous flow

    // Verify it should NOT update products with the stale data
    mockHookIndex = 0;
    res = useShop();
    expect(res.products).toEqual([]);

    // Now resolve Request 2 with new data
    const mockRes2 = {
      items: [{ id: 'new', name: 'New Product' }],
      metadata: { totalCount: 1, totalPages: 1 }
    };
    resolve2(mockRes2);
    await p2;

    mockHookIndex = 0;
    res = useShop();
    expect(res.products).toEqual(mockRes2.items);
  });

  it('should compute hasMore=false and block loadMore when totalPages is 1 (small dataset)', async () => {
    const mockRes = {
      items: [{ id: '1', name: 'Product 1' }],
      metadata: { totalCount: 1, totalPages: 1 }
    };
    (productRepository.getProducts as jest.Mock).mockResolvedValue(mockRes);

    mockHookIndex = 0;
    let res = useShop();
    for (const cb of mockEffectCallbacks) await cb();

    mockHookIndex = 0;
    res = useShop();
    
    expect(res.hasMore).toBe(false);
    
    // Call loadMore - should do nothing
    res.loadMore();
    
    mockHookIndex = 0;
    const finalRes = useShop();
    expect(finalRes.filters.page).toBe(1); // Page should remain 1
  });
});
