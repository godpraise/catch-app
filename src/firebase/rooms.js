// 방(게임) 생성, 참가, 실시간 구독, 미션 관련 Firestore 함수 모음
//
// Firestore 구조
// rooms/{roomId}
//   hostId, status, timeLimitSec, hideTimeSec, maxPlayers, createdAt
//   rooms/{roomId}/players/{userId}
//     nickname, profileImage, role, status, caughtAt, caughtBy, caughtPhotoUrl
//     missionType, missionStatus, missionAssignedAt, missionPhotoUrl

import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, storage, auth } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 6자리 초대 코드 생성 (숫자+대문자, 헷갈리는 0/O, 1/I 제외)
function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function initialPlayer(nickname, profileImage) {
  return { nickname, profileImage: profileImage || null, role: null, status: 'alive',
    caughtAt: null, caughtBy: null, caughtPhotoUrl: null, missionType: null,
    missionStatus: null, missionAssignedAt: null, missionPhotoUrl: null,
    joinedAt: serverTimestamp(), roundId: 0 };
}

// Room and host membership are created atomically; existing codes cannot be overwritten.
export async function createRoom({ hostId, hostNickname, hostProfileImage, maxPlayers, hideTimeSec, timeLimitSec }) {
  if (auth.currentUser?.uid !== hostId) throw new Error('authenticated-host-required');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRoomCode();
    try {
      await runTransaction(db, async (tx) => {
        const roomRef = doc(db, 'rooms', code);
        if ((await tx.get(roomRef)).exists()) throw new Error('invite-code-conflict');
        tx.set(roomRef, { hostId, status: 'waiting', maxPlayers, hideTimeSec, timeLimitSec,
          createdAt: serverTimestamp(), startedAt: null, taggerId: null, roundId: 0 });
        tx.set(doc(db, 'rooms', code, 'players', hostId), initialPlayer(hostNickname, hostProfileImage));
      });
      return code;
    } catch (error) { if (error.message !== 'invite-code-conflict') throw error; }
  }
  throw new Error('invite-code-unavailable');
}

export async function joinRoom({ roomCode, userId, nickname, profileImage }) {
  if (auth.currentUser?.uid !== userId) throw new Error('authenticated-player-required');
  await runTransaction(db, async (tx) => {
    const roomRef = doc(db, 'rooms', roomCode);
    const playerRef = doc(db, 'rooms', roomCode, 'players', userId);
    const room = await tx.get(roomRef);
    if (!room.exists() || room.data().status !== 'waiting') throw new Error('room-not-waiting');
    if ((await tx.get(playerRef)).exists()) return;
    tx.set(playerRef, initialPlayer(nickname, profileImage));
  });
}

// 방 정보 실시간 구독
export function subscribeToRoom(roomCode, callback) {
  return onSnapshot(doc(db, 'rooms', roomCode), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
  });
}

// 참가자 목록 실시간 구독
export function subscribeToPlayers(roomCode, callback) {
  return onSnapshot(collection(db, 'rooms', roomCode, 'players'), (snap) => {
    const players = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(players);
  });
}

// All role resets and the new round are one host batch; rules validate the actor.
export async function startGame(roomCode) {
  const roomRef = doc(db, 'rooms', roomCode);
  const room = await getDoc(roomRef);
  if (!room.exists() || room.data().hostId !== auth.currentUser?.uid || !['waiting', 'ended'].includes(room.data().status)) throw new Error('host-start-required');
  const playersSnap = await getDocs(collection(db, 'rooms', roomCode, 'players'));
  const playerIds = playersSnap.docs.map((d) => d.id);
  if (playerIds.length < 2 || playerIds.length > room.data().maxPlayers) throw new Error('invalid-player-count');
  const taggerId = playerIds[Math.floor(Math.random() * playerIds.length)];
  const roundId = room.data().roundId + 1;
  const batch = writeBatch(db);
  playerIds.forEach((id) => batch.update(doc(db, 'rooms', roomCode, 'players', id), {
    role: id === taggerId ? 'tagger' : 'runner', status: 'alive', roundId,
    caughtAt: null, caughtBy: null, caughtPhotoUrl: null,
    missionType: null, missionStatus: null, missionAssignedAt: null, missionPhotoUrl: null,
  }));
  batch.update(roomRef, { status: 'hiding', startedAt: serverTimestamp(), taggerId, roundId });
  await batch.commit();
  return taggerId;
}

// 숨는 시간이 끝나면 진행 상태로 전환
export async function beginPlaying(roomCode) {
  await updateDoc(doc(db, 'rooms', roomCode), { status: 'playing' });
}

// 도망자 탈락 처리
export async function markPlayerCaught({ roomCode, playerId, caughtById, photoUrl }) {
  await updateDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
    status: 'caught',
    caughtAt: serverTimestamp(),
    caughtBy: caughtById,
    caughtPhotoUrl: photoUrl,
  });
}

// 촬영한 사진을 Firebase Storage에 업로드하고 다운로드 URL 반환
export async function uploadCatchPhoto({ roomCode, localUri }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('authenticated-player-required');
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileName = `${Date.now()}.jpg`;
  const photoRef = ref(storage, `rooms/${roomCode}/${uid}/${fileName}`);
  await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(photoRef);
}

// 방 나가기 (참가자 문서 삭제)
export async function leaveRoom(roomCode, userId) {
  await deleteDoc(doc(db, 'rooms', roomCode, 'players', userId));
}

// 내 위치를 주기적으로 갱신 (거리 힌트용, 지도에는 표시하지 않음)
export async function updateMyLocation(roomCode, userId, lat, lng) {
  await updateDoc(doc(db, 'rooms', roomCode, 'players', userId), {
    location: { lat, lng, updatedAt: Date.now() },
  });
}

// ===== 미션 시스템 =====

// 도망자에게 무작위로 뜨는 미션 목록
export const MISSION_TYPES = [
  { id: 'selfie', label: '셀카 찍기', icon: 'happy-outline' },
  { id: 'sneaky_tagger', label: '몰래 술래 찍기', icon: 'eye-outline' },
  { id: 'sky', label: '하늘 찍기', icon: 'cloud-outline' },
  { id: 'feet', label: '내 발 찍기', icon: 'footsteps-outline' },
  { id: 'nearest_tree', label: '가장 가까운 나무(또는 풀) 찍기', icon: 'leaf-outline' },
  { id: 'finger_heart', label: '손가락 하트 찍기', icon: 'heart-outline' },
];

export const MISSION_TIME_LIMIT_SEC = 45;

// 도망자에게 미션을 무작위 배정
export async function assignMission(roomCode, playerId) {
  const mission = MISSION_TYPES[Math.floor(Math.random() * MISSION_TYPES.length)];
  await updateDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
    missionType: mission.id,
    missionStatus: 'pending',
    missionAssignedAt: serverTimestamp(),
    missionPhotoUrl: null,
  });
  return mission;
}

// 미션 완료 처리
export async function completeMission(roomCode, playerId, photoUrl) {
  await updateDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
    missionStatus: 'completed',
    missionPhotoUrl: photoUrl,
  });
}

// 미션 시간 초과 처리 (술래에게 힌트가 노출됨)
export async function failMission(roomCode, playerId) {
  await updateDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
    missionStatus: 'failed',
  });
}

// 게임 종료 처리
export async function endGame(roomCode) {
  await updateDoc(doc(db, 'rooms', roomCode), { status: 'ended' });
}

// 같은 방에서 재경기 (술래 다시 랜덤 배정)
export async function restartGame(roomCode) {
  return startGame(roomCode);
}
