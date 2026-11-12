import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';
import Button from '../components/Button';
import { createRoom } from '../firebase/rooms';

export default function RoomSetupScreen({ navigation, route }) {
  const user = route.params?.user;

  const [maxPlayers, setMaxPlayers] = useState(8);
  const [hideTimeSec, setHideTimeSec] = useState(30);
  const [timeLimitMin, setTimeLimitMin] = useState(10);
  const [creating, setCreating] = useState(false);

  async function handleCreateRoom() {
    if (!user) {
      Alert.alert('오류', '로그인 정보가 없어요. 다시 로그인해주세요.');
      return;
    }
    setCreating(true);
    try {
      const roomCode = await createRoom({
        hostId: user.uid,
        hostNickname: user.nickname,
        hostProfileImage: user.profileImage,
        maxPlayers,
        hideTimeSec,
        timeLimitSec: timeLimitMin * 60,
      });
      navigation.navigate('WaitingRoom', { roomCode, user, isHost: true });
    } catch (err) {
      console.error(err);
      Alert.alert('방 생성 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>방 만들기</Text>
        <Text style={styles.title}>술래잡기 설정</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>참가 인원</Text>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={3}
            maximumValue={20}
            step={1}
            value={maxPlayers}
            onValueChange={setMaxPlayers}
            minimumTrackTintColor={colors.textPrimary}
            thumbTintColor={colors.textPrimary}
          />
          <Text style={styles.value}>{maxPlayers}명</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          <Ionicons name="eye-off-outline" size={13} /> 숨는 시간
        </Text>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={300}
            step={10}
            value={hideTimeSec}
            onValueChange={setHideTimeSec}
            minimumTrackTintColor={colors.textPrimary}
            thumbTintColor={colors.textPrimary}
          />
          <Text style={styles.value}>{hideTimeSec}초</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>
          <Ionicons name="time-outline" size={13} /> 게임 시간
        </Text>
        <View style={styles.sliderRow}>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={30}
            step={1}
            value={timeLimitMin}
            onValueChange={setTimeLimitMin}
            minimumTrackTintColor={colors.textPrimary}
            thumbTintColor={colors.textPrimary}
          />
          <Text style={styles.value}>{timeLimitMin}분</Text>
        </View>
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="dice-outline" size={16} color={colors.accentText} />
        <Text style={styles.noticeText}>술래는 게임 시작 시 랜덤으로 정해져요</Text>
      </View>

      <Button title="방 만들기" variant="primary" onPress={handleCreateRoom} loading={creating} />
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  value: {
    ...typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    minWidth: 48,
    textAlign: 'right',
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
