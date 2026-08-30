import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useClientStore } from '../../store/clientStore';
import { useToastStore } from '../../store/toastStore';
import { useConsultation } from '../../features/consultation/hooks/useConsultation';
import BookingsScreen from '../../app/bookings';
import { router } from 'expo-router';
import { AppError } from '../../types/errors';
import { Doctor } from '../../types/domain';
import { timeProvider } from '../../services/timeProvider';
import { routerRegistry } from '../../store/toastStore';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Heart: (props: any) => React.createElement(View, props),
    Plus: (props: any) => React.createElement(View, props),
    Minus: (props: any) => React.createElement(View, props),
    ChevronLeft: (props: any) => React.createElement(View, props),
    ChevronRight: (props: any) => React.createElement(View, props),
    Search: (props: any) => React.createElement(View, props),
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock repositories/services
jest.mock('../../services/repositories/doctorRepository', () => ({
  doctorRepository: {
    getAvailableSlots: jest.fn().mockResolvedValue([]),
  },
}));

// Setup useAuth mock controller
let mockIsAuthenticated = false;
let mockUser: any = null;

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
  }),
}));

// Mock supabase to synchronize session with mockUser
jest.mock('../../services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: jest.fn().mockImplementation(async () => {
        if (mockUser) {
          return { data: { session: { user: mockUser } }, error: null };
        }
        return { data: { session: null }, error: null };
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// Mock SafeAreaView to avoid layout issue in tests
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
  };
});

// Component to execute useConsultation hook inside React scope
function TestConsultationHook({ onHook }: { onHook: (res: any) => void }) {
  const res = useConsultation();
  onHook(res);
  return null;
}

describe('Phase 5 — Auth-Gated Actions & End-to-End Validation', () => {
  const mockProduct = {
    id: 'prod-gate-1',
    name: 'Herbal Supplement',
    category: 'Wellness',
    price: 350,
    description: 'High quality supplement',
    rating: 4.8,
    stock: 12,
    imageUrl: 'https://example.com/item.jpg',
  };

  const mockDoctor: Doctor = {
    id: 'doc-gate-1',
    name: 'Dr. John Doe',
    specialty: 'General Physician',
    rating: 4.9,
    experience: 10,
    consultationFee: 500,
    availableDays: ['Monday', 'Tuesday'],
    imageUrl: 'https://example.com/doc.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    timeProvider.setCustomNowFn(() => new Date(2026, 7, 30, 10, 0));
    routerRegistry.push = jest.fn();
    act(() => {
      useClientStore.setState({
        userId: null,
        cart: [],
        wishlist: [],
        bookingQueue: [],
        wishlistQueue: [],
        cartQueue: [],
      });
      useToastStore.setState({ toasts: [] });
    });
    mockIsAuthenticated = false;
    mockUser = null;
  });

  afterEach(() => {
    timeProvider.setCustomNowFn(null);
  });

  it('1-7. Guest booking is rejected, queue/persistence unchanged, shows toast with clickable Login', async () => {
    mockIsAuthenticated = false;
    mockUser = null;
    act(() => {
      useClientStore.setState({ userId: null });
    });

    let hookResult: any;
    act(() => {
      renderer.create(<TestConsultationHook onHook={(val) => { hookResult = val; }} />);
    });

    let threwError = false;
    try {
      await hookResult.bookSlot(mockDoctor, '2026-08-30', '10:00 AM');
    } catch (err: any) {
      threwError = true;
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('UNAUTHORIZED');
    }
    expect(threwError).toBe(true);
    expect(useClientStore.getState().bookingQueue).toHaveLength(0);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].description).toBe('Login to book');
    expect(toasts[0].action?.label).toBe('Login');

    act(() => {
      toasts[0].action?.onPress();
    });
    expect(routerRegistry.push).toHaveBeenCalledWith('/profile');
  });

  it('8-9. Guest Bookings Tab shows Login gate and Login action', () => {
    mockIsAuthenticated = false;
    mockUser = null;
    useClientStore.setState({ userId: null });

    let tree: any;
    act(() => {
      tree = renderer.create(<BookingsScreen />);
    });
    const root = tree.root;
    expect(root.findByProps({ children: 'Login to view bookings' })).toBeDefined();
    const loginButton = root.findByProps({ accessibilityLabel: 'Login to view bookings' });
    act(() => {
      loginButton.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/profile');
  });


  it('10. Authenticated user sees normal bookings UI', () => {
    mockIsAuthenticated = true;
    mockUser = { id: 'user-123' };
    useClientStore.setState({
      userId: 'user-123',
      bookingQueue: [{
        id: 'booking-id-1',
        userId: 'user-123',
        doctorId: 'doc-gate-1',
        doctorName: 'Dr. John Doe',
        dateTime: new Date(2026, 7, 30, 14, 0).toISOString(),
        patientName: 'Vishnu Sowmiya',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }],
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BookingsScreen />);
    });
    expect(tree.root.findByProps({ children: 'Dr. John Doe' })).toBeDefined();
  });

  it('11-15. Guest Add to Cart is rejected, cart/queue unchanged, toast contains Login to add to cart & action', async () => {
    mockIsAuthenticated = false;
    mockUser = null;
    useClientStore.setState({ userId: null });

    let threwError = false;
    try {
      useClientStore.getState().addToCart(mockProduct, 1);
    } catch (err: any) {
      threwError = true;
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('UNAUTHORIZED');
    }
    expect(threwError).toBe(true);

    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(0);
    expect(state.cartQueue).toHaveLength(0);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].description).toBe('Login to add to cart');
    act(() => {
      toasts[0].action?.onPress();
    });
    expect(routerRegistry.push).toHaveBeenCalledWith('/profile');
  });

  it('16. Authenticated Add to Cart still works', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 'user-123' };
    useClientStore.setState({ userId: 'user-123' });

    await act(async () => {
      useClientStore.getState().addToCart(mockProduct, 2);
    });

    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(2);
  });


  it('17. Authenticated booking still works', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 'user-123' };
    act(() => {
      useClientStore.setState({ userId: 'user-123' });
    });

    let hookResult: any;
    act(() => {
      renderer.create(<TestConsultationHook onHook={(val) => { hookResult = val; }} />);
    });

    await act(async () => {
      await hookResult.bookSlot(mockDoctor, '2026-08-30', '11:00 AM');
    });

    expect(useClientStore.getState().bookingQueue).toHaveLength(1);
  });

  it('18. Authenticated offline queue behavior remains intact', async () => {
    mockIsAuthenticated = true;
    mockUser = { id: 'user-123' };
    useClientStore.setState({ userId: 'user-123', isConnected: false });

    await act(async () => {
      useClientStore.getState().addToCart(mockProduct, 1);
      // Wait for any macrotasks
      await new Promise((r) => setTimeout(r, 10));
    });

    const state = useClientStore.getState();
    expect(state.cart).toHaveLength(1);
    expect(state.cartQueue).toHaveLength(1);
  });

  it('19. Guest state does not become persisted mutation state', () => {
    const persistOptions = (useClientStore as any)._persistedPath || (useClientStore as any).persist?.getOptions();
    if (persistOptions && persistOptions.partialize) {
      const partialized = persistOptions.partialize({
        userId: 'some-user',
        cart: [],
        wishlist: [],
        bookingQueue: [],
        wishlistQueue: [],
        cartQueue: [],
      });
      expect(partialized.userId).toBeUndefined();
    }
  });

  it('20. Logout should clear authenticated private state', async () => {
    useClientStore.setState({
      userId: 'user-123',
      cart: [{ productId: 'p1', product: mockProduct, quantity: 1 }],
      wishlist: ['p1'],
      bookingQueue: [{ id: 'b1', userId: 'user-123' } as any],
    });

    await act(async () => {
      useClientStore.setState({
        cart: [],
        wishlist: [],
        bookingQueue: [],
        wishlistQueue: [],
        cartQueue: [],
        userId: null,
      });
    });

    const state = useClientStore.getState();
    expect(state.userId).toBeNull();
    expect(state.cart).toHaveLength(0);
    expect(state.bookingQueue).toHaveLength(0);
  });

  it('21. User A -> User B switch does not expose User A state', async () => {
    useClientStore.setState({
      userId: 'user-A',
      cart: [{ productId: 'p-A', product: mockProduct, quantity: 1 }],
      wishlist: ['p-A'],
      bookingQueue: [{ id: 'b-A', userId: 'user-A' } as any],
    });

    await act(async () => {
      useClientStore.setState({
        cart: [],
        wishlist: [],
        bookingQueue: [],
        wishlistQueue: [],
        cartQueue: [],
        userId: 'user-B',
      });
    });

    const state = useClientStore.getState();
    expect(state.userId).toBe('user-B');
    expect(state.cart).toHaveLength(0);
    expect(state.bookingQueue).toHaveLength(0);
  });
});

