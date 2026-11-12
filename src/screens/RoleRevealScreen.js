import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Avatar from '../components/Avatar';
import { subscribeToRoom, subscribeToPlayers, beginPlaying } from '../firebase/rooms';

export default function RoleRevealScreen({ navigation, route }) {
  const { roomCode, user } = route.params ?? {};

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const hasTransitioned = useRef(false);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, setRoom);
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  // 방 정보가 도착하면 카운트다운 시작
  useEffect(() => {
    if (room?.hideTimeSec != null && secondsLeft === null) {
      setSecondsLeft(room.hideTimeSec);
    }
  }, [room?.hideTimeSec]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleTimeUp() {
    if (hasTransitioned.current) return;
    hasTransitioned.current = true;

    // 방장 기기에서만 status를 playing으로 전환 (중복 호출 방지)
    if (room?.hostId === user?.uid) {
      try {
        await beginPlaying(roomCode);
      } catch (err) {
        console.error(err);
      }
    }

    if (myRole === 'tagger') {
      navigation.replace('TaggerCamera', { roomCode, user });
    } else {
      navigation.replace('RunnerWaiting', { roomCode, user });
    }
  }

  const me = players.find((p) => p.id === user?.uid);
  const myRole = me?.role;
  const tagger = players.find((p) => p.role === 'tagger');

  if (!room || !myRole || !tagger) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>추첨 중...</Text>
      </SafeAreaView>
    );
  }

  const isMeTagger = myRole === 'tagger';
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.eyebrow}>추첨 완료</Text>

      <View style={styles.center}>
        <Text style={styles.label}>이번 판 술래는</Text>

        <Avatar
          nickname={tagger.nickname}
          imageUrl={tagger.profileImage}
          size={96}
          role="tagger"
        />

        <Text style={styles.taggerName}>
          {tagger.nickname}
          {isMeTagger ? ' (나)' : ''}
        </Text>

        <View style={[styles.messageBox, isMeTagger ? styles.messageBoxDanger : styles.messageBoxAccent]}>
          <Text style={[styles.messageText, isMeTagger ? styles.messageTextDanger : styles.messageTextAccent]}>
            {isMeTagger ? '당신이 술래입니다' : '당신은 도망자입니다'}
          </Text>
          <View style={styles.messageSubRow}>
            <Ionicons name="eye-off-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.messageSub}>
              {isMeTagger ? '친구들이 숨는 동안 잠깐 기다려주세요' : '숨을 시간이 주어져요'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.countdownLabel}>숨는 시간</Text>
        <Text style={styles.countdown}>
          {minutes}:{seconds}
        </Text>
        {isMeTagger && <Text style={styles.footerHint}>시간이 끝나면 카메라가 자동으로 켜져요</Text>}
      </View>
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
  eyebrow: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  taggerName: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  messageBox: {
    borderRadius: radius.control,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  messageBoxAccent: {
    backgroundColor: colors.accentBg,
  },
  messageBoxDanger: {
    backgroundColor: colors.dangerBg,
  },
  messageText: {
    ...typography.h3,
  },
  messageTextAccent: {
    color: colors.accentText,
  },
  messageTextDanger: {
    color: colors.dangerText,
  },
  messageSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  messageSub: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  countdownLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  countdown: {
    fontSize: 36,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  footerHint: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
