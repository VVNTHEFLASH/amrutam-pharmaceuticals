import { Heart } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Product } from '@/types/domain';

const FALLBACK_IMAGE = (name: string | undefined) => `https://placehold.co/300/png?text=${name || 'Product Image'}`;

interface ProductDetailProps {
  product: Product;
  onBack: () => void;
  cartQuantity: number;
  onAdd: () => void;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export function ProductDetail({
  product,
  onBack,
  cartQuantity,
  onAdd,
  onUpdateQty,
  onRemove,
  isWishlisted,
  onToggleWishlist,
}: ProductDetailProps) {
  const theme = useTheme();

  return (
    <View style={s.container}>
      <Pressable style={s.backButton} onPress={onBack}>
        <ThemedText type="linkPrimary">← Back to Shop</ThemedText>
      </Pressable>

      <ScrollView contentContainerStyle={s.scroll}>
        <ThemedView type="backgroundElement" style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one }}>
            <ThemedText type="subtitle" style={[s.name, { flex: 1, marginRight: Spacing.two }]}>
              {product.name}
            </ThemedText>
            <Pressable
              onPress={onToggleWishlist}
              style={{ padding: Spacing.one }}
              accessibilityLabel={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              accessibilityRole="button"
              accessibilityState={{ selected: isWishlisted }}
            >
              <Heart
                size={24}
                color={isWishlisted ? '#FF4D4F' : theme.textSecondary}
                fill={isWishlisted ? '#FF4D4F' : 'transparent'}
              />
            </Pressable>
          </View>

          <Image
            source={{ uri: product.imageUrl || FALLBACK_IMAGE(product.name) }}
            style={s.detailImage}
            accessibilityLabel={product.name}
          />

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

          <View style={[s.divider, { backgroundColor: theme.backgroundSelected }]} />

          <ThemedText type="default" style={s.descLabel}>
            Description
          </ThemedText>
          <ThemedText type="small" style={s.desc}>
            {product.description}
          </ThemedText>

          <View style={s.actions}>
            {cartQuantity > 0 ? (
              <View style={s.qtyWrapper}>
                <ThemedText type="smallBold" style={[s.cartLabel, { color: theme.textSecondary }]}>
                  In Cart:
                </ThemedText>
                <View style={[s.stepper, { borderColor: theme.backgroundSelected }]}>
                  <Pressable
                    onPress={() => onUpdateQty(cartQuantity - 1)}
                    style={[s.stepBtn, { backgroundColor: theme.backgroundElement }]}
                    accessibilityLabel="Decrease quantity"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: cartQuantity <= 1 }}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.text }}>-</ThemedText>
                  </Pressable>
                  <ThemedText type="default" style={[s.qty, { color: theme.text, fontWeight: 'bold' }]}>
                    {cartQuantity}
                  </ThemedText>
                  <Pressable
                    disabled={cartQuantity >= product.stock}
                    onPress={() => onUpdateQty(cartQuantity + 1)}
                    style={[
                      s.stepBtn,
                      { backgroundColor: theme.backgroundElement },
                      cartQuantity >= product.stock && { opacity: 0.5 }
                    ]}
                    accessibilityLabel="Increase quantity"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: cartQuantity >= product.stock }}
                  >
                    <ThemedText type="smallBold" style={{ color: theme.text }}>+</ThemedText>
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
                accessibilityRole="button"
                accessibilityLabel="Add product to cart"
                accessibilityState={{ disabled: product.stock <= 0 }}
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
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: Spacing.three,
    backgroundColor: '#eee',
    resizeMode: 'cover',
  },
  category: { marginBottom: Spacing.two },
  rating: { fontSize: 14, color: '#f1c40f', marginBottom: Spacing.two },
  price: { fontWeight: 'bold', color: '#2ecc71', marginBottom: Spacing.one },
  stock: { marginBottom: Spacing.four },
  divider: { height: 1, marginVertical: Spacing.three },
  descLabel: { fontWeight: '600', marginBottom: Spacing.one },
  desc: { lineHeight: 18, marginBottom: Spacing.four },
  actions: { marginTop: Spacing.two },
  addBtn: { backgroundColor: '#208AEF', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  qtyWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  cartLabel: { },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4 },
  stepBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  qty: { paddingHorizontal: 16, fontSize: 16 },
  removeBtn: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
});
