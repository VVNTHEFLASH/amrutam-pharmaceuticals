import React, { useMemo } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CartItem } from '@/types/domain';
import { useTheme } from '@/hooks/use-theme';

interface CartViewProps {
  cart: CartItem[];
  onBack: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
}

export function CartView({ cart, onBack, onUpdateQty, onRemove, onClear }: CartViewProps) {
  const theme = useTheme();

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);


  const renderItem = ({ item }: { item: CartItem }) => {
    const isDecrementDisabled = item.quantity <= 1;
    const isIncrementDisabled = item.quantity >= item.product.stock;

    return (
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
          <View style={[s.stepper, { borderColor: theme.backgroundSelected }]}>
            <Pressable
              disabled={isDecrementDisabled}
              onPress={() => onUpdateQty(item.productId, item.quantity - 1)}
              style={[
                s.stepBtn,
                { backgroundColor: theme.backgroundElement },
                isDecrementDisabled && { opacity: 0.3 }
              ]}
              accessibilityLabel="Decrease quantity"
              accessibilityRole="button"
              accessibilityState={{ disabled: isDecrementDisabled }}
            >
              <Minus size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="default" style={[s.qty, { color: theme.text, fontWeight: 'bold' }]}>
              {item.quantity}
            </ThemedText>
            <Pressable
              disabled={isIncrementDisabled}
              onPress={() => onUpdateQty(item.productId, item.quantity + 1)}
              style={[
                s.stepBtn,
                { backgroundColor: theme.backgroundElement },
                isIncrementDisabled && { opacity: 0.3 }
              ]}
              accessibilityLabel="Increase quantity"
              accessibilityRole="button"
              accessibilityState={{ disabled: isIncrementDisabled }}
            >
              <Plus size={16} color={theme.text} />
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
  };

  const TotalsComponent = () => (
    <ThemedView type="backgroundElement" style={s.totalsCard}>
      <ThemedText type="smallBold" style={{ color: theme.text, marginBottom: Spacing.two }}>
        Order Summary
      </ThemedText>
      <View style={s.totalRow}>
        <ThemedText type="default" themeColor="textSecondary" style={s.totalLabel}>
          Number of items:
        </ThemedText>
        <ThemedText type="default" style={[s.totalValue, { color: theme.text }]}>
          {totalItemCount}
        </ThemedText>
      </View>
      <View style={s.totalRow}>
        <ThemedText type="default" themeColor="textSecondary" style={s.totalLabel}>
          Subtotal:
        </ThemedText>
        <ThemedText type="default" style={[s.totalValue, { color: theme.text, fontWeight: 'bold' }]}>
          ₹ {subtotal}
        </ThemedText>
      </View>
      <View style={[s.divider, { backgroundColor: theme.backgroundSelected }]} />
      <View style={s.totalRow}>
        <ThemedText type="subtitle" style={[s.totalLabel, { color: theme.text }]}>
          Estimated Total:
        </ThemedText>
        <ThemedText type="subtitle" style={[s.totalValue, { color: '#2ecc71', fontWeight: 'bold' }]}>
          ₹ {subtotal}
        </ThemedText>
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
        <FlatList
          data={cart}
          keyExtractor={(item) => item.productId}
          renderItem={renderItem}
          ListFooterComponent={TotalsComponent}
          contentContainerStyle={s.listContent}
          style={{ flex: 1 }}
        />
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
  listContent: { paddingBottom: Platform.OS === 'ios' ? 140 : 120 },
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
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  stepBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  qty: { paddingHorizontal: 12, fontSize: 14 },
  removeBtn: { paddingVertical: 2 },
  totalsCard: { padding: Spacing.three, borderRadius: Spacing.two, marginTop: Spacing.two },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.one,
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  totalLabel: {
    flex: 1,
    minWidth: 120,
  },
  totalValue: {
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
});
