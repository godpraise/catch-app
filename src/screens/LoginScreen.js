import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import { signInWithKakao } from '../firebase/auth';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    setLoading(true);
    try {
      const user = await signInWithKakao();
      navigation.replace('Home', { user });
    } catch (err) {
      console.error(err);
      Alert.alert('로그인 실패', '카카오 로그인 중 문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Ionicons name="camera" size={28} color={colors.accentText} />
        </View>
        <Text style={styles.title}>찍히면 아웃</Text>
        <Text style={styles.subtitle}>사진 한 장이면 술래잡기 끝</Text>
      </View>

      <View style={styles.bottom}>
        <Button title="카카오로 3초만에 시작하기" variant="kakao" onPress={handleKakaoLogin} loading={loading} />
        <Text style={styles.hint}>닉네임과 프로필 사진을 카카오에서 바로 가져와요</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bottom: {
    gap: spacing.sm,
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
