import { useClientStore } from '../../store/clientStore';

describe('Zustand clientStore Wishlist Actions', () => {
  beforeEach(() => {
    // Clear wishlist state before each test
    // Since clearWishlist action does not exist, we just empty the wishlist array using internal Zustand setters or helper
    useClientStore.setState({ wishlist: [] });
  });

  it('should initially have an empty wishlist', () => {
    const state = useClientStore.getState();
    expect(state.wishlist).toEqual([]);
  });

  it('should add an item to the wishlist', () => {
    useClientStore.getState().addToWishlist('prod-5');
    const state = useClientStore.getState();
    expect(state.wishlist).toEqual(['prod-5']);
  });

  it('should protect against duplicate entries', () => {
    useClientStore.getState().addToWishlist('prod-5');
    useClientStore.getState().addToWishlist('prod-5');
    const state = useClientStore.getState();
    expect(state.wishlist).toEqual(['prod-5']);
  });

  it('should toggle wishlist status correctly (add and then remove)', () => {
    // Toggle will add
    useClientStore.getState().toggleWishlist('prod-5');
    let state = useClientStore.getState();
    expect(state.wishlist).toContain('prod-5');

    // Toggle again will remove
    useClientStore.getState().toggleWishlist('prod-5');
    state = useClientStore.getState();
    expect(state.wishlist).not.toContain('prod-5');
  });

  it('should remove a single item from the wishlist', () => {
    useClientStore.getState().addToWishlist('prod-5');
    useClientStore.getState().addToWishlist('prod-6');
    useClientStore.getState().removeFromWishlist('prod-5');
    const state = useClientStore.getState();
    expect(state.wishlist).toEqual(['prod-6']);
  });

  it('should manage multiple items in the wishlist', () => {
    useClientStore.getState().addToWishlist('prod-1');
    useClientStore.getState().addToWishlist('prod-2');
    useClientStore.getState().addToWishlist('prod-3');
    const state = useClientStore.getState();
    expect(state.wishlist).toHaveLength(3);
    expect(state.wishlist).toContain('prod-1');
    expect(state.wishlist).toContain('prod-2');
    expect(state.wishlist).toContain('prod-3');
  });
});
