import React, { useRef, useState } from 'react';
import { ScrollView, View, Pressable, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

interface HorizontalFilterRowProps {
  children: React.ReactNode;
}

export function HorizontalFilterRow({ children }: HorizontalFilterRowProps) {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const hasOverflow = contentWidth > containerWidth + 4;
  const canGoPrevious = scrollOffset > 4;
  const canGoNext = scrollOffset + containerWidth < contentWidth - 4;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.x);
  };

  const scrollBy = (amount: number) => {
    let targetX = scrollOffset + amount;
    if (targetX < 0) targetX = 0;
    if (targetX > contentWidth - containerWidth) targetX = contentWidth - containerWidth;
    scrollViewRef.current?.scrollTo({ x: targetX, animated: true });
  };

  return (
    <View style={styles.container}>
      {hasOverflow && (
        <Pressable
          disabled={!canGoPrevious}
          onPress={() => scrollBy(-150)}
          accessibilityLabel="Previous filters"
          style={[
            styles.arrowButton,
            { backgroundColor: theme.backgroundElement },
            !canGoPrevious && { opacity: 0.3 }
          ]}>
          <ChevronLeft size={16} color={theme.text} />
        </Pressable>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onContentSizeChange={(w) => setContentWidth(w)}
        contentContainerStyle={styles.scrollContent}
      >
        {children}
      </ScrollView>

      {hasOverflow && (
        <Pressable
          disabled={!canGoNext}
          onPress={() => scrollBy(150)}
          accessibilityLabel="Next filters"
          style={[
            styles.arrowButton,
            { backgroundColor: theme.backgroundElement },
            !canGoNext && { opacity: 0.3 }
          ]}>
          <ChevronRight size={16} color={theme.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    marginBottom: 8,
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 16,
  },
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});
