import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Avatar from '../components/Avatar';
import { subscribeToPlayers, MISSION_TYPES } from '../firebase/rooms';

export default function BehindTheScenesScreen({ navigation, route }) {
  const { roomCode } = route.params ?? {};

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const unsub = subscribeToPlayers(roomCode, setPlayers);
    return unsub;
  }, [roomCode]);

  const caughtRunners = players
    .filter((p) => p.role === 'runner' && p.status === 'caught')
    .sort((a, b) => (a.caughtAt?.seconds ?? 0) - (b.caughtAt?.seconds ?? 0));

  const missionCompletedRunners = players.filter(
    (p) => p.role === 'runner' && p.missionStatus === 'completed' && p.missionPhotoUrl
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <View>
          <Text style={styles.title}>비하인드</Text>
          <Text style={styles.subtitle}>이번 판 잡힌 순간들</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {caughtRunners.map((p, i) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.photoBox}>
              {p.caughtPhotoUrl ? (
                <Image source={{ uri: p.caughtPhotoUrl }} style={styles.photo} />
              ) : (
                <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.25)" />
              )}
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{i + 1}번째</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Avatar nickname={p.nickname} imageUrl={p.profileImage} size={22} role="runner" />
              <Text style={styles.cardName}>{p.nickname}</Text>
            </View>
          </View>
        ))}

        {caughtRunners.length === 0 && <Text style={styles.empty}>이번 판에는 잡힌 사람이 없어요</Text>}

        {missionCompletedRunners.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>미션 성공</Text>
            {missionCompletedRunners.map((p) => {
              const mission = MISSION_TYPES.find((m) => m.id === p.missionType);
              return (
                <View key={`mission-${p.id}`} style={styles.card}>
                  <View style={styles.photoBox}>
                    <Image source={{ uri: p.missionPhotoUrl }} style={styles.photo} />
                    <View style={styles.missionBadge}>
                      {mission && <Ionicons name={mission.icon} size={11} color="#fff" />}
                      <Text style={styles.orderBadgeText}>{mission?.label ?? '미션'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Avatar nickname={p.nickname} imageUrl={p.profileImage} size={22} role="runner" />
                    <Text style={styles.cardName}>{p.nickname}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  card: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  photoBox: {
    height: 160,
    backgroundColor: '#2c2c2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  orderBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 10,
  },
  missionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  cardName: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
