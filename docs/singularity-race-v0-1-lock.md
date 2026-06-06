# Singularity Race v0.1 Lock

## One-Line Conclusion

특이점레이스를 현재 repo의 메인 완성 목표로 고정하고, 나머지 확장은 전부 보류한다.

## Current Interpretation

- `Baegeum-City_v3`: 작업장, 실험장, 보관소.
- `index.html`: 특이점레이스를 메인으로 보여주는 런처.
- `singularity-race.html`: 현재 출시 목표인 메인 게임.
- `singularity-race-admin.html`: 방장, 운영, 테스트용 화면.
- 배금도시, 다이스시티, 카지노, 생활 시스템, 드로잉월드: 삭제하지 않고 보류하는 서브 시스템.
- 시뮬라크월드 공통 엔진: 지금 구현하지 않는 미래 개념.

현재 목표는 통합 엔진 구축이 아니라, 특이점레이스를 플레이 가능한 v0.1 대표작으로 완성하는 것이다.

## Do Not

- 공통 엔진 새로 만들기.
- 시뮬라크월드 런처 새로 만들기.
- 배금도시 전체 확장.
- 주차장 운영 시뮬레이션 시작.
- 버거집 운영 시뮬레이션 시작.
- 주식, 부동산, 카지노, 생활 시스템 추가.
- 아이템 거래소, 경제 시스템, 상점 확장.
- 대형 리팩터링.
- `singularity-race.html` 구조를 대규모로 쪼개기.
- 기존 배금도시, 다이스, 카지노 시스템 삭제.
- ZIP 생성.
- 새 아이디어를 코드로 계속 추가하기.

## Allowed Work

- 특이점레이스 버그 수정.
- 진입 흐름 정리.
- 레이스 시작, 결과, 재시작 안정화.
- 모바일 UI 깨짐 수정.
- 방장 페이지 연결 안정화.
- 특이점레이스 smoke 테스트 유지.
- 작은 UI 문구 정리.
- 특이점레이스 관련 최소 문서 작성.

## v0.1 Completion Criteria

- `index.html`에서 특이점레이스가 가장 중요한 메인 모드로 보인다.
- `singularity-race.html` 진입 후 프로필, 로비, 대기열, 맵 미리보기, 레이스 흐름이 자연스럽다.
- 카운트다운, 출발, 레이스, 결과, 재시작 루프가 돌아간다.
- 모바일 조작이 깨지지 않는다.
- `singularity-race-admin.html`에서 개발 방, 봇, 시작 흐름을 확인할 수 있다.
- 기존 `smoke-singularity-race-*` 테스트가 깨지지 않는다.
- 배금도시, 다이스, 카지노, 생활 시스템은 삭제되지 않고 보류 상태로 남는다.

## Priority Order

1. 진입 흐름 안정화: `index.html` -> `singularity-race.html` -> `profile` -> `lobby` -> `queue` -> `mapPreview` -> `race`.
2. 한 판 루프 완성: 프로필 설정, 로비 입장, 대기열, 시작, 카운트다운, 레이스, 결과, 재시작.
3. 조작 안정화: PC 조작과 모바일 조작을 유지한다.
4. 운영 화면 안정화: 개발 방 입장, 봇 추가/제거, 경기 시작, 관전/채팅, 러너 상태 확인.
5. 결과/재시작 안정화: 결과 후 세션, 패킷, 모션 캐시, 연결 상태가 꼬이지 않게 한다.
6. 테스트 유지: 특이점레이스 관련 smoke 테스트를 우선 기준으로 삼는다.

## Test Focus

우선 유지할 테스트 계열:

- `smoke-singularity-race-bot-control`
- `smoke-singularity-race-progression`
- `smoke-singularity-race-camera`
- `smoke-singularity-race-render-budget`
- `smoke-singularity-race-mobile-race-ui`
- `smoke-singularity-race-combat-full-race`
- `smoke-singularity-race-server-load`

전체 `npm run check`는 마지막 통합 점검으로 본다.

## Copy-Paste Directive

공통 엔진 금지. 배금도시 확장 금지. 주차장/버거집 금지. 지금은 특이점레이스 v0.1 완성만 한다. 끝나면 나중에 엔진을 추출한다.
