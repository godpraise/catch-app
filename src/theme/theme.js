// 앱 전역에서 쓰는 색상/타이포그래피/간격 값
// 목업에서 사용한 톤(플랫, 미니멀)을 그대로 따름

export const colors = {
  // 배경
  surface0: '#F5F4F0', // 페이지 배경
  surface1: '#F1EFE8', // 카드 안쪽 배경
  surface2: '#FFFFFF', // 카드/시트 배경

  // 텍스트
  textPrimary: '#1A1A18',
  textSecondary: '#5F5E5A',
  textMuted: '#888780',

  // 테두리
  border: '#E4E2DA',
  borderStrong: '#D3D1C7',

  // 역할별 색 (accent = 파랑, danger = 빨강, success = 초록)
  accentBg: '#E6F1FB',
  accentText: '#0C447C',
  accentBorder: '#378ADD',

  dangerBg: '#FCEBEB',
  dangerText: '#791F1F',
  dangerBorder: '#E24B4A',

  successBg: '#EAF3DE',
  successText: '#27500A',
  successBorder: '#639922',

  kakaoYellow: '#FEE500',
  kakaoText: '#191919',

  black: '#000000',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  control: 8,
  card: 12,
  sheet: 20,
};

export const typography = {
  h1: { fontSize: 22, fontWeight: '500' },
  h2: { fontSize: 18, fontWeight: '500' },
  h3: { fontSize: 16, fontWeight: '500' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  tiny: { fontSize: 11, fontWeight: '400' },
};
