// 두 좌표 사이의 거리를 계산하는 하버사인 공식 (단위: 미터)
export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 지구 반지름(m)
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 거리를 "뜨거워요/차가워요" 단계로 변환 (지도 없이 등급만 제공)
export function getHeatLevel(distanceMeters) {
  if (distanceMeters == null) return { label: '위치 확인 중...', icon: 'help-circle-outline', level: 0 };
  if (distanceMeters < 15) return { label: '너무 뜨거워요!', icon: 'flame', level: 4 };
  if (distanceMeters < 40) return { label: '뜨거워요', icon: 'flame-outline', level: 3 };
  if (distanceMeters < 100) return { label: '미지근해요', icon: 'partly-sunny-outline', level: 2 };
  return { label: '차가워요', icon: 'snow-outline', level: 1 };
}
