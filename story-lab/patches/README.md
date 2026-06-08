# patches — 코드 반영 단위 (작게 쪼갠다)

대공사 한 방 금지. scenes.js 반영은 **작은 패치**로 쪼개서, 하나씩 검증(`node tools/validate-story.js`)하며 진행.

## 패치 형식
`patch-NNN-짧은이름.md` 한 장에:
- **목표** (한 줄)
- **scenes.js 변경 내용** (어느 씬을 어떻게)
- **검증** (validator 통과? 아틀라스에서 고아/막다른 0?)
- **상태** (대기 / 진행 / 완료)

## 집 출발 전환 — 계획된 패치 (순서대로)
- `patch-001-home-start` — 시작 배경 고시원 → 집/원룸. 엄마 폰루트 이식.
- `patch-002-remove-manager` — 매니저(점장) 지각 씬 삭제/축소 → 엄마·은행·통장 알림.
- `patch-003-gosiwon-to-ending` — 고시원 방 묘사를 흙수저 엔딩(e_dirt)으로 이동.
- `patch-004-clean-orphans` — 죽은 `w1_morning`+`w1_mom_*` 고아 블록 제거.
- `patch-005-mom-bank-account` — 엄마 통장 건드림 = 나락 문턱 + 후폭풍(다음 주차 들킴) 추가.

## 규칙
- **Codex와 동시에 scenes.js 편집 금지** — 충돌남. 한 번에 한 손만.
- 각 패치 후 validator + 아틀라스로 깨진 데 확인.
- 완료된 패치는 상태만 갱신(파일 보존 = 이력).
