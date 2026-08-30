import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CartItem } from '@/types/domain';

interface CartViewProps {
  cart: CartItem[];
  onBack: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function CartView({ cart, onBack, onUpdateQty, onRemove, onClear }: CartViewProps) {
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const renderItem = ({ item }: { item: CartItem }) => (
    <ThemedView type="backgroundElement" style={s.itemRow}>
      <View style={s.itemInfo}>
        <ThemedText type="default" style={[s.itemName, { fontWeight: 'bold' }]}>
          {item.product.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          ₹ {item.product.price} each • Subtotal: ₹ {item.product.price * item.quantity}
        </ThemedText>
      </View>
      <View style={s.controls}>
        <View style={s.stepper}>
          <Pressable onPress={() => onUpdateQty(item.productId, item.quantity - 1)} style={s.stepBtn}>
            <ThemedText type="smallBold">-</ThemedText>
          </Pressable>
          <ThemedText type="default" style={[s.qty, { fontWeight: 'bold' }]}>
            {item.quantity}
          </ThemedText>
          <Pressable
            disabled={item.quantity >= item.product.stock}
            onPress={() => onUpdateQty(item.productId, item.quantity + 1)}
            style={[s.stepBtn, item.quantity >= item.product.stock && { opacity: 0.5 }]}>
            <ThemedText type="smallBold">+</ThemedText>
          </Pressable>
        </View>
        <Pressable onPress={() => onRemove(item.productId)} style={s.removeBtn}>
          <ThemedText type="small" style={{ color: 'red' }}>
            Remove
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backButton} onPress={onBack}>
          <ThemedText type="linkPrimary">← Back to Shop</ThemedText>
        </Pressable>
        {cart.length > 0 && (
          <Pressable style={s.clearBtn} onPress={onClear}>
            <ThemedText type="small" style={{ color: 'red' }}>
              Clear Cart
            </ThemedText>
          </Pressable>
        )}
      </View>

      {cart.length === 0 ? (
        <View style={s.emptyWrapper}>
          <ThemedText type="subtitle" style={s.emptyText}>
            Your cart is empty.
          </ThemedText>
          <Pressable style={s.shopBtn} onPress={onBack}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Browse Products
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.productId}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
          />
          <ThemedView type="backgroundElement" style={s.totalsCard}>
            <View style={s.totalRow}>
              <ThemedText type="default" style={{ fontWeight: 'bold' }}>Subtotal:</ThemedText>
              <ThemedText type="default" style={{ fontWeight: 'bold' }}>₹ {subtotal}</ThemedText>
            </View>
            <View style={s.totalRow}>
              <ThemedText type="subtitle">Estimated Total:</ThemedText>
              <ThemedText type="subtitle" style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                ₹ {subtotal}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  backButton: { paddingVertical: Spacing.one },
  clearBtn: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
  emptyWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 250 },
  emptyText: { marginBottom: Spacing.three },
  shopBtn: { backgroundColor: '#208AEF', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 8 },
  listContent: { paddingBottom: 96 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.two,
  },
  itemInfo: { flex: 1, marginRight: Spacing.two },
  itemName: { fontWeight: '600', marginBottom: Spacing.one },
  controls: { alignItems: 'flex-end', gap: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 4 },
  stepBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  qty: { paddingHorizontal: 12, fontSize: 14, color: '#000' },
  removeBtn: { paddingVertical: 2 },
  totalsCard: { padding: Spacing.three, borderRadius: Spacing.two, marginTop: Spacing.two },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.one },
});
