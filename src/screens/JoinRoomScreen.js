import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme/theme';
import Button from '../components/Button';
import { joinRoom, subscribeToRoom } from '../firebase/rooms';

export default function JoinRoomScreen({ navigation, route }) {
  const user = route.params?.user;
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    const roomCode = code.trim().toUpperCase();
    if (roomCode.length < 4) {
      Alert.alert('코드를 확인해주세요', '초대 코드를 정확히 입력했는지 확인해주세요.');
      return;
    }
    if (!user) {
      Alert.alert('오류', '로그인 정보가 없어요. 다시 로그인해주세요.');
      return;
    }

    setJoining(true);

    // 방이 실제로 존재하는지 먼저 확인
    const unsubscribe = subscribeToRoom(roomCode, async (room) => {
      unsubscribe();
      if (!room) {
        setJoining(false);
        Alert.alert('방을 찾을 수 없어요', '초대 코드를 다시 확인해주세요.');
        return;
      }
      if (room.status !== 'waiting') {
        setJoining(false);
        Alert.alert('참가할 수 없어요', '이미 게임이 진행 중인 방이에요.');
        return;
      }

      try {
        await joinRoom({
          roomCode,
          userId: user.uid,
          nickname: user.nickname,
          profileImage: user.profileImage,
        });
        setJoining(false);
        navigation.navigate('WaitingRoom', { roomCode, user, isHost: false });
      } catch (err) {
        console.error(err);
        setJoining(false);
        Alert.alert('참가 실패', '잠시 후 다시 시도해주세요.');
      }
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>방 참가</Text>
        <Text style={styles.title}>초대 코드를 입력하세요</Text>
      </View>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="7F3K2Q"
        autoCapitalize="characters"
        maxLength={6}
        style={styles.input}
      />

      <Button title="참가하기" variant="primary" onPress={handleJoin} loading={joining} />
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
  input: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 6,
    marginBottom: spacing.lg,
  },
});
