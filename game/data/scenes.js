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
     choices:     [ { label, next, set:{yumina:+1}, effects:{...}, requires:{happyAtMost:0} } ]
     set/effects: 호감도 / 돈·플래그·행복 변화
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
       w4_result                          → 수익/코인성공/절제 = 생존 / 붕괴
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
        { label: '그냥 나간다', next: 'a1_leave_plain', effects: { happy: -1, flags: { appearance: 'neglect', confidence: 'low' } } },
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
          effects: { cash: 200000, flags: { wallet_choice: 'returned', seed_wallet: 'clean' } },
        },
        {
          label: '그냥 가진다',
          next: 'a1_wallet_kept',
          effects: { cash: 1200000, flags: { wallet_choice: 'kept', seed_wallet: 'dirty' } },
        },
      ],
    },
    a1_wallet_returned: {
      header: '1막: 골목',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '전화를 걸자, 지갑 주인은 몇 번이나 고맙다고 했다.\n\n사례금은 이십만 원.\n생각보다 큰돈이었다. 손바닥은 깨끗했고, 주머니는 처음으로 묵직했다.',
      next: 'a1_after_work_homefront',
    },
    a1_wallet_kept: {
      header: '1막: 골목',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '신분증을 빼고, 현금만 주머니에 넣었다.\n\n백이십만 원.\n손에 잡히는 액수가 커지자 심장도 같이 커졌다.\n아무도 보지 않았다. 그 사실이 이상하게 더 무서웠다.',
      next: 'a1_after_work_homefront',
    },
    a1_after_work_homefront: {
      header: '1막: 귀가',
      image: 'assets/week1/street/studio-front.png',
      speaker: '{이름}(25)',
      text: '골목 끝 고시원에 불이 하나 켜져 있었다. 내 방이다.\n\n돌아온다는 건 쉬는 게 아니라,\n다시 같은 자리로 밀려나는 일이었다.',
      next: 'a1_loan_offer',
    },
    a1_loan_offer: {
      header: '1막: 대출앱',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '방에 눕자마자 휴대폰 알림이 떴다.\n\n"무직 가능. 3분 승인. 최대 3,000만원 즉시 입금."\n\n처음엔 광고라고 생각했다.\n그런데 계좌에 돈이 꽂히는 상상을 하자, 화면을 닫는 게 더 어려워졌다.',
      choices: [
        {
          label: '3,000만원을 바로 빌린다',
          next: 'w1_card',
          effects: { cash: 30000000, debt: 42000000, flags: { first_loan: true, seed_money: 'loan', pressure: true } },
        },
        {
          label: '망설이다가 결국 3,000만원을 빌린다',
          next: 'w1_card',
          effects: { cash: 30000000, debt: 42000000, happy: -1, flags: { first_loan: true, seed_money: 'loan_delayed', pressure: true } },
        },
      ],
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
        { label: '그냥 버스를 기다린다', next: 'w1_hunt_skip', effects: { happy: -1 } },
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
        { label: '그냥 버스를 기다린다', next: 'w1_hunt_skip', effects: { happy: -1 } },
      ],
    },
    w1_hunt_fail_plain: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/b2-fail.png',
      speaker: '여자',
      text: '"…네? 죄송한데, 좀."\n\n여자는 한 발 물러섰고, 마침 도착한 버스에 올라탔다.\n남은 건 정류장의 적막과, 얼굴로 확 몰리는 열기뿐이었다.',
      next: 'w1_rejection_walk', effects: { happy: -4 },
    },
    w1_hunt_fail_checked: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/a1-approach.png',
      speaker: '여자',
      text: '"아… 죄송해요. 번호는 좀."\n\n말투가 험한 건 아니었다.\n그래서 더 정확하게 거절당한 기분이었다.',
      next: 'w1_rejection_walk', effects: { happy: -4 },
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
    w2_card: { type: 'card', header: '2주차', big: '2주차', sub: '첫 선택', week: 2, next: 'w2_chat_check' },
    w2_chat_check: {
      header: '2주차 · 까까오톡',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'chatRooms',
        statusbar: { time: '1:02', battery: 37 },
        title: '까까오톡',
        subtitle: '새 알림 103개',
        subtitleAfterRead: '읽은 알림 정리됨',
        badge: '2주차',
        badgeAfterRead: '확인',
        readFlag: 'weekly_chat_w2',
        rooms: [
          {
            name: '유민아',
            preview: '오늘도 늦게까지 깨어 있어요?',
            readPreview: '무리하지 말고요. 다음엔 밥이라도 먹어요.',
            meta: '방금',
            readMeta: '읽음',
            badge: '1',
            tone: 'warm',
            avatar: '유',
            requiresFlag: 'met_yumina',
            readFlag: 'yumina_chat_checked',
          },
          {
            name: '비트코인 레버리지방',
            preview: '오늘 청산당한 사람 손 들어보세요.',
            readPreview: '주식으로 시드 만들고 코인으로 끝내야죠.',
            meta: '1분 전',
            readMeta: '읽음',
            badge: '99+',
            tone: 'risk',
            avatar: '₿',
            readFlag: 'invest_room_seen',
          },
          {
            name: '배금증권 알림',
            preview: '관심종목 급등 알림이 도착했습니다.',
            readPreview: '잠이 안 오는 밤 · 앱 선택 대기',
            meta: '3분 전',
            readMeta: '대기',
            badge: '1',
            tone: 'stock',
            avatar: '증',
            readFlag: 'weekly_chat_w2',
          },
        ],
        choices: [
          {
            label: '유민아 채팅방을 연다',
            next: 'w2_chat_yumina_ping',
            requires: { flags: { met_yumina: true }, missingFlags: ['weekly_chat_w2'] },
            set: { yumina: 1 },
            effects: { happy: 1, flags: { weekly_chat_w2: 'yumina', yumina_chat_checked: true } },
          },
          {
            label: '투자방 알림을 훑어본다',
            next: 'w2_chat_invest_room',
            requires: { missingFlags: ['weekly_chat_w2'] },
            effects: { flags: { weekly_chat_w2: 'invest_room', invest_room_seen: true } },
          },
          {
            label: '채팅앱을 닫고 다른 앱을 고른다',
            next: 'w2_phone_apps',
            effects: { flags: { weekly_chat_w2: 'skipped' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '2주차가 시작되자 폰이 먼저 울렸다.\n돈을 불리는 앱보다, 사람한테 온 알림이 위에 떠 있었다.\n\n그런데 그 아래 투자방 알림은 더 시끄러웠다.',
    },
    w2_chat_yumina_ping: {
      header: '2주차 · 유민아',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '1:04', battery: 37 },
        revealText: 'afterFlow',
        contact: '유민아',
        messages: [
          { type: 'system', text: '2주차 새벽 1:04' },
          { from: 'them', text: '오늘도 늦게까지 깨어 있어요?' },
          { from: 'me', text: '네. 잠이 좀 안 와서요.' },
          { from: 'them', text: '무리하지 말고요. 다음엔 밥이라도 먹어요.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '짧은 문장인데도 방 안 공기가 조금 달라졌다.\n\n기분이 올라오자, 더 빨리 돈을 만들어야 한다는 생각도 같이 올라왔다.',
      next: 'w2_phone_apps',
    },
    w2_chat_invest_room: {
      header: '2주차 · 투자방',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '1:04', battery: 36 },
        revealText: 'afterFlow',
        contact: '비트코인 레버리지방',
        messages: [
          { type: 'system', text: '익명 투자방 · 328명 접속 중' },
          { from: 'them', name: '방장', text: '원금 복구는 속도가 생명입니다.' },
          { from: 'them', name: '익명23', text: '방금 500으로 2,000 찍었습니다.' },
          { from: 'them', name: '익명77', text: '주식으로 시드 만들고 코인으로 끝내야죠.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '타인의 수익 인증이 화면을 채웠다.\n진짜인지 아닌지는 중요하지 않았다.\n내 잔고만 느려 보였다.',
      next: 'w2_phone_apps',
    },
    w2_phone_apps: {
      header: '2주차 · 휴대폰',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'apps',
        statusbar: { time: '1:05', battery: 36 },
        homeTitle: '잠이 안 오는 밤',
        homeSubtitle: '손가락이 두 앱 사이에서 멈췄다',
        apps: [
          { title: '홀짝', meta: '500만원 판 · 즉시 정산', icon: '홀', tone: 'gamble' },
          { title: '배금증권', meta: '급등 알림 · 종목토론방', icon: '▲', tone: 'stock' },
        ],
        choices: [
          { label: '도박앱을 연다', next: 'w2_first_gamble_intro', effects: { flags: { first_app: 'gamble' } } },
          { label: '주식앱을 연다', next: 'w2_market_open', effects: { flags: { first_app: 'stock' } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '폰 화면이 켜졌다.\n증권 앱 옆에, 방금 설치한 듯한 도박앱 아이콘이 떠 있었다.\n\n돈을 불리는 방법이 둘로 보였다.',
    },
    w2_first_gamble_intro: {
      header: '2주차 · 홀짝',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'oddEvenGame',
        block: true,
        statusbar: { time: '1:09', battery: 35 },
        oddEvenGame: {
          title: '홀짝',
          badge: 'LIVE',
          round: '체험 베팅',
          bet: 5000000,
          winAmount: 5000000,
          loseAmount: 5000000,
          winNext: 'w2_first_gamble_win',
          loseNext: 'w2_first_gamble_loss',
          winEffects: { cash: 5000000 },
          loseEffects: { cash: -5000000 },
        },
      },
      speaker: '{이름}(25)',
      text: '앱은 설명이 거의 없었다.\n홀, 짝. 금액. 결과.\n\n복잡하지 않아서 더 위험해 보이지 않았다.',
    },
    w2_first_gamble_win: {
      header: '2주차 · 홀짝 결과',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '맞았다.\n오백만 원이 너무 가볍게 늘었다.\n\n화면 위로 증권앱 알림이 하나 더 떠올랐다.',
      choices: [
        { label: '오른 돈으로 주식앱을 연다', next: 'w2_market_open' },
      ],
    },
    w2_first_gamble_loss: {
      header: '2주차 · 홀짝 결과',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '틀렸다.\n오백만 원이 사라지는 데는 몇 초도 걸리지 않았다.\n\n그런데 이상하게, 손은 앱을 끄지 않고 다른 알림을 눌렀다.',
      choices: [
        { label: '손실을 덮으려고 주식앱을 연다', next: 'w2_market_open' },
      ],
    },
    w2_market_open: {
      header: '2주차 · 주식앱',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'market',
        statusbar: { time: '1:08', battery: 34 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
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
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
        posts: [
          { user: '불개미', text: '배금전자 내일 상한가 간다. 지금이 막차다.', hot: true, rec: 312 },
          { user: '존버맨', text: '거래량 터졌는데 안 사는 사람 이해가 안 됨.', rec: 188 },
          { user: '한방', text: '전 재산 배금전자 풀매수. 이번엔 진짜다.', hot: true, rec: 204 },
          { user: '계좌인증', text: '어제 산 사람들 전부 수익권. 늦기 전에 타라.', hot: true, rec: 171 },
        ],
        choices: [
          { label: '주문창 열기', next: 'w2_pick' },
        ],
      },
      speaker: '{이름}(25)',
      text: '글 목록이 온통 배금전자였다.\n추천 수가 높은 글일수록, "지금 안 사면 늦는다"고 했다.',
    },
    /* 종목 선택 — 초반 도파민: 배금전자 한 종목으로 성공 경험을 준다. */
    w2_pick: {
      header: '2주차 · 관심종목',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'market',
        statusbar: { time: '1:18', battery: 30 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
        choices: [
          {
            label: '배금전자 — 전 재산 풀매수',
            next: 'w2_buy_baegeum',
            effects: { stockBuyAll: { symbol: '배금전자', buyPrice: 72000, resultMultiplier: 4 }, flags: { stock_pick: 'baegeum', stock_first_win: true } },
          },
          {
            label: '아무것도 사지 않는다',
            next: 'w2_skip_done',
            effects: { stockSkip: { symbol: '배금전자', buyPrice: 72000, resultMultiplier: 4 }, flags: { stock_pick: 'none' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '관심종목은 사실상 하나였다.\n검색창도, 종토방도, 추천 글도 배금전자를 가리키고 있었다.\n\n전 재산을 걸 것인가. 아니면 이번에도 그냥 볼 것인가.',
    },
    w2_buy_baegeum: {
      header: '2주차 · 체결',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'orderFilled',
        statusbar: { time: '1:19', battery: 29 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
        choices: [ { label: '다음 알림을 확인한다', next: 'w2_stock_result_baegeum' } ],
      },
      speaker: '{이름}(25)',
      text: '확인 버튼을 눌렀다.\n모두가 가는 쪽에 올라탔다는 안도가, 잠깐 들었다.',
    },
    w2_skip_done: {
      header: '2주차 · 주문',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '주문창을 닫았다.\n예수금은 그대로 남았다.',
      choices: [
        { label: '다음 알림을 확인한다', next: 'w2_stock_result_skip' },
      ],
    },
    w2_stock_result_baegeum: {
      header: '2주차 · 다음 알림',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      effects: { stockResult: true },
      phone: {
        screen: 'marketResult',
        statusbar: { time: '9:03', battery: 51 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
        choices: [ { label: '뉴스 속보를 본다', next: 'w2_kospi_news_win' } ],
      },
      speaker: '{이름}(25)',
      text: '알림은 너무 빨리 왔다.\n빨간 숫자가 화면을 채웠고, 어제의 망설임이 전부 실력처럼 느껴졌다.\n\n한 번 맞췄다. 그 사실이 생각보다 크게 몸에 남았다.',
    },
    w2_stock_result_skip: {
      header: '2주차 · 다음 알림',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'missedResult',
        statusbar: { time: '9:03', battery: 51 },
        stock: { symbol: '배금전자', code: '001457', buyPrice: 72000, resultMultiplier: 4 },
        choices: [ { label: '뉴스 속보를 본다', next: 'w2_kospi_news_skip' } ],
      },
      speaker: '{이름}(25)',
      text: '알림이 떴다.\n내가 사지 않은 배금전자가 더 올라 있었다.\n\n돈을 잃은 건 아니었다. 그런데 이상하게, 잃은 것보다 더 오래 손이 떨렸다.',
    },
    w2_kospi_news_win: {
      header: '2주차 · 경제 뉴스',
      image: {
        background: 'assets/news/anchor.png',
        backgroundPosition: 'center',
        banner: {
          kicker: '경제 속보',
          headline: '코스피 4,000선 돌파',
          sub: '배금전자 288,000원… 개인 순매수 확대',
          ticker: 'KOSPI 4,012.86 ▲ 2.7%  |  배금전자 288,000원  |  거래대금 연중 최대',
        },
      },
      effects: { flags: { market_news_seen: true, kospi_news: 'win' } },
      speaker: '뉴스 앵커',
      text: '코스피가 장중 4,000선을 돌파했습니다.\n배금전자는 개인 매수세가 몰리며 288,000원에 거래되고 있습니다.\n\n방금 산 종목이 뉴스 화면 가운데에 걸렸다.\n내가 탄 게, 갑자기 시장 전체의 흐름처럼 보였다.',
      choices: [
        { label: '수익 알림 밑의 이벤트를 누른다', next: 'w2_stock_win_blackjack_intro' },
      ],
    },
    w2_stock_win_blackjack_intro: {
      header: '2주차 · 블랙잭 이벤트',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'blackjackGame',
        block: true,
        statusbar: { time: '9:08', battery: 50 },
        blackjackGame: {
          title: 'BLACKJACK',
          badge: 'BONUS',
          bet: 50000000,
          winAmount: 50000000,
          loseAmount: 50000000,
          winNext: 'w2_stock_win_blackjack_win',
          loseNext: 'w2_stock_win_blackjack_loss',
          pushNext: 'w2_stock_win_blackjack_push',
          winEffects: { cash: 50000000, flags: { post_stock_gamble_played: true } },
          loseEffects: { cash: -50000000, flags: { post_stock_gamble_played: true } },
          pushEffects: { flags: { post_stock_gamble_played: true } },
        },
      },
      speaker: '{이름}(25)',
      text: '수익 알림 아래로 작은 배너가 붙었다.\n"오늘 수익자 전용, 블랙잭 보너스."\n\n방금 번 돈이라서, 5천만 원도 이상하게 작아 보였다.',
    },
    w2_stock_win_blackjack_win: {
      header: '2주차 · 블랙잭 결과',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '딜러가 터졌다.\n아무것도 더 하지 않았는데 돈이 붙었다.\n\n그때, 더 큰 수익 인증 알림이 화면 위에 밀려왔다.',
      choices: [
        { label: '코인 레버리지방 알림을 누른다', next: 'w2_coin_news' },
      ],
    },
    w2_stock_win_blackjack_loss: {
      header: '2주차 · 블랙잭 결과',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '한 장을 더 받자마자 숫자가 21을 넘어갔다.\n5천만 원이 사라졌다.\n\n잃었는데도, 더 큰 판을 말하는 알림은 계속 떠 있었다.',
      choices: [
        { label: '코인 레버리지방 알림을 누른다', next: 'w2_coin_news' },
      ],
    },
    w2_stock_win_blackjack_push: {
      header: '2주차 · 블랙잭 결과',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      speaker: '{이름}(25)',
      text: '비기자 돈은 그대로 돌아왔다.\n잃지 않았다는 사실보다, 못 땄다는 감각이 더 크게 남았다.\n\n그때, 더 큰 판을 말하는 알림이 화면 위에 밀려왔다.',
      choices: [
        { label: '코인 레버리지방 알림을 누른다', next: 'w2_coin_news' },
      ],
    },
    w2_kospi_news_skip: {
      header: '2주차 · 경제 뉴스',
      image: {
        background: 'assets/news/anchor.png',
        backgroundPosition: 'center',
        banner: {
          kicker: '경제 속보',
          headline: '코스피 4,000선 돌파',
          sub: '배금전자 288,000원… 개인 순매수 확대',
          ticker: 'KOSPI 4,012.86 ▲ 2.7%  |  배금전자 288,000원  |  외국인·개인 동반 매수',
        },
      },
      effects: { flags: { market_news_seen: true, kospi_news: 'skip', missed_news_tilt: true } },
      speaker: '뉴스 앵커',
      text: '코스피가 장중 4,000선을 돌파했습니다.\n배금전자는 개인 매수세가 몰리며 288,000원에 거래되고 있습니다.\n\n사지 않은 종목 이름이 뉴스 자막으로 지나갔다.\n돈은 그대로였는데, 기회만 내 손에서 빠져나간 것 같았다.',
      choices: [
        { label: '알림을 닫는다', next: 'w2_after_stock' },
      ],
    },
    /* 코인 입문 전 — 모두가 "끝났다"고 곡소리. 아무도 안 살 때가 바닥처럼 보인다(역발상 미끼). */
    w2_coin_news: {
      header: '2주차 · 유튜브',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'youtube',
        statusbar: { time: '9:41', battery: 46 },
        video: {
          thumb: 'assets/week2/invest/btc.png',
          title: '비트코인, 여기서 끝났습니다 | 반등은 없다',
          channel: '코인청산TV',
          meta: '조회수 21만회 · 2시간 전',
          duration: '13:02',
        },
        shorts: [
          { title: '지금이라도 손절하세요', tone: 'red' },
          { title: '레버리지 = 전재산 증발', tone: 'red' },
          { title: '코인 시대는 끝났다', tone: 'blue' },
        ],
        choices: [
          {
            label: '"다들 끝났다는데… 아무도 안 살 때가 바닥 아냐?"',
            next: 'w2_mstu_leverage',
            effects: { flags: { coin_news_seen: true, contrarian_tempted: true } },
          },
          {
            label: '"진짜 끝났나 보다." 코인은 안 건드린다',
            next: 'w2_after_stock',
            effects: { flags: { leverage_resisted: true, temperance: true } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '추천 영상이 죄다 빨갰다. 끝났다, 반등 없다, 지금이라도 팔아라.\n\n원래 다들 이렇게 욕할 때 줍는 거 아니었나.\n아무도 안 산다니까 오히려 손이 근질거렸다.',
    },
    /* 중간 게이트 — MSTU(주식 레버리지)도 -99%. 댓글은 "사기다, 사지 마라". 그래도 역발상으로 산다. */
    w2_mstu_leverage: {
      header: '2주차 · 레버리지',
      image: 'assets/week2/invest/mstu.png',
      speaker: '{이름}(25)',
      text: 'MSTU. 마이크로스트래티지를 2배로 따라가는 주식 레버리지였다.\n1년 차트가 -99%. 거의 바닥에 누워 있었다.\n\n댓글은 전부 경고였다.\n"레버리지는 사기다." "절대 사지 마라, 나 청산당했다." "만든 놈들이 도둑이야."\n\n근데 다들 이미 팔고 나서 하는 소리였다.\n그럼 이제 더 내릴 사람도 없는 거 아닌가.',
      choices: [
        {
          label: '"모두가 사지 말라는 그 자리를 산다"',
          next: 'w2_leverage_feed',
          effects: { flags: { mstu_entered: true, leverage_hooked: true, contrarian_tempted: true } },
        },
        {
          label: '"사기라잖아." 넘긴다',
          next: 'w2_after_stock',
          effects: { flags: { leverage_resisted: true, temperance: true } },
        },
      ],
    },
    w2_leverage_feed: {
      header: '2주차 · 레버리지 커뮤니티',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'community',
        statusbar: { time: '9:14', battery: 49 },
        communityTitle: '비트코인 레버리지방',
        stock: { symbol: 'BTC 레버리지', code: 'BTC-PERP', buyPrice: 118000, resultMultiplier: 11 },
        posts: [
          { user: '전재산행', text: '오늘 청산당했습니다. 3억 녹았어요. 다들 하지 마세요.', down: true, rec: 512 },
          { user: '존버끝', text: '레버리지 사기 맞네 ㅋㅋ 나 인생 끝났다.', down: true, rec: 430 },
          { user: '관망러', text: '비트코인 이제 진짜 끝. 반등? 꿈 깨라.', down: true, rec: 288 },
          { user: '마지막탈출', text: '지금이라도 손절이 답이다. 여기서 더 떨어진다.', rec: 174 },
          { user: '역발상', text: '다들 던질 때가 줍는 자리지. 난 지금 담는다.', hot: true, rec: 9 },
        ],
        choices: [
          { label: '다들 던질 때 산다 — 글을 더 읽는다', next: 'w2_leverage_hook', effects: { flags: { leverage_seen: true, contrarian_tempted: true } } },
          { label: '이 분위기엔 못 들어가겠다', next: 'w2_after_stock', effects: { flags: { leverage_resisted: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '어제까지 "10억 간다"던 방이 하루 만에 초상집이 됐다.\n청산 인증, 욕, "제발 하지 마세요".\n\n근데 댓글 맨 밑에 한 명이 조용히 적어놨다. 난 지금 담는다고.',
    },
    w2_leverage_hook: {
      header: '2주차 · 레버리지 커뮤니티',
      image: 'assets/week2/invest/investment-room.png',
      speaker: '{이름}(25)',
      text: '곡소리 사이에서 딱 한 줄이 눈에 박혔다.\n"공포에 팔 때 사는 거다."\n\n배금전자도 맞혔잖아. 이번에도 안 틀릴 것 같았다.\n어차피 더 내려갈 데도 없는데. 손가락이 먼저 움직였다.',
      choices: [
        {
          label: '"공포가 바닥이다." 전 재산 레버리지 진입',
          next: 'w2_coin_leverage_win',
          effects: { cashAllInWin: { label: '코인 레버리지 +1,000%', multiplier: 10 }, flags: { coin_success: true, coin_leverage_entered: true, leverage_hooked: true, pressure: true, contrarian_win: true } },
        },
        {
          label: '그래도 도박이다. 오늘은 끝낸다',
          next: 'w2_after_stock',
          effects: { flags: { leverage_resisted: true, temperance: true } },
        },
      ],
    },
    /* 다음 시기 — 완전 반전. 모두가 끝났다던 자리에서 +1,000% 차트. 이 성공이 더 큰 도박으로 끄는 미끼. */
    w2_coin_leverage_win: {
      header: '2주차 · 반전',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'market',
        statusbar: { time: '7:02', battery: 88 },
        changePct: '▲ +1,000%',
        marketSub: '바닥에서 반등 · 거래량 폭발',
        stock: { symbol: 'BTC 레버리지', code: 'BTC-PERP', buyPrice: 118000, resultMultiplier: 11 },
        choices: [
          { label: '수익을 실현하고 앱을 닫는다', next: 'w2_after_stock', effects: { flags: { coin_cashout: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '며칠 뒤, 차트가 그냥 수직으로 섰다. 끝났다던 그 자리에서.\n\n전 재산이 11배. 수익률 +1,000%.\n어제 욕하던 사람들이 이제 왜 안 샀냐고 자기들끼리 싸우고 있었다.\n\n이걸 한 번 보고 나니까, 멈추는 게 바보 같았다.',
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
        {
          label: '놓친 돈 생각에 홀짝 사다리방을 연다',
          next: 'w2_gamble_room',
          requires: { flags: { stock_pick: 'none' } },
          effects: { flags: { gamble_deep: true, missed_stock_tilt: true } },
        },
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
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'community',
        statusbar: { time: '1:42', battery: 24 },
        communityTitle: '홀짝 사다리 공략방',
        stock: { symbol: '홀짝 사다리', code: 'ODD-EVEN', buyPrice: 5000000, resultMultiplier: 2 },
        posts: [
          { user: '첫충요정', text: '주식 놓친 사람들 여기서 멘탈 복구함. 첫 판은 흐름만 보면 쉽다.', hot: true, rec: 226 },
          { user: '사다리장인', text: '홀홀짝 패턴 또 나왔다. 지금 들어가면 먹는다.', hot: true, rec: 181 },
          { user: '복구중', text: '배금전자 못 산 거 여기서 만회했다. 작게 가면 의미 없다.', rec: 143 },
          { user: '주의좀', text: '처음엔 따게 해주고 다음에 크게 먹히는 구조임. 정신 차려.', down: true, rec: 9 },
          { user: '링크맨', text: 'VIP 카지노는 사다리 두 판 깨면 열린다. 블랙잭이 진짜 돈 됨.', hot: true, rec: 311 },
        ],
        choices: [
          { label: '홀짝 사다리 링크를 누른다', next: 'w2_ladder_intro', effects: { flags: { ladder_link_clicked: true } } },
          { label: '방을 나간다', next: 'w2_contact', effects: { flags: { gamble_resisted: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '새 글이 계속 올라왔다.\n주식으로 놓친 돈을 복구했다는 글들이, 이상하게 나만 부르는 것 같았다.',
    },
    w2_ladder_intro: {
      header: '2주차 · 홀짝 사다리',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'ladder',
        statusbar: { time: '1:47', battery: 22 },
        ladder: {
          title: '홀짝 사다리',
          badge: '첫 판',
          round: '1라운드',
          stakeLabel: '전 재산',
          resultText: '30초 뒤 결과 공개',
          rows: ['left', 'right', 'right', 'left'],
        },
        choices: [
          { label: '전 재산 몰빵한다', next: 'w2_ladder_odd_win', effects: { cashAllInWin: { label: '사다리 몰빵 적중', multiplier: 1 }, flags: { ladder_pick: 'all_in', ladder_all_in: true, ladder_first_win: true } } },
          { label: '포기하고 앱을 닫는다', next: 'w2_contact', effects: { flags: { gamble_resisted: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '화면은 단순했다.\n내가 고르는 건 홀짝이 아니었다.\n\n전부 걸 것인가, 아니면 끌 것인가.\n버튼은 두 개뿐이었다.',
    },
    w2_ladder_odd_win: {
      header: '2주차 · 홀짝 사다리',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      effects: { flags: { ladder_first_win: true } },
      phone: {
        screen: 'ladder',
        statusbar: { time: '1:48', battery: 21 },
        ladder: {
          title: '홀짝 사다리',
          badge: '적중',
          round: '1라운드 결과',
          pick: 'odd',
          path: 'left',
          stakeLabel: '전 재산',
          result: 'win',
          resultText: '몰빵 적중',
          rows: ['left', 'right', 'right', 'left'],
        },
        choices: [
          { label: '다시 전 재산 몰빵한다', next: 'w2_ladder_clear', effects: { cashAllInWin: { label: '연승 몰빵 적중', multiplier: 1 }, flags: { ladder_chasing: true, ladder_cleared: true, casino_unlocked: true } } },
          { label: '포기하고 돈을 챙긴다', next: 'w2_contact', effects: { flags: { ladder_stopped: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '맞았다.\n너무 빨리, 너무 쉽게.\n\n주식 알림을 놓쳤던 손끝이 이번엔 정답을 눌렀다는 사실이, 작게 전기를 흘렸다.',
    },
    w2_ladder_clear: {
      header: '2주차 · 홀짝 사다리',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'ladder',
        statusbar: { time: '1:52', battery: 18 },
        ladder: {
          title: '홀짝 사다리',
          badge: 'CLEAR',
          round: '2연승 보상',
          pick: 'odd',
          path: 'left',
          stakeLabel: '전 재산',
          result: 'win',
          resultText: '연승 몰빵 적중',
          rows: ['right', 'right', 'left', 'right'],
        },
        choices: [
          { label: 'VIP 블랙잭에 전 재산 몰빵한다', next: 'w2_blackjack_double_win', effects: { cashAllInWin: { label: '블랙잭 몰빵 적중', multiplier: 2 }, flags: { casino_entered: true, blackjack_entered: true, blackjack_all_in: true, blackjack_played: true, blackjack_hooked: true } } },
          { label: '포기하고 앱을 닫는다', next: 'w2_contact', effects: { flags: { ladder_stopped: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '두 번째도 맞았다.\n이제 화면은 더 이상 홀짝을 보여주지 않았다.\n\n검은 배경 위에 새 버튼이 떠올랐다.\nVIP 카지노 입장.',
    },
    w2_blackjack_double_win: {
      header: '2주차 · 블랙잭',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'blackjack',
        statusbar: { time: '2:00', battery: 14 },
        blackjack: {
          title: 'BLACKJACK',
          badge: 'ALL IN WIN',
          phase: '몰빵 적중',
          dealer: [ { rank: '6', suit: '♣' }, { rank: 'J', suit: '♥' }, { rank: '9', suit: '♣' } ],
          dealerScore: '25',
          player: [ { rank: 'A', suit: '♠' }, { rank: '7', suit: '♥' }, { rank: '3', suit: '♦' } ],
          playerScore: '21',
          betLabel: '전 재산',
          result: 'win',
          resultText: '블랙잭 몰빵 적중',
          hint: '전부 건 손이 가장 크게 보상받았다.',
        },
        choices: [
          { label: '다시 전 재산 몰빵한다', next: 'w2_blackjack_split_loss', effects: { cashAllInLoss: { label: '블랙잭 몰빵 실패' }, flags: { blackjack_loss: true, casino_hooked: true, pressure: true } } },
          { label: '포기하고 돈을 챙긴다', next: 'w2_contact', effects: { flags: { blackjack_stopped: true, temperance: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '전부 걸었다.\n버튼을 누르는 순간 손끝이 비어 버렸고, 다음 순간 숫자가 미친 듯이 불어났다.\n\n큰 선택을 한 사람이 큰돈을 번다. 화면은 그렇게 말하고 있었다.',
    },
    w2_blackjack_split_loss: {
      header: '2주차 · 블랙잭',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'blackjack',
        statusbar: { time: '2:12', battery: 8 },
        blackjack: {
          title: 'BLACKJACK',
          badge: 'LOSS',
          phase: '스플릿 실패',
          dealer: [ { rank: '7', suit: '♠' }, { rank: '3', suit: '♥' }, { rank: 'Q', suit: '♣' } ],
          dealerScore: '20',
          player: [ { rank: '9', suit: '♣' }, { rank: 'K', suit: '♦' } ],
          playerScore: '19 / 17',
          betLabel: '전 재산',
          result: 'lose',
          resultText: '몰빵 실패 -전 재산',
          hint: '전부 걸었기 때문에 전부 사라졌다.',
        },
        choices: [
          { label: '앱을 닫는다', next: 'w2_contact', effects: { flags: { gamble_shame: true } } },
        ],
      },
      speaker: '{이름}(25)',
      text: '스플릿은 화려했다.\n카드가 두 줄로 펼쳐지고, 칩이 두 군데로 갈라졌다.\n\n그리고 둘 다 졌다.\n방금 전까지 실력처럼 보였던 것들이, 순식간에 운이었다는 얼굴로 돌아섰다.',
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
      next: 'w3_card',
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
      next: 'w3_card', effects: { flags: { pressure: true } },
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
      next: 'w3_card',
    },

    /* ========== 3주차 — 데이트, 그리고 균열 ========== */
    w3_card: { type: 'card', header: '3주차', big: '3주차', sub: '마주 앉다', week: 3, next: 'w3_chat_check' },

    w3_chat_check: {
      header: '3주차 · 까까오톡',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'chatRooms',
        statusbar: { time: '12:18', battery: 68 },
        title: '까까오톡',
        subtitle: '오늘 약속과 시세 알림',
        subtitleAfterRead: '오늘 알림 확인 완료',
        badge: '3주차',
        badgeAfterRead: '확인',
        readFlag: 'weekly_chat_w3',
        rooms: [
          {
            name: '유민아',
            preview: '오늘 보기로 한 거 맞죠? ㅎㅎ',
            readPreview: '그럼 이따 봐요. 부담 갖지 말고요.',
            meta: '방금',
            readMeta: '읽음',
            badge: '1',
            tone: 'warm',
            avatar: '유',
            requiresFlag: 'met_yumina',
            readFlag: 'w3_yumina_chat_checked',
          },
          {
            name: '배금증권 알림',
            preview: '보유 종목 변동성 확대',
            readPreview: '알림 확인됨 · 본편 진행 대기',
            meta: '2분 전',
            readMeta: '대기',
            badge: '1',
            tone: 'stock',
            avatar: '증',
            readFlag: 'weekly_chat_w3',
          },
          {
            name: '비트코인 레버리지방',
            preview: '이번 주는 멘탈 못 잡으면 털립니다.',
            readPreview: '다들 수익 인증만 올리고 손실은 숨긴다.',
            meta: '7분 전',
            readMeta: '읽음',
            badge: '12',
            tone: 'risk',
            avatar: '₿',
            readFlag: 'w3_invest_chat_checked',
          },
        ],
        choices: [
          {
            label: '유민아에게 부담 갖지 말라고 답장한다',
            next: 'w3_chat_yumina_reply',
            requires: { flags: { met_yumina: true }, missingFlags: ['weekly_chat_w3'] },
            set: { yumina: 1 },
            effects: { happy: 1, flags: { weekly_chat_w3: 'yumina', w3_yumina_chat_checked: true, date_mood_warm: true } },
          },
          {
            label: '투자방 알림을 먼저 확인한다',
            next: 'w3_chat_invest_room',
            requires: { missingFlags: ['weekly_chat_w3'] },
            effects: { flags: { weekly_chat_w3: 'invest_room', w3_invest_chat_checked: true, pressure: true } },
          },
          {
            label: '채팅앱을 닫고 하루를 시작한다',
            next: 'w3_open',
            effects: { flags: { weekly_chat_w3: 'skipped' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '3주차가 되자 폰 알림의 결이 달라졌다.\n약속을 묻는 메시지와 시세 알림이 같은 화면에 붙어 있었다.\n\n어느 쪽을 먼저 보느냐가, 이미 하루의 방향을 정하고 있었다.',
    },
    w3_chat_yumina_reply: {
      header: '3주차 · 유민아',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '12:20', battery: 67 },
        contact: '유민아',
        revealText: 'afterFlow',
        messages: [
          { from: 'them', name: '유민아', text: '오늘 보기로 한 거 맞죠? ㅎㅎ' },
          { from: 'me', text: '응. 너무 부담 갖진 말고 편하게 보자.' },
          { from: 'them', name: '유민아', text: '그 말 좋네요. 이따 봐요.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '돈 얘기를 빼고 답장하자, 이상하게 마음이 조금 가벼워졌다.\n\n그 가벼움이 오래가길 바랐다. 적어도 카페에 앉기 전까지는.',
      next: 'w3_open',
    },
    w3_chat_invest_room: {
      header: '3주차 · 투자방',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '12:20', battery: 67 },
        contact: '비트코인 레버리지방',
        revealText: 'afterFlow',
        messages: [
          { type: 'system', text: '3주차 투자방 · 512명 접속 중' },
          { from: 'them', name: '익명12', text: '데이트고 뭐고 돈 없으면 아무것도 못 합니다.' },
          { from: 'them', name: '방장', text: '오늘 같은 변동성은 놓치면 안 됩니다.' },
          { from: 'me', text: '…확인했습니다.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '남의 문장이 내 불안을 대신 말하고 있었다.\n\n폰을 닫았는데도, 그 말은 화면 밖으로 따라 나왔다.',
      next: 'w3_open',
    },

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
    w4_card: { type: 'card', header: '4주차', big: '4주차', sub: '결과', week: 4, next: 'w4_chat_check' },
    w4_chat_check: {
      header: '4주차 · 까까오톡',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'chatRooms',
        statusbar: { time: '8:47', battery: 41 },
        title: '까까오톡',
        subtitle: '결과 발표 전 알림',
        subtitleAfterRead: '읽은 알림 정리됨',
        badge: '4주차',
        badgeAfterRead: '확인',
        readFlag: 'weekly_chat_w4',
        rooms: [
          {
            name: '유민아',
            preview: '오늘 괜찮아요? 답장이 뜸해서요.',
            readPreview: '힘들면 그냥 힘들다고 말해도 돼요.',
            meta: '방금',
            readMeta: '읽음',
            badge: '1',
            tone: 'warm',
            avatar: '유',
            requiresFlag: 'met_yumina',
            readFlag: 'w4_yumina_chat_checked',
          },
          {
            name: '배금증권 알림',
            preview: '평가손익 변동 알림 도착',
            readPreview: '결과 확인 대기',
            meta: '1분 전',
            readMeta: '대기',
            badge: '1',
            tone: 'stock',
            avatar: '증',
            readFlag: 'weekly_chat_w4',
          },
          {
            name: '비트코인 레버리지방',
            preview: '오늘 결과로 인생 바뀐 사람 나옵니다.',
            readPreview: '누군가는 웃고, 누군가는 사라진다.',
            meta: '3분 전',
            readMeta: '읽음',
            badge: '88',
            tone: 'risk',
            avatar: '₿',
            readFlag: 'w4_invest_chat_checked',
          },
        ],
        choices: [
          {
            label: '유민아에게 솔직히 불안하다고 보낸다',
            next: 'w4_chat_yumina_honest',
            requires: { flags: { met_yumina: true }, missingFlags: ['weekly_chat_w4'] },
            set: { yumina: 1 },
            effects: { happy: 1, flags: { weekly_chat_w4: 'yumina', w4_yumina_chat_checked: true, yumina_safe_line: true } },
          },
          {
            label: '투자방 반응을 먼저 본다',
            next: 'w4_chat_invest_room',
            requires: { missingFlags: ['weekly_chat_w4'] },
            effects: { flags: { weekly_chat_w4: 'invest_room', w4_invest_chat_checked: true, pressure: true } },
          },
          {
            label: '채팅앱을 닫고 결과를 확인한다',
            next: 'w4_result',
            effects: { flags: { weekly_chat_w4: 'skipped' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '결과를 보기 직전, 폰이 또 울렸다.\n이번 알림은 돈을 벌었다는 말도, 잃었다는 말도 아니었다.\n\n누군가는 내 상태를 묻고 있었고, 누군가는 내 잔고만 궁금해했다.',
    },
    w4_chat_yumina_honest: {
      header: '4주차 · 유민아',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '8:49', battery: 40 },
        contact: '유민아',
        revealText: 'afterFlow',
        messages: [
          { from: 'them', name: '유민아', text: '오늘 괜찮아요? 답장이 뜸해서요.' },
          { from: 'me', text: '솔직히 좀 불안해. 결과 보는 게 무섭다.' },
          { from: 'them', name: '유민아', text: '그럼 결과 보기 전에 숨부터 쉬어요. 돈보다 사람이 먼저예요.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '돈보다 사람이 먼저라는 말이, 너무 당연해서 오히려 낯설었다.\n\n잠깐이지만 손이 덜 떨렸다.',
      next: 'w4_result',
    },
    w4_chat_invest_room: {
      header: '4주차 · 투자방',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '8:49', battery: 40 },
        contact: '비트코인 레버리지방',
        revealText: 'afterFlow',
        messages: [
          { type: 'system', text: '결과 발표 1분 전' },
          { from: 'them', name: '익명8', text: '오늘 터지면 바로 계급 바뀝니다.' },
          { from: 'them', name: '익명44', text: '못 먹은 사람은 평생 노동이죠.' },
          { from: 'me', text: '...' },
        ],
      },
      speaker: '{이름}(25)',
      text: '투자방은 이미 승자와 패자를 정해 놓은 말투였다.\n\n나는 아직 결과도 안 봤는데, 벌써 한쪽으로 밀려나는 기분이었다.',
      next: 'w4_result',
    },
    /* w4_result → engine: 수익/코인성공/절제면 w4b(생존), 아니면 w4a(붕괴) */

    /* ---------- 4-A. 붕괴 ---------- */
    w4a: {
      header: '4주차 · 붕괴',
      image: 'assets/week1/gosiwon/floor-collapse.png',
      speaker: '{이름}(25)',
      text: '앱을 열었다. 숫자 앞의 마이너스가 먼저 눈에 들어왔다.\n\n원금도, 끌어 쓸 수 있던 신용도 다 녹았다.\n남은 건 빚과, 텅 빈 방과, 배터리가 닳아가는 폰 하나.',
      next: 'w4a_after', effects: { debt: 500000000, flags: { branch: 'A', invest_failed: true } },
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
            effects: { cash: 10000000, flags: { yumina_borrowed: true, yumina_betrayed: true } },
          },
          {
            label: '절반만 말한다: "투자가 좀 꼬였어. 미안해"',
            next: 'w4a_borrow_half',
            effects: { cash: 5000000, flags: { yumina_borrowed: true } },
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
          { from: 'system', tone: 'money', text: '유민아님이 10,000,000원을 보냈습니다.' },
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
          { from: 'system', tone: 'money', text: '유민아님이 5,000,000원을 보냈습니다.' },
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
      next: 'w4a_exposed', effects: { debt: 10000000 },
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
      text: '앱을 열었다. 처음으로 숫자 앞에 플러스가 붙어 있었다.\n\n절제한 만큼만 걸었고, 그만큼이 돌아왔다.\n처음으로 돈이 억 단위의 돈을 불렀다.',
      next: 'w4b_after', effects: { assets: 500000000, flags: { branch: 'B' } },
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
    w5b_card_y: { type: 'card', header: '5주차', big: '5주차', sub: '갈림길', week: 5, next: 'w5_chat_check_y' },
    w5_chat_check_y: {
      header: '5주차 · 까까오톡',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'chatRooms',
        statusbar: { time: '19:12', battery: 82 },
        title: '까까오톡',
        subtitle: '부자 모드 알림',
        subtitleAfterRead: '읽은 알림 정리됨',
        badge: '5주차',
        badgeAfterRead: '확인',
        readFlag: 'weekly_chat_w5',
        rooms: [
          {
            name: '유민아',
            preview: '이번 주말 국밥 ㄱ?',
            readPreview: '비싼 데 말고, 그냥 너랑 밥 먹고 싶어.',
            meta: '방금',
            readMeta: '읽음',
            badge: '1',
            tone: 'warm',
            avatar: '유',
            readFlag: 'w5_yumina_chat_checked',
          },
          {
            name: 'BG PRIVATE',
            preview: 'BLACK 자산관리 초대장이 도착했습니다.',
            readPreview: '초대장 확인됨 · 100억대 계좌 조건 충족',
            meta: '1분 전',
            readMeta: '확인',
            badge: 'VIP',
            tone: 'stock',
            avatar: 'B',
            readFlag: 'w5_private_chat_checked',
          },
          {
            name: 'BG Social',
            preview: '차량·부동산·데이트 콘텐츠 수익화 가능',
            readPreview: 'SNS 수익화 메뉴가 곧 열립니다.',
            meta: '3분 전',
            readMeta: '대기',
            badge: 'NEW',
            tone: 'risk',
            avatar: 'S',
            readFlag: 'weekly_chat_w5',
          },
        ],
        choices: [
          {
            label: '유민아에게 국밥 약속을 지킨다고 답한다',
            next: 'w5_chat_yumina_gold',
            requires: { missingFlags: ['weekly_chat_w5'] },
            set: { yumina: 1 },
            effects: { happy: 1, flags: { weekly_chat_w5: 'yumina', w5_yumina_chat_checked: true, gold_yumina_call_ready: true } },
          },
          {
            label: 'BLACK 자산관리 초대장을 확인한다',
            next: 'w5_chat_private_y',
            requires: { missingFlags: ['weekly_chat_w5'] },
            effects: { flags: { weekly_chat_w5: 'private', w5_private_chat_checked: true } },
          },
          {
            label: '채팅앱을 닫고 선택한다',
            next: 'w5b_choice_y',
            effects: { flags: { weekly_chat_w5: 'skipped' } },
          },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '5주차의 폰은 더 이상 같은 폰이 아니었다.\n사람의 메시지 위아래로, VIP 초대장과 수익화 알림이 붙어 있었다.\n\n돈이 많아질수록 알림도 사람처럼 말을 걸었다.',
    },
    w5_chat_yumina_gold: {
      header: '5주차 · 유민아',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '19:14', battery: 82 },
        contact: '유민아',
        revealText: 'afterFlow',
        messages: [
          { from: 'them', name: '유민아', text: '이번 주말 국밥 ㄱ?' },
          { from: 'me', text: '응. 이번엔 진짜 그 약속부터 지킬게.' },
          { from: 'them', name: '유민아', text: '좋다. 돈 얘기 말고 밥 얘기만 해요 그날은.' },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '100억이라는 숫자보다, "국밥" 두 글자가 더 오래 화면에 남았다.\n\n이상하게 그게 제일 비싼 약속처럼 느껴졌다.',
      next: 'w5b_choice_y',
    },
    w5_chat_private_y: {
      header: '5주차 · BG PRIVATE',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '19:14', battery: 82 },
        contact: 'BG PRIVATE',
        revealText: 'afterFlow',
        messages: [
          { type: 'system', text: 'BLACK 자산관리 초대장' },
          { from: 'them', name: '전담 매니저', text: '100억대 계좌 인증이 완료되었습니다.' },
          { from: 'them', name: '전담 매니저', text: 'VIP 차고, 한강 부동산, SNS 수익화 메뉴가 열립니다.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '말투가 달라졌다.\n어제까지는 고객센터가 나를 기다리게 했는데, 이제는 담당자가 먼저 기다리고 있었다.',
      next: 'w5b_choice_y',
    },
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
        {
          label: '코인 수익을 전부 걸어 100억대로 넘기고, 프라이빗 대시보드를 연다',
          next: 'w5_gold_unlock_y',
          requires: { flags: { coin_success: true } },
          effects: { setCash: 11000000000, flags: { chose_money: true, gold_cashout: true, wealth_app_unlocked: true, luxury_date: false } },
        },
      ],
    },
    /* 유민아 못 만난 루트 */
    w5b_card_n: { type: 'card', header: '5주차', big: '5주차', sub: '갈림길', week: 5, next: 'w5_chat_check_n' },
    w5_chat_check_n: {
      header: '5주차 · 까까오톡',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'chatRooms',
        statusbar: { time: '19:12', battery: 82 },
        title: '까까오톡',
        subtitle: '부자 모드 알림',
        subtitleAfterRead: '읽은 알림 정리됨',
        badge: '5주차',
        badgeAfterRead: '확인',
        readFlag: 'weekly_chat_w5',
        rooms: [
          {
            name: 'BG PRIVATE',
            preview: 'BLACK 자산관리 초대장이 도착했습니다.',
            readPreview: '초대장 확인됨 · 100억대 계좌 조건 충족',
            meta: '방금',
            readMeta: '확인',
            badge: 'VIP',
            tone: 'stock',
            avatar: 'B',
            readFlag: 'w5_private_chat_checked',
          },
          {
            name: '비트코인 레버리지방',
            preview: '성공 인증 올리면 바로 전설 됩니다.',
            readPreview: '축하보다 인증 요구가 먼저 온다.',
            meta: '2분 전',
            readMeta: '읽음',
            badge: '99+',
            tone: 'risk',
            avatar: '₿',
            readFlag: 'w5_invest_chat_checked',
          },
          {
            name: 'BG Social',
            preview: '차량·부동산 콘텐츠 수익화 가능',
            readPreview: 'SNS 수익화 메뉴가 곧 열립니다.',
            meta: '3분 전',
            readMeta: '대기',
            badge: 'NEW',
            tone: 'risk',
            avatar: 'S',
            readFlag: 'weekly_chat_w5',
          },
        ],
        choices: [
          {
            label: 'BLACK 자산관리 초대장을 확인한다',
            next: 'w5_chat_private_n',
            requires: { missingFlags: ['weekly_chat_w5'] },
            effects: { flags: { weekly_chat_w5: 'private', w5_private_chat_checked: true } },
          },
          {
            label: '투자방 성공 인증을 올린다',
            next: 'w5_chat_invest_flex',
            requires: { missingFlags: ['weekly_chat_w5'] },
            effects: { happy: -1, flags: { weekly_chat_w5: 'flex', w5_invest_chat_checked: true, flex_addicted: true } },
          },
          {
            label: '채팅앱을 닫고 선택한다',
            next: 'w5b_choice_n',
            effects: { flags: { weekly_chat_w5: 'skipped' } },
          },
        ],
      },
      speaker: '{이름}(25)',
      text: '5주차의 폰에는 축하보다 인증 요구가 많았다.\n돈을 벌었냐고 묻는 사람은 많았지만, 괜찮냐고 묻는 사람은 없었다.',
    },
    w5_chat_private_n: {
      header: '5주차 · BG PRIVATE',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '19:14', battery: 82 },
        contact: 'BG PRIVATE',
        revealText: 'afterFlow',
        messages: [
          { type: 'system', text: 'BLACK 자산관리 초대장' },
          { from: 'them', name: '전담 매니저', text: '100억대 계좌 인증이 완료되었습니다.' },
          { from: 'them', name: '전담 매니저', text: 'VIP 차고, 한강 부동산, SNS 수익화 메뉴가 열립니다.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '드디어 누군가가 먼저 정중하게 말을 걸었다.\n그런데 이름이 아니라 잔고를 보고 온 말투였다.',
      next: 'w5b_choice_n',
    },
    w5_chat_invest_flex: {
      header: '5주차 · 투자방',
      image: 'assets/week1/gosiwon/phone-face-dark.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '19:14', battery: 82 },
        contact: '비트코인 레버리지방',
        revealText: 'afterFlow',
        messages: [
          { from: 'me', text: '계좌 100억 넘겼습니다.' },
          { from: 'them', name: '익명9', text: '와 인증 ㄷㄷ' },
          { from: 'them', name: '익명21', text: '형님 다음 종목 뭐예요?' },
          { from: 'them', name: '방장', text: '이분 VIP방 모셔야 합니다.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '처음 보는 사람들이 나를 형님이라고 불렀다.\n기분은 잠깐 좋았다.\n\n그 잠깐이 끝나자 방은 다시 텅 비었다.',
      next: 'w5b_choice_n',
    },
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
        {
          label: '코인 수익을 전부 걸어 100억대로 넘기고, 프라이빗 대시보드를 연다',
          next: 'w5_gold_unlock_n',
          requires: { flags: { coin_success: true } },
          effects: { setCash: 11000000000, flags: { chose_money: true, gold_cashout: true, wealth_app_unlocked: true, luxury_date: false } },
        },
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
    w5_gold_unlock_y: {
      header: '5주차 · 자산관리',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'wealthHub',
        frame: 'desktop',
        statusbar: { time: '10:08', battery: 91 },
        kicker: 'BG PRIVATE',
        title: 'BLACK 자산관리',
        subtitle: 'VIP 차고 · 부동산 · SNS 수익화가 열렸습니다',
        wealthApps: [
          { title: 'VIP 차고', meta: '출고 가능', icon: 'CAR', tone: 'car' },
          { title: '부동산', meta: '한강 매물 오픈', icon: 'APT', tone: 'property' },
          { title: 'SNS', meta: '데이트 콘텐츠 대기', icon: 'SNS', tone: 'sns' },
        ],
        choices: [
          { label: 'VIP 차고에서 차량을 먼저 출고한다', next: 'w5_gold_car_buy', effects: { cash: -1200000000, assets: 1200000000, flags: { asset_car: true, sns_unlocked: true }, unlock: ['week5_car'] } },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '잔고가 100억을 넘기니까 모니터에 못 보던 계좌가 떴다.\n주식창 밑으로 메뉴가 줄줄이 생겼다.\n\n차고, 부동산, SNS 수익화.\n버는 화면이던 게, 어느새 굴리는 화면이 돼 있었다.',
    },
    w5_gold_unlock_n: {
      header: '5주차 · 자산관리',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'wealthHub',
        frame: 'desktop',
        statusbar: { time: '10:08', battery: 91 },
        kicker: 'BG PRIVATE',
        title: 'BLACK 자산관리',
        subtitle: 'VIP 차고 · 부동산 · SNS 수익화가 열렸습니다',
        wealthApps: [
          { title: 'VIP 차고', meta: '출고 가능', icon: 'CAR', tone: 'car' },
          { title: '부동산', meta: '한강 매물 오픈', icon: 'APT', tone: 'property' },
          { title: 'SNS', meta: '인증 콘텐츠 대기', icon: 'SNS', tone: 'sns' },
        ],
        choices: [
          { label: 'VIP 차고에서 차량을 먼저 출고한다', next: 'w5_gold_car_buy', effects: { cash: -1200000000, assets: 1200000000, flags: { asset_car: true, sns_unlocked: true }, unlock: ['week5_car'] } },
        ],
      },
      speaker: '{이름}(25)',
      text: '잔고가 100억을 넘기니까 모니터에 못 보던 계좌가 떴다.\n주식창 밑으로 메뉴가 줄줄이 생겼다.\n\n차고, 부동산, SNS 수익화.\n혼자 사는 것도 이제 자랑처럼 올릴 수 있었다.',
    },
    w5_gold_car_buy: {
      header: '5주차 · VIP 차고',
      image: { background: 'assets/week5/car1.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '계약 버튼 한 번에 담당자가 바로 전화를 걸어왔다.\n몇 시간 뒤 호텔 앞에 검은 차가 서 있었다.\n\n통장은 12억이 줄었다. 대신 지나가던 사람들이 한 번씩 돌아봤다.',
      choices: [
        { label: '뒷좌석에서 다음 알림을 확인한다', next: 'w5_gold_car_inside' },
      ],
    },
    w5_gold_car_inside: {
      header: '5주차 · 뒷좌석',
      image: { background: 'assets/week5/inside the car.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '문이 닫히니까 바깥 소리가 뚝 줄었다.\n창밖으로 빌딩들이 천천히 흘러갔다.\n\n폰에 알림이 두 개 떠 있었다.\nSNS 하나, 부동산 하나.',
      choices: [
        {
          label: '유민아와 백화점 데이트를 SNS에 올린다',
          next: 'w5_gold_department_date',
          requires: { flags: { met_yumina: true } },
          effects: { cash: -300000000, happy: 1, flags: { luxury_date: true, sns_unlocked: true, gold_yumina_call_ready: true }, unlock: ['week5_department_date'] },
        },
        { label: '부동산 대시보드를 연다', next: 'w5_gold_property_hub' },
      ],
    },
    w5_gold_department_date: {
      header: '5주차 · 백화점',
      image: { background: 'assets/week5/department store.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '유민아는 쇼윈도보다 내 얼굴을 먼저 봤다.\n나는 가격표보다, 우리를 보는 사람들 시선을 먼저 셌다.\n\n사진 한 장 올렸더니 좋아요가 돈처럼 붙었다.',
      choices: [
        { label: '부동산 대시보드를 연다', next: 'w5_gold_property_hub' },
      ],
    },
    w5_gold_property_hub: {
      header: '5주차 · 부동산',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'assetStore',
        frame: 'desktop',
        statusbar: { time: '14:22', battery: 84 },
        brand: 'BG PRIVATE',
        title: '한강 자산',
        subtitle: '현금은 줄고, 등급은 올라갑니다',
        assets: [
          { kind: 'VEHICLE', name: '블랙 팬텀', meta: 'SNS 인증 완료', cost: 1200000000, value: 1200000000, flag: 'asset_car', thumb: 'assets/week5/car1.png' },
          { kind: 'PROPERTY', name: '한강 투자용 아파트', meta: '매입 즉시 자산 반영', choiceNext: 'w5_gold_property_buy', flag: 'asset_property', thumb: 'assets/week5/p4.png' },
          { kind: 'HOME', name: '주거용 고급아파트', meta: '투자용 매입 후 계약 가능', choiceNext: 'w5_gold_home_buy', flag: 'asset_home', thumb: 'assets/week5/luxury_apartment.png' },
        ],
        choices: [
          { label: '한강 투자용 아파트를 매입한다', next: 'w5_gold_property_buy', effects: { cash: -4500000000, assets: 5200000000, flags: { asset_property: true }, unlock: ['week5_property'] } },
        ],
      },
      speaker: '{이름}(25)',
      text: '부동산 대시보드는 종목창보다 조용했다.\n대신 0이 훨씬 많았다.\n\n한 번 누르는 데 4,500,000,000원 (45억).\n그 단위가 이젠 별로 안 무서웠다.',
    },
    w5_gold_property_buy: {
      header: '5주차 · 한강 매입',
      image: { background: 'assets/week5/p4.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '전자서명 하나로 계약서가 넘어왔다.\n"한강"이라는 두 글자가 주소 맨 앞에 붙어 있었다.\n\n주식은 그냥 숫자였는데, 이건 지도에 찍히는 땅이었다.',
      choices: [
        { label: '주거용 고급아파트도 계약한다', next: 'w5_gold_home_buy', effects: { cash: -3000000000, assets: 3400000000, flags: { asset_home: true }, unlock: ['week5_home'] } },
      ],
    },
    w5_gold_home_buy: {
      header: '5주차 · 입주 계약',
      image: { background: 'assets/week5/p5.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '이번엔 투자용이 아니라 내가 살 집이었다.\n강가를 따라 유리로 된 건물들이 서 있었고, 그중 한 층이 내 이름으로 바뀌었다.\n\n폰에 저장된 주소가 고시원 호수에서 펜트하우스 동호수로 바뀌어 있었다.',
      choices: [
        { label: '새 집에 들어간다', next: 'w5_gold_apartment_life' },
      ],
    },
    w5_gold_apartment_life: {
      header: '5주차 · 고급아파트',
      image: { background: 'assets/week5/luxury_apartment.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '거실 창을 꽉 채운 게 강이었다.\n소파에 앉으니 도시가 발밑에 깔려 있었다.\n\n그때 SNS 수익화 승인 알림이 떴다.',
      choices: [
        {
          label: '데이트 게시물로 SNS 수익화를 신청한다',
          next: 'w5_gold_sns_feed_y',
          requires: { flags: { luxury_date: true } },
        },
        {
          label: '차와 집 인증으로 SNS 수익화를 신청한다',
          next: 'w5_gold_sns_feed_n',
          requires: { flags: { luxury_date: false } },
        },
      ],
    },
    w5_gold_sns_feed_y: {
      header: '5주차 · SNS 수익화',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'snsFeed',
        frame: 'desktop',
        statusbar: { time: '22:45', battery: 78 },
        title: 'BG Social',
        handle: '@gold_baegeum',
        bio: '차, 집, 데이트가 전부 콘텐츠가 됐다',
        followers: '82.4만',
        income: '+7.4억',
        posts: [
          { tag: 'DATE', title: '백화점 데이트', meta: '명품관 · 커플샷', likes: '♥ 18.2만' },
          { tag: 'CAR', title: 'VIP 차고 출고', meta: '블랙 팬텀', likes: '♥ 24.7만' },
          { tag: 'APT', title: '한강뷰 입주', meta: '주거용 고급아파트', likes: '♥ 31.9만' },
        ],
        choices: [
          { label: 'SNS 수익과 자산 평가액을 정산한다', next: 'ed_gold_rich', effects: { cash: 740000000, assets: 1300000000, flags: { sns_income: true, asset_income: true }, unlock: ['week5_sns_gold'] } },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '사진 몇 장이 또 돈이 됐다.\n사람들은 부러워하고, 광고주는 연락 오고, 앱은 그걸 예상 수익으로 환산해줬다.\n\n이젠 사는 것까지 돈으로 바뀌고 있었다.',
    },
    w5_gold_sns_feed_n: {
      header: '5주차 · SNS 수익화',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'snsFeed',
        frame: 'desktop',
        statusbar: { time: '22:45', battery: 78 },
        title: 'BG Social',
        handle: '@gold_baegeum',
        bio: '차와 집과 계좌가 전부 콘텐츠가 됐다',
        followers: '64.8만',
        income: '+5.8억',
        posts: [
          { tag: 'CAR', title: 'VIP 차고 출고', meta: '블랙 팬텀', likes: '♥ 24.7만' },
          { tag: 'APT', title: '한강 투자용 매입', meta: '45억 계약', likes: '♥ 19.4만' },
          { tag: 'HOME', title: '한강뷰 입주', meta: '주거용 고급아파트', likes: '♥ 27.1만' },
        ],
        choices: [
          { label: 'SNS 수익과 자산 평가액을 정산한다', next: 'ed_gold_rich', effects: { cash: 580000000, assets: 1100000000, flags: { sns_income: true, asset_income: true }, unlock: ['week5_sns_gold'] } },
        ],
      },
      speaker: '{이름}(25)',
      text: '사진 몇 장이 또 돈이 됐다.\n사람들은 부러워하고, 광고주는 연락 오고, 앱은 그걸 예상 수익으로 환산해줬다.\n\n혼자라는 것도, 화면 안에선 그냥 성공이었다.',
    },
    ed_gold_rich: {
      header: '엔딩 · 금수저',
      image: { background: 'assets/week5/luxury_apartment.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '{이름}(25)',
      text: '차, 집, SNS까지 정산이 끝났다.\n처음엔 계좌 숫자만 100억이었는데, 이제 자산 목록 전체가 금색으로 떴다.\n\n돈이 더는 화면 속 숫자가 아니었다.\n지나가는 도시 전체가, 그냥 내 배경이었다.',
      next: 'ed_gold_after_rich',
    },
    ed_gold_yumina_call: {
      header: '엔딩 · 금수저',
      image: { background: 'assets/week5/luxury_apartment.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        sequence: ['ringing', 'missed'],
        statusbar: { time: '23:56', battery: 89 },
        revealText: 'afterFlow',
        caller: '유민아',
        number: '010-0427-0512',
        ringMs: 4200,
        acceptNext: 'ed_gold_yumina_call_answer',
        declineNext: 'ed_gold_phone',
        acceptEffects: { happy: 1, flags: { gold_yumina_call_answered: true } },
        declineEffects: { flags: { gold_yumina_call_missed: true } },
        afterFlowLabel: '유민아 전화 놓침',
        afterFlowEffects: { flags: { gold_yumina_call_missed: true } },
        missed: [
          { name: '유민아', number: '010-0427-0512', time: '오후 11:56', count: 1 },
        ],
      },
      speaker: '{이름}(25)', relationOf: 'yumina',
      text: '계좌를 닫으려는 순간 전화가 왔다.\n처음엔 늦잠을 깨우던 전화였고, 지금은 이 거실에 사람 목소리를 들여오는 전화였다.\n\n화면엔 유민아 이름이 떠 있었다.',
      next: 'ed_gold_phone',
    },
    ed_gold_yumina_call_answer: {
      header: '엔딩 · 금수저',
      image: { background: 'assets/week5/luxury_apartment.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      speaker: '유민아', relationOf: 'yumina',
      text: '"집 좋네. 근데 목소리는 그대로다."\n\n유민아가 웃었다.\n"이번 주말 국밥 진짜 가는 거죠?"\n\n창밖의 도시보다, 전화기 너머의 웃음소리가 더 가까웠다.',
      choices: [
        { label: '계좌 화면을 닫고 약속을 확인한다', next: 'ed_gold_phone', effects: { flags: { gold_yumina_date_promised: true } } },
      ],
    },
    ed_gold_phone: {
      header: '엔딩 · 금수저',
      image: { background: 'assets/week5/computer.png', backgroundFit: 'contain', backgroundPosition: 'center' },
      phone: {
        screen: 'bankApp',
        frame: 'desktop',
        statusbar: { time: '23:58', battery: 88 },
        bankName: 'BG뱅크',
        accountName: 'BLACK 종합계좌',
        accountNo: '102-9982-1457',
        alert: { title: '입금', amount: 740000000, memo: 'SNS 협찬 수익 정산' },
        tx: [
          { name: 'SNS 협찬 수익', time: '오늘 23:51', amount: 740000000 },
          { name: '주거용 고급아파트', time: '어제 16:20', amount: -3000000000, memo: '입주 계약' },
          { name: '한강 투자용 아파트', time: '어제 14:30', amount: -4500000000, memo: '매입' },
          { name: '블랙 팬텀 출고', time: '3일 전 11:05', amount: -1200000000, memo: 'VIP 차고' },
          { name: '코인 레버리지 정산', time: '4년 전', amount: 9000000000, memo: '+1,000%' },
        ],
      },
      speaker: '{이름}(25)',
      text: '거래내역을 끝까지 내리면 4년 전 그 한 줄이 맨 밑에 있었다.\n+1,000%. 그거 하나로 위에 줄들이 다 생겼다.\n\n살 수 있는 건 다 샀는데,\n앱은 아직도 뭘 더 사라고 띄우고 있었다.',
      next: 'e_gold',
    },
    e_gold: {
      type: 'end', header: '엔딩',
      big: '금수저',
      sub: '계좌는 100억대를 넘겼고 도시는 끝까지 빛났다.\n나를 비추는 불은, 하나도 없었다.',
    },
  },
};
