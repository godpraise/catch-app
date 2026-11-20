# 실행 경로와 파일 정리

2026-11-20에 정리한 실행 경로는 `App.js`, `src/navigation/AppNavigator.js`, `src/screens/`, `src/firebase/`입니다.

| 이전 경로 | 확인한 내용 |
| --- | --- |
| `src/AppNavigator.js` | 이름과 달리 구형 방 서비스 코드. 현재 앱에서 참조하지 않음 |
| `src/HomeScreen.js` | 구형 내비게이터 사본. 현재 앱에서 참조하지 않음 |
| `src/WaitingRoomScreen.js` | 이름과 달리 구형 전적 서비스 코드. 현재 앱에서 참조하지 않음 |
| `src/screens/PlaceholderScreen.js` | 등록된 화면에서 사용하지 않는 빈 화면. 미사용 import와 함께 정리 |
| `functions/app.json`, `functions/eas.json` | 서버 함수와 관계없는 중복 Expo/EAS 설정. 루트 설정만 사용 |

이전 파일은 기존 커밋과 별도 로컬 백업에 남아 있습니다. 활성 화면이나 방 서비스 로직을 구형 사본으로 교체하지 않았습니다.

진입점에서 상대 경로 import를 따라 사용 파일을 확인했습니다. 역할·회차·사진 규칙과 방 서비스는 `security/`의 기존 테스트로 검증합니다. 이 정리는 Expo/EAS 전체 빌드나 실기기 검증을 대신하지 않습니다.

기존 Firebase 배포 전 단계는 정의되지 않은 `lint` 명령을 호출하고 있었습니다. `functions/package.json`에 `check` 명령을 추가하고 `node --check index.js` 문법 검사로 연결했습니다. 이는 ESLint 규칙 검사와는 별개이며, 실제 배포는 수행하지 않았습니다.
