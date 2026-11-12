// 카카오 로그인 -> Firebase Auth 연동
//
// Firebase Auth는 카카오를 기본 지원하지 않기 때문에,
// 1) 카카오 SDK로 로그인 -> 카카오 accessToken 획득
// 2) 그 토큰을 Cloud Functions로 보내서 검증 후 Firebase Custom Token 발급
// 3) 그 Custom Token으로 Firebase에 로그인
// 이 3단계 구조가 필요해요. (Cloud Function 예시는 /functions/index.js 참고)

import {
  login as kakaoLogin,
  getProfile as getKakaoProfile,
} from "@react-native-seoul/kakao-login";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./config";

// Cloud Functions에 배포한 카카오 토큰 검증 엔드포인트 URL
// firebase deploy 이후 콘솔에 표시되는 함수 URL로 교체하세요.
const EXCHANGE_TOKEN_URL = "https://exchangekakaotoken-du64z5rzgq-uc.a.run.app";

export async function signInWithKakao() {
  // 1. 카카오 로그인 실행 (카카오톡 앱 또는 웹뷰로 로그인 창이 뜸)
  const kakaoToken = await kakaoLogin();

  // 2. 카카오 프로필(닉네임, 프로필 사진) 가져오기
  const profile = await getKakaoProfile();

  // 3. 백엔드(Cloud Function)에 카카오 accessToken을 보내서
  //    Firebase Custom Token으로 교환
  const response = await fetch(EXCHANGE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kakaoAccessToken: kakaoToken.accessToken }),
  });

  if (!response.ok) {
    throw new Error("카카오 토큰 교환에 실패했어요.");
  }

  const { firebaseCustomToken } = await response.json();

  // 4. Firebase Custom Token으로 로그인
  const userCredential = await signInWithCustomToken(auth, firebaseCustomToken);

  return {
    uid: userCredential.user.uid,
    nickname: profile.nickname,
    profileImage: profile.profileImageUrl,
  };
}

export function signOut() {
  return auth.signOut();
}
