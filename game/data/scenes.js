/* ===== 배금도시 — 스토리 데이터 =====
   이 파일만 늘리면 스토리가 늘어난다. 엔진(engine.js)은 거의 안 건드림.
   깊이 기준 문서: story-lab/yumina-arc.md (관계 아크·엔딩 설계의 단일 진실)

   씬 한 개 형식:
   "씬id": {
     type:        title | create | card | scene | end | album | map  (기본 scene)
     header:      상단 바 글씨 ("프롤로그", "1주차" ...)
     image:       문자열=파일경로, {placeholder}=임시박스,
                  {background, character, ...}=배경 먼저+글 뒤 인물 등장(레이어)
     speaker:     화자 이름
     relationOf:  이 키 호감도를 화자 옆 관계라벨로 표시 ("yumina")
     relationText:고정 관계라벨
     text:        대사/지문
     next:        다음 씬 id
     choices:     [ { label, next, set:{yumina:+1}, effects:{...}, requires:{angerAtLeast:5} } ]
     set/effects: 호감도 / 돈·플래그·분노 변화
     phone:       폰 오버레이 (phone.js). messages[].from = me|them|system, note, tone:'money'
   }
   * {이름} = 플레이어 이름 자동 치환.
   * 문체: 이미지가 보여주는 건 본문에서 반복 금지. 본문은 감정·해석·압박·다음 행동의 이유만.

   * 히로인 = 유민아(키 yumina). 정류장→톡→데이트→돈 빌림(배신)→상실. 이게 V1 척추.
     모든 베팅은 사실 "유민아에게 거는 베팅". 감정 스프라이트(assets/characters/yumina/·hero/)로
     같은 배경에 표정만 바꿔 관계의 온도를 보여준다.
   * 분기 허브(engine remapSceneId 가 플래그로 실제 씬 교체):
       w1_walk_to_stop / w1_busstop      → 외형(appearance)
       w2_contact / w3_open / w4b_after  → 유민아를 만났는가(met_yumina)
       w4a_after                          → 만났으면 빌림 체인, 아니면 혼자
       w4_result                          → 절제(temperance) = 생존 / 붕괴
========================================================= */

window.STORY = {
  meta: { title: '배금도시', version: '0.3' },
  start: 'title',
  album: [],

  branchMap: {
    rows: [
      [ { label: '프롤로그', week: 0 } ],
      [ { label: '1주차', week: 1 } ],
      [ { label: '2주차', week: 2 } ],
      [ { label: '3주차', week: 3 } ],
      [ { label: '4주차 · 붕괴', week: 4, branch: 'A' },
        { label: '4주차 · 생존', week: 4, branch: 'B' } ],
      [ { label: '5주차 · 바닥',   week: 5, branch: 'A', checkpoint: 'w5a_choice' },
        { label: '5주차 · 갈림길', week: 5, branch: 'B', checkpoint: 'w5b_choice' } ],
      [ { label: '흙수저',     week: 5, branch: 'A', ending: 'e_dirt' },
        { label: '한강',       week: 5, branch: 'A', ending: 'e_han' },
        { label: '파멸',       week: 5, branch: 'A', ending: 'e_ruin' },
        { label: '은수저',     week: 5, branch: 'B', ending: 'e_silver' },
        { label: '금수저',     week: 5, branch: 'B', ending: 'e_gold' } ],
    ],
  },

  scenes: {
    /* ---------- 타이틀 ---------- */
    title: {
      type: 'title',
      title: '배금도시',
      kicker: '2025년의 기록',
      subtitle: '돈으로 사랑을 사려던 한 달',
      image: 'assets/title-bg.png',
      buttons: { continue: '이어하기', start: '새 기록 시작', records: '진행 분기' },
      next: 'create',
    },

    /* ---------- 캐릭터 생성 ---------- */
    create: {
      type: 'create',
      title: '캐릭터 생성',
      defaultFamily: '김',
      defaultGiven: '특붕',
      help: '주인공의 이름입니다. 비워두면 "김특붕"으로 시작합니다.',
      next: 'p0_military_exit',
    },

    /* ---------- 프롤로그 ---------- */
    p0_military_exit: {
      header: '프롤로그',
      hideStats: true,
      image: 'assets/week1/prologue/military-gate.png',
      text: '내 이름은 {이름}. 스물다섯.\n\n오늘 군대에서 나왔다. 맞이하러 온 사람은 없었다.\n\n전역하며 받은 돈 몇 푼이 주머니에 있었다.\n이걸로 뭔가 시작할 수 있을 거라고, 정문을 나설 땐 잠깐 믿었다.',
      next: 'map_intro',
    },
    map_intro: { type: 'map', intro: true, header: '진행 분기', next: 'a1_wake' },

    /* ========== 1막: 첫 아침 (고시원) ========== */
    a1_wake: {
      header: '1막: 고시원',
      image: 'assets/01/00.png',
      speaker: '{이름}(25)',
      text: '전역하고 두 달.\n돈은 늘지 않았고, 통장만 조용히 말라갔다.\n\n새벽 다섯 시. 편의점 마감 알바를 가야 하는 날이다.',
      choices: [
        { label: '일어난다', next: 'a1_bathroom', effects: { flags: { wake_choice: 'up' } } },
        { label: '조금만 더 잔다', next: 'a1_oversleep', effects: { flags: { wake_choice: 'sleep_more' } } },
      ],
    },
    a1_oversleep: {
      header: '1막: 고시원',
      image: 'assets/01/00-1.png',
      phone: {
        statusbar: { time: '13:37', battery: 39 },
        sequence: ['ringing', 'missed'],
        revealText: 'afterFlow',
        acceptNext: 'a1_call_answer',
        acceptEffects: { flags: { firstCall: 'answered' } },
        afterFlowLabel: '전화 놓침',
        afterFlowEffects: { cash: -10000, flags: { firstCall: 'missed' } },
        caller: '점장', number: '010-7442-8680', ringMs: 3400,
        missed: [ { name: '점장', number: '010-7442-8680', time: '오후 1:37', count: 3 } ],
      },
      speaker: '{이름}(25)',
      text: '눈을 떴을 땐 이미 늦어 있었다.\n\n하루치에서 만 원이 깎였다.\n누군가에겐 커피값, 나에겐 이틀치 밥값이었다.',
      next: 'a1_bathroom_late',
    },
    a1_call_answer: {
      header: '1막: 고시원',
      image: 'assets/01/00-1.png',
      speaker: '점장',
      text: '"{이름} 씨. 지금 어디예요?"\n\n"…죄송합니다. 바로 가겠습니다."\n\n"삼십 분. 그 안에 오면 없던 일로 할게요."',
      next: 'a1_bathroom_rush',
    },
    a1_bathroom: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '나가기 전, 거울 앞에 멈춰 섰다.\n\n눌린 머리, 낡은 뿔테.\n누가 보는 것도 아닌데, 이 얼굴부터가 하루를 깎아먹는 기분이었다.',
      choices: [
        { label: '그냥 나간다', next: 'a1_leave_plain', effects: { anger: 1, flags: { appearance: 'neglect', confidence: 'low' } } },
        { label: '조금 다듬어 본다', next: 'a1_groom_cut_1', effects: { flags: { appearance: 'checked', confidence: 'seed' } } },
      ],
    },
    a1_leave_plain: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '거울은 더 보지 않기로 했다.\n\n볼수록 늦어지고, 볼수록 나가기 싫어질 뿐이었다.',
      next: 'a1_work',
    },
    a1_groom_cut_1: { type: 'card', header: '1막: 고시원', big: '...', sub: '머리를 만지고\n안경을 벗어 본다.', next: 'a1_groom_cut_2' },
    a1_groom_cut_2: { type: 'card', header: '1막: 고시원', big: '눈을 뜬다', sub: '다시 거울을 본다.', next: 'a1_mirror_checked' },
    a1_mirror_checked: {
      header: '1막: 고시원',
      image: 'assets/01/02.png',
      speaker: '{이름}(25)',
      text: '잠깐, 딴사람처럼 보였다.\n\n착각이라도 좋았다.\n그 정도면 오늘 하루는 버틸 만했다.',
      next: 'a1_work',
    },
    a1_bathroom_late: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '거울 볼 시간도 없었다.\n세수만 대충 하고, 어제 입은 옷을 다시 집었다.',
      next: 'a1_work',
    },
    a1_bathroom_rush: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '아직 완전히 늦은 건 아니다. 지금 뛰면 된다.\n\n뛰면서도 생각했다. 왜 이렇게까지 해서 이 푼돈을 지켜야 하나.',
      next: 'a1_work',
    },
    a1_work: {
      header: '1막: 편의점',
      image: {
        background: 'assets/week1/work/convenience-store-front.png',
        character: 'assets/characters/hero.png',
        characterWidth: '42%', characterLeft: '56%', characterBottom: '-10%',
      },
      speaker: '{이름}(25)',
      text: '바코드를 찍고, 봉투에 담고, 카드를 긁었다.\n\n사람들은 내 얼굴을 보지 않았다.\n계산대 뒤의 나는, 있어도 없는 사람 같았다.',
      next: 'a1_after_work_street',
    },
    a1_after_work_street: {
      header: '1막: 귀가',
      image: 'assets/week1/work/convenience-store-front.png',
      speaker: '{이름}(25)',
      text: '마감 불을 껐는데도 간판은 한참 더 밝았다.\n\n오늘 번 돈보다,\n집에 가는 길에 지나칠 불빛이 더 많았다.',
      next: 'a1_wallet_find',
    },
    a1_wallet_find: {
      header: '1막: 골목',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '고시원으로 돌아가는 골목에 지갑 하나가 떨어져 있었다.\n\n안에는 신분증과 현금이 있었다.\n주인이 찾으러 오기 전까지, 이 골목엔 나밖에 없었다.',
      choices: [
        {
          label: '주인을 찾아 돌려준다',
          next: 'a1_wallet_returned',
          effects: { cash: 20000, flags: { wallet_choice: 'returned', seed_wallet: 'clean' } },
        },
        {
          label: '그냥 가진다',
          next: 'a1_wallet_kept',
          effects: { cash: 180000, meters: { humanity: -1 }, flags: { wallet_choice: 'kept', seed_wallet: 'dirty' } },
        },
      ],
    },
    a1_wallet_returned: {
      header: '1막: 골목',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '전화를 걸자, 지갑 주인은 몇 번이나 고맙다고 했다.\n\n사례금은 이만 원.\n큰돈은 아니었다. 그래도 손바닥은 깨끗했다.',
      next: 'a1_after_work_homefront',
    },
    a1_wallet_kept: {
      header: '1막: 골목',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '신분증을 빼고, 현금만 주머니에 넣었다.\n\n심장은 빠르게 뛰었지만 아무도 보지 않았다.\n그 사실이 이상하게 더 무서웠다.',
      next: 'a1_after_work_homefront',
    },
    a1_after_work_homefront: {
      header: '1막: 귀가',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '골목 끝 고시원에 불이 하나 켜져 있었다. 내 방이다.\n\n돌아온다는 건 쉬는 게 아니라,\n다시 같은 자리로 밀려나는 일이었다.',
      next: 'w1_card',
    },

    /* ========== 1주차 — 정류장, 그리고 유민아 ========== */
    w1_card: { type: 'card', header: '1주차', big: '1주차', sub: '스물다섯, 한 번도 연애를 못 해봤다', week: 1, next: 'w1_walk_to_stop' },

    w1_walk_to_stop_plain: {
      header: '1주차 · 거리',
      image: 'assets/week1/street/street-day-1.png',
      speaker: '{이름}(25)',
      text: '햇빛은 멀쩡했고, 사람들은 다들 갈 곳이 있는 얼굴이었다.\n\n나만 목적지를 꾸며내며 걷는 사람 같았다.',
      next: 'w1_busstop_plain',
    },
    w1_walk_to_stop_checked: {
      header: '1주차 · 거리',
      image: 'assets/week1/street/street-day-2.png',
      speaker: '{이름}(25)',
      text: '유리창에 비친 얼굴을 한 번 더 봤다.\n\n괜찮아 보인다는 착각은 짧았지만,\n그 짧음만으로도 발걸음이 조금 달라졌다.',
      next: 'w1_busstop_checked',
    },
    w1_busstop_plain: {
      header: '1주차 · 정류장',
      image: {
        background: 'assets/week1/street/street-day-1.png',
        character: 'assets/characters/yumina/full-neutral.png',
        characterWidth: '40%', characterLeft: '62%', characterBottom: '-7%',
      },
      speaker: '{이름}(25)',
      text: '정류장에 한 여자가 버스를 기다리고 있었다.\n\n말을 걸어야 한다고 생각했지만,\n구겨진 셔츠와 눌린 머리가 먼저 마음에 걸렸다.\n\n지금 또 그냥 보내면, 또 아무 일도 없을 거다.',
      choices: [
        { label: '억지로 말을 건다', next: 'w1_hunt_fail_plain' },
        { label: '그냥 버스를 기다린다', next: 'w1_hunt_skip', effects: { anger: 1 } },
      ],
    },
    w1_busstop_checked: {
      header: '1주차 · 정류장',
      image: {
        background: 'assets/week1/street/street-day-2.png',
        character: 'assets/characters/yumina/full-neutral.png',
        characterWidth: '39%', characterLeft: '60%', characterBottom: '-7%',
      },
      speaker: '{이름}(25)',
      text: '정류장에 한 여자가 버스를 기다리고 있었다.\n\n심장은 여전히 뛰었다.\n그래도 오늘은, 적어도 도망치는 얼굴은 아니었다.',
      choices: [
        { label: '"저기… 번호 좀 주실 수 있어요?"', next: 'w1_hunt_fail_checked' },
        { label: '"이상하게 들리겠지만, 지금 안 물어보면 평생 후회할 것 같아서요."', next: 'w1_hunt_success' },
        { label: '그냥 버스를 기다린다', next: 'w1_hunt_skip', effects: { anger: 1 } },
      ],
    },
    w1_hunt_fail_plain: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/b2-fail.png',
      speaker: '여자',
      text: '"…네? 죄송한데, 좀."\n\n여자는 한 발 물러섰고, 마침 도착한 버스에 올라탔다.\n남은 건 정류장의 적막과, 얼굴로 확 몰리는 열기뿐이었다.',
      next: 'w1_rejection_walk', effects: { anger: 4 },
    },
    w1_hunt_fail_checked: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/a1-approach.png',
      speaker: '여자',
      text: '"아… 죄송해요. 번호는 좀."\n\n말투가 험한 건 아니었다.\n그래서 더 정확하게 거절당한 기분이었다.',
      next: 'w1_rejection_walk', effects: { anger: 4 },
    },
    w1_hunt_skip: {
      header: '1주차 · 버스',
      image: {
        background: 'assets/week1/bus/interior.png',
        character: 'assets/characters/hero.png',
        characterWidth: '40%', characterLeft: '50%', characterBottom: '-11%',
      },
      speaker: '{이름}(25)',
      text: '결국 아무 말도 못 했다.\n버스가 그녀를, 그리고 또 한 번의 기회를 데려갔다.\n\n익숙한 후회가 명치에 쌓였다.\n이 무력함을, 뭐로든 덮고 싶었다.',
      next: 'w1_rage',
    },
    w1_rejection_walk: {
      header: '1주차 · 귀가',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '골목은 아무 일도 없었다는 듯 조용했다.\n\n방금 전의 몇 마디가,\n하루 전체보다 더 오래 몸에 남았다.',
      next: 'w1_rage',
    },
    w1_rage: {
      header: '1주차 · 밤',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '45%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '방에 돌아와 천장만 봤다.\n분노인지 수치인지 모를 게 명치에 뭉쳐 있었다.\n\n홧김에 폰을 켰다. 증권 앱, 코인, 도박 사이트.\n"…어차피 이렇게 사는 거. 한 번 걸어볼까."',
      next: 'w2_card',
    },

    /* --- 성공 루트: 유민아와 연결됨 --- */
    w1_hunt_success: {
      header: '1주차 · 정류장',
      image: {
        background: 'assets/week1/street/street-day-2.png',
        character: 'assets/characters/yumina/full-smile.png',
        characterWidth: '40%', characterLeft: '60%', characterBottom: '-7%',
      },
      speaker: '여자', relationText: '이름 모를 그녀',
      text: '여자가 잠깐 멈칫하더니, 피식 웃었다.\n"…진짜 후회할 사람처럼 보이긴 하네요."\n\n폰에 번호가 찍혔다.\n저장하는 손끝이 떨렸다. 처음으로, 세상이 조금 달라 보였다.',
      next: 'w1_cafe_imagined',
      set: { yumina: 2 }, effects: { flags: { met_yumina: true } },
    },
    w1_cafe_imagined: {
      header: '1주차 · 상상',
      image: 'assets/week2/social/cafe-interior.png',
      speaker: '{이름}(25)',
      text: '아직 약속을 잡은 것도 아닌데,\n창가에 마주 앉은 모습부터 떠올랐다.\n\n그리고 곧, 커피값과 밥값과 옷값이 뒤따라 떠올랐다.\n설렘은 금세 계산서처럼 접혔다.',
      next: 'w1_smitten',
    },
    w1_smitten: {
      header: '1주차 · 밤',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '45%', characterLeft: '52%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '번호 하나에 밤새 잠이 안 왔다.\n\n그러다 통장을 떠올리자 들뜸이 식었다.\n이 얼굴로, 이 잔고로, 저 사람을 무슨 수로 만나.\n"…뭐라도, 빨리 불려야 해."',
      next: 'w2_card', effects: { flags: { pressure: true } },
    },

    /* ========== 2주차 — 첫 매수 ========== */
    w2_card: { type: 'card', header: '2주차', big: '2주차', sub: '첫 매수', week: 2, next: 'w2_market_open' },
    w2_market_open: {
      header: '2주차 · 주식앱',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'market',
        statusbar: { time: '1:08', battery: 34 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 2 },
        choices: [
          { label: '종목토론방 보기', next: 'w2_community_open' },
        ],
      },
      speaker: '{이름}(25)',
      text: '배금증권 앱이 열렸다.\n가격 옆 숫자가 빨갛게 깜빡였다.',
    },
    w2_community_open: {
      header: '2주차 · 종목토론방',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'community',
        statusbar: { time: '1:13', battery: 32 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 0.5 },
        posts: [
          { user: '불개미', text: '배금전자 내일 상한가 간다. 지금이 막차다.', hot: true, rec: 312 },
          { user: '존버맨', text: '거래량 터졌는데 안 사는 사람 이해가 안 됨.', rec: 188 },
          { user: '한방', text: '신용까지 풀로 당겨서 배금전자 들어갔다.', hot: true, rec: 204 },
          { user: '물린사람', text: '한성2차전지? 그런 노잼주를 왜 봄 ㅋㅋ', down: true, rec: 12 },
        ],
        choices: [
          { label: '주문창 열기', next: 'w2_pick' },
        ],
      },
      speaker: '{이름}(25)',
      text: '글 목록이 온통 배금전자였다.\n추천 수가 높은 글일수록, "지금 안 사면 늦는다"고 했다.',
    },
    /* 종목 선택 — 결정론: 종목마다 작가가 박은 운명이 다르다.
       군중(종토방)이 떠받드는 배금전자=함정(손실), 아무도 안 보는 한성2차전지=정답(대박). */
    w2_pick: {
      header: '2주차 · 관심종목',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'market',
        statusbar: { time: '1:18', battery: 30 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 0.5 },
        choices: [
          {
            label: '배금전자 — 다들 산다. 전량 매수',
            next: 'w2_buy_samsung',
            effects: { stockBuyAll: { symbol: '배금전자', buyPrice: 72000, resultMultiplier: 0.5 }, flags: { stock_pick: 'samsung' } },
          },
          {
            label: '한성2차전지 — 조용하다. 전량 매수',
            next: 'w2_buy_battery',
            effects: { stockBuyAll: { symbol: '한성2차전지', buyPrice: 41500, resultMultiplier: 2.5 }, flags: { stock_pick: 'battery' } },
          },
          {
            label: '누리바이오 — 테마가 뜨겁다. 전량 매수',
            next: 'w2_buy_bio',
            effects: { stockBuyAll: { symbol: '누리바이오', buyPrice: 88000, resultMultiplier: 1.3 }, flags: { stock_pick: 'bio' } },
          },
          {
            label: '아무것도 사지 않는다',
            next: 'w2_skip_done',
            effects: { stockSkip: { symbol: '배금전자', buyPrice: 72000, resultMultiplier: 0.5 }, flags: { stock_pick: 'none' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '관심종목엔 세 개가 떠 있었다.\n모두가 사는 배금전자, 글 한 줄 없는 한성2차전지, 테마만 뜨거운 누리바이오.\n\n전 재산을 어디에 걸 것인가.',
    },
    w2_buy_samsung: {
      header: '2주차 · 체결',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'orderFilled',
        statusbar: { time: '1:19', battery: 29 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 0.5 },
        choices: [ { label: '앱을 닫는다', next: 'w2_after_stock' } ],
      },
      speaker: '{이름}(25)',
      text: '확인 버튼을 눌렀다.\n모두가 가는 쪽에 올라탔다는 안도가, 잠깐 들었다.',
    },
    w2_buy_battery: {
      header: '2주차 · 체결',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'orderFilled',
        statusbar: { time: '1:19', battery: 29 },
        stock: { symbol: '한성2차전지', code: '137420', buyPrice: 41500, resultMultiplier: 2.5 },
        choices: [ { label: '앱을 닫는다', next: 'w2_after_stock' } ],
      },
      speaker: '{이름}(25)',
      text: '확인 버튼을 눌렀다.\n아무도 말하지 않는 종목이라, 손가락이 한 번 망설였다.',
    },
    w2_buy_bio: {
      header: '2주차 · 체결',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'orderFilled',
        statusbar: { time: '1:19', battery: 29 },
        stock: { symbol: '누리바이오', code: '095700', buyPrice: 88000, resultMultiplier: 1.3 },
        choices: [ { label: '앱을 닫는다', next: 'w2_after_stock' } ],
      },
      speaker: '{이름}(25)',
      text: '확인 버튼을 눌렀다.\n테마가 식기 전에 올라탔다고, 그렇게 믿었다.',
    },
    w2_skip_done: {
      header: '2주차 · 주문',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '주문창을 닫았다.\n예수금은 그대로 남았다.',
      next: 'w2_after_stock',
    },
    w2_after_stock: {
      header: '2주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '44%', characterLeft: '51%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '폰 화면이 꺼졌다.\n방 안은 다시 어두워졌다.',
      choices: [
        { label: '심심해서 AI한테 말을 건다', next: 'w2_ai_room', effects: { flags: { ai: true } } },
        { label: '도박 커뮤니티에 더 깊이 들어간다', next: 'w2_gamble_room', effects: { flags: { gamble_deep: true } } },
      ],
    },
    w2_ai_room: {
      header: '2주차 · 새벽',
      image: 'assets/week1/gosiwon/room-empty.png',
      speaker: '{이름}(25)',
      text: '채팅창을 열었다.\n커서가 입력칸에서 깜빡였다.',
      next: 'w2_contact',
    },
    w2_gamble_room: {
      header: '2주차 · 새벽',
      image: 'assets/week2/invest/investment-room.png',
      speaker: '{이름}(25)',
      text: '새 글이 계속 올라왔다.\n조회수와 추천수가 먼저 눈에 들어왔다.',
      next: 'w2_contact',
    },

    /* --- 유민아 첫 톡 (성공 루트). 과거 상처 = 복선/지뢰 --- */
    w2_yumina_text: {
      header: '2주차 · 밤',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-smile.png',
        characterWidth: '46%', characterLeft: '6%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '23:41', battery: 44 },
        contact: '그녀', appearDelay: 260,
        messages: [
          { from: 'me', text: '저… 며칠 전 정류장에서 번호 받은 사람이에요.' },
          { from: 'them', name: '그녀', text: '아 ㅋㅋㅋ 진짜로 연락 올 줄은 몰랐는데.' },
          { from: 'them', name: '그녀', text: '저 유민아예요.' },
          { from: 'them', name: '유민아', text: '예전에 막 있어 보이려고만 하는 사람 만나서 좀 데였거든요.\n그쪽은 솔직해 보여서 번호 줬어요 ㅎㅎ' },
        ],
        choices: [
          {
            label: '솔직하게: "사실 요즘 좀 빠듯해요. 부담 없는 데서 봐요"',
            next: 'w2_yumina_honest', set: { yumina: 2 },
            effects: { flags: { yumina_named: true, yumina_honest: true } },
          },
          {
            label: '센 척: "좋은 데 예약해 둘게요"',
            next: 'w2_yumina_flex', set: { yumina: 1 },
            effects: { flags: { yumina_named: true, yumina_flex: true } },
          },
        ],
      },
    },
    w2_yumina_honest: {
      header: '2주차 · 밤',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-smile.png',
        characterWidth: '46%', characterLeft: '6%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '23:48', battery: 43 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1000,
        messages: [
          { from: 'me', text: '저 {이름}이에요.\n사실 요즘 좀 빠듯해서… 부담 없는 데서 봐요.' },
          { from: 'them', name: '유민아', text: '오 솔직하다 ㅋㅋ 그런 거 좋아요.' },
          { from: 'them', name: '유민아', text: '그럼 토요일에 동네 카페 어때요?' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '없는 척을 안 했더니, 오히려 약속이 잡혔다.\n\n그런데도 토요일까지, 머릿속엔 카페값 계산이 떠나지 않았다.\n솔직했던 만큼, 더 잘 보이고 싶어졌다.',
      next: 'w3_stock_result',
    },
    w2_yumina_flex: {
      header: '2주차 · 밤',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-quiet.png',
        characterWidth: '46%', characterLeft: '6%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '23:48', battery: 43 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1000,
        messages: [
          { from: 'me', text: '저 {이름}이에요.\n좋은 데 예약해 둘게요.' },
          { from: 'them', name: '유민아', text: '오… 기대해도 돼요? ㅎㅎ' },
          { from: 'them', name: '유민아', text: '토요일 좋아요!' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '큰소리부터 쳐 버렸다. 예약 같은 건 해본 적도 없으면서.\n\n솔직한 게 좋다던 사람한테, 첫 단추부터 센 척을 끼웠다.\n토요일까지, 없는 돈을 어디서 만들지부터 생각하고 있었다.',
      next: 'w3_stock_result', effects: { flags: { pressure: true } },
    },

    /* --- 혼자인 루트 (정류장 실패/포기) --- */
    w2_alone: {
      header: '2주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '45%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '연락할 사람도, 기다리는 사람도 없었다.\n\n그래서 더 화면에만 매달렸다.\n숫자가 오르면, 잠깐은 누군가 나를 봐주는 것 같았다.',
      next: 'w3_stock_result',
    },

    /* ========== 3주차 첫날 — 2주차 매수 결과 (종목별 분기) ========== */
    /* 수익 종목 = 기존 결과화면(상승 렌더). 손실/미매수 = 내러티브. */
    w3_result_battery: {
      header: '3주차 · 첫날',
      week: 3,
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      effects: { stockResult: true },
      phone: {
        screen: 'marketResult',
        statusbar: { time: '9:03', battery: 51 },
        stock: { symbol: '한성2차전지', code: '137420', buyPrice: 41500, resultMultiplier: 2.5 },
        choices: [ { label: '화면을 닫는다', next: 'w3_card' } ],
      },
      speaker: '{이름}(25)',
      text: '조용하던 종목이 갱신됐다.\n남들이 안 볼 때 들어간 자리가, 처음으로 나를 위로했다.',
    },
    w3_result_bio: {
      header: '3주차 · 첫날',
      week: 3,
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      effects: { stockResult: true },
      phone: {
        screen: 'marketResult',
        statusbar: { time: '9:03', battery: 51 },
        stock: { symbol: '누리바이오', code: '095700', buyPrice: 88000, resultMultiplier: 1.3 },
        choices: [ { label: '화면을 닫는다', next: 'w3_card' } ],
      },
      speaker: '{이름}(25)',
      text: '테마는 식기 전에 한 번 더 올랐다.\n크진 않아도, 적어도 잃지는 않았다.',
    },
    w3_result_loss: {
      header: '3주차 · 첫날',
      week: 3,
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      effects: { stockResult: true },
      speaker: '{이름}(25)',
      text: '배금전자 알림이 떴다.\n모두가 사라던 그 자리에서, 빨간 마이너스가 나를 보고 있었다.\n\n종토방은 어느새 조용했다. 상한가를 외치던 글들은 지워지고 없었다.\n군중이 가리킨 곳이, 정확히 함정이었다.',
      next: 'w3_card',
    },
    w3_result_skip: {
      header: '3주차 · 첫날',
      week: 3,
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '아무것도 사지 않았다. 통장은 그대로였다.\n\n배금전자는 무너졌으니, 안 산 게 다행이라면 다행이었다.\n그런데 그대로라는 건, 유민아를 만날 돈도 그대로 없다는 뜻이었다.',
      next: 'w3_card',
    },

    /* ========== 3주차 — 데이트, 그리고 균열 ========== */
    w3_card: { type: 'card', header: '3주차', big: '3주차', sub: '마주 앉다', week: 3, next: 'w3_open' },

    w3_date_meet: {
      header: '3주차 · 카페',
      image: {
        background: 'assets/week2/social/cafe-interior.png',
        character: 'assets/characters/yumina/full-smile.png',
        characterWidth: '44%', characterLeft: '58%', characterBottom: '-8%',
      },
      speaker: '유민아', relationOf: 'yumina',
      text: '"진짜 나왔네요?" 유민아가 웃었다.\n\n마주 앉으니 그날 정류장이 거짓말 같았다.\n"…오랜만이에요. 이렇게 편한 거." 그 말이 이상하게 오래 남았다.\n\n그때, 주머니 속 폰이 울리기 시작했다. 베팅한 종목의 알림이었다.',
      choices: [
        { label: '폰을 엎어 두고, 그녀에게만 집중한다', next: 'w3_date_good', set: { yumina: 2 }, effects: { flags: { date_present: true } } },
        { label: '대화 중에도 자꾸 폰으로 시세를 확인한다', next: 'w3_date_bad', set: { yumina: -1 }, effects: { flags: { date_distracted: true } } },
      ],
    },
    w3_date_good: {
      header: '3주차 · 카페',
      image: {
        background: 'assets/week2/social/cafe-interior.png',
        character: 'assets/characters/yumina/full-smile.png',
        characterWidth: '44%', characterLeft: '58%', characterBottom: '-8%',
      },
      speaker: '유민아', relationOf: 'yumina',
      text: '폰을 엎어 두자 시간이 다르게 흘렀다.\n\n별것 아닌 얘기에도 유민아는 잘 웃었고,\n나는 오랜만에 누군가에게 "있는 사람"이 된 기분이었다.',
      next: 'w3_date_pay',
    },
    w3_date_bad: {
      header: '3주차 · 카페',
      image: {
        background: 'assets/week2/social/cafe-interior.png',
        character: 'assets/characters/yumina/full-fluster.png',
        characterWidth: '44%', characterLeft: '58%', characterBottom: '-8%',
      },
      speaker: '유민아', relationOf: 'yumina',
      text: '"…재밌어요? 그거." 유민아가 폰을 턱으로 가리켰다.\n\n"아, 아니. 미안." 황급히 엎었지만 늦었다.\n눈앞의 사람보다 화면 속 숫자가 더 급했던 걸, 그녀도 봤다.',
      next: 'w3_date_pay',
    },
    w3_date_pay: {
      header: '3주차 · 귀가',
      image: 'assets/week1/street/street-day-2.png',
      speaker: '{이름}(25)',
      text: '계산은 내가 했다. 지갑에 남은 거의 전부였다.\n\n버스에 오르는 그녀를 보내고 돌아서는데,\n좋았던 만큼 무서웠다. 이 사람을 계속 보려면, 돈이 있어야 했다.',
      next: 'w3_date_text', effects: { flags: { pressure: true } },
    },
    w3_date_text: {
      header: '3주차 · 밤',
      image: 'assets/week1/gosiwon/room-empty.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '22:09', battery: 61 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1100,
        messages: [
          { from: 'them', name: '유민아', text: '오늘 진짜 좋았어요 ㅎㅎ' },
          { from: 'them', name: '유민아', text: '잘 들어갔죠?' },
          { from: 'me', text: '응 잘 들어왔어. 나도 오늘… 진짜 오랜만에 사람 같았어.\n다음엔 내가 더 좋은 데 데려갈게.' },
          { from: 'them', name: '유민아', text: '그런 거 안 해도 돼요. 오늘 같은 거면 충분해요.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '충분하다는 말이, 나에겐 들리지 않았다.\n\n나는 이미 "더 좋은 데"를 약속해 버렸고,\n그 약속은 또 돈이었다.',
      next: 'w4_card',
    },

    /* --- 혼자 남은 루트 --- */
    w3_market_arrival: {
      header: '3주차 · 투자방',
      image: 'assets/week2/invest/investment-room.png',
      speaker: '{이름}(25)',
      text: '좋은 의자와 조용한 조명, 비싼 물건들은\n말을 하지 않아도 사람을 설득했다.\n\n여기서는 돈이 도덕처럼 보였다.',
      next: 'w3_1',
    },
    w3_1: {
      header: '3주차', image: 'assets/week2/invest/investment-room.png',
      speaker: '{이름}(25)',
      text: '차트가 올라갔다 내려갔다.\n호가창 숫자가 바뀔 때마다 손가락이 새로고침을 눌렀다.',
      choices: [
        { label: '차트를 계속 새로고침한다', next: 'w3_after' },
        { label: '알림을 끄고 잠깐 눕는다', next: 'w3_after' },
      ],
    },
    w3_after: {
      header: '3주차 · 밤',
      image: {
        background: 'assets/week2/invest/investment-room.png',
        character: 'assets/characters/hero.png',
        characterWidth: '40%', characterLeft: '53%', characterBottom: '-10%',
      },
      speaker: '{이름}(25)',
      text: '다음 주, 결과가 드러난다.\n이 한 주가 내 계급을 가른다는 걸, 그날 밤은 알 수 없었다.',
      next: 'w4_card',
    },

    /* ========== 4주차 — 결과 (베팅으로 자동 분기) ========== */
    w4_card: { type: 'card', header: '4주차', big: '4주차', sub: '결과', week: 4, next: 'w4_result' },
    /* w4_result → engine: temperance(절제)면 w4b(생존), 아니면 w4a(붕괴) */

    /* ---------- 4-A. 붕괴 ---------- */
    w4a: {
      header: '4주차 · 붕괴',
      image: 'assets/week1/gosiwon/floor-collapse.png',
      speaker: '{이름}(25)',
      text: '앱을 열었다. 숫자 앞의 마이너스가 먼저 눈에 들어왔다.\n\n원금도, 끌어 쓸 수 있던 신용도 다 녹았다.\n남은 건 빚과, 텅 빈 방과, 배터리가 닳아가는 폰 하나.',
      next: 'w4a_after', effects: { debt: 5000000, flags: { branch: 'A', invest_failed: true } },
    },
    /* w4a_after → engine: met_yumina면 빌림 체인(w4a_borrow_hesitate), 아니면 w4a_alone */

    w4a_borrow_hesitate: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '44%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '연락처를 위아래로 한참 굴렸다.\n끝에 유민아 이름에서 손가락이 멈췄다.\n\n그 사람한테만은 안 된다는 걸 알았다.\n아는데도, 한 번만 빌리면 만회할 수 있을 것 같았다.',
      choices: [
        { label: '메시지 창을 연다', next: 'w4a_borrow_text' },
        { label: '폰을 내려놓는다', next: 'w4a_borrow_refuse', effects: { flags: { yumina_spared: true } } },
      ],
    },
    w4a_borrow_text: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-worry.png',
        characterWidth: '44%', characterLeft: '7%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '2:11', battery: 9 },
        contact: '유민아', appearDelay: 260,
        messages: [
          { from: 'me', text: '민아야. 자?' },
          { from: 'me', text: '미안한데… 돈 좀 빌릴 수 있을까. 진짜 잠깐만.' },
          { from: 'them', name: '유민아', text: '무슨 일 있어? 갑자기.' },
          { from: 'them', name: '유민아', text: '얼마나.' },
        ],
        choices: [
          {
            label: '거짓말한다: "갑자기 보증금 뺄 데가 생겨서. 곧 갚을게"',
            next: 'w4a_borrow_lie', set: { yumina: 1 },
            effects: { cash: 500000, flags: { yumina_borrowed: true, yumina_betrayed: true } },
          },
          {
            label: '절반만 말한다: "투자가 좀 꼬였어. 미안해"',
            next: 'w4a_borrow_half',
            effects: { cash: 300000, flags: { yumina_borrowed: true } },
          },
          {
            label: '"…아냐. 미안. 잘 자."',
            next: 'w4a_borrow_refuse', set: { yumina: -1 },
            effects: { flags: { yumina_spared: true } },
          },
        ],
      },
    },
    w4a_borrow_lie: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-smile.png',
        characterWidth: '44%', characterLeft: '7%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '2:14', battery: 7 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1400,
        messages: [
          { from: 'me', text: '갑자기 보증금 뺄 데가 생겨서… 곧 갚을게. 진짜 미안.' },
          { from: 'them', name: '유민아', text: '그런 건 빨리 말하지 ㅠㅠ' },
          { from: 'system', tone: 'money', text: '유민아님이 500,000원을 보냈습니다.' },
          { from: 'them', name: '유민아', text: '조금 더 보탰어. 무리하지 말고, 밥 챙겨 먹어.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '묻지도 않고 더 얹어 보냈다.\n그 믿음이, 받는 순간 칼처럼 느껴졌다.\n\n그런데도 나는 이 돈으로 갚을 생각을 하지 않았다.\n이걸로 한 번만 더 걸어서, 만회할 생각만 했다.',
      next: 'w4a_rebet',
    },
    w4a_borrow_half: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/face-quiet.png',
        characterWidth: '44%', characterLeft: '7%', characterBottom: '-6%',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '2:14', battery: 7 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1400,
        messages: [
          { from: 'me', text: '투자가 좀 꼬였어. 미안해.' },
          { from: 'them', name: '유민아', text: '…너 괜찮은 거 맞아?' },
          { from: 'system', tone: 'money', text: '유민아님이 300,000원을 보냈습니다.' },
          { from: 'them', name: '유민아', text: '이번 한 번만이야. 다음엔 나한테 이런 거 말고, 그냥 힘들다고 말해.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '그녀는 선을 그으면서도 결국 보냈다.\n"힘들다고 말해"라는 말이, 가장 아팠다.\n\n나는 힘들다고 말하는 대신,\n그 돈을 또 화면에 밀어 넣을 생각을 하고 있었다.',
      next: 'w4a_rebet',
    },
    w4a_rebet: {
      header: '4주차 · 새벽',
      image: 'assets/week2/invest/investment-room.png',
      speaker: '{이름}(25)',
      text: '빌린 돈을 그대로 걸었다. 만회할 수 있다고 믿으면서.\n\n도박이 진짜 무서운 건 잃는 게 아니라,\n"다음 한 번"이 늘 있다고 속삭이는 거였다.\n\n그 새벽, 빌린 돈마저 사라졌다.',
      next: 'w4a_exposed', effects: { debt: 500000 },
    },
    w4a_exposed: {
      header: '4주차 · 들통',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/full-despair.png',
        characterWidth: '40%', characterLeft: '60%', characterBottom: '-8%',
        backgroundPosition: 'center top',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '20:02', battery: 14 },
        contact: '유민아', appearDelay: 260,
        messages: [
          { from: 'system', text: '── 며칠 뒤 ──' },
          { from: 'them', name: '유민아', text: '너 그 돈… 도박한 거였어?' },
          { from: 'me', text: '아니 그게, 만회하려고 한 거고 진짜 곧 갚으려고 했는데 타이밍이 안 맞아서 어쩔 수 없이' },
          { from: 'them', name: '유민아', text: '…난 네가 솔직한 사람인 줄 알았는데.' },
        ],
        choices: [
          { label: '"미안해. 한 번만 믿어줘. 이번엔 진짜—"', next: 'w4a_exposed_end', set: { yumina: -6 }, effects: { flags: { yumina_lost: true } } },
          { label: '아무 말도 보내지 못한다', next: 'w4a_exposed_end', set: { yumina: -6 }, effects: { flags: { yumina_lost: true } } },
        ],
      },
    },
    w4a_exposed_end: {
      header: '4주차 · 들통',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/yumina/full-despair.png',
        characterWidth: '40%', characterLeft: '60%', characterBottom: '-8%',
        backgroundPosition: 'center top',
      },
      phone: {
        screen: 'messages',
        statusbar: { time: '20:05', battery: 13 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1600,
        messages: [
          { from: 'them', name: '유민아', text: '그 돈은 안 갚아도 돼.' },
          { from: 'them', name: '유민아', text: '대신, 이제 연락하지 마.' },
          { from: 'me', text: '민아야', note: '읽음' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '내 마지막 메시지 옆에 "읽음"만 떴다.\n그 뒤로 답은 오지 않았다.\n\n나는 빌린 돈으로, 나를 처음 봐준 단 한 사람을 잃었다.',
      next: 'w5a_card',
    },
    w4a_borrow_refuse: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '44%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '결국 액수를 보내지 못하고 폰을 껐다.\n그 사람한테까지 손을 벌리면, 정말 돌아올 수 없을 것 같았다.\n\n빚은 고스란히 내 몫으로 남았다.\n적어도 그녀만은, 아직 태우지 않았다.',
      next: 'w5a_card',
    },

    /* 붕괴 + 혼자 */
    w4a_alone: {
      header: '4주차 · 새벽',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '44%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '전화를 걸 사람조차 없다는 게, 빚보다 먼저 사무쳤다.\n\n도와달라고 말할 데가 없는 사람은\n이렇게까지 내려갈 수 있다는 걸, 그제야 알았다.',
      next: 'w5a_card',
    },

    /* ---------- 4-B. 생존 ---------- */
    w4b: {
      header: '4주차 · 생존',
      image: {
        background: 'assets/week5/han-river-view.png',
        character: 'assets/characters/hero.png',
        characterWidth: '39%', characterLeft: '57%', characterBottom: '-11%',
      },
      speaker: '{이름}(25)',
      text: '앱을 열었다. 처음으로 숫자 앞에 플러스가 붙어 있었다.\n\n절제한 만큼만 걸었고, 그만큼이 돌아왔다.\n처음으로 돈이 돈을 불렀다.',
      next: 'w4b_after', effects: { assets: 5000000, flags: { branch: 'B' } },
    },
    /* w4b_after → engine: met_yumina면 w4b_yumina, 아니면 w4b_alone */

    w4b_yumina: {
      header: '4주차 · 밤',
      image: {
        background: 'assets/week2/social/cafe-interior.png',
        character: 'assets/characters/yumina/full-neutral.png',
        characterWidth: '44%', characterLeft: '58%', characterBottom: '-8%',
      },
      speaker: '유민아', relationOf: 'yumina',
      text: '돈이 들어오자, 마음이 먼저 커졌다.\n\n국밥이면 충분하다던 사람한테\n나는 자꾸 더 비싼 걸 들이밀었다. 그게 사랑인 줄 알았다.\n\n"…예전이 더 좋았는데." 그녀가 농담처럼 흘린 말을, 나는 듣지 못했다.',
      next: 'w4b_yumina_text',
    },
    w4b_yumina_text: {
      header: '4주차 · 밤',
      image: 'assets/week2/social/cafe-interior.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '21:30', battery: 73 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1200,
        messages: [
          { from: 'me', text: '이번 주말엔 호텔 디너 예약했어. 드레스코드 있대.' },
          { from: 'them', name: '유민아', text: '오… 좋네 ㅎㅎ' },
          { from: 'them', name: '유민아', text: '근데 나는 그냥 너랑 국밥 먹던 게 더 좋았어.', note: '읽음' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '읽고도, 무슨 말인지 알아듣지 못했다.\n\n돈이 귀를 막은 사람은,\n사랑마저 더 비싼 걸로 갚으려 든다.',
      next: 'w5b_card_y',
    },
    w4b_alone: {
      header: '4주차 · 생존',
      image: 'assets/week5/han-river-view.png',
      speaker: '{이름}(25)',
      text: '높은 곳에서 내려다본 도시는 조용했다.\n\n아래에선 다들 바쁘게 움직였지만,\n여기서는 모든 게 내 선택을 기다리는 것 같았다.\n곁에 그걸 함께 볼 사람이 없다는 것만 빼면.',
      next: 'w5b_card_n',
    },

    /* ========== 5주차 — 엔딩 ========== */

    /* ----- 붕괴 계열 (흙 / 한강 / 파멸) ----- */
    w5a_card: { type: 'card', header: '5주차', big: '5주차', sub: '바닥에서', week: 5, next: 'w5a_bridge_arrival' },
    w5a_bridge_arrival: {
      header: '5주차 · 한강',
      image: 'assets/week5/han-river-view.png',
      speaker: '{이름}(25)',
      text: '차들이 다리 위를 지나갔다.\n강변 불빛이 물 위에 길게 늘어졌다.',
      next: 'w5a_choice',
    },
    w5a_choice: {
      header: '5주차 · 한강',
      image: {
        background: 'assets/week5/han-river-view.png',
        character: 'assets/characters/hero.png',
        characterWidth: '38%', characterLeft: '58%', characterBottom: '-11%',
        textDelay: 900, characterDelay: 520,
      },
      speaker: '{이름}(25)',
      text: '한강 다리 위에 섰다.\n뒤로는 돈으로 빛나는 도시, 앞으로는 검은 물.\n난간은 차가웠다.\n\n더 내려갈 곳도 없었다.',
      choices: [
        { label: '돌아선다. 그냥 방으로 간다', next: 'ed_dirt_room' },
        { label: '난간 너머를 본다', next: 'ed_han_still' },
        { label: '그 자리에 주저앉는다', next: 'ed_ruin_phone' },
      ],
    },

    /* 흙수저 시퀀스 */
    ed_dirt_room: {
      header: '엔딩 · 흙수저',
      image: {
        background: 'assets/week1/gosiwon/room-empty.png',
        character: 'assets/characters/hero.png',
        characterWidth: '44%', characterLeft: '50%', characterBottom: '-10%',
        backgroundPosition: 'center top',
      },
      speaker: '{이름}(25)',
      text: '돌아섰다. 변한 건 없었다. 여전히 307호.\n\n달라진 건 통장의 마이너스와,\n끝내 보내지 못한 말 하나뿐이었다.',
      next: 'ed_dirt_phone',
    },
    ed_dirt_phone: {
      header: '엔딩 · 흙수저',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '3:50', battery: 1 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1500,
        messages: [
          { from: 'system', text: '대화한 지 27일' },
          { from: 'me', text: '미안', note: '전송되지 않음' },
        ],
      },
      speaker: '{이름}(25)',
      text: '세 글자를 썼다 지웠다, 결국 전송 버튼을 누르지 못했다.\n\n배터리 1%. 화면이 꺼졌다.\n도시는 그대로 빛났고, 나만 꺼졌다.',
      next: 'e_dirt',
    },
    e_dirt: {
      type: 'end', header: '엔딩',
      big: '흙수저',
      sub: '도시는 끝까지 밝았다.\n그 불빛 어디에도, 내 자리는 없었다.',
    },

    /* 한강 시퀀스 */
    ed_han_still: {
      header: '엔딩 · 한강',
      image: 'assets/week5/han-river-view.png',
      speaker: '{이름}(25)',
      text: '불빛이 물 위에서 흔들렸다.\n바람이 지나가자 화면 밝기가 혼자 낮아졌다.',
      next: 'ed_han_phone',
    },
    ed_han_phone: {
      header: '엔딩 · 한강',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '4:11', battery: 4 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1500,
        messages: [
          { from: 'them', name: '유민아', text: '이제 연락하지 마.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '마지막으로 그 한 줄을 한참 봤다.\n\n그리고 화면을 껐다.\n불빛이 물 위에서 흔들리고 있었다.',
      next: 'e_han',
    },
    e_han: {
      type: 'end', header: '엔딩',
      big: '한강',
      sub: '도시는 끝까지 빛났고,\n그 빛이 물 위에서 흔들리는 걸, 마지막으로 봤다.',
    },

    /* 파멸 시퀀스 */
    ed_ruin_phone: {
      header: '엔딩 · 파멸',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '4:18', battery: 2 },
        contact: '알림', revealText: 'afterFlow', holdMs: 1400,
        messages: [
          { from: 'system', text: '대출 상환일이 지났습니다.' },
          { from: 'system', text: '부재중 전화 11통' },
          { from: 'me', text: '미안', note: '전송되지 않음' },
        ],
      },
      speaker: '{이름}(25)',
      text: '알림이 겹쳐 떴다.\n미납, 부재중 전화, 전송되지 않은 메시지가 같은 화면에 쌓였다.\n\n손가락이 화면을 닫았다.\n곧바로 다른 알림이 올라왔다.',
      next: 'e_ruin',
    },
    e_ruin: {
      type: 'end', header: '엔딩',
      big: '파멸',
      sub: '다음 날에도 미납 알림은 남아 있었다.\n통장 잔액과 대출 잔액만 다시 갱신됐다.',
    },

    /* ----- 생존 계열 (은 / 금) ----- */
    /* 유민아 만난 루트 */
    w5b_card_y: { type: 'card', header: '5주차', big: '5주차', sub: '갈림길', week: 5, next: 'w5b_choice_y' },
    w5b_choice_y: {
      header: '5주차 · 생존',
      image: {
        background: 'assets/week2/invest/investment-room.png',
        character: 'assets/characters/hero.png',
        characterWidth: '39%', characterLeft: '53%', characterBottom: '-10%',
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '여기서 멈출 수도, 더 키울 수도 있었다.\n\n폰엔 유민아의 메시지가 떠 있었다. "이번 주말 국밥 ㄱ?"\n그 한 줄과, 화면 속 불어나는 숫자가 같은 손바닥 위에 있었다.',
      choices: [
        { label: '앱을 끄고, 약속 장소로 간다', next: 'ed_silver_gukbap' },
        { label: '약속을 미루고, 전부 걸어 더 키운다', next: 'ed_gold_rich', effects: { flags: { chose_money: true } } },
      ],
    },
    /* 유민아 못 만난 루트 */
    w5b_card_n: { type: 'card', header: '5주차', big: '5주차', sub: '갈림길', week: 5, next: 'w5b_choice_n' },
    w5b_choice_n: {
      header: '5주차 · 생존',
      image: {
        background: 'assets/week2/invest/investment-room.png',
        character: 'assets/characters/hero.png',
        characterWidth: '39%', characterLeft: '53%', characterBottom: '-10%',
      },
      speaker: '{이름}(25)',
      text: '여기서 멈출 수도, 더 키울 수도 있었다.\n\n멈춰서 가질 평범한 하루를 떠올려 봤지만,\n그 하루를 같이 보낼 사람이 없다는 걸 깨닫자, 멈출 이유도 옅어졌다.',
      choices: [
        { label: '여기서 멈추고 만족한다', next: 'e_silver' },
        { label: '전부 걸어 더 크게 키운다', next: 'e_gold' },
      ],
    },

    /* 은수저 시퀀스 */
    ed_silver_gukbap: {
      header: '엔딩 · 은수저',
      image: {
        background: 'assets/week2/social/cafe-interior.png',
        character: 'assets/characters/yumina/full-smile.png',
        characterWidth: '44%', characterLeft: '58%', characterBottom: '-8%',
      },
      speaker: '유민아', relationOf: 'yumina',
      text: '앱을 껐다. 손이 잠깐 허전했지만, 그뿐이었다.\n\n허름한 국밥집, 마주 앉은 유민아가 김 너머로 웃었다.\n"거봐. 이런 게 좋다니까."\n\n더 키웠으면 가질 수 있던 돈이, 하나도 아깝지 않았다.',
      next: 'ed_silver_phone',
    },
    ed_silver_phone: {
      header: '엔딩 · 은수저',
      image: 'assets/week1/street/studio-front.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '21:40', battery: 64 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1300,
        messages: [
          { from: 'them', name: '유민아', text: '오늘 맛있었다 ㅎㅎ' },
          { from: 'them', name: '유민아', text: '다음 주에 또 봐요.' },
          { from: 'me', text: '응. 다음 주에 또 보자.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '종목 알림은 더 이상 울리지 않았다.\n대신 "다음 주에 또 봐요"가 떠 있었다.\n\n한 칸 올라선 게 아니었다.\n처음으로, 내가 서 있을 자리가 생긴 거였다.',
      next: 'e_silver',
    },
    e_silver: {
      type: 'end', header: '엔딩',
      big: '은수저',
      sub: '특별할 것 없는 토요일이,\n처음으로 온전히 내 것이었다.',
    },

    /* 금수저 시퀀스 */
    ed_gold_rich: {
      header: '엔딩 · 금수저',
      image: {
        background: 'assets/week2/invest/investment-room.png',
        character: 'assets/characters/hero.png',
        characterWidth: '39%', characterLeft: '53%', characterBottom: '-10%',
      },
      speaker: '{이름}(25)',
      text: '약속을 미뤘다. "다음에." 그 다음은 오지 않았다.\n\n대신 숫자가 불었다. 자릿수가 바뀌고, 또 바뀌었다.\n도시가 전부 내 것 같았다.\n\n그런데 이 좋은 걸 같이 볼 사람이, 어느새 하나도 없었다.',
      next: 'ed_gold_phone',
    },
    ed_gold_phone: {
      header: '엔딩 · 금수저',
      image: 'assets/week2/invest/investment-room.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '23:58', battery: 88 },
        contact: '유민아', revealText: 'afterFlow', holdMs: 1500,
        messages: [
          { from: 'system', text: '── 3개월 전 ──' },
          { from: 'them', name: '유민아', text: '바쁜가 보네. 잘 지내요.' },
          { from: 'me', text: '나중에 연락할게', note: '읽음' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '석 달 전 그 대화가, 우리의 마지막이었다.\n"나중에"라고 보낸 답장 옆엔, 그녀가 읽은 표시만 남아 있었다.\n\n가질 수 있는 건 다 가졌다. 그 사람만 빼고.',
      next: 'e_gold',
    },
    e_gold: {
      type: 'end', header: '엔딩',
      big: '금수저',
      sub: '도시는 끝까지 빛났고,\n나를 비추는 불은, 하나도 없었다.',
    },
  },
};
