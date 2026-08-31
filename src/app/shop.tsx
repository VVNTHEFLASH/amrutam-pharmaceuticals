import React, { useState, useMemo, useEffect } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { CartView } from '@/features/shop/components/CartView';
import { ProductDetail } from '@/features/shop/components/ProductDetail';
import { WishlistView } from '@/features/shop/components/WishlistView';
import { useTheme } from '@/hooks/use-theme';
import { useShop } from '@/features/shop/hooks/useShop';
import { useClientStore } from '@/store/clientStore';
import { useToastStore } from '@/store/toastStore';
import { Search, ChevronLeft, ChevronRight, Heart, Plus, Minus } from 'lucide-react-native';
import { HorizontalFilterRow } from '@/components/horizontal-filter-row';
import { productRepository } from '@/services/repositories/productRepository';
import { Product } from '@/types/domain';
import { AppError, getErrorMessage } from '@/types/errors';

const CATS = ['Ayurvedic Medicine', 'Homeopathy', 'Wellness & Nutrition', 'Personal Care', 'Baby Care', 'Devices'];

const PRICES = [
  { label: 'Any Price', min: undefined, max: undefined },
  { label: 'Under ₹200', min: 0, max: 200 },
  { label: '₹200 - ₹500', min: 200, max: 500 },
  { label: '₹500 - ₹800', min: 500, max: 800 },
  { label: 'Over ₹800', min: 800, max: 100000 },
];

const RATINGS = [
  { label: 'Any Rating', val: undefined },
  { label: '★ 3.5+', val: 3.5 },
  { label: '★ 4.0+', val: 4.0 },
  { label: '★ 4.5+', val: 4.5 },
];

const SORTS = [
  { label: '★ Rating', val: 'rating_desc' },
  { label: 'Price ↑', val: 'price_asc' },
  { label: 'Price ↓', val: 'price_desc' },
  { label: 'A-Z', val: 'name_asc' },
] as const;

export default function ShopScreen() {
  const {
    products,
    loading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
    totalPages,
    totalCount,
    page,
    filters,
    updateFilters,
    resetFilters,
    retry,
  } = useShop();

  const theme = useTheme();
  const cart = useClientStore((s) => s.cart);
  const addToCart = useClientStore((s) => s.addToCart);
  const updateCartQuantity = useClientStore((s) => s.updateCartQuantity);
  const removeFromCart = useClientStore((s) => s.removeFromCart);
  const clearCart = useClientStore((s) => s.clearCart);

  // Wishlist bindings
  const wishlist = useClientStore((s) => s.wishlist);
  const toggleWishlist = useClientStore((s) => s.toggleWishlist);
  const showToast = useToastStore((s) => s.showToast);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewingCart, setViewingCart] = useState(false);
  const [viewingWishlist, setViewingWishlist] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    let active = true;
    const fetchWishlist = async () => {
      try {
        const resolved = await Promise.all(
          wishlist.map((id) => productRepository.getProductById(id))
        );
        if (active) {
          setWishlistProducts(resolved);
        }
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
      }
    };
    if (wishlist.length > 0) {
      fetchWishlist();
    } else {
      setWishlistProducts([]);
    }
    return () => {
      active = false;
    };
  }, [wishlist]);

  // Memoize cart totals for performance and avoiding unnecessary redraw calculations
  const { totalQty, totalVal } = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        acc.totalQty += item.quantity;
        acc.totalVal += item.product.price * item.quantity;
        return acc;
      },
      { totalQty: 0, totalVal: 0 }
    );
  }, [cart]);

  const handleToggleWishlist = (productId: string, productName: string) => {
    toggleWishlist(productId);
    const exists = wishlist.includes(productId);
    if (exists) {
      showToast('info', `${productName} removed from wishlist.`);
    } else {
      showToast('success', `${productName} added to wishlist!`);
    }
  };

  const handleAddToCart = (product: Product) => {
    try {
      addToCart(product, 1);
      showToast('success', `${product.name} added to cart!`);
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'UNAUTHORIZED') {
        return;
      }
      showToast('error', getErrorMessage(err));
    }
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    try {
      updateCartQuantity(productId, qty);
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'UNAUTHORIZED') {
        return;
      }
      showToast('error', getErrorMessage(err));
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    try {
      removeFromCart(productId);
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'UNAUTHORIZED') {
        return;
      }
      showToast('error', getErrorMessage(err));
    }
  };

  const handleClearCart = () => {
    try {
      clearCart();
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'UNAUTHORIZED') {
        return;
      }
      showToast('error', getErrorMessage(err));
    }
  };

  const selectedProductQuantity = useMemo(() => {
    if (!selectedProduct) return 0;
    const match = cart.find((item) => item.productId === selectedProduct.id);
    return match ? match.quantity : 0;
  }, [cart, selectedProduct]);

  if (viewingCart) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <CartView
            cart={cart}
            onBack={() => setViewingCart(false)}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemoveFromCart}
            onClear={handleClearCart}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (viewingWishlist) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <WishlistView
            wishlistProducts={wishlistProducts}
            onBack={() => setViewingWishlist(false)}
            onRemove={(id) => {
              const prod = wishlistProducts.find((p) => p.id === id);
              if (prod) {
                handleToggleWishlist(id, prod.name);
              } else {
                toggleWishlist(id);
              }
            }}
            onSelectProduct={(product) => {
              setSelectedProduct(product);
              setViewingWishlist(false);
            }}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (selectedProduct) {
    return (
      <ThemedView style={s.container}>
        <SafeAreaView style={s.safe}>
          <ProductDetail
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
            cartQuantity={selectedProductQuantity}
            onAdd={() => handleAddToCart(selectedProduct)}
            onUpdateQty={(qty) => handleUpdateQty(selectedProduct.id, qty)}
            onRemove={() => handleRemoveFromCart(selectedProduct.id)}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            onToggleWishlist={() => handleToggleWishlist(selectedProduct.id, selectedProduct.name)}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        {/* Top Bar with Wishlist and Cart Buttons */}
        <View style={s.topBar}>
          <ThemedText type="subtitle" style={{ flexShrink: 1, marginRight: Spacing.two }}>Health Shop</ThemedText>
          <View style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', flexShrink: 0 }}>
            <Pressable
              style={[s.wishlistIndicator, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
              onPress={() => setViewingWishlist(true)}
              accessibilityLabel="View Wishlist"
              accessibilityRole="button"
            >
              <Heart size={18} color="#FF4D4F" fill={wishlist.length > 0 ? "#FF4D4F" : "transparent"} style={{ marginRight: 4 }} />
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                ({wishlist.length})
              </ThemedText>
            </Pressable>
            <Pressable style={s.cartIndicator} onPress={() => setViewingCart(true)}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                🛒 Cart ({totalQty}) | ₹{totalVal}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Search Input */}
        <View style={s.header}>
          <TextInput
            style={s.input}
            value={localSearch}
            onChangeText={setLocalSearch}
            onSubmitEditing={() => updateFilters({ search: localSearch, page: 1 })}
            placeholder="Search products..."
            placeholderTextColor="#999"
          />
          <Pressable
            style={s.btn}
            accessibilityLabel="Search"
            onPress={() => updateFilters({ search: localSearch, page: 1 })}>
            <Search size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Category Filters */}
        <HorizontalFilterRow>
          <Pressable
            onPress={() => updateFilters({ category: '', page: 1 })}
            style={[s.chip, { backgroundColor: theme.backgroundElement }, !filters.category && s.act]}>
            <ThemedText type="small">All Categories</ThemedText>
          </Pressable>
          {CATS.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => updateFilters({ category: cat, page: 1 })}
              style={[s.chip, { backgroundColor: theme.backgroundElement }, filters.category === cat && s.act]}>
              <ThemedText type="small">{cat}</ThemedText>
            </Pressable>
          ))}
        </HorizontalFilterRow>

        {/* Price Filters */}
        <HorizontalFilterRow>
          {PRICES.map((pr) => {
            const isAct = filters.minPrice === pr.min && filters.maxPrice === pr.max;
            return (
              <Pressable
                key={pr.label}
                onPress={() => updateFilters({ minPrice: pr.min, maxPrice: pr.max, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, isAct && s.act]}>
                <ThemedText type="small">{pr.label}</ThemedText>
              </Pressable>
            );
          })}
        </HorizontalFilterRow>

        {/* Rating Filters */}
        <HorizontalFilterRow>
          {RATINGS.map((rt) => {
            const isAct = filters.minRating === rt.val;
            return (
              <Pressable
                key={rt.label}
                onPress={() => updateFilters({ minRating: rt.val, page: 1 })}
                style={[s.chip, { backgroundColor: theme.backgroundElement }, isAct && s.act]}>
                <ThemedText type="small">{rt.label}</ThemedText>
              </Pressable>
            );
          })}
        </HorizontalFilterRow>

        {/* Sorting */}
        <View style={s.sortRow}>
          {SORTS.map((opt) => (
            <Pressable
              key={opt.val}
              onPress={() => updateFilters({ sort: opt.val, page: 1 })}
              style={[s.sort, { backgroundColor: theme.backgroundElement }, filters.sort === opt.val && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">{opt.label}</ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Results details */}
        <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 8 }}>
          Found {totalCount} products
        </ThemedText>

        {/* List / Loading / Error / Empty States */}
        {loading ? (
          <ThemedText type="small">Loading products...</ThemedText>
        ) : error ? (
          <View style={s.center}>
            <ThemedText type="small" style={{ color: 'red', marginBottom: 8 }}>
              {error}
            </ThemedText>
            <Pressable style={s.retryBtn} onPress={retry}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Retry
              </ThemedText>
            </Pressable>
          </View>
        ) : products.length === 0 ? (
          <View style={s.center}>
            <ThemedText type="small">No products found matching filters.</ThemedText>
            <Pressable style={s.retryBtn} onPress={resetFilters}>
              <ThemedText type="smallBold" style={{ color: '#fff' }}>
                Reset Filters
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 96 }}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => {
              const isWish = wishlist.includes(item.id);
              const cartItem = cart.find((c) => c.productId === item.id);
              const quantity = cartItem ? cartItem.quantity : 0;
              return (
                <Pressable onPress={() => setSelectedProduct(item)}>
                  <ThemedView type="backgroundElement" style={s.card}>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="default" style={{ fontWeight: 'bold' }}>{item.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.category} • ★{item.rating}
                        </ThemedText>
                        <ThemedText type="default" style={{ color: '#2ecc71', marginTop: 4, fontWeight: 'bold' }}>
                          ₹ {item.price}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleWishlist(item.id, item.name);
                          }}
                          style={{ padding: Spacing.two }}
                          accessibilityLabel={isWish ? "Remove from wishlist" : "Add to wishlist"}
                          accessibilityRole="button"
                        >
                          <Heart
                            size={20}
                            color={isWish ? '#FF4D4F' : theme.textSecondary}
                            fill={isWish ? '#FF4D4F' : 'transparent'}
                          />
                        </Pressable>
                        {quantity > 0 ? (
                          <View style={s.controls}>
                            <View style={[s.stepper, { borderColor: theme.backgroundSelected }]}>
                              <Pressable
                                disabled={quantity <= 1}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQty(item.id, quantity - 1);
                                }}
                                style={[
                                  s.stepBtn,
                                  { backgroundColor: theme.backgroundElement },
                                  quantity <= 1 && { opacity: 0.3 }
                                ]}
                                accessibilityLabel={`Decrease quantity for ${item.name}`}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: quantity <= 1 }}
                              >
                                <Minus size={16} color={theme.text} />
                              </Pressable>
                              <ThemedText type="default" style={[s.qty, { color: theme.text, fontWeight: 'bold' }]}>
                                {quantity}
                              </ThemedText>
                              <Pressable
                                disabled={quantity >= item.stock}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleUpdateQty(item.id, quantity + 1);
                                }}
                                style={[
                                  s.stepBtn,
                                  { backgroundColor: theme.backgroundElement },
                                  quantity >= item.stock && { opacity: 0.3 }
                                ]}
                                accessibilityLabel={`Increase quantity for ${item.name}`}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: quantity >= item.stock }}
                              >
                                <Plus size={16} color={theme.text} />
                              </Pressable>
                            </View>
                            <Pressable 
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveFromCart(item.id);
                              }} 
                              style={s.removeBtn}
                            >
                              <ThemedText type="small" style={{ color: 'red' }}>
                                Remove
                              </ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable 
                            disabled={item.stock <= 0}
                            style={[s.addCartBtn, item.stock <= 0 && { backgroundColor: '#ccc' }]} 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                            accessibilityLabel={`Add ${item.name} to cart`}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: item.stock <= 0 }}
                          >
                            <ThemedText type="smallBold" style={{ color: '#fff' }}>
                              {item.stock <= 0 ? 'Out of Stock' : '+ Add'}
                            </ThemedText>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </ThemedView>
                </Pressable>
              );
            }}
            ListFooterComponent={() => {
              if (isLoadingMore) {
                return (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }} accessibilityLabel="Loading more products" accessibilityRole="progressbar">
                    <ThemedText type="small">Loading more products...</ThemedText>
                  </View>
                );
              }
              if (!hasMore && products.length > 0) {
                return (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ThemedText type="small" themeColor="textSecondary">No more products.</ThemedText>
                  </View>
                );
              }
              return null;
            }}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.three, justifyContent: 'center', flexDirection: 'row' },
  safe: { flex: 1, maxWidth: MaxContentWidth, paddingBottom: 0 },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginVertical: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  wishlistIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cartIndicator: { backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  header: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 40,
    backgroundColor: '#fff',
    color: '#000',
  },
  btn: { backgroundColor: '#208AEF', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 4 },
  chip: { paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, justifyContent: 'center', height: 32 },
  act: { backgroundColor: '#208AEF' },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sort: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#eee' },
  actSort: { backgroundColor: '#ccc' },
  card: { padding: 12, borderRadius: 8, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addCartBtn: { backgroundColor: '#208AEF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  controls: { alignItems: 'flex-end', gap: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  stepBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  qty: { paddingHorizontal: 12, fontSize: 14 },
  removeBtn: { paddingVertical: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  retryBtn: { backgroundColor: '#208AEF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 4, marginTop: 8 },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    marginBottom: Platform.OS === 'ios' ? 90 : 76,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
});
