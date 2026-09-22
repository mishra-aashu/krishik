import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemedText } from './themed-text';

interface IntroPillOverlayProps {
  onFinish?: () => void;
}

export function IntroPillOverlay({ onFinish }: IntroPillOverlayProps) {
  const [stage, setStage] = useState<'popCircle' | 'drawLeaf' | 'expandPill' | 'showText' | 'fadeAway'>('popCircle');

  useEffect(() => {
    // Animation Stage Sequence
    const t1 = setTimeout(() => setStage('drawLeaf'), 180);
    const t2 = setTimeout(() => setStage('expandPill'), 700);
    const t3 = setTimeout(() => setStage('showText'), 1050);
    const t4 = setTimeout(() => setStage('fadeAway'), 2000);
    const t5 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinish]);

  if (stage === 'fadeAway') {
    return null;
  }

  const isExpanded = stage === 'expandPill' || stage === 'showText';

  return (
    <View style={styles.overlay}>
      <View
        style={[
          styles.pillContainer,
          isExpanded && styles.pillContainerExpanded,
        ]}
      >
        {/* Logo Circle */}
        <View style={styles.logoCircle}>
          <svg width="26" height="26" viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
            {/* Center Leaf */}
            <path
              d="M12 20.5 C12 20.5 7.5 13 12 5.5 C16.5 13 12 20.5 12 20.5Z"
              stroke="#24d17e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: stage === 'popCircle' ? 40 : 0,
                transition: 'stroke-dashoffset 0.6s ease-out',
              } as any}
            />
            {/* Left Leaf */}
            <path
              d="M11.5 19.5 C11.5 19.5 4 16 5 9.5 C8 8.5 11.5 14.5 11.5 19.5Z"
              stroke="#24d17e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: 35,
                strokeDashoffset: stage === 'popCircle' ? 35 : 0,
                transition: 'stroke-dashoffset 0.6s ease-out 0.15s',
              } as any}
            />
            {/* Right Leaf */}
            <path
              d="M12.5 19.5 C12.5 19.5 20 16 19 9.5 C16 8.5 12.5 14.5 12.5 19.5Z"
              stroke="#24d17e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: 35,
                strokeDashoffset: stage === 'popCircle' ? 35 : 0,
                transition: 'stroke-dashoffset 0.6s ease-out 0.3s',
              } as any}
            />
          </svg>
        </View>

        {/* Brand Text */}
        <View
          style={[
            styles.textContainer,
            stage === 'showText' && styles.textContainerVisible,
          ]}
        >
          <ThemedText style={styles.brandText}>
            Krishik Mitra
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1e2520',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      } as any,
      default: {},
    }),
  },
  pillContainer: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: '#111b14',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(36, 209, 126, 0.25)',
    ...Platform.select({
      web: {
        boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.5)',
        transition: 'width 0.55s cubic-bezier(0.4, 0.0, 0.2, 1)',
      } as any,
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  pillContainerExpanded: {
    width: 215,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1d4c38',
    backgroundColor: '#111b14',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    paddingLeft: 12,
    paddingRight: 16,
    opacity: 0,
    transform: [{ translateX: -10 }],
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap',
        transition: 'opacity 0.45s ease-out, transform 0.45s ease-out',
      } as any,
      default: {},
    }),
  },
  textContainerVisible: {
    opacity: 1,
    transform: [{ translateX: 0 }],
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
