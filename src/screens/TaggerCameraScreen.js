import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import {
  subscribeToRoom,
  subscribeToPlayers,
  markPlayerCaught,
  uploadCatchPhoto,
  endGame,
  updateMyLocation,
} from '../firebase/rooms';
import { getDistanceMeters, getHeatLevel } from '../utils/geo';

export default function TaggerCameraScreen({ navigation, route }) {
  const { roomCode, user } = route.params ?? {};

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [zoom, setZoom] = useState(0);
  const baseZoom = useRef(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseZoom.current = zoom;
    })
    .onUpdate((e) => {
      const next = baseZoom.current + (e.scale - 1) * 0.4;
      setZoom(Math.max(0, Math.min(1, next)));
    });

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const [capturedUri, setCapturedUri] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const hasEnded = useRef(false);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  // 술래 본인 위치를 주기적으로 갱신 (거리 힌트 계산용)
  useEffect(() => {
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
  }, [roomCode]);

  useEffect(() => {
    const unsubRoom = subscribeToRoom(roomCode, setRoom);
    const unsubPlayers = subscribeToPlayers(roomCode, setPlayers);
    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [roomCode]);

  useEffect(() => {
    if (room?.timeLimitSec != null && secondsLeft === null) {
      setSecondsLeft(room.timeLimitSec);
    }
  }, [room?.timeLimitSec]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (room?.status === 'ended' && !hasEnded.current) {
      hasEnded.current = true;
      navigation.replace('Result', { roomCode, user });
    }
  }, [room?.status]);

  async function handleTimeUp() {
    if (hasEnded.current) return;
    hasEnded.current = true;
    try {
      await endGame(roomCode);
    } catch (err) {
      console.error(err);
    }
    navigation.replace('Result', { roomCode, user });
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        shutterSound: false,
        animateShutter: false,
      });
      setCapturedUri(photo.uri);
      setSelectedPlayerId(null);
    } catch (err) {
      console.error(err);
      Alert.alert('촬영 실패', '다시 시도해주세요.');
    }
  }

  async function handleConfirm() {
    if (!selectedPlayerId || !capturedUri) return;
    setSubmitting(true);
    try {
      const photoUrl = await uploadCatchPhoto({ roomCode, localUri: capturedUri });
      await markPlayerCaught({
        roomCode,
        playerId: selectedPlayerId,
        caughtById: user.uid,
        photoUrl,
      });

      const remainingRunners = players.filter(
        (p) => p.role === 'runner' && p.status === 'alive' && p.id !== selectedPlayerId
      );

      if (remainingRunners.length === 0) {
        hasEnded.current = true;
        await endGame(roomCode);
        navigation.replace('Result', { roomCode, user });
        return;
      }

      setCapturedUri(null);
      setSelectedPlayerId(null);
    } catch (err) {
      console.error(err);
      Alert.alert('처리 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  const aliveRunners = players.filter((p) => p.role === 'runner' && p.status === 'alive');
  const me = players.find((p) => p.id === user?.uid);

  let nearestDistance = null;
  if (me?.location) {
    aliveRunners.forEach((p) => {
      if (!p.location) return;
      const d = getDistanceMeters(me.location.lat, me.location.lng, p.location.lat, p.location.lng);
      if (nearestDistance === null || d < nearestDistance) nearestDistance = d;
    });
  }
  const heat = getHeatLevel(nearestDistance);

  const minutes = secondsLeft != null ? String(Math.floor(secondsLeft / 60)).padStart(2, '0') : '--';
  const seconds = secondsLeft != null ? String(secondsLeft % 60).padStart(2, '0') : '--';

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>카메라 권한이 필요해요</Text>
          <Button title="권한 허용하기" variant="primary" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <GestureDetector gesture={pinchGesture}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          zoom={zoom}
          animateShutter={false}
        />
      </GestureDetector>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={13} color="#fff" />
            <Text style={styles.pillText}>
              {minutes}:{seconds}
            </Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="search" size={13} color="#fff" />
            <Text style={styles.pillText}>{(1 + zoom * 4).toFixed(1)}x</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={13} color="#fff" />
            <Text style={styles.pillText}>{aliveRunners.length}명 남음</Text>
          </View>
        </View>

        <View style={styles.heatRow}>
          <View style={styles.heatPill}>
            <Ionicons name={heat.icon} size={14} color="#fff" />
            <Text style={styles.pillText}>{heat.label}</Text>
          </View>
        </View>

        {!capturedUri && (
          <View style={styles.shutterRow}>
            <Pressable style={styles.shutterButton} onPress={handleCapture}>
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {capturedUri && (
        <View style={styles.sheetBackdrop}>
          <SafeAreaView style={styles.sheet}>
            <Text style={styles.sheetEyebrow}>방금 촬영한 사진</Text>
            <Text style={styles.sheetTitle}>누구를 찍었나요?</Text>

            {aliveRunners.map((p) => {
              const selected = p.id === selectedPlayerId;
              const missedMission = p.missionStatus === 'failed';
              return (
                <Pressable
                  key={p.id}
                  style={[styles.playerOption, selected && styles.playerOptionSelected]}
                  onPress={() => setSelectedPlayerId(p.id)}
                >
                  <Avatar nickname={p.nickname} imageUrl={p.profileImage} size={32} />
                  <Text style={styles.playerOptionName}>{p.nickname}</Text>
                  {missedMission && (
                    <View style={styles.hintBadge}>
                      <Ionicons name="flame" size={11} color={colors.dangerText} />
                      <Text style={styles.hintBadgeText}>힌트</Text>
                    </View>
                  )}
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.accentText} />}
                </Pressable>
              );
            })}

            <Button
              title="탈락 확정"
              variant="primary"
              onPress={handleConfirm}
              loading={submitting}
              disabled={!selectedPlayerId}
              style={styles.confirmButton}
            />
            <Button
              title="다시 찍기"
              variant="secondary"
              onPress={() => {
                setCapturedUri(null);
                setSelectedPlayerId(null);
              }}
            />
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface0,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  heatRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  heatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(226,75,74,0.85)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
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
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
  },
  sheetEyebrow: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.control,
    marginBottom: spacing.xs,
  },
  playerOptionSelected: {
    borderColor: colors.accentBorder,
    borderWidth: 1.5,
    backgroundColor: colors.accentBg,
  },
  playerOptionName: {
    ...typography.caption,
    flex: 1,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.control,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  hintBadgeText: {
    fontSize: 10,
    color: colors.dangerText,
    fontWeight: '500',
  },
  confirmButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});
