import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../theme/theme";
import Button from "../components/Button";
import Avatar from "../components/Avatar";
import {
  subscribeToRoom,
  subscribeToPlayers,
  startGame,
} from "../firebase/rooms";

export default function WaitingRoomScreen({ navigation, route }) {
  const { roomCode, user, isHost } = route.params ?? {};

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, setRoom);
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  // 방장이 시작하면 status가 'hiding'으로 바뀌고, 모든 참가자가 동시에 추첨 화면으로 이동
  useEffect(() => {
    if (room?.status === "hiding") {
      navigation.replace("RoleReveal", { roomCode, user });
    }
  }, [room?.status]);

  async function handleStart() {
    if (players.length < 2) {
      Alert.alert("인원이 부족해요", "최소 2명이 모여야 시작할 수 있어요.");
      return;
    }
    setStarting(true);
    try {
      await startGame(roomCode);
    } catch (err) {
      console.error(err);
      Alert.alert("시작 실패", "잠시 후 다시 시도해주세요.");
      setStarting(false);
    }
  }

  function handleInvite() {
    Share.share({ message: `찍히면 아웃 초대 코드: ${roomCode}` });
  }

  const maxPlayers = room?.maxPlayers ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>초대 코드</Text>
        <Text style={styles.codeValue}>{roomCode}</Text>
      </View>

      <Button
        title="카톡으로 친구 초대하기"
        variant="kakao"
        icon={
          <Ionicons
            name="chatbubble-ellipses"
            size={15}
            color={colors.kakaoText}
          />
        }
        onPress={handleInvite}
        style={styles.inviteButton}
      />

      <View style={styles.playersHeader}>
        <Text style={styles.playersTitle}>참가자</Text>
        <Text style={styles.playersCount}>
          {players.length} / {maxPlayers || "-"}명
        </Text>
      </View>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Avatar
              nickname={item.nickname}
              imageUrl={item.profileImage}
              size={32}
            />
            <Text style={styles.playerName}>{item.nickname}</Text>
            {item.id === room?.hostId && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>방장</Text>
              </View>
            )}
          </View>
        )}
      />

      {room && (
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Ionicons
              name="eye-off-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.summaryValue}>{room.hideTimeSec}초</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.summaryValue}>
              {Math.round(room.timeLimitSec / 60)}분
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons
              name="dice-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.summaryValue}>랜덤 술래</Text>
          </View>
        </View>
      )}

      {isHost ? (
        <>
          <Button
            title="게임 시작"
            variant="primary"
            onPress={handleStart}
            loading={starting}
          />
          <Text style={styles.hint}>방장만 시작할 수 있어요</Text>
        </>
      ) : (
        <Text style={styles.hint}>방장이 시작하기를 기다리는 중...</Text>
      )}
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
  codeBox: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  codeLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 3,
    color: colors.textPrimary,
  },
  inviteButton: {
    marginBottom: spacing.lg,
  },
  playersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  playersTitle: {
    ...typography.caption,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  playersCount: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.control,
    marginBottom: spacing.xs,
  },
  playerName: {
    ...typography.caption,
    flex: 1,
    color: colors.textPrimary,
  },
  hostBadge: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  hostBadgeText: {
    ...typography.tiny,
    color: colors.accentText,
  },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.surface1,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  hint: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
