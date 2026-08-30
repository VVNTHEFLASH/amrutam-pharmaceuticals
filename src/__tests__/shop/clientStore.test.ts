import { useClientStore } from '../../store/clientStore';
import { Product } from '../../types/domain';

const mockProduct1: Product = {
  id: 'prod-1',
  name: 'Premium Gel',
  category: 'Wellness',
  price: 250,
  description: 'Gel extract',
  imageUrl: 'url',
  rating: 4.5,
  stock: 12,
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Herbal Pain Reliever',
  category: 'Medicine',
  price: 490,
  description: 'Pure herbs',
  imageUrl: 'url',
  rating: 4.9,
  stock: 5,
};

describe('Zustand clientStore Cart Actions', () => {
  beforeEach(() => {
    useClientStore.getState().clearCart();
  });

  it('should initially have an empty cart', () => {
    const state = useClientStore.getState();
    expect(state.cart).toEqual([]);
  });

  it('should add an item to the cart', () => {
    useClientStore.getState().addToCart(mockProduct1, 2);
    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].productId).toBe('prod-1');
    expect(state.cart[0].quantity).toBe(2);
    expect(state.cart[0].product).toEqual(mockProduct1);
  });

  it('should increment quantity when adding the same item again', () => {
    useClientStore.getState().addToCart(mockProduct1, 2);
    useClientStore.getState().addToCart(mockProduct1, 3);
    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(5);
  });

  it('should update cart quantity correctly', () => {
    useClientStore.getState().addToCart(mockProduct1, 1);
    useClientStore.getState().updateCartQuantity('prod-1', 4);
    const state = useClientStore.getState();
    expect(state.cart[0].quantity).toBe(4);
  });

  it('should remove item when updating quantity to 0 or negative', () => {
    useClientStore.getState().addToCart(mockProduct1, 3);
    useClientStore.getState().updateCartQuantity('prod-1', 0);
    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(0);
  });

  it('should remove a single item from the cart', () => {
    useClientStore.getState().addToCart(mockProduct1, 1);
    useClientStore.getState().addToCart(mockProduct2, 1);
    useClientStore.getState().removeFromCart('prod-1');
    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].productId).toBe('prod-2');
  });

  it('should clear the cart entirely', () => {
    useClientStore.getState().addToCart(mockProduct1, 1);
    useClientStore.getState().addToCart(mockProduct2, 1);
    useClientStore.getState().clearCart();
    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(0);
  });
});
