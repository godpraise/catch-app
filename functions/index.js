// 카카오 accessToken을 검증하고 Firebase Custom Token을 발급하는 함수
// 배포: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

exports.exchangeKakaoToken = functions.https.onRequest(async (req, res) => {
  // CORS 허용 (앱에서 직접 호출하므로)
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  const { kakaoAccessToken } = req.body;
  if (!kakaoAccessToken) {
    return res.status(400).json({ error: 'kakaoAccessToken이 필요해요.' });
  }

  try {
    // 1. 카카오 서버에 토큰을 보내 사용자 정보를 검증받음
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });

    if (!kakaoRes.ok) {
      return res.status(401).json({ error: '유효하지 않은 카카오 토큰이에요.' });
    }

    const kakaoUser = await kakaoRes.json();
    const uid = `kakao:${kakaoUser.id}`;

    // 2. Firebase Custom Token 발급 (없던 유저면 Firebase Auth에 자동 생성됨)
    const customToken = await admin.auth().createCustomToken(uid);

    return res.status(200).json({ firebaseCustomToken: customToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '토큰 교환 중 오류가 발생했어요.' });
  }
});
