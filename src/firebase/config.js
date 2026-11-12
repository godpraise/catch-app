// Firebase 프로젝트 설정
// 아래 값들은 Firebase 콘솔 > 프로젝트 설정 > 일반 탭에서 확인 후 채워넣으세요.
// (README.md의 "Firebase 설정" 섹션 참고)

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID",
  measurementId: "YOUR_FIREBASE_MEASUREMENT_ID",
};

// 이미 초기화된 앱이 있으면 재사용 (핫리로드 시 중복 초기화 방지)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// React Native에서는 로그인 상태 유지를 위해 AsyncStorage 기반 persistence 필요
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Fast Refresh 중 재초기화 에러 방지
  const { getAuth } = require("firebase/auth");
  auth = getAuth(app);
}

export const db = getFirestore(app);
export const storage = getStorage(app);
export { auth };
export default app;
