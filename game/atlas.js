/* ===== 배금도시 — 스토리 아틀라스 분석 로직 (읽기전용) =====
   window.STORY(scenes.js)를 받아서 "한눈에 보기"용 데이터 모델을 만든다.
   순수 함수만 둔다(DOM 안 건드림) → overview.html 과 node 스모크 테스트가 같이 쓴다.

   Atlas.build(STORY) -> {
     groups: [ { key, label, scenes: [sceneModel...] } ],   // 주차별 묶음(흐름 순서)
     order:  [sceneId...],                                   // 도달 순서(BFS)
     health: { sceneCount, orphans[], deadends[], endings[], brokenLinks[], runtimeLinks[] },
     flags:  [ { name, kind, setAt:[{scene,label,val}] } ],  // 모든 플래그/스탯 한곳에
   }
   sceneModel = { id, type, week, group, header, speaker, text, image,
                  edges:[{label,target,kind,deltas}], deltas, badges:[] }
============================================================ */
(function (root) {
  'use strict';

  // 돈/턴/주차 등은 "스탯"이 아니라 경제·진행 키. 나머지 set 키는 감정 스탯으로 본다.
  const MONEY_KEYS = ['cash', 'debt', 'assets', 'setCash', 'setDebt', 'setAssets', 'startingCash'];
  const TERMINAL_TYPES = ['end', 'album'];

  function sceneExists(scenes, id) {
    return Object.prototype.hasOwnProperty.call(scenes, id);
  }

  // 엔진의 런타임 분기(remapSceneId)를 데이터만으로 흉내: 없는 타겟이면 _plain/_checked 변형을 찾는다.
  function resolveTarget(scenes, id) {
    if (id == null) return { target: id, kind: 'missing' };
    if (sceneExists(scenes, id)) return { target: id, kind: 'ok' };
    const variants = [id + '_plain', id + '_checked', id + '_default'];
    const hit = variants.find(v => sceneExists(scenes, v));
    if (hit) return { target: id, kind: 'runtime' }; // 런타임에 갈라지는 가상 타겟
    return { target: id, kind: 'broken' };
  }

  // set / effects 를 사람이 읽는 델타 칩으로
  function collectDeltas(node) {
    const out = [];
    if (!node || typeof node !== 'object') return out;

    const set = node.set;
    if (set && typeof set === 'object') {
      for (const k of Object.keys(set)) out.push({ kind: 'stat', name: k, val: set[k] });
    }
    const fx = node.effects;
    if (fx && typeof fx === 'object') {
      for (const k of Object.keys(fx)) {
        if (k === 'flags' || k === 'flag') {
          const fl = fx[k] || {};
          for (const fk of Object.keys(fl)) out.push({ kind: 'flag', name: fk, val: fl[fk] });
        } else if (k === 'affection') {
          const af = fx[k] || {};
          for (const ak of Object.keys(af)) out.push({ kind: 'stat', name: ak, val: af[ak] });
        } else if (MONEY_KEYS.includes(k)) {
          out.push({ kind: 'money', name: k, val: fx[k] });
        } else if (typeof fx[k] === 'number') {
          out.push({ kind: 'stat', name: k, val: fx[k] }); // 예: anger
        } else {
          out.push({ kind: 'misc', name: k, val: fx[k] });
        }
      }
    }
    return out;
  }

  function imageModel(image) {
    if (!image) return null;
    if (typeof image === 'string') return { kind: 'file', src: image };
    if (image && typeof image === 'object' && image.placeholder) {
      return { kind: 'placeholder', label: image.placeholder };
    }
    return null;
  }

  function outEdges(scenes, sc) {
    const edges = [];
    const push = (label, target, deltas) => {
      if (target == null) return;
      const r = resolveTarget(scenes, target);
      edges.push({ label, target, kind: r.kind, deltas: deltas || [] });
    };
    if (Array.isArray(sc.choices)) {
      sc.choices.forEach(ch => {
        const e = { label: ch.label || '(선택)', target: ch.next, kind: resolveTarget(scenes, ch.next).kind,
                    deltas: collectDeltas(ch) };
        edges.push(e);
      });
    }
    if (sc.next) push('→ 다음', sc.next);
    if (sc.phone && Array.isArray(sc.phone.choices)) {
      const prefix = sc.phone.screen === 'messages' ? '메시지' : '폰';
      sc.phone.choices.forEach(ch => {
        if (!ch || typeof ch !== 'object') return;
        push(prefix + ': ' + (ch.label || '(선택)'), ch.next, collectDeltas(ch));
      });
    }
    if (sc.phone && sc.phone.acceptNext) push('☎ 받으면', sc.phone.acceptNext);
    if (sc.phone && sc.phone.declineNext) push('☎ 거절하면', sc.phone.declineNext);
    // choices 경로엔 위에서 deltas를 이미 넣었으니, push로 만든 엣지엔 빈 deltas 보강
    edges.forEach(e => { if (!e.deltas) e.deltas = []; });
    return edges;
  }

  function weekLabel(week, type) {
    if (TERMINAL_TYPES.includes(type) || type === 'end') return { key: 'z_end', label: '엔딩' };
    const w = Number(week || 0);
    if (w <= 0) return { key: 'w0', label: '프롤로그 / 도입' };
    return { key: 'w' + w, label: w + '주차' };
  }

  function build(STORY) {
    const scenes = (STORY && STORY.scenes) || {};
    const start = STORY && STORY.start;
    const ids = Object.keys(scenes);

    // ---- BFS 도달 + 주차 전파 ----
    const order = [];
    const reached = new Set();
    const weekOf = {};
    if (start && sceneExists(scenes, start)) {
      const queue = [{ id: start, week: 0 }];
      reached.add(start);
      while (queue.length) {
        const { id, week } = queue.shift();
        const sc = scenes[id] || {};
        const myWeek = (typeof sc.week === 'number') ? sc.week
          : (sc.effects && typeof sc.effects.week === 'number') ? sc.effects.week
          : week;
        weekOf[id] = myWeek;
        order.push(id);
        outEdges(scenes, sc).forEach(e => {
          const r = resolveTarget(scenes, e.target);
          const real = r.kind === 'ok' ? e.target
            : r.kind === 'runtime' ? (sceneExists(scenes, e.target + '_plain') ? e.target + '_plain' : e.target + '_checked')
            : null;
          if (real && sceneExists(scenes, real) && !reached.has(real)) {
            reached.add(real);
            queue.push({ id: real, week: myWeek });
          }
        });
      }
    }

    // ---- 씬 모델 ----
    const sceneModels = {};
    ids.forEach(id => {
      const sc = scenes[id] || {};
      const type = sc.type || 'scene';
      const week = (id in weekOf) ? weekOf[id] : (typeof sc.week === 'number' ? sc.week : null);
      const grp = weekLabel(week, type);
      const edges = outEdges(scenes, sc);
      const badges = [];
      if (id === start) badges.push('시작');
      if (!reached.has(id) && id !== start) badges.push('고아');
      const hasExit = edges.length > 0;
      if (!hasExit && !TERMINAL_TYPES.includes(type) && type !== 'map') badges.push('막다른');
      if (type === 'end') badges.push('엔딩');
      if (sc.secret) badges.push('비밀');

      sceneModels[id] = {
        id, type, week, group: grp,
        header: sc.header || '', speaker: sc.speaker || '',
        image: imageModel(sc.image),
        text: sc.text || sc.sub || sc.big || '',
        edges, deltas: collectDeltas(sc), badges,
      };
    });

    // ---- 그룹 묶기(도달 순서 우선, 미도달은 뒤에) ----
    const groupMap = new Map();
    const pushToGroup = id => {
      const m = sceneModels[id];
      const g = m.group;
      if (!groupMap.has(g.key)) groupMap.set(g.key, { key: g.key, label: g.label, scenes: [] });
      groupMap.get(g.key).scenes.push(m);
    };
    order.forEach(pushToGroup);
    ids.filter(id => !reached.has(id)).forEach(pushToGroup);

    const WEEK_ORDER = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'z_end'];
    const groups = [...groupMap.values()].sort(
      (a, b) => (WEEK_ORDER.indexOf(a.key) + 99 * (WEEK_ORDER.indexOf(a.key) < 0)) -
                (WEEK_ORDER.indexOf(b.key) + 99 * (WEEK_ORDER.indexOf(b.key) < 0))
    );

    // ---- 건강검진 ----
    const orphans = ids.filter(id => !reached.has(id) && id !== start);
    const deadends = ids.filter(id => sceneModels[id].badges.includes('막다른'));
    const endings = ids.filter(id => (scenes[id].type === 'end'));
    const reachableEndings = endings.filter(id => reached.has(id));
    const brokenLinks = [];
    const runtimeLinks = [];
    ids.forEach(id => {
      sceneModels[id].edges.forEach(e => {
        if (e.kind === 'broken') brokenLinks.push({ from: id, to: e.target, label: e.label });
        if (e.kind === 'runtime') runtimeLinks.push({ from: id, to: e.target });
      });
    });

    // ---- 플래그/스탯 색인 ----
    const flagIndex = new Map();
    ids.forEach(id => {
      const note = (d) => {
        if (d.kind === 'money' || d.kind === 'misc') return;
        const key = d.kind + ':' + d.name;
        if (!flagIndex.has(key)) flagIndex.set(key, { name: d.name, kind: d.kind, setAt: [] });
        flagIndex.get(key).setAt.push({ scene: id, val: d.val });
      };
      sceneModels[id].deltas.forEach(note);
      sceneModels[id].edges.forEach(e => (e.deltas || []).forEach(note));
    });

    return {
      groups, order,
      health: {
        sceneCount: ids.length,
        start, orphans, deadends,
        endings, reachableEndings,
        brokenLinks, runtimeLinks,
      },
      flags: [...flagIndex.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  root.Atlas = { build };
})(typeof window !== 'undefined' ? window : globalThis);
