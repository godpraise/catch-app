import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';

// role: 'neutral' | 'tagger' | 'runner' 에 따라 배경색이 달라짐
export default function Avatar({ nickname, imageUrl, size = 40, role = 'neutral' }) {
  const bgColor = role === 'tagger' ? colors.dangerBg : role === 'runner' ? colors.accentBg : colors.surface1;
  const textColor = role === 'tagger' ? colors.dangerText : role === 'runner' ? colors.accentText : colors.textSecondary;

  const initial = nickname ? nickname[0] : '?';

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
      ]}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initial, { color: textColor, fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    fontWeight: '500',
  },
});
