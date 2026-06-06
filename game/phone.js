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

  // 핸드셋 아이콘(폰트 의존 없이 항상 동일하게 보이도록 인라인 SVG)
  const HANDSET = '<svg class="ph2-ico-svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 '
    + '1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 '
    + '1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

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
      const side = (msg.from === 'me' || msg.side === 'me') ? 'me' : 'them';
      const name = esc(msg.name || (side === 'me' ? '나' : contact));
      return `
        <div class="ph2-msg-row ph2-msg-${side}">
          <div class="ph2-msg-name">${name}</div>
          <div class="ph2-msg-bubble">${esc(msg.text || '')}</div>
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

  const SCREENS = {
    ringing: screenRinging,
    missed: screenRecents,
    recents: screenRecents,
    messages: screenMessages,
  };

  function screenHTML(kind, cfg) {
    return (SCREENS[kind] || screenRinging)(cfg);
  }

  /* ---------- 기기(베젤+상태바+화면) ---------- */
  function deviceHTML(cfg) {
    const first = cfg.screen || (cfg.sequence && cfg.sequence[0]) || 'ringing';
    const kindClass = first === 'messages' ? ' ph2-device-msg' : '';
    return `
      <div class="ph2-device${kindClass}" data-state="${esc(first)}">
        ${statusbarHTML(cfg.statusbar)}
        <div class="ph2-screen">${screenHTML(first, cfg)}</div>
        <div class="ph2-navbar"></div>
      </div>`;
  }

  /* ---------- 화면 전환(크로스페이드) ---------- */
  function revealDelayedText(textEl) {
    if (!textEl) return;
    textEl.classList.remove('ph2-text-delayed');
    textEl.classList.add('ph2-text-reveal');
  }

  function switchScreen(device, kind, cfg, done) {
    if (!device.isConnected) return;
    const screen = device.querySelector('.ph2-screen');
    screen.classList.add('ph2-switching');
    setTimeout(() => {
      if (!device.isConnected) return;
      screen.innerHTML = screenHTML(kind, cfg);
      device.dataset.state = kind;
      // 다음 프레임에 페이드 복귀
      requestAnimationFrame(() => {
        screen.classList.remove('ph2-switching');
        if (done) done();
      });
    }, 260);
  }

  /* ---------- 시퀀스 진행 ---------- */
  function runSequence(overlay, cfg, done) {
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
        setTimeout(() => switchScreen(device, seq[index + 1], cfg, () => {
          index += 1;
          next();
        }), 520);
      }, waitMs);
    }

    // 수신중 유지 → 끊김 표시 살짝 → 다음 화면으로
    next();
  }

  /* ---------- 엔진이 부르는 진입점 ---------- */
  function bind(stageEl, scene) {
    if (!scene || !scene.phone) return;
    const host = stageEl.querySelector('.scene-img');
    if (!host) return;
    if (host.querySelector('.ph2-overlay')) return; // 중복 방지

    const cfg = scene.phone;
    const hasChoices = Array.isArray(cfg.choices) && cfg.choices.length > 0;
    const textEl = cfg.revealText === 'afterFlow' ? stageEl.querySelector('.scene-text') : null;
    if (textEl) textEl.classList.add('ph2-text-delayed');

    const overlay = document.createElement('div');
    overlay.className = 'ph2-overlay';
    if (textEl || hasChoices || cfg.block) overlay.classList.add('ph2-block');
    overlay.innerHTML = deviceHTML(cfg);
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
        handlePhoneAction(stageEl, cfg, actionEl.dataset.phoneAct);
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
      if (hasChoices) return;
      runSequence(overlay, cfg, () => {
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
