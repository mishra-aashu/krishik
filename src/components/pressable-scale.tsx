import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

export function PressableScale({ children, style, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (event: any) => {
    setIsPressed(true);
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
    if (onPressIn) onPressIn(event);
  };

  const handlePressOut = (event: any) => {
    setIsPressed(false);
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    if (onPressOut) onPressOut(event);
  };

  // Resolve style if it's a function using our state
  const resolvedStyle = typeof style === 'function' ? style({ pressed: isPressed }) : style;
  const resolvedStyleArray = Array.isArray(resolvedStyle) ? resolvedStyle : [resolvedStyle];
  // Filter out any falsy values (like false, null, undefined) to avoid breaking stylesheet compilers
  const filteredStyle = resolvedStyleArray.filter(Boolean);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        ...filteredStyle,
        animatedStyle,
        Platform.OS === 'web' && {
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        } as any,
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
