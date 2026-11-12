// 사용자별 전적(게임 수, 생존 횟수, 술래 승리 횟수) 관리
//
// Firestore 구조
// users/{uid}
//   nickname, profileImage, gamesPlayed, timesSurvived, timesCaught, timesAsTagger, taggerWins

import { doc, getDoc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { db } from './config';

export function subscribeToUserStats(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

export async function getUserStats(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

// 게임이 끝났을 때, 자신의 결과에 맞춰 전적을 1회 누적
// role: 'tagger' | 'runner', outcome: 'survived' | 'caught' | 'taggerWon'
export async function recordGameResult({ uid, nickname, profileImage, role, survived }) {
  const ref = doc(db, 'users', uid);

  const updates = {
    nickname,
    profileImage,
    gamesPlayed: increment(1),
  };

  if (role === 'tagger') {
    updates.timesAsTagger = increment(1);
    if (survived === false) {
      // 술래 입장에서 "survived: false"는 쓰지 않음. 술래는 승리 여부로 기록.
    }
  } else {
    if (survived) {
      updates.timesSurvived = increment(1);
    } else {
      updates.timesCaught = increment(1);
    }
  }

  await setDoc(ref, updates, { merge: true });
}

// 술래가 이겼을 때(전원 잡음) 별도로 호출
export async function recordTaggerWin(uid) {
  await setDoc(doc(db, 'users', uid), { taggerWins: increment(1) }, { merge: true });
}
