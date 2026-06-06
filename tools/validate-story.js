/* ===== 배금도시 — 스토리 검증기 =====
   코드를 켜보지 않고도 "스토리가 깨졌는지"를 잡아낸다.
   실행:  node tools/validate-story.js

   검사 항목:
   1) start 씬이 존재하는가
   2) next / choices[].next 가 실제 존재하는 씬을 가리키는가
   3) image 파일(문자열 경로)이 실제로 디스크에 있는가
   4) phone 연출의 screen 타입이 지원 목록에 있는가 (sequence/flow/screens 모두 지원)
   5) 막다른 씬(next도 choices도 없는데 종료형도 아님)
   6) effects 키 오타 (allowlist 밖)
   7) unlock 한 앨범 id가 album 목록에 있는가
   8) 어디서도 연결되지 않는 고아(orphan) 씬 (경고)

   에러가 하나라도 있으면 exit code 1 로 끝난다(자동화/커밋 훅에 물리기 좋음).
========================================================= */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GAME_DIR = path.join(__dirname, '..', 'game');
const SCENES_FILE = path.join(GAME_DIR, 'data', 'scenes.js');

// phone.js 가 실제로 그릴 수 있는 화면. 새 화면 추가하면 여기도 같이 갱신.
const SUPPORTED_PHONE_SCREENS = ['ringing', 'missed', 'recents', 'messages'];

// engine.js applyEffects 가 실제로 읽는 키. 오타 잡이용.
const EFFECT_KEYS = [
  'cash', 'debt', 'assets', 'turn', 'week', 'day', 'addDay',
  'flag', 'flags', 'affection', 'economy', 'unlock',
  'anger', 'rage', 'meters',
  'setCash', 'setDebt', 'setAssets', 'setAnger', 'startingCash',
];

// 종료형(다음 씬이 없어도 정상인) 타입
const TERMINAL_TYPES = ['end', 'album'];

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

/* ---- 스토리 로드 (window 셰임) ---- */
function loadStory() {
  if (!fs.existsSync(SCENES_FILE)) {
    err(`scenes 파일을 못 찾음: ${SCENES_FILE}`);
    return null;
  }
  const code = fs.readFileSync(SCENES_FILE, 'utf8');
  const sandbox = { window: {} };
  try {
    vm.runInContext(code, vm.createContext(sandbox), { filename: 'scenes.js' });
  } catch (e) {
    err(`scenes.js 실행 중 에러(문법?): ${e.message}`);
    return null;
  }
  if (!sandbox.window.STORY) {
    err('scenes.js 가 window.STORY 를 만들지 않음');
    return null;
  }
  return sandbox.window.STORY;
}

/* ---- phone 연출에서 screen 타입들 뽑기 (구/신 스키마 모두) ---- */
function phoneScreens(phone) {
  if (!phone) return [];
  if (Array.isArray(phone.sequence)) return phone.sequence.slice();      // 현재 스키마
  const flow = phone.flow || phone.screens;                              // 향후 스키마
  if (Array.isArray(flow)) return flow.map(s => (s && (s.screen || s.type)) || '(없음)');
  if (phone.screen) return [phone.screen];
  return [];
}

function validate(story) {
  const scenes = story.scenes || {};
  const ids = Object.keys(scenes);
  const idSet = new Set(ids);
  const albumIds = new Set((story.album || []).map(a => a.id));
  const referenced = new Set();

  // 1) start
  if (!story.start) err('story.start 가 없음');
  else if (!idSet.has(story.start)) err(`story.start("${story.start}") 가 존재하지 않는 씬`);
  else referenced.add(story.start);

  for (const id of ids) {
    const sc = scenes[id] || {};
    const type = sc.type || 'scene';
    const where = `[${id}]`;

    // 2) next
    if (sc.next) {
      referenced.add(sc.next);
      if (!idSet.has(sc.next)) err(`${where} next → 존재하지 않는 씬 "${sc.next}"`);
    }

    // 2) choices
    if (sc.choices) {
      if (!Array.isArray(sc.choices) || sc.choices.length === 0) {
        warn(`${where} choices 가 비어 있음`);
      } else {
        sc.choices.forEach((ch, i) => {
          if (!ch || typeof ch !== 'object') return err(`${where} choices[${i}] 형식 이상`);
          if (!ch.next) err(`${where} choices[${i}]("${ch.label || ''}") 에 next 없음`);
          else {
            referenced.add(ch.next);
            if (!idSet.has(ch.next)) err(`${where} choices[${i}] next → 없는 씬 "${ch.next}"`);
          }
          if (ch.set) checkAffection(where + ` choices[${i}].set`, ch.set);
          if (ch.effects) checkEffects(where + ` choices[${i}].effects`, ch.effects);
          if (ch.unlock) checkUnlock(where, ch.unlock, albumIds);
        });
      }
    }

    // 3) image
    if (typeof sc.image === 'string') {
      const abs = path.join(GAME_DIR, sc.image);
      if (!fs.existsSync(abs)) err(`${where} image 파일 없음: ${sc.image}`);
    }
    if (typeof sc.image === 'string' && /title|bg/.test(type)) {/* noop */}

    // 4) phone
    if (sc.phone) {
      const screens = phoneScreens(sc.phone);
      if (screens.length === 0) warn(`${where} phone 에 screen/sequence/flow 가 없음`);
      screens.forEach(s => {
        if (!SUPPORTED_PHONE_SCREENS.includes(s)) {
          err(`${where} phone screen "${s}" 미지원 (지원: ${SUPPORTED_PHONE_SCREENS.join(', ')})`);
        }
      });

      if (sc.phone.choices) {
        if (!Array.isArray(sc.phone.choices) || sc.phone.choices.length === 0) {
          warn(`${where} phone.choices 가 비어 있음`);
        } else {
          sc.phone.choices.forEach((ch, i) => {
            if (!ch || typeof ch !== 'object') return err(`${where} phone.choices[${i}] 형식 이상`);
            if (!ch.next) err(`${where} phone.choices[${i}]("${ch.label || ''}") 에 next 없음`);
            else {
              referenced.add(ch.next);
              if (!idSet.has(ch.next)) err(`${where} phone.choices[${i}] next → 없는 씬 "${ch.next}"`);
            }
            if (ch.set) checkAffection(where + ` phone.choices[${i}].set`, ch.set);
            if (ch.effects) checkEffects(where + ` phone.choices[${i}].effects`, ch.effects);
            if (ch.unlock) checkUnlock(where, ch.unlock, albumIds);
          });
        }
      }

      ['acceptNext', 'declineNext'].forEach(key => {
        const target = sc.phone[key];
        if (!target) return;
        referenced.add(target);
        if (!idSet.has(target)) err(`${where} phone.${key} → 없는 씬 "${target}"`);
      });
    }

    // 5) 막다른 씬
    const isTerminal = TERMINAL_TYPES.includes(type);
    const hasPhoneExit = !!(sc.phone && (
      sc.phone.acceptNext ||
      sc.phone.declineNext ||
      (Array.isArray(sc.phone.choices) && sc.phone.choices.length > 0)
    ));
    const hasExit = !!sc.next || (Array.isArray(sc.choices) && sc.choices.length > 0) || hasPhoneExit;
    if (!isTerminal && !hasExit) {
      err(`${where} 막다른 씬: next 도 choices 도 없음 (type=${type})`);
    }

    // 6) effects / set / unlock (씬 레벨)
    if (sc.effects) checkEffects(where + '.effects', sc.effects);
    if (sc.set) checkAffection(where + '.set', sc.set);
    if (sc.unlock) checkUnlock(where, sc.unlock, albumIds);
  }

  // 8) orphan (start/앨범에서 도달 못 하는 씬) — 경고만
  for (const id of ids) {
    const type = scenes[id].type || 'scene';
    if (id === story.start) continue;
    if (['title', 'create'].includes(type)) continue; // 진입점류는 예외
    if (!referenced.has(id)) warn(`[${id}] 어떤 씬도 이리로 연결하지 않음 (고아 씬?)`);
  }
}

function checkEffects(where, effects) {
  if (typeof effects !== 'object') return err(`${where} 형식 이상`);
  for (const k of Object.keys(effects)) {
    if (!EFFECT_KEYS.includes(k)) {
      err(`${where} 알 수 없는 effects 키 "${k}" (오타? 허용: ${EFFECT_KEYS.join(', ')})`);
    }
  }
}

function checkAffection(where, set) {
  if (typeof set !== 'object') return err(`${where} 형식 이상`);
  for (const k of Object.keys(set)) {
    if (typeof set[k] !== 'number') err(`${where}.${k} 값이 숫자가 아님`);
  }
}

function checkUnlock(where, ids, albumIds) {
  const list = Array.isArray(ids) ? ids : [ids];
  list.forEach(id => {
    if (!albumIds.has(id)) warn(`${where} unlock "${id}" 가 album 목록에 없음`);
  });
}

/* ---- 실행 ---- */
const story = loadStory();
if (story) validate(story);

const sceneCount = story && story.scenes ? Object.keys(story.scenes).length : 0;
console.log(`\n📖 배금도시 스토리 검증  (씬 ${sceneCount}개)\n`);

if (warns.length) {
  console.log('⚠️  경고');
  warns.forEach(w => console.log('   - ' + w));
  console.log('');
}
if (errors.length) {
  console.log('❌ 에러');
  errors.forEach(e => console.log('   - ' + e));
  console.log(`\n실패: 에러 ${errors.length}개, 경고 ${warns.length}개\n`);
  process.exit(1);
} else {
  console.log(`✅ 통과: 에러 0개, 경고 ${warns.length}개\n`);
  process.exit(0);
}
