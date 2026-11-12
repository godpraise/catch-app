import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import Avatar from '../components/Avatar';

export default function HomeScreen({ navigation, route }) {
  const user = route.params?.user;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar nickname={user?.nickname} imageUrl={user?.profileImage} size={36} />
          <View>
            <Text style={styles.headerName}>{user?.nickname ?? '게스트'}</Text>
            <Text style={styles.headerHint}>환영해요</Text>
          </View>
        </View>
        <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
      </View>

      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <Ionicons name="camera" size={30} color={colors.accentText} />
        </View>
        <Text style={styles.title}>찍히면 아웃</Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="새 방 만들기"
          variant="primary"
          icon={<Ionicons name="add" size={18} color={colors.white} />}
          onPress={() => navigation.navigate('RoomSetup', { user })}
        />
        <Button
          title="코드로 참가하기"
          variant="secondary"
          icon={<Ionicons name="enter-outline" size={18} color={colors.textPrimary} />}
          onPress={() => navigation.navigate('JoinRoom', { user })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerName: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  headerHint: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
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
  },
  actions: {
    gap: spacing.sm,
  },
});
