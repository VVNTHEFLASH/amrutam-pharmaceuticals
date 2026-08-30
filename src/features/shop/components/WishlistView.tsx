import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Heart, Trash2 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Product } from '@/types/domain';
import { useTheme } from '@/hooks/use-theme';

interface WishlistViewProps {
  wishlistProducts: Product[];
  onBack: () => void;
  onRemove: (productId: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function WishlistView({ wishlistProducts, onBack, onRemove, onSelectProduct }: WishlistViewProps) {
  const theme = useTheme();

  const renderItem = ({ item }: { item: Product }) => (
    <Pressable onPress={() => onSelectProduct(item)}>
      <ThemedView type="backgroundElement" style={s.itemRow}>
        <View style={s.itemInfo}>
          <ThemedText type="default" style={[s.itemName, { fontWeight: 'bold' }]}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.category} • ★ {item.rating}
          </ThemedText>
          <ThemedText type="default" style={{ color: '#2ecc71', marginTop: 4, fontWeight: 'bold' }}>
            ₹ {item.price}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => onRemove(item.id)}
          style={s.removeBtn}
          accessibilityLabel={`Remove ${item.name} from wishlist`}
        >
          <Trash2 size={20} color="#FF4D4F" />
        </Pressable>
      </ThemedView>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backButton} onPress={onBack}>
          <ThemedText type="linkPrimary">← Back to Shop</ThemedText>
        </Pressable>
        <ThemedText type="subtitle">My Wishlist</ThemedText>
      </View>

      {wishlistProducts.length === 0 ? (
        <View style={s.emptyWrapper}>
          <Heart size={48} color={theme.textSecondary} style={{ marginBottom: Spacing.two }} />
          <ThemedText type="subtitle" style={s.emptyText}>
            Your wishlist is empty.
          </ThemedText>
          <Pressable style={s.shopBtn} onPress={onBack}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              Browse Products
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={wishlistProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  backButton: { paddingVertical: Spacing.one },
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
  removeBtn: { padding: Spacing.two },
});
