import { act } from 'react';
import renderer from 'react-test-renderer';
import ShopScreen from '../../app/shop';

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

// Mock react-native FlatList to avoid VirtualizedList act warnings
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');

  const MockFlatList = (props: any) => {
    const { ScrollView, View } = require('react-native');
    const { data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent, ...rest } = props;
    return React.createElement(
      ScrollView,
      rest,
      ListHeaderComponent && (typeof ListHeaderComponent === 'function' ? ListHeaderComponent() : ListHeaderComponent),
      data && data.map((item: any, index: number) => {
        const key = keyExtractor ? keyExtractor(item, index) : item.key || String(index);
        return React.createElement(
          View,
          { key },
          renderItem({ item, index })
        );
      }),
      ListFooterComponent && (typeof ListFooterComponent === 'function' ? ListFooterComponent() : ListFooterComponent)
    );
  };

  return {
    __esModule: true,
    default: MockFlatList,
    FlatList: MockFlatList,
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

jest.mock('../../features/shop/hooks/useShop', () => ({
  useShop: () => mockShopState,
}));

jest.mock('@/features/shop/hooks/useShop', () => ({
  useShop: () => mockShopState,
}));

// Mock useShop
const mockShopState = {
  products: [
    { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5, imageUrl: undefined as string | undefined },
    { id: 'p2', name: 'Product B', price: 600, category: 'Wellness', rating: 5, stock: 2, imageUrl: undefined as string | undefined },
  ],
  loading: false,
  isLoadingMore: false,
  hasMore: true,
  loadMore: jest.fn(),
  error: null,
  totalPages: 2,
  totalCount: 2,
  page: 1,
  filters: {
    search: '',
    category: '',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    sort: 'rating_desc' as any,
    page: 1,
  },
  updateFilters: jest.fn(),
  resetFilters: jest.fn(),
  retry: jest.fn(),
};

// Mock useClientStore
const mockStoreState = {
  userId: 'user-123',
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

describe('ShopScreen Filters and Sorting UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShopState.filters = {
      search: '',
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      sort: 'rating_desc',
      page: 1,
    };
    mockShopState.updateFilters.mockReset();
  });

  it('renders default listing and default sorting of A-Z as non-highlighted', async () => {
    let component: any;
    await act(async () => {
      component = renderer.create(<ShopScreen />);
    });
    const root = component.root;

    // Default sorting is rating_desc, so name sort option should show "A-Z" and not have text white color
    const sortByNameBtn = root.findByProps({ accessibilityLabel: 'Sort by name' });
    const textNode = sortByNameBtn.findByProps({ type: 'small' });
    expect(textNode.props.children).toBe('A-Z');
    // It should not be highlighted (so style should not define color: '#ffffff')
    if (textNode.props.style) {
      expect(textNode.props.style.color).not.toBe('#ffffff');
    }
  });

  it('highlights category filter when activated and keeps text readable', async () => {
    mockShopState.filters.category = 'Wellness & Nutrition';
    let component: any;
    await act(async () => {
      component = renderer.create(<ShopScreen />);
    });
    const root = component.root;

    // Filter by Wellness & Nutrition button
    const wellnessBtn = root.findByProps({ accessibilityLabel: 'Filter by Wellness & Nutrition' });
    const textNode = wellnessBtn.findByProps({ type: 'small' });
    expect(textNode.props.style).toEqual(
      expect.objectContaining({ color: '#ffffff', fontWeight: '600' })
    );

    // Verify "All Categories" is NOT highlighted
    const allCatBtn = root.findByProps({ accessibilityLabel: 'Filter by All categories' });
    const allCatText = allCatBtn.findByProps({ type: 'small' });
    if (allCatText.props.style) {
      expect(allCatText.props.style.color).not.toBe('#ffffff');
    }
  });

  it('toggles name sorting between A-Z and Z-A dynamically', async () => {
    let component: any;
    await act(async () => {
      component = renderer.create(<ShopScreen />);
    });

    const sortByNameBtn = component.root.findByProps({ accessibilityLabel: 'Sort by name' });
    await act(async () => {
      sortByNameBtn.props.onPress();
    });

    // Triggers sorting update to name_asc (A-Z)
    expect(mockShopState.updateFilters).toHaveBeenLastCalledWith({ sort: 'name_asc', page: 1 });

    // Simulate active filters holding name_asc
    mockShopState.filters.sort = 'name_asc';
    let compAsc: any;
    await act(async () => {
      compAsc = renderer.create(<ShopScreen />);
    });
    const ascBtn = compAsc.root.findByProps({ accessibilityLabel: 'Sort by name' });
    const ascText = ascBtn.findByProps({ type: 'small' });
    expect(ascText.props.children).toBe('A-Z');
    expect(ascText.props.style).toEqual(
      expect.objectContaining({ color: '#ffffff', fontWeight: '600' })
    );

    // Press again to toggle to name_desc (Z-A)
    await act(async () => {
      ascBtn.props.onPress();
    });
    expect(mockShopState.updateFilters).toHaveBeenLastCalledWith({ sort: 'name_desc', page: 1 });

    // Simulate active filters holding name_desc
    mockShopState.filters.sort = 'name_desc';
    let compDesc: any;
    await act(async () => {
      compDesc = renderer.create(<ShopScreen />);
    });
    const descBtn = compDesc.root.findByProps({ accessibilityLabel: 'Sort by name' });
    const descText = descBtn.findByProps({ type: 'small' });
    expect(descText.props.children).toBe('Z-A');
    expect(descText.props.style).toEqual(
      expect.objectContaining({ color: '#ffffff', fontWeight: '600' })
    );
  });

  it('renders products with fallback images when imageUrl is missing', async () => {
    mockShopState.products = [
      { id: 'p1', name: 'Product A', price: 200, category: 'Wellness', rating: 4, stock: 5, imageUrl: undefined },
      { id: 'p2', name: 'Product B', price: 600, category: 'Wellness', rating: 5, stock: 2, imageUrl: 'https://example.com/custom.jpg' },
    ];
    let component: any;
    await act(async () => {
      component = renderer.create(<ShopScreen />);
    });

    const root = component.root;
    const images = root.findAllByType('Image');
    expect(images.length).toBe(2);

    // First product image should use fallback
    expect(images[0].props.source.uri).toBe('https://placehold.co/150/png?text=Product');
    // Second product image should use its own imageUrl
    expect(images[1].props.source.uri).toBe('https://example.com/custom.jpg');
  });
});
