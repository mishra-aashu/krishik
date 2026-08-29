import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const flatStyle = StyleSheet.flatten([
    { color: theme[themeColor ?? 'text'] },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'subtitle' && styles.subtitle,
    type === 'link' && styles.link,
    type === 'linkPrimary' && styles.linkPrimary,
    type === 'code' && styles.code,
    style,
  ]) as TextStyle;

  // Helper to recursively check if the children node contains Devanagari characters
  const hasDevanagari = (node: any): boolean => {
    if (typeof node === 'string') {
      return /[\u0900-\u097F]/.test(node);
    }
    if (typeof node === 'number') {
      return false;
    }
    if (Array.isArray(node)) {
      return node.some(hasDevanagari);
    }
    if (node && typeof node === 'object' && node.props && node.props.children) {
      return hasDevanagari(node.props.children);
    }
    return false;
  };

  const containsHindi = hasDevanagari(rest.children);

  // On native platforms, setting any fontWeight other than normal on a single-weight
  // custom font will cause the rendering engine to fall back to the system font.
  if (
    flatStyle.fontFamily === 'Pravah-Regular' ||
    flatStyle.fontFamily === 'Pravah-Bold'
  ) {
    if (containsHindi) {
      flatStyle.fontWeight = 'normal';
    } else {
      // Clear font family to fall back to clean system font for English/numbers
      flatStyle.fontFamily = undefined;
    }
  }

  return (
    <Text
      style={flatStyle}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    fontFamily: Fonts.sans,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.sans,
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
