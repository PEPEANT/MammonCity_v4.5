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

  function signedMoney(v) {
    const n = Math.round(Number(v || 0));
    return `${n >= 0 ? '+' : '-'}${Math.abs(n).toLocaleString('ko-KR')}원`;
  }

  // 핸드셋 아이콘(폰트 의존 없이 항상 동일하게 보이도록 인라인 SVG)
  const HANDSET = '<svg class="ph2-ico-svg" viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 '
    + '1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 '
    + '1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

  const STOCK_ACTION_SCREENS = new Set(['market', 'community', 'orderDecision', 'orderFilled', 'marketResult', 'missedResult']);

  function firstScreen(cfg) {
    return (cfg && cfg.screen) || (cfg && Array.isArray(cfg.sequence) && cfg.sequence[0]) || '';
  }

  function stockChoicesUseDialogue(cfg) {
    return STOCK_ACTION_SCREENS.has(firstScreen(cfg));
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
            <div class="ph2-stock-change">▲ +61.54%</div>
          </div>
          <div class="ph2-stock-sub">거래량 증가</div>
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
        <div class="ph2-community-head"><b>배금전자 종목토론방</b><span>실시간</span></div>
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

  const SCREENS = {
    ringing: screenRinging,
    missed: screenRecents,
    recents: screenRecents,
    messages: screenMessages,
    market: screenMarket,
    community: screenCommunity,
    orderDecision: screenOrderDecision,
    orderFilled: screenOrderFilled,
    marketResult: screenMarketResult,
    missedResult: screenMissedResult,
  };

  function screenHTML(kind, cfg, stateSnapshot) {
    return (SCREENS[kind] || screenRinging)(cfg, stateSnapshot);
  }

  /* ---------- 기기(베젤+상태바+화면) ---------- */
  function deviceHTML(cfg, stateSnapshot) {
    const first = cfg.screen || (cfg.sequence && cfg.sequence[0]) || 'ringing';
    const kindClass = first === 'messages' ? ' ph2-device-msg'
      : ['market', 'community', 'orderDecision', 'orderFilled', 'marketResult', 'missedResult'].includes(first) ? ' ph2-device-stock'
      : '';
    return `
      <div class="ph2-device${kindClass}" data-state="${esc(first)}">
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
      if (hasDeviceChoices) return;
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
