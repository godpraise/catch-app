// 아직 구현하지 않은 화면들을 위한 임시 컴포넌트
// (RoomSetup, JoinRoom, WaitingRoom, RoleReveal, TaggerCamera, Result, BehindTheScenes)
// 다음 개발 단계에서 하나씩 실제 화면으로 교체할 예정

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../theme/theme';

export default function PlaceholderScreen({ route }) {
  const screenName = route?.name ?? '화면';
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>{screenName} 화면{'\n'}(다음 단계에서 구현 예정)</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  text: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
