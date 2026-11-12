import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import { subscribeToPlayers, subscribeToRoom } from '../firebase/rooms';

export default function CaughtScreen({ navigation, route }) {
  const { roomCode, user, caughtInfo } = route.params ?? {};

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, (room) => {
      if (room?.status === 'ended') {
        navigation.replace('Result', { roomCode, user });
      }
    });
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  const catcher = players.find((p) => p.id === caughtInfo?.caughtBy);
  const aliveRunners = players.filter((p) => p.role === 'runner' && p.status === 'alive');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="camera" size={28} color={colors.dangerText} />
        </View>
        <Text style={styles.title}>탈락!</Text>
        <Text style={styles.subtitle}>{catcher?.nickname ?? '술래'}님에게 찍혔어요</Text>
      </View>

      <View style={styles.photoBox}>
        {caughtInfo?.caughtPhotoUrl ? (
          <Image source={{ uri: caughtInfo.caughtPhotoUrl }} style={styles.photo} />
        ) : (
          <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.3)" />
        )}
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statLabel}>남은 도망자</Text>
        <Text style={styles.statValue}>{aliveRunners.length}명</Text>
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.noticeText}>관전 모드로 남은 게임을 지켜볼 수 있어요</Text>
      </View>

      <Button
        title="관전하러 가기"
        variant="secondary"
        onPress={() => navigation.replace('RunnerWaiting', { roomCode, user, spectate: true })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.dangerText,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  photoBox: {
    height: 200,
    borderRadius: radius.card,
    backgroundColor: '#2c2c2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});
