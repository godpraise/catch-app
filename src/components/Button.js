import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius, typography } from '../theme/theme';

// variant: 'primary' | 'secondary' | 'kakao'
export default function Button({ title, onPress, variant = 'secondary', icon, loading, disabled, style }) {
  const variantStyle = styles[variant] || styles.secondary;
  const textVariantStyle = textStyles[variant] || textStyles.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.textPrimary} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textVariantStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.textPrimary,
  },
  secondary: {
    backgroundColor: colors.surface2,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
  },
  kakao: {
    backgroundColor: colors.kakaoYellow,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    ...typography.body,
    fontWeight: '500',
  },
});

const textStyles = StyleSheet.create({
  primary: { color: colors.white },
  secondary: { color: colors.textPrimary },
  kakao: { color: colors.kakaoText },
});
