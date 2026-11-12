// 방(게임) 생성, 참가, 실시간 구독 관련 Firestore 함수 모음
//
// Firestore 구조
// rooms/{roomId}
//   hostId, status, timeLimitSec, hideTimeSec, maxPlayers, createdAt
//   rooms/{roomId}/players/{userId}
//     nickname, profileImage, role, status, caughtAt, caughtBy, caughtPhotoUrl

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

  // 방장도 참가자로 등록
  await setDoc(doc(db, 'rooms', roomCode, 'players', hostId), {
    nickname: hostNickname,
    profileImage: hostProfileImage,
    role: null, // 게임 시작 시 랜덤 배정
    status: 'alive', // alive | caught
    caughtAt: null,
    caughtBy: null,
    caughtPhotoUrl: null,
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

// 도망자 탈락 처리 (술래가 사진 찍고 대상 선택 시 호출)
export async function markPlayerCaught({ roomCode, playerId, caughtById, photoUrl }) {
  await updateDoc(doc(db, 'rooms', roomCode, 'players', playerId), {
    status: 'caught',
    caughtAt: serverTimestamp(),
    caughtBy: caughtById,
    caughtPhotoUrl: photoUrl,
  });
}

// 방 나가기 (참가자 문서 삭제)
export async function leaveRoom(roomCode, userId) {
  await deleteDoc(doc(db, 'rooms', roomCode, 'players', userId));
}

// 게임 종료 처리
export async function endGame(roomCode) {
  await updateDoc(doc(db, 'rooms', roomCode), { status: 'ended' });
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

// 같은 방에서 재경기 (술래 다시 랜덤 배정)
export async function restartGame(roomCode) {
  return startGame(roomCode);
}
