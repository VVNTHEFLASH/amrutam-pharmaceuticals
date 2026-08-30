import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Product } from '@/types/domain';

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  cartQuantity: number;
  onAdd: () => void;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}

export function ProductDetail({
  product,
  onBack,
  cartQuantity,
  onAdd,
  onUpdateQty,
  onRemove,
}: ProductDetailProps) {
  return (
    <View style={s.container}>
      <Pressable style={s.backButton} onPress={onBack}>
        <ThemedText type="linkPrimary">← Back to Shop</ThemedText>
      </Pressable>

      <ScrollView contentContainerStyle={s.scroll}>
        <ThemedView type="backgroundElement" style={s.card}>
          <ThemedText type="subtitle" style={s.name}>
            {product.name}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={s.category}>
            Category: {product.category}
          </ThemedText>
          <ThemedText type="default" style={s.rating}>
            ★ {product.rating} Rating
          </ThemedText>
          <ThemedText type="subtitle" style={s.price}>
            ₹ {product.price}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={s.stock}>
            Stock left: {product.stock} items
          </ThemedText>

          <View style={s.divider} />

          <ThemedText type="default" style={s.descLabel}>
            Description
          </ThemedText>
          <ThemedText type="small" style={s.desc}>
            {product.description}
          </ThemedText>

          <View style={s.actions}>
            {cartQuantity > 0 ? (
              <View style={s.qtyWrapper}>
                <ThemedText type="smallBold" style={s.cartLabel}>
                  In Cart:
                </ThemedText>
                <View style={s.stepper}>
                  <Pressable onPress={() => onUpdateQty(cartQuantity - 1)} style={s.stepBtn}>
                    <ThemedText type="smallBold">-</ThemedText>
                  </Pressable>
                  <ThemedText type="default" style={[s.qty, { fontWeight: 'bold' }]}>
                    {cartQuantity}
                  </ThemedText>
                  <Pressable
                    disabled={cartQuantity >= product.stock}
                    onPress={() => onUpdateQty(cartQuantity + 1)}
                    style={[s.stepBtn, cartQuantity >= product.stock && { opacity: 0.5 }]}>
                    <ThemedText type="smallBold">+</ThemedText>
                  </Pressable>
                </View>
                <Pressable onPress={onRemove} style={s.removeBtn}>
                  <ThemedText type="small" style={{ color: 'red' }}>
                    Remove
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable
                disabled={product.stock <= 0}
                onPress={onAdd}
                style={[s.addBtn, product.stock <= 0 && { backgroundColor: '#ccc' }]}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: Spacing.two },
  backButton: { marginBottom: Spacing.three, paddingVertical: Spacing.one },
  scroll: { paddingBottom: 96 },
  card: { padding: Spacing.four, borderRadius: Spacing.three },
  name: { fontWeight: '600', marginBottom: Spacing.one },
  category: { marginBottom: Spacing.two },
  rating: { fontSize: 14, color: '#f1c40f', marginBottom: Spacing.two },
  price: { fontWeight: 'bold', color: '#2ecc71', marginBottom: Spacing.one },
  stock: { marginBottom: Spacing.four },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: Spacing.three },
  descLabel: { fontWeight: '600', marginBottom: Spacing.one },
  desc: { lineHeight: 18, color: '#555', marginBottom: Spacing.four },
  actions: { marginTop: Spacing.two },
  addBtn: { backgroundColor: '#208AEF', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  qtyWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  cartLabel: { color: '#666' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 4 },
  stepBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  qty: { paddingHorizontal: 16, fontSize: 16, color: '#000' },
  removeBtn: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
});
