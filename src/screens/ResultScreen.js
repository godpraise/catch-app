import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import { subscribeToRoom, subscribeToPlayers, restartGame } from '../firebase/rooms';

export default function ResultScreen({ navigation, route }) {
  const { roomCode, user } = route.params ?? {};

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, setRoom);
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  // 방장이 "다시하기" 누르면 모두 같이 새 추첨 화면으로 이동
  useEffect(() => {
    if (room?.status === 'hiding') {
      navigation.replace('RoleReveal', { roomCode, user });
    }
  }, [room?.status]);

  if (!room || players.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>결과 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  const tagger = players.find((p) => p.role === 'tagger');
  const runners = players.filter((p) => p.role === 'runner');
  const caughtRunners = runners
    .filter((p) => p.status === 'caught')
    .sort((a, b) => (a.caughtAt?.seconds ?? 0) - (b.caughtAt?.seconds ?? 0));
  const survivors = runners.filter((p) => p.status === 'alive');

  const taggerWon = survivors.length === 0;
  const isHost = room.hostId === user?.uid;

  async function handleRestart() {
    setRestarting(true);
    try {
      await restartGame(roomCode);
    } catch (err) {
      console.error(err);
      setRestarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.trophyBox, taggerWon ? styles.trophyDanger : styles.trophySuccess]}>
          <Ionicons name="trophy" size={26} color={taggerWon ? colors.dangerText : colors.successText} />
        </View>
        <Text style={styles.title}>{taggerWon ? '술래 승리' : '도망자 승리'}</Text>
        <Text style={styles.subtitle}>
          {taggerWon
            ? '제한 시간 안에 전원을 잡았어요'
            : `${survivors.length}명이 끝까지 살아남았어요`}
        </Text>
      </View>

      {taggerWon ? (
        <View style={styles.taggerCardWrap}>
          <View style={styles.taggerCard}>
            <Avatar nickname={tagger?.nickname} imageUrl={tagger?.profileImage} size={32} role="tagger" />
            <Text style={styles.taggerCardName}>{tagger?.nickname}</Text>
            <Text style={styles.taggerCardLabel}>이번 판 술래</Text>
          </View>
        </View>
      ) : (
        <View style={styles.survivorRow}>
          {survivors.map((p) => (
            <View key={p.id} style={styles.survivorCard}>
              <Avatar nickname={p.nickname} imageUrl={p.profileImage} size={28} role="runner" />
              <Text style={styles.survivorName}>{p.nickname}</Text>
              <Text style={styles.survivorLabel}>최후 생존</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>잡힌 순서</Text>
      <View style={styles.timeline}>
        {caughtRunners.map((p, i) => (
          <View key={p.id} style={styles.timelineRow}>
            <Text style={styles.timelineIndex}>{i + 1}</Text>
            <Avatar nickname={p.nickname} imageUrl={p.profileImage} size={26} role="runner" />
            <Text style={styles.timelineName}>{p.nickname}</Text>
          </View>
        ))}
        {caughtRunners.length === 0 && <Text style={styles.timelineEmpty}>아무도 잡히지 않았어요</Text>}
      </View>

      <Button
        title="비하인드 보기"
        variant="secondary"
        icon={<Ionicons name="images-outline" size={16} color={colors.textPrimary} />}
        onPress={() => navigation.navigate('BehindTheScenes', { roomCode, user })}
        style={styles.behindButton}
      />

      {isHost ? (
        <Button
          title="다시하기"
          variant="primary"
          icon={<Ionicons name="refresh" size={16} color={colors.white} />}
          onPress={handleRestart}
          loading={restarting}
        />
      ) : (
        <Text style={styles.hint}>방장이 다시 시작하기를 기다리는 중...</Text>
      )}

      <Button title="홈으로" variant="secondary" onPress={() => navigation.popToTop()} style={styles.homeButton} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  trophyBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  trophySuccess: {
    backgroundColor: colors.successBg,
  },
  trophyDanger: {
    backgroundColor: colors.dangerBg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  taggerCardWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  taggerCard: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  taggerCardName: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.dangerText,
  },
  taggerCardLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  survivorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  survivorCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.control,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  survivorName: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.successText,
  },
  survivorLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  timeline: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.control,
    padding: spacing.sm,
  },
  timelineIndex: {
    ...typography.tiny,
    color: colors.textMuted,
    width: 16,
  },
  timelineName: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  timelineEmpty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  behindButton: {
    marginBottom: spacing.sm,
  },
  homeButton: {
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
