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
} from 'firebase/firestore';
import { db, storage } from './config';
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

// 방 생성 (방장이 호출)
export async function createRoom({ hostId, hostNickname, hostProfileImage, maxPlayers, hideTimeSec, timeLimitSec }) {
  const roomCode = generateRoomCode();
  const roomRef = doc(db, 'rooms', roomCode);

  await setDoc(roomRef, {
    hostId,
    status: 'waiting', // waiting | hiding | playing | ended
    maxPlayers,
    hideTimeSec,
    timeLimitSec,
    createdAt: serverTimestamp(),
    startedAt: null,
  });

  await setDoc(doc(db, 'rooms', roomCode, 'players', hostId), {
    nickname: hostNickname,
    profileImage: hostProfileImage,
    role: null,
    status: 'alive',
    caughtAt: null,
    caughtBy: null,
    caughtPhotoUrl: null,
    missionType: null,
    missionStatus: null,
    missionAssignedAt: null,
    missionPhotoUrl: null,
    joinedAt: serverTimestamp(),
  });

  return roomCode;
}

// 초대 코드로 방 참가
export async function joinRoom({ roomCode, userId, nickname, profileImage }) {
  const playerRef = doc(db, 'rooms', roomCode, 'players', userId);
  await setDoc(playerRef, {
    nickname,
    profileImage,
    role: null,
    status: 'alive',
    caughtAt: null,
    caughtBy: null,
    caughtPhotoUrl: null,
    missionType: null,
    missionStatus: null,
    missionAssignedAt: null,
    missionPhotoUrl: null,
    joinedAt: serverTimestamp(),
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

// 게임 시작: 참가자 중 랜덤 1명을 술래로 배정
export async function startGame(roomCode) {
  const playersSnap = await getDocs(collection(db, 'rooms', roomCode, 'players'));
  const playerIds = playersSnap.docs.map((d) => d.id);
  const taggerId = playerIds[Math.floor(Math.random() * playerIds.length)];

  const updates = playerIds.map((id) =>
    updateDoc(doc(db, 'rooms', roomCode, 'players', id), {
      role: id === taggerId ? 'tagger' : 'runner',
      status: 'alive',
      caughtAt: null,
      caughtBy: null,
      caughtPhotoUrl: null,
      missionType: null,
      missionStatus: null,
      missionAssignedAt: null,
      missionPhotoUrl: null,
    })
  );
  await Promise.all(updates);

  await updateDoc(doc(db, 'rooms', roomCode), {
    status: 'hiding',
    startedAt: serverTimestamp(),
    taggerId,
  });

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
  const response = await fetch(localUri);
  const blob = await response.blob();
  const fileName = `${Date.now()}.jpg`;
  const photoRef = ref(storage, `rooms/${roomCode}/${fileName}`);
  await uploadBytes(photoRef, blob);
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
