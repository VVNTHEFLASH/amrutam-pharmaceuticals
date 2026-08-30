import React, { useState, useMemo } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { CartView } from '@/features/shop/components/CartView';
import { ProductDetail } from '@/features/shop/components/ProductDetail';
import { useShop } from '@/features/shop/hooks/useShop';
import { useClientStore } from '@/store/clientStore';
import { Product } from '@/types/domain';

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
    error,
    totalPages,
    totalCount,
    page,
    filters,
    updateFilters,
    resetFilters,
    retry,
  } = useShop();

  const cart = useClientStore((s) => s.cart);
  const addToCart = useClientStore((s) => s.addToCart);
  const updateCartQuantity = useClientStore((s) => s.updateCartQuantity);
  const removeFromCart = useClientStore((s) => s.removeFromCart);
  const clearCart = useClientStore((s) => s.clearCart);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewingCart, setViewingCart] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);

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

  const handleAddToCart = (product: Product) => {
    try {
      addToCart(product, 1);
      Platform.OS === 'web' ? alert('Added to cart!') : Alert.alert('Success', 'Added to cart!');
    } catch (err: any) {
      Platform.OS === 'web' ? alert(err.message) : Alert.alert('Error', err.message);
    }
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    updateCartQuantity(productId, qty);
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
            onRemove={removeFromCart}
            onClear={clearCart}
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
            onRemove={() => removeFromCart(selectedProduct.id)}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={s.container}>
      <SafeAreaView style={s.safe}>
        {/* Top Bar with Cart Button */}
        <View style={s.topBar}>
          <ThemedText type="subtitle">Health Shop</ThemedText>
          <Pressable style={s.cartIndicator} onPress={() => setViewingCart(true)}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              🛒 Cart ({totalQty}) | ₹{totalVal}
            </ThemedText>
          </Pressable>
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
          <Pressable style={s.btn} onPress={() => updateFilters({ search: localSearch, page: 1 })}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Search
            </ThemedText>
          </Pressable>
        </View>

        {/* Category Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Pressable
              onPress={() => updateFilters({ category: '', page: 1 })}
              style={[s.chip, !filters.category && s.act]}>
              <ThemedText type="small">All Categories</ThemedText>
            </Pressable>
            {CATS.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => updateFilters({ category: cat, page: 1 })}
                style={[s.chip, filters.category === cat && s.act]}>
                <ThemedText type="small">{cat}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Price Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PRICES.map((pr) => {
              const isAct = filters.minPrice === pr.min && filters.maxPrice === pr.max;
              return (
                <Pressable
                  key={pr.label}
                  onPress={() => updateFilters({ minPrice: pr.min, maxPrice: pr.max, page: 1 })}
                  style={[s.chip, isAct && s.act]}>
                  <ThemedText type="small">{pr.label}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Rating Filters */}
        <View style={{ height: 32, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {RATINGS.map((rt) => {
              const isAct = filters.minRating === rt.val;
              return (
                <Pressable
                  key={rt.label}
                  onPress={() => updateFilters({ minRating: rt.val, page: 1 })}
                  style={[s.chip, isAct && s.act]}>
                  <ThemedText type="small">{rt.label}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Sorting */}
        <View style={s.sortRow}>
          {SORTS.map((opt) => (
            <Pressable
              key={opt.val}
              onPress={() => updateFilters({ sort: opt.val, page: 1 })}
              style={[s.sort, filters.sort === opt.val && s.actSort]}>
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
            renderItem={({ item }) => (
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
                    <Pressable style={s.addCartBtn} onPress={() => handleAddToCart(item)}>
                      <ThemedText type="smallBold" style={{ color: '#fff' }}>
                        + Add
                      </ThemedText>
                    </Pressable>
                  </View>
                </ThemedView>
              </Pressable>
            )}
          />
        )}

        {/* Pagination */}
        <View style={s.paginationRow}>
          <Pressable
            disabled={page === 1}
            onPress={() => updateFilters({ page: page - 1 })}
            style={[s.pageBtn, page === 1 && { opacity: 0.5 }]}>
            <ThemedText type="smallBold">Prev</ThemedText>
          </Pressable>
          <ThemedText type="small">
            Page {page} / {totalPages}
          </ThemedText>
          <Pressable
            disabled={page === totalPages}
            onPress={() => updateFilters({ page: page + 1 })}
            style={[s.pageBtn, page === totalPages && { opacity: 0.5 }]}>
            <ThemedText type="smallBold">Next</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'center', flexDirection: 'row' },
  safe: { flex: 1, maxWidth: MaxContentWidth, paddingBottom: BottomTabInset + Spacing.three },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  retryBtn: { backgroundColor: '#208AEF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 4, marginTop: 8 },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
});
