import React, { act } from 'react';
import renderer from 'react-test-renderer';
import { ProductDetail } from '../../features/shop/components/ProductDetail';
import { CartView } from '../../features/shop/components/CartView';
import { Product, CartItem } from '../../types/domain';

// Mock Lucide Icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
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

describe('Accessibility Hardening Tests', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Amla Extract',
    category: 'Wellness',
    price: 250,
    description: 'Pure Organic Amla',
    rating: 4.5,
    stock: 5,
    imageUrl: 'https://example.com/amla.jpg',
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ProductDetail: wishlist exposes selected status', async () => {
    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <ProductDetail
          product={mockProduct}
          onBack={jest.fn()}
          cartQuantity={0}
          onAdd={jest.fn()}
          onUpdateQty={jest.fn()}
          onRemove={jest.fn()}
          isWishlisted={true}
          onToggleWishlist={jest.fn()}
        />
      );
    });

    const btn = tree.root.findByProps({ accessibilityLabel: 'Remove from wishlist' });
    expect(btn).toBeDefined();
    expect(btn.props.accessibilityState).toEqual({ selected: true });
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('ProductDetail: quantity increase/decrease buttons expose disabled status correctly', async () => {
    let treeMax: any;
    await act(async () => {
      treeMax = renderer.create(
        <ProductDetail
          product={mockProduct}
          onBack={jest.fn()}
          cartQuantity={5}
          onAdd={jest.fn()}
          onUpdateQty={jest.fn()}
          onRemove={jest.fn()}
          isWishlisted={false}
          onToggleWishlist={jest.fn()}
        />
      );
    });

    const decBtnMax = treeMax.root.findByProps({ accessibilityLabel: 'Decrease quantity' });
    const incBtnMax = treeMax.root.findByProps({ accessibilityLabel: 'Increase quantity' });

    expect(decBtnMax.props.accessibilityState).toEqual({ disabled: false });
    expect(incBtnMax.props.accessibilityState).toEqual({ disabled: true });

    let treeMin: any;
    await act(async () => {
      treeMin = renderer.create(
        <ProductDetail
          product={mockProduct}
          onBack={jest.fn()}
          cartQuantity={1}
          onAdd={jest.fn()}
          onUpdateQty={jest.fn()}
          onRemove={jest.fn()}
          isWishlisted={false}
          onToggleWishlist={jest.fn()}
        />
      );
    });

    const decBtnMin = treeMin.root.findByProps({ accessibilityLabel: 'Decrease quantity' });
    const incBtnMin = treeMin.root.findByProps({ accessibilityLabel: 'Increase quantity' });

    expect(decBtnMin.props.accessibilityState).toEqual({ disabled: true });
    expect(incBtnMin.props.accessibilityState).toEqual({ disabled: false });
  });

  it('CartView: quantity decrement/increment buttons expose disabled status', async () => {
    const mockCartItem: CartItem = {
      productId: 'prod-1',
      quantity: 5,
      product: mockProduct,
    };

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <CartView
          cart={[mockCartItem]}
          onBack={jest.fn()}
          onUpdateQty={jest.fn()}
          onRemove={jest.fn()}
          onClear={jest.fn()}
        />
      );
    });

    const decBtn = tree.root.findByProps({ accessibilityLabel: 'Decrease quantity' });
    const incBtn = tree.root.findByProps({ accessibilityLabel: 'Increase quantity' });

    expect(decBtn.props.accessibilityState).toEqual({ disabled: false });
    expect(incBtn.props.accessibilityState).toEqual({ disabled: true });
  });
});