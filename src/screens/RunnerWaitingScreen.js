import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import {
  subscribeToRoom,
  subscribeToPlayers,
  assignMission,
  completeMission,
  failMission,
  uploadCatchPhoto,
  updateMyLocation,
  MISSION_TYPES,
  MISSION_TIME_LIMIT_SEC,
} from '../firebase/rooms';
import { getDistanceMeters, getHeatLevel } from '../utils/geo';

export default function RunnerWaitingScreen({ navigation, route }) {
  const { roomCode, user, spectate } = route.params ?? {};

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const hasNavigated = useRef(false);
  const missionTimerScheduled = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [missionSecondsLeft, setMissionSecondsLeft] = useState(null);
  const [capturedUri, setCapturedUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, setRoom);
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  // 도망자(관전자 제외) 본인 위치를 주기적으로 갱신 (거리 힌트 계산용)
  useEffect(() => {
    if (spectate) return;
    let subscription;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 15 },
        (loc) => {
          updateMyLocation(roomCode, user.uid, loc.coords.latitude, loc.coords.longitude).catch((err) =>
            console.error(err)
          );
        }
      );
    })();
    return () => subscription?.remove();
  }, [roomCode, spectate]);

  const me = players.find((p) => p.id === user?.uid);

  useEffect(() => {
    if (hasNavigated.current) return;

    if (room?.status === 'ended') {
      hasNavigated.current = true;
      navigation.replace('Result', { roomCode, user });
      return;
    }

    if (!spectate && me?.status === 'caught') {
      hasNavigated.current = true;
      navigation.replace('Caught', { roomCode, user, caughtInfo: me });
    }
  }, [room?.status, me?.status]);

  // 게임이 본격 진행되면(status: playing), 무작위 시점에 딱 1번 미션을 배정
  useEffect(() => {
    if (spectate) return;
    if (missionTimerScheduled.current) return;
    if (room?.status !== 'playing') return;
    if (!me || me.missionStatus) return;

    missionTimerScheduled.current = true;

    const timeLimitMs = (room.timeLimitSec ?? 300) * 1000;
    const randomDelay = timeLimitMs * (0.2 + Math.random() * 0.5);

    const timer = setTimeout(() => {
      if (me.status === 'alive') {
        assignMission(roomCode, user.uid).catch((err) => console.error(err));
      }
    }, randomDelay);

    return () => clearTimeout(timer);
  }, [room?.status, me?.missionStatus]);

  // 미션이 'pending'으로 뜨면 카운트다운 시작
  useEffect(() => {
    if (me?.missionStatus === 'pending' && missionSecondsLeft === null) {
      setMissionSecondsLeft(MISSION_TIME_LIMIT_SEC);
      if (!permission?.granted) requestPermission();
    }
    if (me?.missionStatus !== 'pending' && missionSecondsLeft !== null) {
      setMissionSecondsLeft(null);
      setCapturedUri(null);
    }
  }, [me?.missionStatus]);

  useEffect(() => {
    if (missionSecondsLeft === null) return;
    if (missionSecondsLeft <= 0) {
      failMission(roomCode, user.uid).catch((err) => console.error(err));
      return;
    }
    const t = setTimeout(() => setMissionSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [missionSecondsLeft]);

  async function handleMissionCapture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        shutterSound: false,
        animateShutter: false,
      });
      setCapturedUri(photo.uri);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMissionSubmit() {
    if (!capturedUri) return;
    setSubmitting(true);
    try {
      const photoUrl = await uploadCatchPhoto({ roomCode, localUri: capturedUri });
      await completeMission(roomCode, user.uid, photoUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const aliveRunners = players.filter((p) => p.role === 'runner' && p.status === 'alive');
  const tagger = players.find((p) => p.role === 'tagger');
  const currentMission = MISSION_TYPES.find((m) => m.id === me?.missionType);
  const showMission = !spectate && me?.missionStatus === 'pending' && currentMission;

  let distanceToTagger = null;
  if (!spectate && me?.location && tagger?.location) {
    distanceToTagger = getDistanceMeters(me.location.lat, me.location.lng, tagger.location.lat, tagger.location.lng);
  }
  const heat = getHeatLevel(distanceToTagger);

  if (showMission) {
    return (
      <View style={styles.missionCameraContainer}>
        {!capturedUri ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" animateShutter={false} />
        ) : (
          <View style={StyleSheet.absoluteFill} />
        )}

        <SafeAreaView style={styles.missionOverlay} pointerEvents="box-none">
          <View style={styles.missionHeader}>
            <View style={styles.missionPill}>
              <Ionicons name={currentMission.icon} size={14} color="#fff" />
              <Text style={styles.missionPillText}>{currentMission.label}</Text>
            </View>
            <View style={styles.missionPill}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.missionPillText}>{missionSecondsLeft}초</Text>
            </View>
          </View>

          {!capturedUri ? (
            <View style={styles.shutterRow}>
              <Pressable style={styles.shutterButton} onPress={handleMissionCapture}>
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.missionConfirmBox}>
              <Button title="이 사진으로 제출" variant="primary" onPress={handleMissionSubmit} loading={submitting} />
              <Button title="다시 찍기" variant="secondary" onPress={() => setCapturedUri(null)} />
            </View>
          )}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <Ionicons name={spectate ? 'eye-outline' : 'body-outline'} size={30} color={colors.accentText} />
        </View>
        <Text style={styles.title}>{spectate ? '관전 중' : '숨는 중...'}</Text>
        <Text style={styles.subtitle}>
          {spectate ? '남은 도망자들을 지켜보고 있어요' : `${tagger?.nickname ?? '술래'}에게 들키지 마세요`}
        </Text>

        {!spectate && me?.missionStatus === 'completed' && (
          <View style={styles.missionDoneBox}>
            <Ionicons name="checkmark-circle" size={16} color={colors.successText} />
            <Text style={styles.missionDoneText}>미션 완료!</Text>
          </View>
        )}
        {!spectate && me?.missionStatus === 'failed' && (
          <View style={styles.missionFailBox}>
            <Ionicons name="flame-outline" size={16} color={colors.dangerText} />
            <Text style={styles.missionFailText}>미션을 놓쳤어요! 술래가 눈치챌 수도 있어요</Text>
          </View>
        )}

        {!spectate && room?.status === 'playing' && (
          <View style={styles.heatBox}>
            <Ionicons name={heat.icon} size={16} color={colors.dangerText} />
            <Text style={styles.heatText}>술래와의 거리: {heat.label}</Text>
          </View>
        )}

        <View style={styles.statBox}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.statValue}>{aliveRunners.length}명 생존</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  statBox: {
    backgroundColor: colors.surface1,
    borderRadius: radius.control,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  heatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  heatText: {
    ...typography.tiny,
    color: colors.dangerText,
    fontWeight: '500',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  missionDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    borderRadius: radius.control,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  missionDoneText: {
    ...typography.tiny,
    color: colors.successText,
    fontWeight: '500',
  },
  missionFailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    maxWidth: 260,
  },
  missionFailText: {
    ...typography.tiny,
    color: colors.dangerText,
    fontWeight: '500',
    flexShrink: 1,
  },
  missionCameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  missionOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  missionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  missionPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  shutterRow: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  shutterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {},
  missionConfirmBox: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});
