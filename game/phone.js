/* ===== 배금도시 — 스마트폰 연출 위젯 (재활용) =====
   일러스트(scene-img) 위에 "폰 화면"을 오버레이로 띄운다.
   엔진은 render() 끝에서 PhoneWidget.bind(stage, scene) 한 줄만 부른다.

   씬 데이터에서 쓰는 법 (image 는 그대로 두고, phone 필드만 추가):
   a1_oversleep: {
     image: 'assets/01/00-1.png',     // 일러스트는 배경으로 유지
     phone: {
       statusbar: { time:'5:20', battery:39 },
       sequence: ['ringing', 'missed'], // 수신중 → (자동) 부재중 목록
       revealText: 'afterFlow',          // 폰 연출이 끝난 뒤 대사창 표시
       acceptNext: 'a1_call_answer',      // 초록 수신 버튼을 눌렀을 때 이동할 씬
       caller:  '점장',
       number:  '010-7442-8680',
       missed:  [ { name:'점장', number:'010-7442-8680', time:'오후 1:37', count:3 } ],
       ringMs:  3400,                   // 수신중 유지 시간(ms)
     },
     ...
   }

   화면 종류(screen)는 SCREENS 에 추가만 하면 늘어난다:
   'ringing'(수신중), 'recents'(부재중 목록) … 향후 'stocks','ticker' 등.
========================================================= */

window.PhoneWidget = (function () {
  'use strict';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function money(v) {
    return `${Math.round(Number(v || 0)).toLocaleString('ko-KR')}원`;
  }

  function unitMoney(v) {
    const abs = Math.abs(Math.round(Number(v || 0)));
    if (abs >= 100000000) {
      const value = abs / 100000000;
      return `${Number.isInteger(value) ? value.toLocaleString('ko-KR') : value.toFixed(1)}억`;
    }
    if (abs >= 10000) {
      const value = abs / 10000;
      return `${Number.isInteger(value) ? value.toLocaleString('ko-KR') : Math.round(value).toLocaleString('ko-KR')}만원`;
    }
    return '';
  }

  function wonEok(v) {
    const n = Math.round(Number(v || 0));
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const unit = unitMoney(abs);
    return `${sign}${money(abs)}${unit ? ` (${unit})` : ''}`;
  }

  function compactMoney(v) {
    const n = Math.round(Number(v || 0));
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs >= 100000000) {
      const value = abs / 100000000;
      return `${sign}${Number.isInteger(value) ? value.toLocaleString('ko-KR') : value.toFixed(1)}억`;
    }
    if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString('ko-KR')}만`;
    return `${sign}${abs.toLocaleString('ko-KR')}`;
  }

  function signedMoney(v) {
    const n = Math.round(Number(v || 0));
    return `${n >= 0 ? '+' : '-'}${Math.abs(n).toLocaleString('ko-KR')}원`;
  }

  // 부호 + 원 단위 + (억) 병기.  예: +9,000,000,000원 (90억)
  function signedWonEok(v) {
    const n = Math.round(Number(v || 0));
    const abs = Math.abs(n);
    const unit = unitMoney(abs);
    return `${n >= 0 ? '+' : '-'}${money(abs)}${unit ? ` (${unit})` : ''}`;
  }

  // 핸드셋 아이콘(폰트 의존 없이 항상 동일하게 보이도록 인라인 SVG)
  const HANDSET = '<svg class="ph2-ico-svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 '
    + '1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 '
    + '1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

  // assetStore/bankApp 는 화면 안의 버튼(구매하기/확인)으로 직접 진행하므로 dialogue 세트에서 제외.
  const STOCK_ACTION_SCREENS = new Set(['chatRooms', 'market', 'community', 'orderDecision', 'orderFilled', 'marketResult', 'missedResult', 'ladder', 'casino', 'blackjack', 'wealthHub', 'snsFeed']);
  const MANUAL_ACTION_SCREENS = new Set(['oddEvenGame', 'blackjackGame']);

  function firstScreen(cfg) {
    return (cfg && cfg.screen) || (cfg && Array.isArray(cfg.sequence) && cfg.sequence[0]) || '';
  }

  function stockChoicesUseDialogue(cfg) {
    return STOCK_ACTION_SCREENS.has(firstScreen(cfg));
  }

  function usesManualPhoneActions(cfg) {
    return MANUAL_ACTION_SCREENS.has(firstScreen(cfg));
  }

  function randomInt(max) {
    const limit = Math.max(1, Number(max || 1));
    if (window.crypto && window.crypto.getRandomValues) {
      const values = new Uint32Array(1);
      window.crypto.getRandomValues(values);
      return values[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  }

  function cloneEffects(effects) {
    const copy = Object.assign({}, effects || {});
    copy.flags = Object.assign({}, (effects && effects.flags) || {});
    return copy;
  }

  function gameEffects(effects, flags) {
    const copy = cloneEffects(effects);
    copy.flags = Object.assign(copy.flags || {}, flags || {});
    return copy;
  }

  function economyOf(state) {
    return (state && state.economy) || {};
  }

  function netWorthOf(state) {
    const economy = economyOf(state);
    return Number(economy.cash || 0) + Number(economy.assets || 0) - Number(economy.debt || 0);
  }

  function wealthTier(state) {
    const net = netWorthOf(state);
    if (net >= 10000000000) return '금수저';
    if (net >= 1000000000) return '은수저';
    if (net >= 100000000) return '동수저';
    return '흙수저';
  }

  function choiceListForScene(scene) {
    if (!scene) return [];
    return [
      ...(Array.isArray(scene.choices) ? scene.choices : []),
      ...((scene.phone && Array.isArray(scene.phone.choices)) ? scene.phone.choices : []),
    ];
  }

  function storyChoiceByNext(next) {
    if (!next || !window.STORY || !window.STORY.scenes) return null;
    const scenes = window.STORY.scenes;
    for (const id in scenes) {
      const found = choiceListForScene(scenes[id]).find(choice => choice && choice.next === next);
      if (found) return found;
    }
    return null;
  }

  function assetChoice(item, cfg, index) {
    const choices = Array.isArray(cfg && cfg.choices) ? cfg.choices : [];
    if (typeof item.choiceIndex === 'number') return choices[item.choiceIndex] || null;
    const target = item.choiceNext || item.next;
    if (target) {
      return choices.find(choice => choice && choice.next === target) || storyChoiceByNext(target);
    }
    if (item.flag) {
      return choices.find(choice => choice && choice.effects && choice.effects.flags && choice.effects.flags[item.flag]);
    }
    return choices[index] || null;
  }

  function assetPriceLabel(item, cfg, index, owned) {
    if (owned) return item.ownedLabel || '보유중';
    const choice = assetChoice(item, cfg, index);
    const cash = choice && choice.effects && choice.effects.cash;
    if (typeof cash === 'number' && cash < 0) return wonEok(Math.abs(cash));
    if (typeof item.cost === 'number') return wonEok(item.cost);
    if (item.price != null) return String(item.price);
    return item.lockedLabel || '대기';
  }

  function assetMetaText(item, cfg, index) {
    const choice = assetChoice(item, cfg, index);
    const effectValue = choice && choice.effects && choice.effects.assets;
    const value = typeof effectValue === 'number' ? effectValue : item.value;
    const parts = [];
    if (item.meta) parts.push(item.meta);
    if (typeof value === 'number' && value > 0) parts.push(`평가 ${wonEok(value)}`);
    return parts.join(' · ');
  }

  // 자산 항목 → 그 항목을 사는 choice 의 인덱스(구매하기 버튼 연결용). 없으면 -1.
  function assetChoiceIndex(item, cfg, index) {
    const choices = (cfg && cfg.choices) || [];
    const choice = assetChoice(item, cfg, index);
    return choice ? choices.indexOf(choice) : -1;
  }

  /* ---------- 상태바 ---------- */
  function statusbarHTML(sb) {
    sb = sb || {};
    const time = esc(sb.time || '5:20');
    const battery = Math.max(0, Math.min(100, Number(sb.battery == null ? 39 : sb.battery)));
    return `
      <div class="ph2-status">
        <span class="ph2-time">${time}</span>
        <span class="ph2-icons">
          <span class="ph2-net">LTE</span>
          <span class="ph2-sig"><i></i><i></i><i></i><i></i></span>
          <span class="ph2-batt"><b style="width:${battery}%"></b><span class="ph2-batt-n">${battery}</span></span>
        </span>
      </div>`;
  }

  /* ---------- 화면: 수신중 ---------- */
  function screenRinging(cfg) {
    const name = esc(cfg.caller || '발신자');
    const initial = esc((cfg.caller || '?').trim().charAt(0));
    const number = esc(cfg.number || '');
    return `
      <div class="ph2-call">
        <div class="ph2-call-label">수신 전화</div>
        <div class="ph2-avatar">
          <span class="ph2-ring"></span>
          <span class="ph2-ring ph2-ring2"></span>
          <span class="ph2-avatar-txt">${initial}</span>
        </div>
        <div class="ph2-call-name">${name}</div>
        ${number ? `<div class="ph2-call-num">${number}</div>` : ''}
        <div class="ph2-call-actions">
          <button type="button" class="ph2-act ph2-decline" data-phone-act="decline">✕</button>
          <button type="button" class="ph2-act ph2-accept" data-phone-act="accept">${HANDSET}</button>
        </div>
      </div>`;
  }

  /* ---------- 화면: 부재중 목록(최근기록) ---------- */
  function screenRecents(cfg) {
    let list = Array.isArray(cfg.missed) && cfg.missed.length
      ? cfg.missed
      : [{ name: cfg.caller || '발신자', number: cfg.number || '', time: '오후 1:37', count: 3 }];

    const rows = list.map((m, i) => {
      const name = esc(m.name || cfg.caller || '발신자');
      const sub = esc(m.number || cfg.number || '');
      const time = esc(m.time || '');
      const count = Number(m.count || 0);
      return `
        <div class="ph2-rec-row${i === 0 ? ' ph2-rec-new' : ''}">
          <span class="ph2-rec-ico">${HANDSET}</span>
          <span class="ph2-rec-main">
            <span class="ph2-rec-name">${name}${count > 1 ? ` <em>(${count})</em>` : ''}</span>
            ${sub ? `<span class="ph2-rec-sub">부재중 전화</span>` : ''}
          </span>
          <span class="ph2-rec-time">${time}</span>
        </div>`;
    }).join('');

    return `
      <div class="ph2-recents">
        <div class="ph2-rec-head">전화</div>
        <div class="ph2-rec-tab">최근기록</div>
        <div class="ph2-rec-list">${rows}</div>
      </div>`;
  }

  /* ---------- 화면: 메시지 ---------- */
  function screenMessages(cfg) {
    const contact = esc(cfg.contact || cfg.caller || '엄마');
    const rows = (Array.isArray(cfg.messages) ? cfg.messages : []).map(msg => {
      // 시스템 줄: 날짜 구분선 / 송금 알림 등 (가운데, 회색)
      if (msg.type === 'system' || msg.from === 'system' || msg.system) {
        const tone = msg.tone === 'money' ? ' ph2-msg-money' : '';
        return `<div class="ph2-msg-system${tone}">${esc(msg.text || '')}</div>`;
      }
      const side = (msg.from === 'me' || msg.side === 'me') ? 'me' : 'them';
      const name = esc(msg.name || (side === 'me' ? '나' : contact));
      const note = msg.note ? `<div class="ph2-msg-note">${esc(msg.note)}</div>` : '';
      return `
        <div class="ph2-msg-row ph2-msg-${side}">
          <div class="ph2-msg-name">${name}</div>
          <div class="ph2-msg-bubble">${esc(msg.text || '')}</div>
          ${note}
        </div>`;
    }).join('');

    const choices = (Array.isArray(cfg.choices) ? cfg.choices : []).map((choice, i) => `
      <button type="button" class="ph2-msg-choice" data-phone-choice="${i}">
        ${esc(choice.label || '')}
      </button>`).join('');

    return `
      <div class="ph2-messages">
        <div class="ph2-msg-head">
          <span class="ph2-msg-back">‹</span>
          <span class="ph2-msg-contact">${contact}<small>메시지</small></span>
        </div>
        <div class="ph2-msg-list">${rows}</div>
        ${choices ? `<div class="ph2-msg-choices">${choices}</div>` : ''}
      </div>`;
  }

  /* ---------- 화면: 채팅방 목록 ---------- */
  function screenChatRooms(cfg, state) {
    const flags = (state && state.flags) || {};
    const readAll = cfg.readFlag && flags[cfg.readFlag];
    const title = esc(cfg.title || '까까오톡');
    const subtitle = esc(readAll && cfg.subtitleAfterRead ? cfg.subtitleAfterRead : (cfg.subtitle || '대화'));
    const headBadge = esc(readAll && cfg.badgeAfterRead ? cfg.badgeAfterRead : (cfg.badge || 'LIVE'));
    const rooms = Array.isArray(cfg.rooms) && cfg.rooms.length
      ? cfg.rooms
      : [
        { name: '유민아', preview: '오늘도 늦게까지 깨어 있어요?', meta: '방금', badge: '1', tone: 'warm' },
        { name: '비트코인 레버리지방', preview: '청산 알림이 계속 올라옵니다.', meta: '1분 전', badge: '99+', tone: 'risk' },
      ];

    const visibleRooms = rooms
      .filter(room => {
        if (room.requiresFlag && !flags[room.requiresFlag]) return false;
        if (room.hideWhenFlag && flags[room.hideWhenFlag]) return false;
        return true;
      })
      .map(room => {
        const read = !!(room.readFlag && flags[room.readFlag]);
        return {
          ...room,
          _read: read,
          preview: read ? (room.readPreview || room.preview || '') : (room.preview || ''),
          meta: read ? (room.readMeta || room.meta || '읽음') : (room.meta || ''),
          badge: read ? (room.readBadge || '') : (room.badge || ''),
          locked: read ? (room.readLocked || room.locked || '') : (room.locked || ''),
        };
      });

    return `
      <div class="ph2-chatrooms">
        <div class="ph2-chat-head">
          <div>
            <b>${title}</b>
            <span>${subtitle}</span>
          </div>
          <em>${headBadge}</em>
        </div>
        <div class="ph2-chat-list">
          ${visibleRooms.map(room => {
            const tone = room.tone ? ` ph2-chat-${esc(room.tone)}` : '';
            const readClass = room._read ? ' ph2-chat-read' : '';
            const initials = esc(room.avatar || (room.name || '?').slice(0, 1));
            const badge = room.badge ? `<span class="ph2-chat-badge">${esc(room.badge)}</span>` : '';
            const locked = room.locked ? `<small class="ph2-chat-lock">${esc(room.locked)}</small>` : '';
            return `
              <div class="ph2-chat-row${tone}${readClass}">
                <div class="ph2-chat-avatar">${initials}</div>
                <div class="ph2-chat-main">
                  <div class="ph2-chat-top">
                    <b>${esc(room.name || '채팅방')}</b>
                    <time>${esc(room.meta || '')}</time>
                  </div>
                  <p>${esc(room.preview || '')}</p>
                  ${locked}
                </div>
                ${badge}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ---------- 화면: 앱 선택 ---------- */
  function screenApps(cfg) {
    const choices = Array.isArray(cfg.choices) ? cfg.choices : [];
    const apps = Array.isArray(cfg.apps) && cfg.apps.length
      ? cfg.apps
      : choices.map(choice => ({ title: choice.label || '앱', meta: '' }));
    const title = esc(cfg.homeTitle || '휴대폰');
    const subtitle = esc(cfg.homeSubtitle || '어떤 앱을 열까');

    return `
      <div class="ph2-apps">
        <div class="ph2-apps-head">
          <b>${title}</b>
          <span>${subtitle}</span>
        </div>
        <div class="ph2-app-grid">
          ${apps.map((app, i) => {
            const choice = choices[i] || {};
            const disabled = choice.disabled ? ' disabled' : '';
            const tone = app.tone ? ` ${esc(app.tone)}` : '';
            return `
              <button type="button" class="ph2-app-tile${tone}" data-phone-choice="${i}"${disabled}>
                <span class="ph2-app-icon" aria-hidden="true">${esc(app.icon || '')}</span>
                <b>${esc(app.title || choice.label || '앱')}</b>
                <small>${esc(app.meta || '')}</small>
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ---------- 화면: 금수저 자산 허브 ---------- */
  function screenWealthHub(cfg, state) {
    const economy = economyOf(state);
    const flags = (state && state.flags) || {};
    const apps = Array.isArray(cfg.wealthApps) ? cfg.wealthApps : [
      { title: 'VIP 차고', meta: flags.asset_car ? '출고 완료' : '미구매', icon: 'CAR', tone: 'car' },
      { title: '부동산', meta: flags.asset_home ? '입주 완료' : flags.asset_property ? '매입 완료' : '매물 대기', icon: 'APT', tone: 'property' },
      { title: 'SNS', meta: flags.sns_income ? '수익화 완료' : flags.sns_unlocked ? '게시 가능' : '잠김', icon: 'SNS', tone: 'sns' },
    ];
    const milestones = Array.isArray(cfg.milestones) ? cfg.milestones : [
      ['차량', flags.asset_car ? '완료' : '대기'],
      ['매입', flags.asset_property ? '완료' : '대기'],
      ['입주', flags.asset_home ? '완료' : '대기'],
      ['SNS', flags.sns_income ? '수익화' : flags.sns_unlocked ? '해금' : '잠김'],
    ];

    return `
      <div class="ph2-wealth">
        <div class="ph2-wealth-head">
          <span>${esc(cfg.kicker || 'BAEGEUM BLACK')}</span>
          <b>${esc(cfg.title || wealthTier(state))}</b>
          <small>${esc(cfg.subtitle || '금수저 패키지가 해금되었습니다')}</small>
        </div>
        <div class="ph2-wealth-balance">
          <div><span>현금</span><b>${wonEok(economy.cash || 0)}</b></div>
          <div><span>자산</span><b>${wonEok(economy.assets || 0)}</b></div>
          <div><span>순자산</span><b>${wonEok(netWorthOf(state))}</b></div>
        </div>
        <div class="ph2-wealth-apps">
          ${apps.map(app => `
            <div class="ph2-wealth-app ${esc(app.tone || '')}">
              <span>${esc(app.icon || '')}</span>
              <b>${esc(app.title || '')}</b>
              <small>${esc(app.meta || '')}</small>
            </div>`).join('')}
        </div>
        <div class="ph2-wealth-steps">
          ${milestones.map(([label, status]) => `
            <div><span>${esc(label)}</span><b>${esc(status)}</b></div>`).join('')}
        </div>
      </div>`;
  }

  /* ---------- 화면: 자산 구매 ---------- */
  function screenAssetStore(cfg, state) {
    const economy = economyOf(state);
    const flags = (state && state.flags) || {};
    const items = Array.isArray(cfg.assets) ? cfg.assets : [];
    return `
      <div class="ph2-shop">
        <div class="ph2-shop-bar">
          <span class="ph2-shop-brand"><i></i>${esc(cfg.brand || 'BLACK 멤버십')}</span>
          <span class="ph2-shop-bal">보유 ${wonEok(economy.cash || 0)}</span>
        </div>
        <div class="ph2-shop-title">
          <b>${esc(cfg.title || 'VIP 자산')}</b>
          <small>${esc(cfg.subtitle || '현금은 줄고, 등급은 올라갑니다')}</small>
        </div>
        <div class="ph2-shop-list">
          ${items.map((item, i) => {
            const owned = item.flag && flags[item.flag];
            const priceLabel = assetPriceLabel(item, cfg, i, owned);
            const meta = assetMetaText(item, cfg, i);
            const ci = assetChoiceIndex(item, cfg, i);
            const thumb = item.thumb
              ? `<div class="ph2-shop-thumb"><img src="${esc(item.thumb)}" alt=""></div>`
              : `<div class="ph2-shop-thumb ph2-shop-thumb-ph">${esc(item.kind || 'ASSET')}</div>`;
            const cta = owned
              ? `<span class="ph2-shop-owned">보유중</span>`
              : ci >= 0
                ? `<button type="button" class="ph2-shop-buy" data-phone-choice="${ci}">구매하기</button>`
                : `<span class="ph2-shop-lock">${esc(item.lockedLabel || '대기')}</span>`;
            return `
              <div class="ph2-shop-card ${owned ? 'owned' : ''}">
                ${thumb}
                <div class="ph2-shop-info">
                  <span class="ph2-shop-kind">${esc(item.kind || 'ASSET')}</span>
                  <b class="ph2-shop-name">${esc(item.name || '')}</b>
                  ${meta ? `<small class="ph2-shop-meta">${esc(meta)}</small>` : ''}
                  <div class="ph2-shop-foot">
                    <strong class="ph2-shop-price">${esc(priceLabel)}</strong>
                    ${cta}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ---------- 화면: 은행 앱(거래내역 · 입출금 알림 · 잔액) ---------- */
  function screenBankApp(cfg, state) {
    const economy = economyOf(state);
    const bankName = cfg.bankName || 'BG뱅크';
    const accountName = cfg.accountName || '입출금통장';
    const accountNo = cfg.accountNo || '102-9982-1457';
    const balance = typeof cfg.balance === 'number' ? cfg.balance : Number(economy.cash || 0);
    const tx = Array.isArray(cfg.tx) ? cfg.tx : [];
    const alert = cfg.alert;

    const alertHTML = alert ? `
      <div class="ph2-bank-push ${alert.amount < 0 ? 'out' : 'in'}">
        <span class="ph2-bank-push-app"><i></i>${esc(bankName)}</span>
        <b>${esc(alert.title || (alert.amount < 0 ? '출금' : '입금'))} ${typeof alert.amount === 'number' ? signedWonEok(alert.amount) : ''}</b>
        ${alert.memo ? `<small>${esc(alert.memo)}</small>` : ''}
      </div>` : '';

    const quick = (Array.isArray(cfg.quick) && cfg.quick.length ? cfg.quick : ['송금', '이체', '자산', '더보기'])
      .map(q => `<span>${esc(q)}</span>`).join('');

    const txHTML = tx.map(t => {
      const amt = Number(t.amount || 0);
      return `
        <div class="ph2-bank-tx">
          <div class="ph2-bank-tx-l">
            <b>${esc(t.name || '')}</b>
            <small>${esc(t.time || '')}${t.memo ? ` · ${esc(t.memo)}` : ''}</small>
          </div>
          <div class="ph2-bank-tx-r">
            <strong class="${amt < 0 ? 'out' : 'in'}">${signedWonEok(amt)}</strong>
            ${typeof t.balance === 'number' ? `<small>${money(t.balance)}</small>` : ''}
          </div>
        </div>`;
    }).join('');

    const choices = (Array.isArray(cfg.choices) ? cfg.choices : []).map((c, i) =>
      `<button type="button" class="ph2-bank-cta" data-phone-choice="${i}">${esc(c.label || '확인')}</button>`).join('');

    return `
      <div class="ph2-bank">
        <div class="ph2-bank-bar">
          <span class="ph2-bank-brand"><i></i>${esc(bankName)}</span>
          <span class="ph2-bank-ico">≡</span>
        </div>
        <div class="ph2-bank-scroll">
          ${alertHTML}
          <div class="ph2-bank-card">
            <div class="ph2-bank-acc">${esc(accountName)} <span>${esc(accountNo)}</span></div>
            <div class="ph2-bank-balance">${wonEok(balance)}</div>
            <div class="ph2-bank-quick">${quick}</div>
          </div>
          ${tx.length ? `<div class="ph2-bank-tx-head">거래내역</div><div class="ph2-bank-tx-list">${txHTML}</div>` : ''}
        </div>
        ${choices ? `<div class="ph2-bank-actions">${choices}</div>` : ''}
      </div>`;
  }

  /* ---------- 화면: SNS 피드 ---------- */
  function screenSnsFeed(cfg, state) {
    const flags = (state && state.flags) || {};
    const posts = Array.isArray(cfg.posts) ? cfg.posts : [];
    const followers = cfg.followers || (flags.sns_income ? '82.4만' : flags.sns_unlocked ? '18.6만' : '0');
    return `
      <div class="ph2-sns">
        <div class="ph2-sns-head">
          <b>${esc(cfg.title || 'BG Social')}</b>
          <span>followers ${esc(followers)}</span>
        </div>
        <div class="ph2-sns-profile">
          <span>${esc(cfg.handle || '@baegeum_city')}</span>
          <b>${esc(cfg.bio || '차, 집, 계좌가 전부 콘텐츠가 됐다')}</b>
        </div>
        <div class="ph2-sns-posts">
          ${posts.map(post => `
            <div class="ph2-sns-post">
              <span>${esc(post.tag || 'POST')}</span>
              <b>${esc(post.title || '')}</b>
              <small>${esc(post.meta || '')}</small>
              <em>${esc(post.likes || '')}</em>
            </div>`).join('')}
        </div>
        <div class="ph2-sns-income">
          <span>${esc(cfg.incomeLabel || '이번 달 협찬 예상')}</span>
          <b>${esc(cfg.income || (flags.sns_income ? '+7.4억' : '심사중'))}</b>
        </div>
      </div>`;
  }

  /* ---------- 화면: 유튜브(FOMO 뉴스 피드) ---------- */
  function screenYoutube(cfg) {
    const v = cfg.video || {};
    const cats = Array.isArray(cfg.categories) && cfg.categories.length
      ? cfg.categories : ['전체', '뉴스', '비트코인', '경제', '실시간'];
    const shorts = Array.isArray(cfg.shorts) ? cfg.shorts : [];
    const thumb = v.thumb
      ? `<img class="ph2-yt-thumb" src="${esc(v.thumb)}" alt="">`
      : `<div class="ph2-yt-thumb ph2-yt-thumb-ph"></div>`;
    return `
      <div class="ph2-yt">
        <div class="ph2-yt-bar">
          <span class="ph2-yt-logo"><i></i>YouTube</span>
          <span class="ph2-yt-icons">⤺ 🔔 🔍</span>
        </div>
        <div class="ph2-yt-cats">
          ${cats.map((c, i) => `<span class="ph2-yt-cat${i === 0 ? ' on' : ''}">${esc(c)}</span>`).join('')}
        </div>
        <div class="ph2-yt-feed">
          <div class="ph2-yt-video">
            <div class="ph2-yt-thumb-wrap">${thumb}${v.duration ? `<span class="ph2-yt-dur">${esc(v.duration)}</span>` : ''}</div>
            <div class="ph2-yt-meta">
              <div class="ph2-yt-title">${esc(v.title || '')}</div>
              <div class="ph2-yt-sub">${esc(v.channel || '')}${v.meta ? ` · ${esc(v.meta)}` : ''}</div>
            </div>
          </div>
          ${shorts.length ? `
            <div class="ph2-yt-shorts-h">Shorts</div>
            <div class="ph2-yt-shorts">
              ${shorts.map(sh => `<div class="ph2-yt-short${sh.tone ? ' t-' + esc(sh.tone) : ''}"><span>${esc(sh.title || '')}</span></div>`).join('')}
            </div>` : ''}
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  /* ---------- 화면: 주식앱 ---------- */
  function stockParams(cfg) {
    const stock = cfg.stock || cfg;
    const buyPrice = Math.max(1, Number(stock.buyPrice || 72000));
    const resultMultiplier = Math.max(0, Number(stock.resultMultiplier || 2));
    return {
      symbol: stock.symbol || '배금전자',
      code: stock.code || '001457',
      buyPrice,
      resultPrice: Math.round(buyPrice * resultMultiplier),
      resultMultiplier,
    };
  }

  function stockView(cfg, state) {
    const params = stockParams(cfg);
    const economy = (state && state.economy) || {};
    const flags = (state && state.flags) || {};
    const cash = Math.max(0, Number(economy.cash || 0));
    const baseCash = Number(flags.stock_start_cash || cash);
    const shares = Number(flags.stock_shares || Math.floor(cash / params.buyPrice));
    const invested = Number(flags.stock_invested || shares * params.buyPrice);
    const leftover = Number(flags.stock_leftover || Math.max(0, cash - invested));
    const resultValue = Number(flags.stock_result_value || shares * params.resultPrice);
    const profit = Number(flags.stock_profit || (resultValue + leftover - baseCash));
    const missedShares = Number(flags.stock_skip_shares || Math.floor(cash / params.buyPrice));
    const missedProfit = Number(flags.stock_skip_missed_profit || (missedShares * params.resultPrice + (cash - missedShares * params.buyPrice) - cash));
    return { ...params, cash, baseCash, shares, invested, leftover, resultValue, profit, missedShares, missedProfit };
  }

  function stockAppBar(title, right) {
    return `
      <div class="ph2-stock-app">
        <span class="ph2-stock-logo"></span>
        <span class="ph2-stock-title">${esc(title || '배금증권')}</span>
        <span class="ph2-stock-right">${esc(right || '내 계좌')}</span>
      </div>`;
  }

  function priceOnly(v) {
    return Math.round(Number(v || 0)).toLocaleString('ko-KR');
  }

  function stockChartHTML(s) {
    const price = Math.max(1, Number(s.buyPrice || 72000));
    const closePath = [
      0.585, 0.575, 0.592, 0.579, 0.587, 0.574, 0.596, 0.583,
      0.602, 0.594, 0.611, 0.604, 0.623, 0.631, 0.641, 0.653,
      0.667, 0.692, 0.729, 0.792, 0.842, 0.884, 0.927, 0.968,
      0.994, 1.0, 1.0, 1.0,
    ];
    const candles = closePath.map((close, i) => {
      const prev = i ? closePath[i - 1] : close - 0.012;
      const open = i % 4 === 0 ? close + 0.01 : prev;
      const wick = i > 18 ? 0.035 : 0.018 + (i % 3) * 0.006;
      return {
        open: open * price,
        close: close * price,
        high: (Math.max(open, close) + wick) * price,
        low: (Math.min(open, close) - wick * 0.72) * price,
      };
    });

    const w = 300;
    const h = 420;
    const padL = 4;
    const padR = 58;
    const padT = 13;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const hi = Math.max(price * 1.075, ...candles.map(c => c.high));
    const lo = Math.min(price * 0.55, ...candles.map(c => c.low));
    const y = value => padT + ((hi - value) / (hi - lo)) * plotH;
    const step = plotW / candles.length;
    const candleW = Math.max(3, step * 0.52);
    const ticks = [price, price * 0.916, price * 0.799, price * 0.683, price * 0.567];

    const grid = ticks.map(value => {
      const yy = y(value).toFixed(1);
      return `
        <line class="ph2-chart-grid" x1="${padL}" y1="${yy}" x2="${padL + plotW}" y2="${yy}" />
        <text class="ph2-chart-axis" x="${padL + plotW + 8}" y="${Number(yy) + 3}">${priceOnly(value)}</text>`;
    }).join('');

    const bars = candles.map((c, i) => {
      const x = padL + step * i + step / 2;
      const up = c.close >= c.open;
      const cls = up ? 'up' : 'down';
      const highY = y(c.high);
      const lowY = y(c.low);
      const openY = y(c.open);
      const closeY = y(c.close);
      const top = Math.min(openY, closeY);
      const height = Math.max(2, Math.abs(closeY - openY));
      return `
        <line class="ph2-candle-wick ${cls}" x1="${x.toFixed(1)}" y1="${highY.toFixed(1)}" x2="${x.toFixed(1)}" y2="${lowY.toFixed(1)}" />
        <rect class="ph2-candle-body ${cls}" x="${(x - candleW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${candleW.toFixed(1)}" height="${height.toFixed(1)}" />`;
    }).join('');

    const lineY = y(price).toFixed(1);
    const volumeY = h - 21;
    const buyW = plotW * 0.9;

    return `
      <svg class="ph2-chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(s.symbol)} 상승 차트">
        ${grid}
        ${bars}
        <line class="ph2-chart-current" x1="${padL}" y1="${lineY}" x2="${padL + plotW}" y2="${lineY}" />
        <rect class="ph2-chart-price-tag" x="${padL + plotW + 4}" y="${Number(lineY) - 9}" width="48" height="18" rx="2" />
        <text class="ph2-chart-price-text" x="${padL + plotW + 8}" y="${Number(lineY) + 4}">${priceOnly(price)}</text>
        <rect class="ph2-volume-buy" x="${padL}" y="${volumeY}" width="${buyW.toFixed(1)}" height="4" rx="1" />
        <rect class="ph2-volume-sell" x="${(padL + buyW).toFixed(1)}" y="${volumeY}" width="${(plotW - buyW).toFixed(1)}" height="4" rx="1" />
        <text class="ph2-volume-label buy" x="${padL}" y="${volumeY + 14}">매수</text>
        <text class="ph2-volume-label sell" x="${padL + plotW}" y="${volumeY + 14}">매도</text>
      </svg>`;
  }

  function screenMarket(cfg, state) {
    const s = stockView(cfg, state);
    return `
      <div class="ph2-stock ph2-stock-market">
        ${stockAppBar('배금증권', '내 계좌')}
        <div class="ph2-stock-head">
          <div class="ph2-stock-name">${esc(s.symbol)} <span>${esc(s.code)}</span></div>
          <div class="ph2-stock-row">
            <div class="ph2-stock-price">${money(s.buyPrice).replace('원', '')}</div>
            <div class="ph2-stock-change">${esc(cfg.changePct || '▲ +61.54%')}</div>
          </div>
          <div class="ph2-stock-sub">${esc(cfg.marketSub || '거래량 증가')}</div>
        </div>
        <div class="ph2-chart">
          <span class="ph2-live">LIVE</span>
          ${stockChartHTML(s)}
        </div>
        <div class="ph2-stock-hold">
          <span>보유 <b>0주</b></span>
          <span>평가손익 <b>0원</b></span>
          <span>예수금 <b>${money(s.cash)}</b></span>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function screenCommunity(cfg) {
    const s = stockParams(cfg);
    const posts = cfg.posts || [
      { user: '불개미', text: '오늘 장 끝까지 봐라. 거래량 붙었다.', hot: true, rec: 142 },
      { user: '존버맨', text: '시초에 못 산 사람들 계속 쳐다만 봄.', rec: 88 },
      { user: '물린사람', text: '위에서 잡았는데 아직 안 팔았다.', down: true, rec: 31 },
      { user: '호가창', text: '매도벽 먹는 중. 숫자 봐라.', hot: true, rec: 166 },
      { user: '신용계좌', text: '가능금액 전부 걸었다.', rec: 77 },
      { user: '한방', text: '방금 시장가로 들어갔다.', hot: true, rec: 120 },
    ];
    const rows = posts.concat(posts).map(p => `
      <div class="ph2-post${p.hot ? ' hot' : ''}${p.down ? ' down' : ''}">
        <div class="ph2-post-user">${esc(p.user)}</div>
        <div class="ph2-post-text">${esc(p.text)}</div>
        <div class="ph2-post-meta">추천 ${Number(p.rec || 0).toLocaleString('ko-KR')} · 방금</div>
      </div>`).join('');
    return `
      <div class="ph2-stock ph2-community">
        <div class="ph2-community-head"><b>${esc(cfg.communityTitle || `${s.symbol} 종목토론방`)}</b><span>실시간</span></div>
        <div class="ph2-community-feed"><div>${rows}</div></div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function metricHTML(items) {
    return `<div class="ph2-metrics">${items.map(([label, value, cls]) => `
      <div class="ph2-metric">
        <span>${esc(label)}</span>
        <b class="${cls || ''}">${esc(value)}</b>
      </div>`).join('')}</div>`;
  }

  function phoneChoicesHTML(cfg) {
    const choices = cfg && cfg.choices;
    if (stockChoicesUseDialogue(cfg)) return '';
    if (!Array.isArray(choices) || !choices.length) return '';
    return `<div class="ph2-stock-actions">${choices.map((choice, i) => `
      <button type="button" class="ph2-stock-btn" data-phone-choice="${i}">${esc(choice.label || '')}</button>
    `).join('')}</div>`;
  }

  function screenOrderDecision(cfg, state) {
    const s = stockView(cfg, state);
    return `
      <div class="ph2-stock ph2-order">
        ${stockAppBar('매수 주문', '시장가')}
        <div class="ph2-stock-panel">
          <div class="ph2-panel-label">매수 가능 금액</div>
          <div class="ph2-panel-big">${money(s.cash)}</div>
          ${metricHTML([
            ['현재가', money(s.buyPrice)],
            ['가능 수량', `${s.shares.toLocaleString('ko-KR')}주`],
            ['주문 금액', money(s.invested)],
            ['남은 예수금', money(s.leftover)],
          ])}
          <div class="ph2-stock-desc">주문창이 열렸다.\n보유 현금 전부로 주문 금액이 채워졌다.</div>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function screenOrderFilled(cfg, state) {
    const s = stockView(cfg, state);
    return `
      <div class="ph2-stock ph2-order">
        ${stockAppBar('체결 내역', '2주차')}
        <div class="ph2-stock-panel">
          <div class="ph2-fill-mark">매수 체결</div>
          ${metricHTML([
            ['종목', s.symbol],
            ['체결가', money(s.buyPrice)],
            ['체결 수량', `${s.shares.toLocaleString('ko-KR')}주`],
            ['남은 예수금', money(s.leftover)],
          ])}
          <div class="ph2-stock-desc">확인 버튼을 눌렀다.\n체결 알림이 화면 위에 내려왔다.</div>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function screenMarketResult(cfg, state) {
    const s = stockView(cfg, state);
    return `
      <div class="ph2-stock ph2-result">
        ${stockAppBar('평가손익', '3주차')}
        <div class="ph2-stock-panel">
          <div class="ph2-panel-label">평가손익</div>
          <div class="ph2-panel-big gain">${signedMoney(s.profit)}</div>
          ${metricHTML([
            ['보유 수량', `${s.shares.toLocaleString('ko-KR')}주`],
            ['평가금액', money(s.resultValue)],
            ['수익률', `+${Math.round((s.resultMultiplier - 1) * 100)}%`, 'gain'],
            ['예수금', money(s.leftover)],
          ])}
          <div class="ph2-stock-desc">3주차 첫날, 평가손익 숫자가 빨갛게 표시됐다.\n잔고 화면이 그대로 켜져 있었다.</div>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function screenMissedResult(cfg, state) {
    const s = stockView(cfg, state);
    return `
      <div class="ph2-stock ph2-result">
        ${stockAppBar('가격 알림', '3주차')}
        <div class="ph2-stock-panel">
          <div class="ph2-panel-label">보유 수량</div>
          <div class="ph2-panel-big">0주</div>
          ${metricHTML([
            ['예수금', money(s.cash)],
            ['현재가', money(s.resultPrice)],
            ['놓친 평가손익', signedMoney(s.missedProfit), 'gain'],
            ['수익률', `+${Math.round((s.resultMultiplier - 1) * 100)}%`, 'gain'],
          ])}
          <div class="ph2-stock-desc">급등 알림이 떴다.\n보유 수량은 0주로 표시됐다.</div>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function oddEvenState(cfg) {
    if (!cfg.__oddEvenState) {
      cfg.__oddEvenState = {
        phase: 'pick',
        pick: '',
        roll: 0,
        result: '',
        next: '',
        effects: {},
      };
    }
    return cfg.__oddEvenState;
  }

  function screenOddEvenGame(cfg, state) {
    const game = cfg.oddEvenGame || {};
    const session = oddEvenState(cfg);
    const resultClass = session.result === 'win' ? ' win' : session.result === 'lose' ? ' lose' : '';
    const pickLabel = session.pick === 'odd' ? '홀' : session.pick === 'even' ? '짝' : '-';
    const parityLabel = session.roll ? (session.roll % 2 ? '홀' : '짝') : '대기';
    const resultText = session.result === 'win'
      ? signedMoney(game.winAmount || game.bet || 0)
      : session.result === 'lose'
        ? signedMoney(-(game.loseAmount || game.bet || 0))
        : '결과 대기';
    return `
      <div class="ph2-gamble ph2-odd-even">
        <div class="ph2-gamble-app">
          <span class="ph2-gamble-logo"></span>
          <span class="ph2-gamble-title">${esc(game.title || '홀짝')}</span>
          <span class="ph2-gamble-right">${esc(game.badge || 'LIVE')}</span>
        </div>
        <div class="ph2-oe-stage">
          <div class="ph2-oe-number${session.roll ? ' is-open' : ''}">${session.roll || '?'}</div>
          <div class="ph2-oe-meta">
            <span>선택 <b>${esc(pickLabel)}</b></span>
            <span>결과 <b>${esc(parityLabel)}</b></span>
          </div>
        </div>
        <div class="ph2-gamble-panel${resultClass}">
          <span>${esc(game.round || '1라운드')}</span>
          <b>${esc(resultText)}</b>
          <small>베팅 ${money(game.bet || 0)} · 잔고 ${money((state && state.economy && state.economy.cash) || 0)}</small>
        </div>
        <div class="ph2-game-actions">
          ${session.phase === 'pick' ? `
            <button type="button" class="ph2-game-btn" data-phone-act="odd:pick:odd">홀 선택</button>
            <button type="button" class="ph2-game-btn" data-phone-act="odd:pick:even">짝 선택</button>
          ` : `
            <button type="button" class="ph2-game-btn primary" data-phone-act="odd:continue">다음 알림을 확인한다</button>
          `}
        </div>
      </div>`;
  }

  function screenLadder(cfg, state) {
    const game = cfg.ladder || {};
    const rows = Array.isArray(game.rows) && game.rows.length ? game.rows : ['left', 'right', 'left', 'right'];
    const resultClass = game.result === 'win' ? ' win' : game.result === 'lose' ? ' lose' : '';
    const resultText = game.resultText || '결과 대기';
    return `
      <div class="ph2-gamble ph2-ladder">
        <div class="ph2-gamble-app">
          <span class="ph2-gamble-logo"></span>
          <span class="ph2-gamble-title">${esc(game.title || '홀짝 사다리')}</span>
          <span class="ph2-gamble-right">${esc(game.badge || '실시간')}</span>
        </div>
        <div class="ph2-ladder-board">
          <div class="ph2-ladder-top">
            <span class="${game.pick === 'odd' ? 'on' : ''}">홀</span>
            <span class="${game.pick === 'even' ? 'on' : ''}">짝</span>
          </div>
          <div class="ph2-ladder-lines">
            <i></i><i></i>
            ${rows.map((side, i) => `<b class="${side}" style="top:${24 + i * 17}%"></b>`).join('')}
            <em class="${game.path || 'left'}"></em>
          </div>
          <div class="ph2-ladder-bottom">
            <span>도착 A</span>
            <span>도착 B</span>
          </div>
        </div>
        <div class="ph2-gamble-panel${resultClass}">
          <span>${esc(game.round || '1라운드')}</span>
          <b>${esc(resultText)}</b>
          <small>베팅 ${esc(game.stakeLabel || money(game.stake || 0))} · 잔고 ${money(game.balance == null ? ((state && state.economy && state.economy.cash) || 0) : game.balance)}</small>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function cardHTML(card) {
    const rank = typeof card === 'string' ? card : (card && card.rank) || '?';
    const suit = typeof card === 'string' ? '' : (card && card.suit) || '';
    const red = ['♥', '♦'].includes(suit) ? ' red' : '';
    return `<span class="ph2-card${red}"><b>${esc(rank)}</b>${suit ? `<i>${esc(suit)}</i>` : ''}</span>`;
  }

  const CARD_SUITS = ['♠', '♥', '♦', '♣'];
  const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function shuffledDeck() {
    const deck = [];
    CARD_SUITS.forEach(suit => {
      CARD_RANKS.forEach(rank => deck.push({ rank, suit }));
    });
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      const t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    return deck;
  }

  function drawCard(session) {
    if (!session.deck.length) session.deck = shuffledDeck();
    return session.deck.pop();
  }

  function cardScore(card) {
    if (!card) return 0;
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return Number(card.rank || 0);
  }

  function handScore(cards) {
    let total = 0;
    let aces = 0;
    cards.forEach(card => {
      total += cardScore(card);
      if (card && card.rank === 'A') aces += 1;
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return total;
  }

  function blackjackState(cfg) {
    if (!cfg.__blackjackState) {
      const session = {
        deck: shuffledDeck(),
        dealer: [],
        player: [],
        phase: 'play',
        result: '',
        next: '',
        effects: {},
      };
      session.player.push(drawCard(session), drawCard(session));
      session.dealer.push(drawCard(session), drawCard(session));
      cfg.__blackjackState = session;
    }
    return cfg.__blackjackState;
  }

  function settleBlackjack(cfg, session, result) {
    const game = cfg.blackjackGame || {};
    session.phase = 'result';
    session.result = result;
    if (result === 'win') {
      session.next = game.winNext;
      session.effects = gameEffects(game.winEffects, { blackjack_result: 'win', blackjack_played: true, post_stock_gamble_result: 'win' });
    } else if (result === 'lose') {
      session.next = game.loseNext;
      session.effects = gameEffects(game.loseEffects, { blackjack_result: 'lose', blackjack_played: true, post_stock_gamble_result: 'lose' });
    } else {
      session.next = game.pushNext || game.winNext;
      session.effects = gameEffects(game.pushEffects, { blackjack_result: 'push', blackjack_played: true, post_stock_gamble_result: 'push' });
    }
  }

  function finishDealer(cfg, session) {
    while (handScore(session.dealer) < 17) {
      session.dealer.push(drawCard(session));
    }
    const dealerScore = handScore(session.dealer);
    const playerScore = handScore(session.player);
    if (dealerScore > 21 || playerScore > dealerScore) {
      settleBlackjack(cfg, session, 'win');
    } else if (playerScore < dealerScore) {
      settleBlackjack(cfg, session, 'lose');
    } else {
      settleBlackjack(cfg, session, 'push');
    }
  }

  function screenBlackjackGame(cfg) {
    const game = cfg.blackjackGame || {};
    const session = blackjackState(cfg);
    const dealerVisible = session.phase === 'result'
      ? session.dealer
      : [session.dealer[0], { rank: '?', suit: '' }];
    const dealerScore = session.phase === 'result' ? handScore(session.dealer) : '?';
    const playerScore = handScore(session.player);
    const resultClass = session.result === 'win' ? ' win' : session.result === 'lose' ? ' lose' : session.result === 'push' ? ' push' : '';
    const resultText = session.result === 'win'
      ? signedMoney(game.winAmount || game.bet || 0)
      : session.result === 'lose'
        ? signedMoney(-(game.loseAmount || game.bet || 0))
        : session.result === 'push'
          ? 'PUSH'
          : '히트할지 멈출지 선택';
    return `
      <div class="ph2-gamble ph2-blackjack">
        <div class="ph2-gamble-app">
          <span class="ph2-gamble-logo"></span>
          <span class="ph2-gamble-title">${esc(game.title || 'BLACKJACK')}</span>
          <span class="ph2-gamble-right">${esc(game.badge || 'LIVE')}</span>
        </div>
        <div class="ph2-bj-table">
          <div class="ph2-bj-row dealer">
            <span>DEALER <b>${esc(dealerScore)}</b></span>
            <div>${dealerVisible.map(cardHTML).join('')}</div>
          </div>
          <div class="ph2-bj-pot">
            <span>BET</span>
            <b>${money(game.bet || 0)}</b>
          </div>
          <div class="ph2-bj-row player">
            <span>PLAYER <b>${esc(playerScore)}</b></span>
            <div>${session.player.map(cardHTML).join('')}</div>
          </div>
        </div>
        <div class="ph2-gamble-panel${resultClass}">
          <span>${esc(session.phase === 'result' ? '결과' : '플레이 중')}</span>
          <b>${esc(resultText)}</b>
          <small>${esc(session.phase === 'result' ? '결과가 확정됐다.' : '카드를 더 받을지, 여기서 멈출지 직접 고른다.')}</small>
        </div>
        <div class="ph2-game-actions">
          ${session.phase === 'play' ? `
            <button type="button" class="ph2-game-btn" data-phone-act="bj:hit">히트</button>
            <button type="button" class="ph2-game-btn primary" data-phone-act="bj:stand">스탠드</button>
          ` : `
            <button type="button" class="ph2-game-btn primary" data-phone-act="bj:continue">코인 레버리지방 알림을 누른다</button>
          `}
        </div>
      </div>`;
  }

  function screenCasino(cfg) {
    const casino = cfg.casino || {};
    const tables = casino.tables || [
      ['BLACKJACK', '최소 5천만원'],
      ['BACCARAT', '점검중'],
      ['ROULETTE', '준비중'],
    ];
    return `
      <div class="ph2-gamble ph2-casino">
        <div class="ph2-gamble-app">
          <span class="ph2-gamble-logo"></span>
          <span class="ph2-gamble-title">${esc(casino.title || 'VIP 카지노')}</span>
          <span class="ph2-gamble-right">${esc(casino.badge || '입장 가능')}</span>
        </div>
        <div class="ph2-casino-hero">
          <span>${esc(casino.kicker || 'LADDER CLEAR BONUS')}</span>
          <b>${esc(casino.headline || '블랙잭 테이블 오픈')}</b>
          <small>${esc(casino.copy || '방금 이긴 회원에게만 열리는 고배율 테이블입니다.')}</small>
        </div>
        <div class="ph2-casino-tables">
          ${tables.map(([name, meta], i) => `
            <div class="${i === 0 ? 'open' : ''}">
              <b>${esc(name)}</b><span>${esc(meta)}</span>
            </div>`).join('')}
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  function screenBlackjack(cfg) {
    const bj = cfg.blackjack || {};
    const dealer = Array.isArray(bj.dealer) ? bj.dealer : ['6', '?'];
    const player = Array.isArray(bj.player) ? bj.player : ['A', '7'];
    const resultClass = bj.result === 'win' ? ' win' : bj.result === 'lose' ? ' lose' : bj.result === 'push' ? ' push' : '';
    return `
      <div class="ph2-gamble ph2-blackjack">
        <div class="ph2-gamble-app">
          <span class="ph2-gamble-logo"></span>
          <span class="ph2-gamble-title">${esc(bj.title || 'BLACKJACK')}</span>
          <span class="ph2-gamble-right">${esc(bj.badge || 'LIVE')}</span>
        </div>
        <div class="ph2-bj-table">
          <div class="ph2-bj-row dealer">
            <span>DEALER <b>${esc(bj.dealerScore || '?')}</b></span>
            <div>${dealer.map(cardHTML).join('')}</div>
          </div>
          <div class="ph2-bj-pot">
            <span>BET</span>
            <b>${esc(bj.betLabel || money(bj.bet || 0))}</b>
          </div>
          <div class="ph2-bj-row player">
            <span>PLAYER <b>${esc(bj.playerScore || '')}</b></span>
            <div>${player.map(cardHTML).join('')}</div>
          </div>
        </div>
        <div class="ph2-gamble-panel${resultClass}">
          <span>${esc(bj.phase || '선택')}</span>
          <b>${esc(bj.resultText || '카드를 받을지 멈출지 선택')}</b>
          <small>${esc(bj.hint || '딜러의 오픈 카드를 보고 판단하세요.')}</small>
        </div>
        ${phoneChoicesHTML(cfg)}
      </div>`;
  }

  const SCREENS = {
    ringing: screenRinging,
    missed: screenRecents,
    recents: screenRecents,
    messages: screenMessages,
    chatRooms: screenChatRooms,
    apps: screenApps,
    wealthHub: screenWealthHub,
    assetStore: screenAssetStore,
    bankApp: screenBankApp,
    snsFeed: screenSnsFeed,
    youtube: screenYoutube,
    market: screenMarket,
    community: screenCommunity,
    orderDecision: screenOrderDecision,
    orderFilled: screenOrderFilled,
    marketResult: screenMarketResult,
    missedResult: screenMissedResult,
    oddEvenGame: screenOddEvenGame,
    ladder: screenLadder,
    casino: screenCasino,
    blackjackGame: screenBlackjackGame,
    blackjack: screenBlackjack,
  };

  function screenHTML(kind, cfg, stateSnapshot) {
    return (SCREENS[kind] || screenRinging)(cfg, stateSnapshot);
  }

  /* ---------- 기기(베젤+상태바+화면) ---------- */
  function deviceHTML(cfg, stateSnapshot) {
    const first = cfg.screen || (cfg.sequence && cfg.sequence[0]) || 'ringing';
    const frameClass = cfg.frame === 'desktop' || cfg.device === 'desktop' ? ' ph2-device-desktop' : '';
    const kindClass = first === 'messages' ? ' ph2-device-msg'
      : ['chatRooms', 'apps', 'wealthHub', 'assetStore', 'bankApp', 'snsFeed', 'youtube', 'market', 'community', 'orderDecision', 'orderFilled', 'marketResult', 'missedResult', 'oddEvenGame', 'ladder', 'casino', 'blackjackGame', 'blackjack'].includes(first) ? ' ph2-device-stock'
      : '';
    return `
      <div class="ph2-device${kindClass}${frameClass}" data-state="${esc(first)}">
        ${statusbarHTML(cfg.statusbar)}
        <div class="ph2-screen">${screenHTML(first, cfg, stateSnapshot)}</div>
        <div class="ph2-navbar"></div>
      </div>`;
  }

  /* ---------- 화면 전환(크로스페이드) ---------- */
  function revealDelayedText(textEl) {
    if (!textEl) return;
    textEl.classList.remove('ph2-text-delayed');
    textEl.classList.add('ph2-text-reveal');
  }

  function switchScreen(device, kind, cfg, stateSnapshot, done) {
    if (!device.isConnected) return;
    const screen = device.querySelector('.ph2-screen');
    screen.classList.add('ph2-switching');
    setTimeout(() => {
      if (!device.isConnected) return;
      screen.innerHTML = screenHTML(kind, cfg, stateSnapshot);
      device.dataset.state = kind;
      // 다음 프레임에 페이드 복귀
      requestAnimationFrame(() => {
        screen.classList.remove('ph2-switching');
        if (done) done();
      });
    }, 260);
  }

  function renderPhoneScreen(overlay, cfg, stateSnapshot) {
    const device = overlay && overlay.querySelector('.ph2-device');
    const screen = device && device.querySelector('.ph2-screen');
    if (!screen) return;
    const kind = firstScreen(cfg) || 'ringing';
    screen.innerHTML = screenHTML(kind, cfg, stateSnapshot);
    device.dataset.state = kind;
  }

  function dispatchGameResult(stageEl, label, next, effects) {
    if (!next) return;
    stageEl.dispatchEvent(new CustomEvent('phone:action', {
      bubbles: true,
      detail: {
        action: 'gameResult',
        label,
        next,
        effects: effects || {},
      },
    }));
  }

  function handleOddEvenAction(stageEl, cfg, action, overlay, stateSnapshot) {
    if (!cfg.oddEvenGame || !action.startsWith('odd:')) return false;
    const game = cfg.oddEvenGame;
    const session = oddEvenState(cfg);

    if (action.startsWith('odd:pick:') && session.phase === 'pick') {
      const pick = action.split(':')[2] === 'even' ? 'even' : 'odd';
      const roll = randomInt(99) + 1;
      const parity = roll % 2 ? 'odd' : 'even';
      const won = pick === parity;
      session.phase = 'result';
      session.pick = pick;
      session.roll = roll;
      session.result = won ? 'win' : 'lose';
      session.next = won ? game.winNext : game.loseNext;
      session.effects = won
        ? gameEffects(game.winEffects, { intro_gamble_played: true, intro_gamble_pick: pick, intro_gamble_result: 'win' })
        : gameEffects(game.loseEffects, { intro_gamble_played: true, intro_gamble_pick: pick, intro_gamble_result: 'lose' });
      renderPhoneScreen(overlay, cfg, stateSnapshot);
      return true;
    }

    if (action === 'odd:continue' && session.phase === 'result') {
      dispatchGameResult(stageEl, '홀짝 결과', session.next, session.effects);
      return true;
    }

    return true;
  }

  function handleBlackjackGameAction(stageEl, cfg, action, overlay, stateSnapshot) {
    if (!cfg.blackjackGame || !action.startsWith('bj:')) return false;
    const session = blackjackState(cfg);

    if (action === 'bj:hit' && session.phase === 'play') {
      session.player.push(drawCard(session));
      if (handScore(session.player) > 21) {
        settleBlackjack(cfg, session, 'lose');
      }
      renderPhoneScreen(overlay, cfg, stateSnapshot);
      return true;
    }

    if (action === 'bj:stand' && session.phase === 'play') {
      finishDealer(cfg, session);
      renderPhoneScreen(overlay, cfg, stateSnapshot);
      return true;
    }

    if (action === 'bj:continue' && session.phase === 'result') {
      const label = session.result === 'win'
        ? '블랙잭 승리'
        : session.result === 'lose'
          ? '블랙잭 패배'
          : '블랙잭 무승부';
      dispatchGameResult(stageEl, label, session.next, session.effects);
      return true;
    }

    return true;
  }

  /* ---------- 시퀀스 진행 ---------- */
  function runSequence(overlay, cfg, stateSnapshot, done) {
    const device = overlay.querySelector('.ph2-device');
    const seq = Array.isArray(cfg.sequence) && cfg.sequence.length ? cfg.sequence : [cfg.screen || 'ringing'];
    if (seq.length < 2) {
      setTimeout(() => { if (done) done(); }, Number(cfg.holdMs == null ? 1200 : cfg.holdMs));
      return;
    }

    const ringMs = Number(cfg.ringMs == null ? 3400 : cfg.ringMs);
    const stepMs = Number(cfg.stepMs == null ? 1600 : cfg.stepMs);
    const afterFlowDelay = Number(cfg.afterFlowDelay == null ? 700 : cfg.afterFlowDelay);
    let index = 0;

    function next() {
      if (!device.isConnected) return;
      if (index >= seq.length - 1) {
        setTimeout(() => { if (done) done(); }, afterFlowDelay);
        return;
      }

      const waitMs = index === 0 ? ringMs : stepMs;
      setTimeout(() => {
        if (!device.isConnected) return;
        device.dataset.state = 'ending';
        setTimeout(() => switchScreen(device, seq[index + 1], cfg, stateSnapshot, () => {
          index += 1;
          next();
        }), 520);
      }, waitMs);
    }

    // 수신중 유지 → 끊김 표시 살짝 → 다음 화면으로
    next();
  }

  /* ---------- 엔진이 부르는 진입점 ---------- */
  function bind(stageEl, scene, stateSnapshot) {
    if (!scene || !scene.phone) return;
    const host = stageEl.querySelector('.scene-img');
    if (!host) return;
    if (host.querySelector('.ph2-overlay')) return; // 중복 방지

    const cfg = scene.phone;
    const hasChoices = Array.isArray(cfg.choices) && cfg.choices.length > 0;
    const hasDeviceChoices = hasChoices && !stockChoicesUseDialogue(cfg);
    const textEl = cfg.revealText === 'afterFlow' ? stageEl.querySelector('.scene-text') : null;
    if (textEl) textEl.classList.add('ph2-text-delayed');

    const overlay = document.createElement('div');
    overlay.className = 'ph2-overlay';
    if (textEl || hasDeviceChoices || cfg.block) overlay.classList.add('ph2-block');
    overlay.innerHTML = deviceHTML(cfg, stateSnapshot);
    overlay.addEventListener('click', event => {
      const choiceEl = event.target.closest('[data-phone-choice]');
      if (choiceEl) {
        event.stopPropagation();
        handlePhoneChoice(stageEl, cfg, Number(choiceEl.dataset.phoneChoice));
        return;
      }
      const actionEl = event.target.closest('[data-phone-act]');
      if (actionEl) {
        event.stopPropagation();
        const handled = handleOddEvenAction(stageEl, cfg, actionEl.dataset.phoneAct, overlay, stateSnapshot)
          || handleBlackjackGameAction(stageEl, cfg, actionEl.dataset.phoneAct, overlay, stateSnapshot);
        if (!handled) {
          handlePhoneAction(stageEl, cfg, actionEl.dataset.phoneAct);
        }
        return;
      }
      if (overlay.classList.contains('ph2-block') && !overlay.classList.contains('ph2-done')) {
        event.stopPropagation();
      }
    });
    overlay.addEventListener('pointerdown', event => {
      if (overlay.classList.contains('ph2-block') && !overlay.classList.contains('ph2-done')) {
        event.stopPropagation();
      }
    });
    host.appendChild(overlay);

    // 일러스트가 먼저 보이고 → 폰이 서서히 떠오름
    const delay = Number(cfg.appearDelay == null ? (cfg.screen === 'messages' ? 240 : 650) : cfg.appearDelay);
    setTimeout(() => {
      if (!overlay.isConnected) return;
      overlay.classList.add('ph2-show');
      if (hasDeviceChoices || usesManualPhoneActions(cfg)) return;
      runSequence(overlay, cfg, stateSnapshot, () => {
        overlay.classList.add('ph2-done');
        const afterFlowEffects = cfg.afterFlowEffects || cfg.missedEffects;
        if (afterFlowEffects || cfg.afterFlowSet || cfg.afterFlowUnlock) {
          stageEl.dispatchEvent(new CustomEvent('phone:action', {
            bubbles: true,
            detail: {
              action: 'flowComplete',
              label: cfg.afterFlowLabel || '폰 연출 완료',
              effects: afterFlowEffects || {},
              set: cfg.afterFlowSet,
              unlock: cfg.afterFlowUnlock,
            },
          }));
        }
        revealDelayedText(textEl);
      });
    }, delay);
  }

  function handlePhoneAction(stageEl, cfg, action) {
    const next = action === 'accept' ? cfg.acceptNext : cfg.declineNext;
    if (!next) return;

    stageEl.dispatchEvent(new CustomEvent('phone:action', {
      bubbles: true,
      detail: {
        action,
        label: action === 'accept' ? '전화 받기' : '전화 거절',
        next,
        effects: action === 'accept' ? (cfg.acceptEffects || {}) : (cfg.declineEffects || {}),
        set: action === 'accept' ? cfg.acceptSet : cfg.declineSet,
        unlock: action === 'accept' ? cfg.acceptUnlock : cfg.declineUnlock,
      },
    }));
  }

  function handlePhoneChoice(stageEl, cfg, index) {
    const choice = Array.isArray(cfg.choices) ? cfg.choices[index] : null;
    if (!choice) return;

    stageEl.dispatchEvent(new CustomEvent('phone:action', {
      bubbles: true,
      detail: {
        action: 'messageChoice',
        label: choice.label || '메시지 선택',
        next: choice.next,
        effects: choice.effects || {},
        set: choice.set,
        unlock: choice.unlock,
      },
    }));
  }

  return { bind, deviceHTML, screenHTML };
})();
