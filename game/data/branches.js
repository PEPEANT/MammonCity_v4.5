/* ===== 배금도시 — 런타임 분기 단일 진실 =====
   "가상 허브 id"가 플래그(이전 선택의 결과)에 따라 실제 씬으로 갈린다.
   engine.js(게임 동작) · atlas.js(흐름도 표시) · tools/validate-story.js(검증)
   세 곳이 전부 이 파일을 읽는다. 분기를 바꾸려면 여기 한 곳만 고치면 된다.

   형식:
     허브id: {
       gate : "사람이 읽는 분기 조건",         // 흐름도에 ⟨...⟩ 로 표시
       test : flags => boolean,               // true면 cases[0], false면 cases[1]
       cases: [ { to:'실제씬', label:'언제 이리로' }, ... ]   // 1개면 무조건 그 씬
     }
   ⚠ test 는 engine 의 옛 remapSceneId 와 1:1 로 같아야 한다(동작 안 바뀌게).
========================================================= */
(function (root) {
  'use strict';

  const RUNTIME_BRANCHES = {
    // 외형: 거울에서 외모를 다듬었는가
    w1_walk_to_stop: {
      gate: '거울에서 외모를 다듬었나',
      test: f => f.appearance === 'checked',
      cases: [
        { to: 'w1_walk_to_stop_checked', label: '다듬음' },
        { to: 'w1_walk_to_stop_plain',   label: '안 다듬음' },
      ],
    },
    w1_busstop: {
      gate: '거울에서 외모를 다듬었나',
      test: f => f.appearance === 'checked',
      cases: [
        { to: 'w1_busstop_checked', label: '다듬음' },
        { to: 'w1_busstop_plain',   label: '안 다듬음' },
      ],
    },
    w1_hunt_fail: {
      gate: '(고정)',
      test: () => true,
      cases: [{ to: 'w1_hunt_fail_plain', label: '항상' }],
    },

    // 유민아를 만났는가 → 2·3·4·5주차 분기
    w2_contact: {
      gate: '유민아를 만났나',
      test: f => !!f.met_yumina,
      cases: [
        { to: 'w2_yumina_text', label: '만남' },
        { to: 'w2_alone',       label: '못 만남' },
      ],
    },
    w3_open: {
      gate: '유민아를 만났나',
      test: f => !!f.met_yumina,
      cases: [
        { to: 'w3_date_meet',      label: '만남' },
        { to: 'w3_market_arrival', label: '못 만남' },
      ],
    },
    w4a_after: {
      gate: '유민아를 만났나',
      test: f => !!f.met_yumina,
      cases: [
        { to: 'w4a_borrow_hesitate', label: '만남' },
        { to: 'w4a_alone',           label: '못 만남' },
      ],
    },
    w4b_after: {
      gate: '유민아를 만났나',
      test: f => !!f.met_yumina,
      cases: [
        { to: 'w4b_yumina', label: '만남' },
        { to: 'w4b_alone',  label: '못 만남' },
      ],
    },
    w5b_choice: {
      gate: '유민아를 만났나',
      test: f => !!f.met_yumina,
      cases: [
        { to: 'w5b_choice_y', label: '만남' },
        { to: 'w5b_choice_n', label: '못 만남' },
      ],
    },

    // 주식 결과는 이제 2주차 직후 w3_card 에서 처리(구버전 세이브 호환용 허브)
    w3_stock_result: {
      gate: '(구버전 세이브 호환)',
      test: () => true,
      cases: [{ to: 'w3_card', label: '항상' }],
    },

    // 4주차 결과: 주식/코인 수익이 났으면 생존(w4b), 손실/미매수면 붕괴(w4a)
    w4_result: {
      gate: '주식/코인 수익이 났나',
      test: f => (Number(f.stock_profit) > 0 || !!f.coin_success || !!f.temperance),
      cases: [
        { to: 'w4b', label: '수익>0 또는 코인성공 또는 절제 → 생존' },
        { to: 'w4a', label: '손실/미매수 → 붕괴' },
      ],
    },
    ed_gold_after_rich: {
      gate: '금수저 루트에서 유민아 관계가 살아 있나',
      test: f => !!f.gold_yumina_call_ready && !f.yumina_lost,
      cases: [
        { to: 'ed_gold_yumina_call', label: '관계 유지 → 전화' },
        { to: 'ed_gold_phone',       label: '혼자/관계 상실 → 계좌' },
      ],
    },
  };

  // 허브 id + 현재 플래그 → 실제 도착 씬 id. 허브가 아니면 그대로 돌려준다.
  function remapBranch(id, flags) {
    const b = RUNTIME_BRANCHES[id];
    if (!b) return id;
    if (b.cases.length === 1) return b.cases[0].to;
    return b.test(flags || {}) ? b.cases[0].to : b.cases[1].to;
  }

  root.RUNTIME_BRANCHES = RUNTIME_BRANCHES;
  root.remapBranch = remapBranch;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RUNTIME_BRANCHES, remapBranch };
  }
})(typeof window !== 'undefined' ? window : globalThis);
