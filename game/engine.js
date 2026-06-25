/* ===== 배금도시 — 엔진 =====
   스토리 데이터(window.STORY)를 읽어서 화면에 그린다.
   이 파일은 "한 번 만들고 거의 안 건드림". 스토리는 data/scenes.js 에서 늘린다.

   상태(state):
     player    : 플레이어 이름 등 고정 정보
     progress  : 현재 씬, 턴, 날짜, 주차
     economy   : 시작 현금, 보유금, 빚, 자산
     records   : 향후 랭킹 제출에 쓸 최고 기록
     affection : { 캐릭터키: 숫자 }  호감도
     unlocked  : [앨범에 해금된 그림 id]
============================================================ */

const ENGINE_PARAMS = new URLSearchParams(window.location.search);
const PREVIEW_SCENE = ENGINE_PARAMS.get('preview') || '';
const PREVIEW_MODE = !!PREVIEW_SCENE;
const SAVE_VERSION = 3;
const SAVE_KEY = 'baegeumdosi_save_v2';
const LEGACY_SAVE_KEY = 'baegeumdosi_save_v1';
const STARTING_CASH = 300000;
const MAX_HAPPY = 5;
const START_HAPPY = 0;
const MAX_HISTORY = 50;
const MAX_BRANCH_SAVES = 80;
const MAX_MONEY_CUES = 3;
// assetStore/bankApp 은 화면 안의 버튼(구매하기/확인)으로 직접 진행 → dialogue 중복 방지 위해 제외.
const STOCK_PHONE_SCREENS = new Set(['chatRooms', 'market', 'community', 'orderDecision', 'orderFilled', 'marketResult', 'missedResult', 'ladder', 'casino', 'blackjack', 'wealthHub', 'snsFeed']);
const ENDING_SCENE_CHAINS = {
  e_dirt: ['ed_dirt_room', 'ed_dirt_phone', 'e_dirt'],
  e_han: ['ed_han_still', 'ed_han_phone', 'e_han'],
  e_ruin: ['ed_ruin_phone', 'e_ruin'],
  e_survival: ['ed_survival_gukbap', 'ed_survival_phone', 'e_survival'],
  e_silver: ['ed_silver_gukbap', 'ed_silver_phone', 'e_silver'],
  e_gold: ['ed_gold_rich', 'ed_gold_phone', 'e_gold'],
};
const story = window.STORY;

const els = {
  hdr: document.getElementById('hdr'),
  stage: document.getElementById('stage'),
};

if (PREVIEW_MODE) {
  document.documentElement.classList.add('preview-mode');
  document.body.classList.add('preview-mode');
}

els.stage.addEventListener('phone:action', handlePhoneAction);

let state = initialState();
let renderToken = 0;
let pendingMoneyCues = [];
let lastSaveError = '';

function newGame() {
  return {
    version: SAVE_VERSION,
    player: { name: '' },
    progress: { scene: story.start, turn: 0, day: 1, week: 0 },
    economy: {
      startingCash: STARTING_CASH,
      cash: STARTING_CASH,
      debt: 0,
      assets: 0,
    },
    meters: { happy: START_HAPPY },
    affection: {},
    flags: {},
    unlocked: [],
    history: [],
    branchSaves: {},
    records: {
      bestCash: STARTING_CASH,
      bestNetWorth: STARTING_CASH,
      leaderboardScore: STARTING_CASH,
    },
  };
}

function initialState() {
  const next = newGame();
  if (!PREVIEW_MODE) return next;

  next.player.name = ENGINE_PARAMS.get('name') || '김특붕';
  next.progress.scene = PREVIEW_SCENE;
  applyPreviewOverrides(next);
  next.progress.scene = remapSceneId(next.progress.scene, next);

  const sc = story.scenes[next.progress.scene];
  if (sc && typeof sc.week === 'number') next.progress.week = sc.week;
  return next;
}

function applyPreviewOverrides(target) {
  const happy = ENGINE_PARAMS.get('happy');
  if (happy != null) target.meters.happy = clampHappy(happy);

  const cash = ENGINE_PARAMS.get('cash');
  if (cash != null && !Number.isNaN(Number(cash))) target.economy.cash = Number(cash);

  const appearance = ENGINE_PARAMS.get('appearance');
  if (appearance) target.flags.appearance = appearance;

  ENGINE_PARAMS.forEach((value, key) => {
    if (key.startsWith('flag.')) target.flags[key.slice(5)] = parsePreviewValue(value);
    if (key.startsWith('affection.')) target.affection[key.slice(10)] = Number(value) || 0;
  });
}

function parsePreviewValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function normalizeState(raw) {
  const next = newGame();
  if (!raw || typeof raw !== 'object') return next;

  if (raw.version >= 2) {
    next.player = { ...next.player, ...(raw.player || {}) };
    next.progress = { ...next.progress, ...(raw.progress || {}) };
    next.economy = { ...next.economy, ...(raw.economy || {}) };
    next.meters = { happy: normalizeHappy(raw) };
    next.affection = { ...(raw.affection || {}) };
    next.flags = { ...(raw.flags || {}) };
    next.unlocked = Array.isArray(raw.unlocked) ? [...raw.unlocked] : [];
    next.history = Array.isArray(raw.history) ? raw.history.slice(-MAX_HISTORY) : [];
    next.branchSaves = normalizeBranchSaves(raw.branchSaves);
    next.records = { ...next.records, ...(raw.records || {}) };
    next.progress.scene = remapSceneId(next.progress.scene, next);
    migrateSeedMoney(next, raw.version || 0);
    return next;
  }

  next.player.name = raw.name || '';
  next.progress.scene = raw.scene || story.start;
  next.progress.week = Number(raw.week || 0);
  next.affection = { ...(raw.affection || {}) };
  next.unlocked = Array.isArray(raw.unlocked) ? [...raw.unlocked] : [];
  next.branchSaves = normalizeBranchSaves(raw.branchSaves);
  next.progress.scene = remapSceneId(next.progress.scene, next);
  migrateSeedMoney(next, raw.version || 0);
  updateRecords(next);
  return next;
}

function normalizeHappy(raw) {
  const rawHappy = raw && raw.meters && typeof raw.meters.happy === 'number'
    ? raw.meters.happy
    : START_HAPPY;
  if (raw && raw.version >= 3) return clampHappy(rawHappy);

  // v2까지는 기본 행복도가 3이라, 기존 저장은 0 기준으로 낮춰서 보정한다.
  return clampHappy(Math.max(0, rawHappy - 3));
}

function migrateSeedMoney(target, version) {
  if (!target || version >= 3) return;
  const flags = target.flags || {};
  const scene = target.progress && target.progress.scene ? target.progress.scene : '';
  const week = Number(target.progress && target.progress.week || 0);
  const alreadyDecided = flags.first_loan === true || Number(target.economy.debt || 0) > 0;
  const progressedPastIntro = week >= 2 || /^w[2-5]/.test(scene) || /^ed_/.test(scene) || /^e_/.test(scene);
  const tinyEconomy = Number(target.economy.cash || 0) < 10000000
    && Number(target.economy.assets || 0) < 10000000;

  if (progressedPastIntro && !alreadyDecided && tinyEconomy) {
    target.economy.cash = Number(target.economy.cash || 0) + 30000000;
    target.economy.debt = Number(target.economy.debt || 0) + 42000000;
    target.flags = {
      ...flags,
      first_loan: true,
      seed_money: 'loan_migrated',
      loan_resisted: false,
      pressure: true,
    };
  }
}

function currentScene() {
  return state.progress.scene || story.start;
}

function setScene(id) {
  state.progress.scene = remapSceneId(id || story.start, state);
}

function remapSceneId(id, target = state) {
  const flags = (target && target.flags) || {};
  // 분기 조건은 data/branches.js 한 곳에만 둔다(흐름도·검증기와 공유). 여기선 적용만.
  return remapBranch(id, flags, target);
}

function playerName() {
  return state.player.name || '';
}

function setPlayerName(name) {
  state.player.name = name || '';
}

function clampHappy(value) {
  return Math.max(0, Math.min(MAX_HAPPY, Number(value || 0)));
}

function netWorth(target = state) {
  const economy = target.economy || {};
  return Number(economy.cash || 0) + Number(economy.assets || 0) - Number(economy.debt || 0);
}

function leaderboardScore(target = state) {
  return Math.max(0, Math.round(netWorth(target)));
}

function updateRecords(target = state) {
  const economy = target.economy || {};
  target.records = target.records || {};
  target.records.bestCash = Math.max(Number(target.records.bestCash || 0), Number(economy.cash || 0));
  target.records.bestNetWorth = Math.max(Number(target.records.bestNetWorth || 0), netWorth(target));
  target.records.leaderboardScore = Math.max(Number(target.records.leaderboardScore || 0), leaderboardScore(target));
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatUnitMoney(value) {
  const abs = Math.abs(Math.round(Number(value || 0)));
  if (abs >= 100000000) {
    const unit = abs / 100000000;
    return `${Number.isInteger(unit) ? unit.toLocaleString('ko-KR') : Number(unit.toFixed(1)).toLocaleString('ko-KR')}억`;
  }
  if (abs >= 10000) {
    const unit = abs / 10000;
    return `${Number.isInteger(unit) ? unit.toLocaleString('ko-KR') : Math.round(unit).toLocaleString('ko-KR')}만원`;
  }
  return '';
}

function formatWonEok(value) {
  const num = Number(value || 0);
  const abs = Math.abs(Math.round(num));
  const sign = num < 0 ? '-' : '';
  const unit = formatUnitMoney(abs);
  return `${sign}${formatMoney(abs)}원${unit ? ` (${unit})` : ''}`;
}

function formatSignedMoney(value) {
  const num = Number(value || 0);
  const sign = num >= 0 ? '+' : '-';
  return `${sign}${formatWonEok(Math.abs(num))}`;
}

function formatCompactMoney(value) {
  const num = Number(value || 0);
  const abs = Math.abs(num);
  if (abs >= 100000000) return `${Number((num / 100000000).toFixed(1)).toLocaleString('ko-KR')}억`;
  if (abs >= 10000) return `${Math.round(num / 10000).toLocaleString('ko-KR')}만원`;
  return `${formatMoney(num)}원`;
}

function queueMoneyCue(delta, label) {
  const amount = Number(delta || 0);
  if (!Number.isFinite(amount) || amount === 0) return;
  pendingMoneyCues.push({
    amount,
    label: label || (amount > 0 ? '입금' : '출금'),
  });
  if (pendingMoneyCues.length > MAX_MONEY_CUES) {
    pendingMoneyCues = pendingMoneyCues.slice(-MAX_MONEY_CUES);
  }
}

function moneyCueHTML() {
  if (!pendingMoneyCues.length) return '';
  const cues = pendingMoneyCues.splice(0);
  return `<div class="money-cues" aria-live="polite">`
    + cues.map(cue => {
      const tone = cue.amount > 0 ? 'plus' : 'minus';
      return `<div class="money-cue ${tone}">
        <span class="money-cue-label">${escapeHTML(cue.label)}</span>
        <span class="money-cue-amount">${escapeHTML(formatSignedMoney(cue.amount))}</span>
      </div>`;
    }).join('')
    + `</div>`;
}

function happyGaugeHTML() {
  const happy = clampHappy(state.meters && state.meters.happy);
  const low = happy <= 1 ? ' low' : '';
  const cells = Array.from({ length: MAX_HAPPY }, (_, i) =>
    `<i class="${i < happy ? 'on' : ''}"></i>`).join('');
  return `<span class="happy-meter${low}" aria-label="행복 ${happy}/${MAX_HAPPY}">
    <span class="happy-label">행복</span><span class="happy-cells">${cells}</span>
  </span>`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

/* ---------- 저장/불러오기 ---------- */
function save() {
  if (PREVIEW_MODE) return true;
  try {
    updateRecords();
    captureBranchSave();
    pruneBranchSaves();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    lastSaveError = '';
    return true;
  } catch (e) {
    try {
      pruneBranchSaves(Math.max(20, Math.floor(MAX_BRANCH_SAVES / 2)));
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      lastSaveError = '';
      return true;
    } catch (retryError) {
      lastSaveError = retryError && retryError.message ? retryError.message : 'save failed';
      return false;
    }
  }
}
function clearSave() {
  if (PREVIEW_MODE) return;
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_SAVE_KEY);
  } catch (e) {}
}
function loadSave() {
  if (PREVIEW_MODE) return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch (e) { return null; }
}
function hasSave() {
  if (PREVIEW_MODE) return false;
  const s = loadSave();
  return !!(s && s.progress && s.progress.scene && s.progress.scene !== story.start);
}

function normalizeBranchSaves(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const scene in raw) {
    const item = raw[scene];
    if (!item || typeof item !== 'object' || !item.snapshot) continue;
    out[scene] = {
      scene: item.scene || scene,
      label: item.label || scene,
      week: Number(item.week || 0),
      branch: item.branch || '',
      ending: item.ending || '',
      at: Number(item.at || 0),
      snapshot: item.snapshot,
    };
  }
  return out;
}

function restoreSnapshotData(sceneId = currentScene()) {
  return {
    version: SAVE_VERSION,
    player: { ...state.player },
    progress: { ...state.progress, scene: sceneId },
    economy: { ...state.economy },
    meters: { ...state.meters },
    affection: { ...state.affection },
    flags: { ...state.flags },
    unlocked: Array.isArray(state.unlocked) ? [...state.unlocked] : [],
    records: { ...state.records },
  };
}

function endingForScene(sceneId) {
  for (const ending in ENDING_SCENE_CHAINS) {
    if (ENDING_SCENE_CHAINS[ending].includes(sceneId)) return ending;
  }
  return '';
}

function captureBranchSave(sceneId = currentScene()) {
  const sc = story.scenes[sceneId];
  if (!sc) return;
  state.branchSaves = state.branchSaves || {};
  const snapshot = restoreSnapshotData(sceneId);
  state.branchSaves[sceneId] = {
    scene: sceneId,
    label: sc.header || sc.big || sceneId,
    week: Number(snapshot.progress.week || 0),
    branch: snapshot.flags.branch || '',
    ending: endingForScene(sceneId),
    at: Date.now(),
    snapshot,
  };
}

function pruneBranchSaves(limit = MAX_BRANCH_SAVES) {
  const saves = state.branchSaves || {};
  const entries = Object.entries(saves);
  if (entries.length <= limit) return;

  const current = currentScene();
  const keep = new Set([current]);
  entries
    .sort((a, b) => Number(a[1].at || 0) - Number(b[1].at || 0))
    .slice(-limit)
    .forEach(([scene]) => keep.add(scene));

  const next = {};
  entries.forEach(([scene, item]) => {
    if (keep.has(scene)) next[scene] = item;
  });
  state.branchSaves = next;
}

/* ---------- 텍스트 치환: {이름} -> 플레이어 이름 ---------- */
function fill(text) {
  if (!text) return '';
  return text.replace(/\{이름\}/g, playerName() || '플레이어');
}

/* ---------- 호감도 -> 관계 라벨 ---------- */
function relationLabel(key) {
  const v = state.affection[key] || 0;
  if (v >= 6) return '연인';
  if (v >= 4) return '호감';
  if (v >= 2) return '관심';
  if (v <= -2) return '냉랭';
  return '';
}

/* ---------- 이미지 칸 그리기 (실제 파일 or placeholder) ---------- */
function isLayeredImage(img) {
  return !!(img && typeof img === 'object' && img.background);
}

function stagedImageTextDelay(img) {
  if (!isLayeredImage(img)) return 0;
  return Number(img.textDelay ?? 420);
}

function cssVar(name, value) {
  return value == null ? '' : `--${name}:${escapeHTML(value)}`;
}

function imageBlock(img) {
  // img 가 문자열이면 실제 파일 경로, 객체면 {placeholder:'설명'} 또는 레이어 이미지.
  if (typeof img === 'string') {
    return `<div class="scene-img has-art is-loading" style="--scene-art:url('${escapeHTML(img)}')">
      <img src="${escapeHTML(img)}" alt="" data-missing="${escapeHTML('이미지 없음: ' + img)}">
      <div class="scene-loader" aria-hidden="true"></div>
    </div>`;
  }
  if (isLayeredImage(img)) {
    const character = img.character || null;
    const banner = img.banner || null;
    const classes = ['scene-img', 'has-art', 'layered-art'];
    if (character && img.revealCharacter !== false) classes.push('reveal-character');
    if (character && img.revealCharacter === false) classes.push('character-shown');
    if (banner) classes.push('has-news-banner');

    const style = [
      `--scene-art:url('${escapeHTML(img.background)}')`,
      cssVar('scene-bg-position', img.backgroundPosition),
      cssVar('scene-bg-scale', img.backgroundScale),
      cssVar('scene-bg-fit', img.backgroundFit || img.fit),
      cssVar('character-left', img.characterLeft),
      cssVar('character-bottom', img.characterBottom),
      cssVar('character-width', img.characterWidth),
      cssVar('character-max-height', img.characterMaxHeight),
      cssVar('character-shift-y', img.characterShiftY),
    ].filter(Boolean).join(';');
    const delay = Number(img.characterDelay ?? 180);
    const characterHTML = character
      ? `<img class="scene-character" src="${escapeHTML(character)}" alt="" data-missing="${escapeHTML('이미지 없음: ' + character)}">`
      : '';
    const bannerHTML = banner
      ? `<div class="scene-news-banner" aria-label="${escapeHTML(banner.kicker || '경제 뉴스')}">
          <div class="scene-news-kicker">${escapeHTML(banner.kicker || '경제 속보')}</div>
          <div class="scene-news-headline">${escapeHTML(banner.headline || '')}</div>
          ${banner.sub ? `<div class="scene-news-sub">${escapeHTML(banner.sub)}</div>` : ''}
          ${banner.ticker ? `<div class="scene-news-ticker">${escapeHTML(banner.ticker)}</div>` : ''}
        </div>`
      : '';

    return `<div class="${classes.join(' ')} is-loading" style="${style}" data-character-delay="${escapeHTML(delay)}">
      <img class="scene-bg" src="${escapeHTML(img.background)}" alt="" data-missing="${escapeHTML('이미지 없음: ' + img.background)}">
      ${characterHTML}
      ${bannerHTML}
      <div class="scene-loader" aria-hidden="true"></div>
    </div>`;
  }
  if (img && img.placeholder) {
    return `<div class="scene-img">${phHTML(img.placeholder)}</div>`;
  }
  return `<div class="scene-img" style="background:#000"></div>`;
}
function bindImageFallbacks() {
  els.stage.querySelectorAll('img[data-missing]').forEach(img => {
    img.onerror = () => {
      const wrap = img.closest('.scene-img');
      img.parentNode.innerHTML = phHTML(img.dataset.missing || '이미지 없음');
      if (wrap) wrap.classList.remove('is-loading');
    };
  });
  // 메인 이미지가 실제로 도착하면 로딩 스피너를 끄고 부드럽게 페이드인.
  els.stage.querySelectorAll('.scene-img.is-loading').forEach(wrap => {
    const main = wrap.querySelector('.scene-bg') || wrap.querySelector('img');
    if (!main) { wrap.classList.remove('is-loading'); return; }
    const done = () => wrap.classList.remove('is-loading');
    if (main.complete && main.naturalWidth > 0) done();       // 이미 캐시됨(프리로드 덕분)
    else main.addEventListener('load', done, { once: true });
  });
}

/* ---------- 이미지 사전 로딩: 다음에 갈 씬 그림을 미리 받아둔다 ---------- */
const preloadCache = new Map();
function preloadImage(url) {
  if (!url || preloadCache.has(url)) return;
  const im = new Image();
  im.src = url;
  preloadCache.set(url, im);
}
function sceneImageUrls(sc) {
  const img = sc && sc.image;
  if (typeof img === 'string') return [img];
  if (img && typeof img === 'object') return [img.background, img.character].filter(Boolean);
  return [];
}
function preloadUpcoming(sc) {
  if (!sc) return;
  const ids = new Set();
  if (sc.next) ids.add(sc.next);
  [
    ...(Array.isArray(sc.choices) ? sc.choices : []),
    ...((sc.phone && Array.isArray(sc.phone.choices)) ? sc.phone.choices : []),
  ].forEach(ch => { if (ch && ch.next) ids.add(ch.next); });
  ids.forEach(id => {
    const target = story.scenes[remapSceneId(id, state)];
    if (target) sceneImageUrls(target).forEach(preloadImage);
  });
}
function phHTML(label) {
  return `<div class="ph"><div class="ph-icon">미술 슬롯</div>`
    + `<div class="ph-label">${label}</div>`
    + `<div class="ph-hint">여기에 AI 그림 파일을 넣으면 자동 교체</div></div>`;
}

/* ================= 렌더러 ================= */
function render() {
  renderToken += 1;
  const sc = story.scenes[currentScene()];
  if (!sc) {
    els.stage.innerHTML = `<div class="card-screen"><div class="card-sub">씬을 찾을 수 없음: ${currentScene()}</div></div>`;
    return;
  }
  renderHeader(sc);

  const type = sc.type || 'scene';
  ({
    title: renderTitle,
    create: renderCreate,
    card: renderCard,
    scene: renderScene,
    end: renderEnd,
    album: renderAlbum,
    map: renderMap,
  }[type] || renderScene)(sc);

  bindImageFallbacks();
  preloadUpcoming(sc);
  if (window.PhoneWidget) PhoneWidget.bind(els.stage, sc, state);

  const mapBtn = els.hdr.querySelector('[data-act="map"]');
  if (mapBtn) mapBtn.onclick = () => { openMapOverlay(save()); };
}

function renderHeader(sc) {
  const title = fill(sc.header || '');
  if (!title) {
    els.hdr.textContent = '';
    return;
  }

  const type = sc.type || 'scene';
  if (type === 'title' || type === 'create' || type === 'album' || sc.hideStats) {
    els.hdr.textContent = title;
    return;
  }

  const moneyClass = pendingMoneyCues.length ? ' money-bump' : '';
  els.hdr.innerHTML = `
    <span class="hdr-title">${escapeHTML(title)}</span>
    <span class="hdr-stats">
      <span class="money-stat${moneyClass}">돈 ${formatCompactMoney(state.economy.cash)}</span>
      ${happyGaugeHTML()}
      <button class="map-btn" data-act="map">${PREVIEW_MODE ? '지도' : '세이브'}</button>
    </span>`;
}

/* --- 타이틀 --- */
function renderTitle(sc) {
  els.hdr.textContent = '';
  const labels = sc.buttons || {};
  const hasBg = typeof sc.image === 'string';
  const bgStyle = hasBg ? ` style="--title-bg: url('${sc.image}')"` : '';
  const bgClass = hasBg ? ' has-bg' : '';
  const art = hasBg ? '' : `<div class="title-art">${sc.image ? imageBlock(sc.image) : phHTML('타이틀 일러스트\n(거울 보는 한서기 등)')}</div>`;
  const cont = hasSave() ? `<button class="title-btn" data-act="continue"><span>${labels.continue || '이어하기'}</span></button>` : '';
  els.stage.innerHTML = `
    <div class="title-screen${bgClass}"${bgStyle}>
      ${art}
      <div class="title-copy">
        ${sc.kicker ? `<div class="title-kicker">${fill(sc.kicker)}</div>` : ''}
        <h1 class="title-name">${fill(sc.title || story.meta.title)}</h1>
        ${sc.subtitle ? `<div class="title-subtitle">${fill(sc.subtitle)}</div>` : ''}
      </div>
      <div class="title-buttons">
        ${cont}
        <button class="title-btn primary" data-act="start"><span>${labels.start || '시작하기'}</span></button>
        <button class="title-btn" data-act="records"><span>${labels.records || labels.album || '진행 분기'}</span></button>
      </div>
    </div>`;
  els.stage.querySelector('[data-act="start"]').onclick = () => {
    state = newGame();
    setScene(sc.next || 'create');
    save();
    render();
  };
  const c = els.stage.querySelector('[data-act="continue"]');
  if (c) c.onclick = () => {
    const loaded = loadSave();
    if (!loaded) return;
    state = loaded;
    save();
    render();
  };
  els.stage.querySelector('[data-act="records"]').onclick = () => {
    const loaded = loadSave();
    if (loaded) state = loaded;
    openMapOverlay();
  };
}

/* --- 캐릭터 생성 --- */
function renderCreate(sc) {
  els.hdr.textContent = '';
  els.stage.innerHTML = `
    <button class="help-btn" id="helpBtn">?</button>
    <div class="create-screen">
      <div class="create-title">${sc.title || '캐릭터 생성'}</div>
      <div class="create-field">
        <label>성</label>
        <input id="famName" placeholder="${sc.defaultFamily || '한'}" value="${sc.defaultFamily || '한'}" maxlength="6">
      </div>
      <div class="create-field">
        <label>이름</label>
        <input id="givenName" placeholder="${sc.defaultGiven || '서기'}" value="${sc.defaultGiven || '서기'}" maxlength="8">
      </div>
      <button class="create-go" id="createGo">시작하기</button>
    </div>`;
  document.getElementById('helpBtn').onclick = () =>
    alert(sc.help || '이름을 정하면 게임 속 주인공이 그 이름으로 불립니다.');
  document.getElementById('createGo').onclick = () => {
    const fam = document.getElementById('famName').value.trim() || (sc.defaultFamily || '한');
    const giv = document.getElementById('givenName').value.trim() || (sc.defaultGiven || '서기');
    setPlayerName(fam + giv);
    setScene(sc.next);
    save();
    render();
  };
}

/* --- 검은 타이틀 카드 (프롤로그 등) --- */
function renderCard(sc) {
  els.stage.innerHTML = `
    <div class="card-screen" id="cardScreen">
      <div class="card-big">${fill(sc.big || '')}</div>
      ${sc.sub ? `<div class="card-sub">${fill(sc.sub)}</div>` : ''}
      <div class="card-tap">(터치로 진행)</div>
    </div>`;
  document.getElementById('cardScreen').onclick = () => advance(sc);
}

/* --- 일반 씬 (대사 / 선택지) --- */
function renderScene(sc) {
  const rel = sc.relationOf ? relationLabel(sc.relationOf) : '';
  const relSpan = rel ? `<span class="relation">${rel}</span>`
                 : (sc.relationText ? `<span class="relation">${fill(sc.relationText)}</span>` : '');

  let bottom;
  const choices = visibleChoices(sc);
  if (choices.length) {
    bottom = `<div class="tap-hint tap-hint-hidden choice-next-hint">(터치로 선택)</div>`
      + `<div class="choices choices-hidden">` + choices.map(({ ch, i }) =>
      `<button class="choice-btn${isDesperateChoice(ch) ? ' desperate-choice' : ''}" data-source="${ch.source}" data-i="${i}">${fill(ch.label)}</button>`).join('') + `</div>`;
  } else if (sc.next) {
    bottom = `<div class="tap-hint tap-hint-hidden">(터치로 진행)</div>`;
  } else {
    bottom = '';
  }

  const hasTextBox = !!(sc.speaker || sc.text || bottom);
  const textDelay = stagedImageTextDelay(sc.image);
  const textClass = textDelay ? 'scene-text scene-text-delayed' : 'scene-text';
  const textStyle = textDelay ? ` style="--text-delay:${textDelay}ms"` : '';
  const moneyCues = hasTextBox ? moneyCueHTML() : '';
  const textBox = hasTextBox ? `
    <div class="${textClass}"${textStyle}>
      ${sc.speaker ? `<div class="speaker">${fill(sc.speaker)}${relSpan}</div>` : ''}
      ${moneyCues}
      <div class="dialogue">${fill(sc.text || '')}</div>
      ${bottom}
    </div>` : '';

  els.stage.innerHTML = `
    ${imageBlock(sc.image)}
    ${textBox}`;

  const flow = bindDialogueFlow(sc, choices.length > 0, renderToken);

  if (choices.length) {
    els.stage.querySelectorAll('.choice-btn').forEach(btn => {
      btn.onclick = () => {
        const list = btn.dataset.source === 'phone'
          ? ((sc.phone && sc.phone.choices) || [])
          : (sc.choices || []);
        const ch = list[+btn.dataset.i];
        commitTransition(ch, { countTurn: btn.dataset.source !== 'phone' });
      };
    });
    const textEl = els.stage.querySelector('.scene-text');
    if (textEl) textEl.onclick = event => {
      if (!event.target.closest('.choice-btn') && flow && !flow.isChoicePage()) flow.showChoicePage();
    };
    els.stage.querySelector('.scene-img').onclick = () => {
      if (flow && !flow.isChoicePage()) flow.showChoicePage();
    };
  } else if (sc.next) {
    const textEl = els.stage.querySelector('.scene-text');
    const goNext = () => {
      if (flow && !flow.isDone()) {
        flow.finish();
        return;
      }
      advance(sc);
    };
    if (textEl) textEl.onclick = goNext;
    els.stage.querySelector('.scene-img').onclick = goNext;
  }
}

function bindDialogueFlow(sc, hasChoices = false, token = renderToken) {
  const dialogue = els.stage.querySelector('.dialogue');
  const choices = els.stage.querySelector('.choices');
  const hint = els.stage.querySelector('.tap-hint');
  const fullText = dialogue ? dialogue.textContent : '';
  const shouldType = !!(dialogue && fullText && sc.typewriter !== false);
  let done = !shouldType;
  let choicePage = false;
  let index = 0;
  let timer = null;

  function revealAfterText() {
    if (!hasChoices && choices) choices.classList.remove('choices-hidden');
    if (hint) hint.classList.remove('tap-hint-hidden');
  }

  function finish() {
    if (timer) clearTimeout(timer);
    if (dialogue) {
      dialogue.textContent = fullText;
      dialogue.classList.remove('dialogue-typing');
    }
    done = true;
    revealAfterText();
    revealSceneCharacter(token);
  }

  function showChoicePage() {
    finish();
    if (!hasChoices) return;
    const textBox = els.stage.querySelector('.scene-text');
    if (textBox) textBox.classList.add('scene-text-choice-only');
    if (hint) hint.classList.add('tap-hint-hidden');
    if (choices) choices.classList.remove('choices-hidden');
    choicePage = true;
  }

  if (!shouldType) {
    revealAfterText();
    revealSceneCharacter(token);
    return { isDone: () => true, isChoicePage: () => choicePage, finish, showChoicePage };
  }

  dialogue.textContent = '';
  dialogue.classList.add('dialogue-typing');
  const baseSpeed = Number(sc.typeSpeed || (story.meta && story.meta.typeSpeed) || 18);

  function step() {
    if (index >= fullText.length) {
      finish();
      return;
    }
    const ch = fullText[index++];
    dialogue.textContent += ch;
    const pause = ch === '\n' ? baseSpeed * 5 : /[.!?。！？…]/.test(ch) ? baseSpeed * 7 : baseSpeed;
    timer = setTimeout(step, pause);
  }

  const textDelay = stagedImageTextDelay(sc.image);
  const startDelay = Number(sc.typeDelay ?? (textDelay ? textDelay + 160 : 120));
  timer = setTimeout(step, startDelay);
  return { isDone: () => done, isChoicePage: () => choicePage, finish, showChoicePage };
}

function revealSceneCharacter(token) {
  const layer = els.stage.querySelector('.scene-img.reveal-character');
  if (!layer || layer.classList.contains('character-shown') || layer.dataset.characterRevealQueued) return;
  layer.dataset.characterRevealQueued = '1';

  const show = () => {
    if (token !== renderToken) return;
    layer.classList.add('character-shown');
  };
  const delay = Number(layer.dataset.characterDelay || 0);
  if (delay > 0) window.setTimeout(show, delay);
  else show();
}

function visibleChoices(sc) {
  const sceneChoices = Array.isArray(sc.choices) ? sc.choices : [];
  const phoneChoices = stockPhoneChoicesInDialogue(sc) ? sc.phone.choices : [];
  return [
    ...sceneChoices.map((ch, i) => ({ ch: { ...ch, source: 'scene' }, i })),
    ...phoneChoices.map((ch, i) => ({ ch: { ...ch, source: 'phone' }, i })),
  ].filter(({ ch }) => isChoiceVisible(ch));
}

function stockPhoneChoicesInDialogue(sc) {
  const phone = sc && sc.phone;
  if (!phone || !Array.isArray(phone.choices) || !phone.choices.length) return false;
  const firstScreen = phone.screen || (Array.isArray(phone.sequence) && phone.sequence[0]) || '';
  return STOCK_PHONE_SCREENS.has(firstScreen);
}

function isChoiceVisible(ch) {
  const req = ch.requires || ch.when;
  if (!req) return true;

  const happy = clampHappy(state.meters && state.meters.happy);
  const happyMax = req.happyAtMost ?? req.happyLte ?? req.maxHappy;
  if (typeof happyMax === 'number' && happy > happyMax) return false;

  const flagReq = req.flags || {};
  for (const key in flagReq) {
    if (state.flags[key] !== flagReq[key]) return false;
  }

  const missingFlags = req.missingFlags || req.flagsMissing || [];
  const missingList = Array.isArray(missingFlags) ? missingFlags : Object.keys(missingFlags);
  for (const key of missingList) {
    if (Object.prototype.hasOwnProperty.call(state.flags, key)) return false;
  }

  return true;
}

function isDesperateChoice(ch) {
  const req = ch.requires || ch.when || {};
  return !!(ch.desperate || ch.rage || ch.extreme || typeof req.happyAtMost === 'number' || typeof req.happyLte === 'number');
}

/* --- 엔딩 카드 --- */
function renderEnd(sc) {
  const happy = clampHappy(state.meters && state.meters.happy);
  const cash = formatWonEok(state.economy.cash);
  const worth = formatWonEok(netWorth());
  els.stage.innerHTML = `
    <div class="card-screen" id="endScreen">
      <div class="card-big">${fill(sc.big || 'THE END')}</div>
      ${sc.sub ? `<div class="card-sub">${fill(sc.sub)}</div>` : ''}
      <div class="card-final">
        <div class="card-final-title">최종 상태</div>
        <div class="card-final-row"><span>행복도</span><b>${happy}/${MAX_HAPPY}</b></div>
        <div class="card-final-row"><span>현금</span><b>${escapeHTML(cash)}</b></div>
        <div class="card-final-row"><span>순자산</span><b>${escapeHTML(worth)}</b></div>
      </div>
      <div class="card-tap">(터치하면 타이틀로)</div>
    </div>`;
  document.getElementById('endScreen').onclick = () => {
    state = newGame();
    clearSave();
    render();
  };
}

/* --- 앨범 --- */
function renderAlbum() {
  els.hdr.textContent = '앨범';
  const items = story.album || [];
  const cells = items.map(it => {
    const open = state.unlocked.includes(it.id);
    return `<div class="album-cell ${open ? '' : 'locked'}">${open ? it.name : '잠김'}</div>`;
  }).join('');
  els.stage.innerHTML = `
    <div class="album-screen">
      <div class="album-grid">${cells || '<div class="album-cell locked">아직 없음</div>'}</div>
      <button class="back-btn" id="albumBack">← 돌아가기</button>
    </div>`;
  document.getElementById('albumBack').onclick = () => { setScene(story.start); render(); };
}

/* --- 분기맵 (이름 정한 직후 + 세이브 버튼) --- */
function reachedSceneSet() {
  const reached = new Set([currentScene()]);
  (state.history || []).forEach(item => {
    if (item.from) reached.add(item.from);
    if (item.next) reached.add(item.next);
  });
  Object.keys(state.branchSaves || {}).forEach(scene => reached.add(scene));
  return reached;
}

function latestSavedScene(scenes) {
  let best = null;
  const saves = state.branchSaves || {};
  scenes.forEach(scene => {
    const item = saves[scene];
    if (item && (!best || Number(item.at || 0) >= Number(best.at || 0))) best = item;
  });
  return best && best.scene;
}

function latestReachedScene(scenes, reached) {
  for (let i = scenes.length - 1; i >= 0; i -= 1) {
    if (reached.has(scenes[i])) return scenes[i];
  }
  return '';
}

function nodeCheckpointScene(node, reached) {
  if (node.ending) {
    const chain = ENDING_SCENE_CHAINS[node.ending] || [node.ending];
    return latestSavedScene(chain) || latestReachedScene(chain, reached);
  }

  const saves = Object.values(state.branchSaves || {})
    .filter(item => Number(item.week || 0) === Number(node.week || 0))
    .filter(item => !node.branch || item.branch === node.branch)
    .filter(item => !item.ending)
    .sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
  if (saves.length) return saves[0].scene;

  if (node.checkpoint && Number(node.week || 0) <= Number(state.progress.week || 0)) {
    return remapSceneId(node.checkpoint, state);
  }

  return '';
}

function isCurrentEnding(node) {
  if (!node.ending) return false;
  const chain = ENDING_SCENE_CHAINS[node.ending] || [node.ending];
  return chain.includes(currentScene());
}

function restoreMapCheckpoint(sceneId) {
  sceneId = remapSceneId(sceneId, state);
  if (!sceneId || !story.scenes[sceneId]) return;
  const keepBranchSaves = { ...(state.branchSaves || {}) };
  const keepHistory = Array.isArray(state.history) ? [...state.history] : [];
  const checkpoint = keepBranchSaves[sceneId];

  if (checkpoint && checkpoint.snapshot) {
    state = normalizeState(checkpoint.snapshot);
    state.branchSaves = keepBranchSaves;
    state.history = keepHistory;
  } else {
    state.progress.scene = sceneId;
    const sc = story.scenes[sceneId];
    if (sc && typeof sc.week === 'number') state.progress.week = sc.week;
  }

  save();
  render();
}

function bindMapCheckpointButtons() {
  els.stage.querySelectorAll('[data-map-scene]').forEach(btn => {
    btn.onclick = () => restoreMapCheckpoint(btn.dataset.mapScene);
  });
}

function buildMapHTML(interactive = false) {
  const map = story.branchMap;
  if (!map || !Array.isArray(map.rows)) return '<div class="map-empty">분기 정보 없음</div>';

  const curWeek = Number(state.progress.week || 0);
  const branch = state.flags.branch;
  const curScene = currentScene();
  const reached = reachedSceneSet();

  const rows = map.rows.map(row => {
    const cells = row.map(node => {
      let cls;
      const targetScene = interactive ? nodeCheckpointScene(node, reached) : '';
      if (node.ending) {
        cls = isCurrentEnding(node) ? 'current' : (targetScene ? 'done' : 'locked');
      } else if (node.branch && branch && node.branch !== branch) {
        cls = 'locked off';                       // 안 고른 분기
      } else if (node.week < curWeek) {
        cls = 'done';
      } else if (node.week === curWeek) {
        cls = 'current';
      } else {
        cls = 'locked';
      }
      // 숨겨진 진엔딩은 도달 전까지 ??? 로 가린다
      const reveal = (cls === 'current') || (cls === 'done');
      const label = (node.secret && !reveal) ? '???' : node.label;
      const className = `map-node ${cls}${node.secret ? ' secret' : ''}`;
      if (interactive && targetScene && (cls === 'current' || cls === 'done')) {
        return `<button type="button" class="${className} map-node-btn" data-map-scene="${escapeHTML(targetScene)}">${escapeHTML(label)}</button>`;
      }
      return `<div class="${className}">${escapeHTML(label)}</div>`;
    }).join('');
    return `<div class="map-row">${cells}</div>`;
  }).join('');

  return `<div class="map-tree">${rows}</div>`;
}

function renderMap(sc) {
  els.hdr.textContent = fill(sc.header || '진행 분기');
  const footer = (sc.intro && sc.next)
    ? `<button class="map-go" id="mapGo">시작</button>`
    : `<button class="back-btn" id="mapBack">← 돌아가기</button>`;
  els.stage.innerHTML = `<div class="map-screen">${buildMapHTML()}${footer}</div>`;
  const go = document.getElementById('mapGo');
  if (go) go.onclick = () => advance(sc);
  const back = document.getElementById('mapBack');
  if (back) back.onclick = () => render();
}

// 세이브 버튼에서 여는 오버레이 (현재 씬은 그대로, 돌아가기로 복귀)
function openMapOverlay(saveOk = true) {
  els.hdr.textContent = saveOk ? '진행 분기 · 저장됨' : '진행 분기 · 저장 실패';
  const saveWarning = saveOk ? '' : `<div class="map-save-warning">저장 공간을 정리한 뒤 다시 세이브해 주세요.${lastSaveError ? ` ${escapeHTML(lastSaveError)}` : ''}</div>`;
  els.stage.innerHTML = `<div class="map-screen">${buildMapHTML(true)}`
    + `${saveWarning}<button class="back-btn" id="mapBack">← 돌아가기</button></div>`;
  bindMapCheckpointButtons();
  document.getElementById('mapBack').onclick = () => render();
}

/* ---------- 공통 동작 ---------- */
function advance(sc) {
  commitTransition(sc, { countTurn: false });
}

function commitTransition(node, options = {}) {
  if (!node || !node.next) return;

  const from = currentScene();
  const turnDelta = turnDeltaFor(node, !!options.countTurn);

  applyEffects(node);
  if (turnDelta) state.progress.turn += turnDelta;

  setScene(node.next);
  // node.next 는 가상 허브일 수 있으므로, remap 된 실제 도착 씬의 효과를 적용한다.
  const arrived = currentScene();
  applyEffects(story.scenes[arrived]);
  recordHistory({
    from,
    next: arrived,
    label: node.label || '',
    turnDelta,
  });
  save();
  render();
}

function turnDeltaFor(node, countTurn) {
  const effects = node.effects || {};
  if (typeof effects.turn === 'number') return effects.turn;
  if (typeof node.turn === 'number') return node.turn;
  return countTurn ? 1 : 0;
}

function recordHistory(entry) {
  state.history.push({
    ...entry,
    turn: state.progress.turn,
    cash: state.economy.cash,
    happy: clampHappy(state.meters && state.meters.happy),
    netWorth: netWorth(),
    at: Date.now(),
  });
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
}

function applyEffects(node) {
  if (!node) return;
  if (node.set) {
    applyAffection(node.set);
  }

  const effects = node.effects || {};
  if (effects.affection) applyAffection(effects.affection);
  if (effects.flag) applyFlags(effects.flag);
  if (effects.flags) applyFlags(effects.flags);
  if (effects.stockSkip) applyStockSkip(effects.stockSkip);
  if (effects.stockBuyAll) applyStockBuyAll(effects.stockBuyAll);
  if (effects.stockResult) applyStockResult(effects.stockResult);
  if (effects.cashAllInWin) applyCashAllInWin(effects.cashAllInWin);
  if (effects.cashAllInLoss) applyCashAllInLoss(effects.cashAllInLoss);

  applyEconomyDelta('cash', effects.cash);
  applyEconomyDelta('debt', effects.debt);
  applyEconomyDelta('assets', effects.assets);
  applyHappyDelta(effects.happy);
  if (effects.economy) {
    applyEconomyDelta('cash', effects.economy.cash);
    applyEconomyDelta('debt', effects.economy.debt);
    applyEconomyDelta('assets', effects.economy.assets);
  }
  if (effects.meters) {
    applyHappyDelta(effects.meters.happy);
  }

  if (typeof effects.setCash === 'number') {
    const beforeCash = Number(state.economy.cash || 0);
    state.economy.cash = effects.setCash;
    queueMoneyCue(effects.setCash - beforeCash);
  }
  // 코인 "당함": 현금의 일정 비율을 깎는다(0.5 = -50%). 청산(cashAllInLoss)과 달리 일부만.
  if (typeof effects.cashLossPct === 'number') {
    const beforeCash = Number(state.economy.cash || 0);
    const loss = Math.round(beforeCash * Math.max(0, Math.min(1, effects.cashLossPct)));
    state.economy.cash = Math.max(0, beforeCash - loss);
    queueMoneyCue(-loss);
    applyFlags({ coin_last_loss: loss });
  }
  if (typeof effects.setDebt === 'number') state.economy.debt = effects.setDebt;
  if (typeof effects.setAssets === 'number') state.economy.assets = effects.setAssets;
  if (typeof effects.setHappy === 'number') state.meters.happy = clampHappy(effects.setHappy);
  if (typeof effects.startingCash === 'number') state.economy.startingCash = effects.startingCash;

  if (typeof node.week === 'number') state.progress.week = node.week;
  if (typeof effects.week === 'number') state.progress.week = effects.week;
  if (typeof effects.day === 'number') state.progress.day = effects.day;
  if (typeof effects.addDay === 'number') state.progress.day += effects.addDay;

  unlock(node.unlock);
  unlock(effects.unlock);
}

function stockParams(cfg = {}) {
  const buyPrice = Math.max(1, Number(cfg.buyPrice || 72000));
  const resultMultiplier = Math.max(0, Number(cfg.resultMultiplier || 2));
  return {
    buyPrice,
    resultPrice: Math.round(buyPrice * resultMultiplier),
    resultMultiplier,
    symbol: cfg.symbol || '배금전자',
  };
}

function applyStockBuyAll(cfg = {}) {
  const params = stockParams(cfg);
  const startCash = Math.max(0, Number(state.economy.cash || 0));
  const shares = Math.floor(startCash / params.buyPrice);

  if (shares <= 0) {
    applyFlags({
      stock_buy_failed: true,
      stock_bought: false,
      stock_buy_price: params.buyPrice,
      stock_start_cash: startCash,
    });
    return;
  }

  const invested = shares * params.buyPrice;
  const leftover = startCash - invested;
  const resultValue = shares * params.resultPrice;
  const profit = resultValue + leftover - startCash;
  const returnRate = invested > 0
    ? Math.round(((params.resultPrice - params.buyPrice) / params.buyPrice) * 100)
    : 0;

  state.economy.cash = leftover;
  applyEconomyDelta('assets', invested);
  applyFlags({
    stock_bought: true,
    stock_skipped: false,
    stock_symbol: params.symbol,
    stock_buy_price: params.buyPrice,
    stock_result_price: params.resultPrice,
    stock_result_multiplier: params.resultMultiplier,
    stock_start_cash: startCash,
    stock_shares: shares,
    stock_invested: invested,
    stock_leftover: leftover,
    stock_result_value: resultValue,
    stock_profit: profit,
    stock_return_rate: returnRate,
  });
}

function applyStockSkip(cfg = {}) {
  const params = stockParams(cfg);
  const startCash = Math.max(0, Number(state.economy.cash || 0));
  const shares = Math.floor(startCash / params.buyPrice);
  const invested = shares * params.buyPrice;
  const leftover = startCash - invested;
  const resultValue = shares * params.resultPrice;
  const missedProfit = resultValue + leftover - startCash;

  applyFlags({
    stock_bought: false,
    stock_skipped: true,
    stock_symbol: params.symbol,
    stock_buy_price: params.buyPrice,
    stock_result_price: params.resultPrice,
    stock_start_cash: startCash,
    stock_skip_cash: startCash,
    stock_skip_shares: shares,
    stock_skip_missed_profit: missedProfit,
    stock_return_rate: Math.round((params.resultMultiplier - 1) * 100),
  });
}

function applyStockResult() {
  const flags = state.flags || {};
  if (!flags.stock_bought || flags.stock_result_applied) return;

  const invested = Number(flags.stock_invested || 0);
  const resultValue = Number(flags.stock_result_value || 0);
  if (resultValue <= 0) return;

  const currentAssets = Number(state.economy.assets || 0);
  const realizedProfit = Number(flags.stock_profit || (resultValue - invested));

  state.economy.assets = Math.max(0, currentAssets - invested);
  state.economy.cash = Number(state.economy.cash || 0) + resultValue;
  queueMoneyCue(realizedProfit, realizedProfit >= 0 ? '수익 확정' : '손실 확정');
  applyFlags({
    stock_result_applied: true,
    stock_cash_result: resultValue,
    stock_profit_realized: realizedProfit,
  });
}

function applyCashAllInWin(cfg = {}) {
  const cash = Math.max(0, Number(state.economy.cash || 0));
  if (cash <= 0) return;
  const multiplier = Math.max(0, Number(cfg.multiplier ?? 1));
  const gain = Math.round(cash * multiplier);
  if (gain <= 0) return;
  applyEconomyDelta('cash', gain, { label: cfg.label || '몰빵 적중' });
  applyFlags({
    all_in_last_stake: cash,
    all_in_last_gain: gain,
    all_in_last_result: 'win',
  });
}

function applyCashAllInLoss(cfg = {}) {
  const cash = Math.max(0, Number(state.economy.cash || 0));
  if (cash <= 0) return;
  applyEconomyDelta('cash', -cash, { label: cfg.label || '몰빵 손실' });
  applyFlags({
    all_in_last_stake: cash,
    all_in_last_loss: cash,
    all_in_last_result: 'loss',
  });
}

function applyAffection(delta) {
  for (const k in delta) {
    state.affection[k] = (state.affection[k] || 0) + delta[k];
  }
}

function applyFlags(flags) {
  for (const k in flags) {
    state.flags[k] = flags[k];
  }
}

function applyEconomyDelta(key, delta, options = {}) {
  if (typeof delta !== 'number') return;
  state.economy[key] = Number(state.economy[key] || 0) + delta;
  if (key === 'cash' && !options.silent) queueMoneyCue(delta, options.label);
}

function applyHappyDelta(delta) {
  if (typeof delta !== 'number') return;
  state.meters = state.meters || { happy: START_HAPPY };
  state.meters.happy = clampHappy(Number(state.meters.happy || 0) + delta);
}

function unlock(ids) {
  if (!ids) return;
  const list = Array.isArray(ids) ? ids : [ids];
  list.forEach(id => {
    if (id && !state.unlocked.includes(id)) state.unlocked.push(id);
  });
}

function handlePhoneAction(event) {
  const detail = event.detail || {};
  const node = {
    label: detail.label || detail.action || '',
    set: detail.set,
    effects: detail.effects || {},
    unlock: detail.unlock,
  };

  if (!detail.next) {
    applyEffects(node);
    recordHistory({
      from: currentScene(),
      next: currentScene(),
      label: node.label,
      turnDelta: 0,
    });
    save();
    const sc = story.scenes[currentScene()];
    if (sc) renderHeader(sc);
    return;
  }

  commitTransition({
    label: node.label,
    next: detail.next,
    set: node.set,
    effects: node.effects,
    unlock: node.unlock,
  }, { countTurn: false });
}

/* 시작 */
render();
