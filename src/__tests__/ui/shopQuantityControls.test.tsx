import React, { act } from 'react';
import renderer from 'react-test-renderer';
import ShopScreen from '../../app/shop';
import { AppError } from '../../types/errors';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Search: (props: any) => React.createElement(View, props),
    ChevronLeft: (props: any) => React.createElement(View, props),
    ChevronRight: (props: any) => React.createElement(View, props),
    Heart: (props: any) => React.createElement(View, props),
    Plus: (props: any) => React.createElement(View, props),
    Minus: (props: any) => React.createElement(View, props),
  };
});

// Mock Theme
jest.mock('../../hooks/use-theme', () => ({
  useTheme: () => ({
    backgroundElement: '#F0F0F3',
    text: '#000000',
    backgroundSelected: '#E0E0E0',
    textSecondary: '#666666',
  }),
}));

// Mock useShop
const mockShopState = {
  products: [
    { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
    { id: 'p2', name: 'Product B', price: 600, category: 'Wellness', rating: 5, stock: 2 },
  ],
  loading: false,
  isLoadingMore: false,
  hasMore: true,
  loadMore: jest.fn(),
  error: null,
  totalPages: 2,
  totalCount: 2,
  page: 1,
  filters: { search: '', category: '', page: 1 },
  updateFilters: jest.fn(),
  resetFilters: jest.fn(),
  retry: jest.fn(),
};

jest.mock('../../features/shop/hooks/useShop', () => ({
  useShop: () => mockShopState,
}));

// Mock useClientStore
const mockStoreState = {
  userId: 'user-123' as string | null | undefined,
  cart: [] as any[],
  wishlist: [] as string[],
  addToCart: jest.fn(),
  updateCartQuantity: jest.fn(),
  removeFromCart: jest.fn(),
  toggleWishlist: jest.fn(),
  clearCart: jest.fn(),
};

jest.mock('../../store/clientStore', () => {
  const useStore = (selector: any) => selector(mockStoreState);
  useStore.getState = () => mockStoreState;
  useStore.setState = (updates: any) => {
    Object.assign(mockStoreState, updates);
  };
  return {
    useClientStore: useStore,
  };
});

// Mock useToastStore
const mockToastState = {
  showToast: jest.fn(),
};

jest.mock('../../store/toastStore', () => {
  const useStore = (selector: any) => selector(mockToastState);
  useStore.getState = () => mockToastState;
  return {
    useToastStore: useStore,
  };
});

// Reset function helper
const resetMockData = () => {
  mockStoreState.userId = 'user-123';
  mockStoreState.cart = [];
  mockStoreState.wishlist = [];
  mockStoreState.addToCart.mockReset();
  mockStoreState.updateCartQuantity.mockReset();
  mockStoreState.removeFromCart.mockReset();
  mockStoreState.toggleWishlist.mockReset();
  mockStoreState.clearCart.mockReset();
  mockToastState.showToast.mockReset();
  mockShopState.products = [
    { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
    { id: 'p2', name: 'Product B', price: 600, category: 'Wellness', rating: 5, stock: 2 },
  ];
  mockShopState.loading = false;
  mockShopState.isLoadingMore = false;
  mockShopState.hasMore = true;
};

describe('ShopScreen Quantity Controls & Responsive Header Tests', () => {
  beforeEach(() => {
    resetMockData();
  });

  it('Header components validation and no-overflow responsive setup', async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    // Check title presence
    const title = tree.root.findByProps({ children: 'Health Shop' });
    expect(title).toBeDefined();
    // Verify flexShrink is applied for responsive wrapping
    expect(title.props.style).toEqual(expect.objectContaining({ flexShrink: 1 }));

    // Check wishlist presence
    const wishlistIndicator = tree.root.findByProps({ accessibilityLabel: 'View Wishlist' });
    expect(wishlistIndicator).toBeDefined();

    // Check cart indicator presence - finding by array text components
    const strings = tree.root.findAllByType(require('../../components/themed-text').ThemedText);
    const cartText = strings.find((el: any) => {
      const kids = el.props.children;
      const joined = Array.isArray(kids) ? kids.join('') : kids;
      return joined && typeof joined === 'string' && joined.includes('Cart');
    });
    expect(cartText).toBeDefined();
  });

  it('Product initially displays Add button; clicking triggers addToCart', async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    const addBtn = tree.root.findByProps({ accessibilityLabel: 'Add Product A to cart' });
    expect(addBtn).toBeDefined();

    await act(async () => {
      addBtn.props.onPress({ stopPropagation: jest.fn() });
    });

    expect(mockStoreState.addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1', name: 'Product A' }),
      1
    );
  });

  it('Active cart item renders stepper controls and Remove', async () => {
    mockStoreState.cart = [
      {
        productId: 'p1',
        quantity: 1,
        product: { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
      },
    ];

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    // Verify stepper elements are rendered
    const decBtn = tree.root.findByProps({ accessibilityLabel: 'Decrease quantity for Product A' });
    const incBtn = tree.root.findByProps({ accessibilityLabel: 'Increase quantity for Product A' });
    const removeBtn = tree.root.findByProps({ children: 'Remove' });

    expect(decBtn).toBeDefined();
    expect(incBtn).toBeDefined();
    expect(removeBtn).toBeDefined();

    // Lower bound: Quantity is 1, so minus button is disabled
    expect(decBtn.props.accessibilityState).toEqual({ disabled: true });
    expect(incBtn.props.accessibilityState).toEqual({ disabled: false });
  });

  it('Disabled button states on stock upper limits and controls interactions', async () => {
    // Set Product A to max stock (5)
    mockStoreState.cart = [
      {
        productId: 'p1',
        quantity: 5,
        product: { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
      },
    ];

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    const decBtn = tree.root.findByProps({ accessibilityLabel: 'Decrease quantity for Product A' });
    const incBtn = tree.root.findByProps({ accessibilityLabel: 'Increase quantity for Product A' });

    expect(decBtn.props.accessibilityState).toEqual({ disabled: false });
    // Upper bound: quantity === stock, so plus button is disabled
    expect(incBtn.props.accessibilityState).toEqual({ disabled: true });
  });

  it('Clicking plus increases quantity, clicking minus reduces quantity', async () => {
    mockStoreState.cart = [
      {
        productId: 'p1',
        quantity: 2,
        product: { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
      },
    ];

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    const decBtn = tree.root.findByProps({ accessibilityLabel: 'Decrease quantity for Product A' });
    const incBtn = tree.root.findByProps({ accessibilityLabel: 'Increase quantity for Product A' });

    await act(async () => {
      incBtn.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockStoreState.updateCartQuantity).toHaveBeenCalledWith('p1', 3);

    await act(async () => {
      decBtn.props.onPress({ stopPropagation: jest.fn() });
    });
    expect(mockStoreState.updateCartQuantity).toHaveBeenCalledWith('p1', 1);
  });

  it('Clicking remove calls removeFromCart', async () => {
    mockStoreState.cart = [
      {
        productId: 'p1',
        quantity: 1,
        product: { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5 },
      },
    ];

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    const removeText = tree.root.findByProps({ children: 'Remove' });
    let removeBtn = removeText;
    while (removeBtn && !removeBtn.props.onPress) {
      removeBtn = removeBtn.parent;
    }
    
    await act(async () => {
      removeBtn.props.onPress({ stopPropagation: jest.fn() });
    });

    expect(mockStoreState.removeFromCart).toHaveBeenCalledWith('p1');
  });

  it('Guest add triggers auth exception inside addToCart but propagates no rendering crash', async () => {
    mockStoreState.userId = null;
    mockStoreState.addToCart.mockImplementation(() => {
      throw new AppError('UNAUTHORIZED', 'Login to add to cart');
    });

    let tree: any;
    await act(async () => {
      tree = renderer.create(<ShopScreen />);
    });

    const addBtn = tree.root.findByProps({ accessibilityLabel: 'Add Product A to cart' });
    
    // Clicking add should catch the error and do nothing, allowing other functionality to remain stable
    expect(() => {
      act(() => {
        addBtn.props.onPress({ stopPropagation: jest.fn() });
      });
    }).not.toThrow();
  });
});

