import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Platform, useWindowDimensions } from 'react-native';

// Ultra-wide HD landscape panoramas (16:9) exclusively for Desktop — zero stretching or pixelation
const DESKTOP_SLIDESHOW_IMAGES = [
  require('@/assets/images/farm_bg.png'),
  require('@/assets/images/farm_bg_4.png'),
  require('@/assets/images/farm_bg_2.png'),
  require('@/assets/images/farm_bg_3.png'),
  { uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1920&auto=format&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1920&auto=format&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=1920&auto=format&fit=crop' },
];

// Portrait & mobile-optimized images exclusively for mobile screens (farmer harvest image hidden for mobile)
const MOBILE_SLIDESHOW_IMAGES = [
  require('@/assets/images/farmer_paddy_mobile.jpg'),
  require('@/assets/images/farm_bg_2.png'),
  require('@/assets/images/farm_bg_3.png'),
  { uri: 'https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?q=80&w=1200&auto=format&fit=crop' },
];

interface BackgroundSlideshowProps {
  isDark: boolean;
  overlayOpacityDark?: number;
  overlayOpacityLight?: number;
}

export function BackgroundSlideshow({
  isDark,
  overlayOpacityDark = 0.72,
  overlayOpacityLight = 0.82,
}: BackgroundSlideshowProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const images = isMobile ? MOBILE_SLIDESHOW_IMAGES : DESKTOP_SLIDESHOW_IMAGES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      const upcoming = (currentIndex + 1) % images.length;
      setNextIndex(upcoming);

      // Fade out current image slowly to reveal next image underneath
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1600,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        // Swap active index and reset opacity for continuous smooth loop
        setCurrentIndex(upcoming);
        fadeAnim.setValue(1);
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [currentIndex, fadeAnim, images.length]);

  const overlayBg = isDark
    ? `rgba(5, 20, 10, ${overlayOpacityDark})`
    : `rgba(235, 247, 237, ${overlayOpacityLight})`;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base layer (Next Image) */}
      <Animated.Image
        source={images[nextIndex % images.length]}
        style={[styles.bgImage, { opacity: 1 }]}
        resizeMode="cover"
      />

      {/* Top layer (Current Image fading out) */}
      <Animated.Image
        source={images[currentIndex % images.length]}
        style={[styles.bgImage, { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      {/* Theme Overlay Layer for text contrast */}
      <View style={[styles.bgOverlay, { backgroundColor: overlayBg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
