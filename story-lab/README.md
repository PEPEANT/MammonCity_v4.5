# story-lab — 작가용 변경 시스템

스토리가 계속 바뀌어도 **코드가 같이 무너지지 않게** 하는 작업 공간.
아이디어는 여기서 마음껏 바꾸고, `game/data/scenes.js`(실행용)는 **마지막에** 반영한다.

## 읽는 순서 (AI/Codex/사람 공통)
1. **[current-direction.md](current-direction.md)** ← ⭐ 유일한 필수. 지금 확정된 기준.
2. [DECISION_LOG.md](DECISION_LOG.md) — 왜 이렇게 정했나(되돌리기/재논의 방지)
3. 필요할 때만: `patches/`, `*-outline.md`, `archive/`

## 원칙
- **current-direction.md가 단일 진실.** 다른 문서와 충돌하면 이게 이김.
- **scenes.js는 실행용.** 여기서 막 쓰지 말고, 확정된 것만 패치로 반영.
- **대공사 금지. 패치 단위로 쪼갠다** (patch-001, 002 …).
- **이 process가 또 하나의 끝없는 프로젝트가 되면 실패.** current-direction.md 외엔 다 보조. 가볍게.

## 폴더
```
story-lab/
  current-direction.md   ← 확정 기준 (필수)
  DECISION_LOG.md        ← 결정 이력 + 이유
  patches/               ← 코드 반영 단위(작게 쪼갬)
  archive/               ← 버린/보류 아이디어
  *-outline.md           ← 개별 안 초안 (자유롭게)
```

## 워크플로
1. 새 아이디어 → `*-outline.md` 또는 `archive/`에 자유롭게.
2. 채택되면 → `current-direction.md` 갱신 + `DECISION_LOG.md`에 한 줄.
3. 코드 반영 → `patches/`에 작은 패치로 쪼개서 scenes.js에.
4. "이전 거 말고 X안으로 가자" → current-direction.md만 고치면 AI가 바로 따라감.
