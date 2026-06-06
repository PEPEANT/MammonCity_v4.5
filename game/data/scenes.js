/* ===== 배금도시 — 스토리 데이터 =====
   이 파일만 늘리면 스토리가 늘어난다. 엔진(engine.js)은 안 건드림.

   씬 한 개 형식:
   "씬id": {
     type:        title | create | card | scene | end | album  (기본 scene)
     header:      상단 바 글씨 ("프롤로그", "개강(1주차)" ...)
     image:       그림. 문자열이면 파일경로("assets/yumina.png"),
                  객체 { placeholder:"설명" } 이면 임시 박스(나중에 그림으로 교체)
     speaker:     화자 이름  (예: "{이름}(26)" / "유민아(25)")
     relationOf:  이 키의 호감도를 화자 옆에 관계라벨로 표시 ("yumina")
     text:        대사/지문
     next:        터치하면 갈 다음 씬 id
     choices: [ { label, next, set:{yumina:+1}, effects:{cash:-50000}, unlock:"cg1" } ]  선택지
     set:         이 씬 진입 시 호감도 변화 { yumina:+1 }
     effects:     돈/턴/플래그 변화
                  { cash:+10000, debt:-5000, assets:+30000, turn:1, flags:{firstTrade:true} }
     week:        주차 설정(숫자)
     unlock:      앨범 해금 id
   }
   * {이름} 은 플레이어가 만든 이름으로 자동 치환됨.
   * 문체 규칙: 이미지가 이미 보여주는 물건, 장소, 글자는 본문에서 반복 설명하지 않는다.
     본문은 이미지가 못 말하는 감정, 해석, 압박, 다음 행동의 이유만 쓴다.
========================================================= */

window.STORY = {
  meta: { title: '배금도시', version: '0.1' },
  start: 'title',

  // 앨범에 들어갈 그림 목록 (해금되면 보임) — V1 히로인/CG는 추후 확정
  album: [],

  // 진행 분기맵 (이름 정한 직후 + 세이브 버튼에서 시각화)
  // 각 노드: week(주차) / branch('A'붕괴·'B'생존) / ending(엔딩 씬 id) / secret(숨김)
  branchMap: {
    rows: [
      [ { label: '프롤로그', week: 0 } ],
      [ { label: '1주차', week: 1 } ],
      [ { label: '2주차', week: 2 } ],
      [ { label: '3주차', week: 3 } ],
      [ { label: '4주차 · 붕괴', week: 4, branch: 'A' },
        { label: '4주차 · 생존', week: 4, branch: 'B' } ],
      [ { label: '흙수저',     week: 5, branch: 'A', ending: 'e_dirt' },
        { label: '진엔딩',     week: 5, branch: 'A', ending: 'e_true', secret: true },
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
      subtitle: '밑바닥 인생에서 시작하기',
      image: 'assets/title-bg.png',
      buttons: {
        continue: '이어하기',
        start: '새 기록 시작',
        records: '진행 분기',
      },
      next: 'create',
    },

    /* ---------- 캐릭터 생성 ---------- */
    create: {
      type: 'create',
      title: '캐릭터 생성',
      defaultFamily: '김',
      defaultGiven: '특붕',
      help: '주인공의 이름입니다. 비워두면 "김특붕"으로 시작합니다.',
      next: 'map_intro',
    },

    /* ---------- 1막: 첫 아침 ---------- */
    a1_wake: {
      header: '1막: 고시원',
      image: 'assets/01/00.png',
      speaker: '{이름}(25)',
      text: '고시원 창밖은 아직 해가 뜨지 않은 새벽 05:00.\n\n배금날드 알바생의 새벽 출근 날이다.',
      choices: [
        {
          label: '일어나기',
          next: 'a1_mom_food',
          effects: { flags: { wake_choice: 'up' } },
        },
        {
          label: '더 자기',
          next: 'a1_oversleep',
          effects: { flags: { wake_choice: 'sleep_more' } },
        },
      ],
    },
    a1_mom_food: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      speaker: '{이름}(25)',
      text: '냉장고 안에는 밥이 있었다.\n\n엄마 글씨였다.\n메시지 창을 여는 손가락이 괜히 무거워졌다.',
      choices: [
        {
          label: '메시지를 보낸다',
          next: 'a1_mom_call',
          effects: { flags: { mother_contact: 'messaged' } },
        },
        {
          label: '못 본 척하고 알바 준비를 한다',
          next: 'a1_mom_ignore',
          effects: { flags: { mother_missed: true, mother_money_route: 'locked' } },
        },
      ],
    },
    a1_mom_call: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:24', battery: 38 },
        contact: '엄마',
        appearDelay: 260,
        messages: [
          { from: 'them', name: '엄마', text: '어제 너 자고 있을 때 잠깐 들렀다.' },
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
        ],
        choices: [
          {
            label: '왜 들어왔어.',
            next: 'a1_mom_angry',
            set: { mother: -1 },
            effects: { anger: 1, flags: { mother_money_route: 'weakened', anger_mother: true, negative: 1 } },
          },
          {
            label: '알았어. 먹을게.',
            next: 'a1_mom_ok',
            effects: { flags: { mother_contact: 'pressed_down' } },
          },
          {
            label: '밥 고마워.',
            next: 'a1_mom_thanks',
            set: { mother: +1 },
            effects: { flags: { mother_help_route: 'open' } },
          },
          {
            label: '엄마. 돈 좀 빌릴 수 있어?',
            next: 'a1_mom_borrow',
            effects: { flags: { pressure: true } },
          },
        ],
      },
    },
    a1_mom_ignore: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      speaker: '{이름}(25)',
      text: '메시지는 보내지 않았다.\n\n엄마가 이 방 근처까지 왔다는 사실만 아침 공기 속에 남아 있었다.',
      next: 'a1_bathroom',
    },
    a1_mom_angry: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:25', battery: 38 },
        contact: '엄마',
        messages: [
          { from: 'them', name: '엄마', text: '어제 너 자고 있을 때 잠깐 들렀다.' },
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '왜 들어왔어.' },
          { from: 'them', name: '엄마', text: '미안하다.\n밥은 먹고 가라.' },
        ],
        choices: [
          { label: '...미안.', next: 'a1_mom_angry_soft', set: { mother: +1 }, effects: { flags: { mother_contact: 'softened' } } },
          { label: '읽고 폰을 내려놓는다', next: 'a1_mom_angry_end' },
        ],
      },
    },
    a1_mom_ok: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:25', battery: 38 },
        contact: '엄마',
        messages: [
          { from: 'them', name: '엄마', text: '어제 너 자고 있을 때 잠깐 들렀다.' },
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '알았어. 먹을게.' },
          { from: 'them', name: '엄마', text: '그래.\n밥 챙겨 먹고.' },
        ],
        choices: [
          { label: '방도 치울게.', next: 'a1_mom_ok_end', effects: { flags: { room_clean_promise: true } } },
          { label: '읽고 폰을 내려놓는다', next: 'a1_mom_ok_silent' },
        ],
      },
    },
    a1_mom_thanks: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:25', battery: 38 },
        contact: '엄마',
        messages: [
          { from: 'them', name: '엄마', text: '어제 너 자고 있을 때 잠깐 들렀다.' },
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '밥 고마워.' },
          { from: 'them', name: '엄마', text: '그래.\n먹고 일 가라.' },
        ],
        choices: [
          { label: '방도 치울게.', next: 'a1_mom_thanks_end', effects: { flags: { room_clean_promise: true } } },
          { label: '읽고 폰을 내려놓는다', next: 'a1_mom_thanks_silent' },
        ],
      },
    },
    a1_mom_borrow: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:25', battery: 38 },
        contact: '엄마',
        messages: [
          { from: 'them', name: '엄마', text: '어제 너 자고 있을 때 잠깐 들렀다.' },
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '엄마. 돈 좀 빌릴 수 있어?' },
          { from: 'them', name: '엄마', text: '얼마나.' },
        ],
        choices: [
          {
            label: '오백.',
            next: 'a1_mom_borrow_amount',
            effects: {
              cash: 5000000,
              flags: {
                mother_debt: true,
                guilt: true,
                pressure: true,
                mother_money_route: 'borrowed_max',
              },
            },
          },
          { label: '아냐. 됐어.', next: 'a1_mom_borrow_cancel', effects: { flags: { mother_money_route: 'cancelled' } } },
        ],
      },
    },
    a1_mom_angry_soft: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'me', text: '왜 들어왔어.' },
          { from: 'them', name: '엄마', text: '미안하다.\n밥은 먹고 가라.' },
          { from: 'me', text: '...미안.' },
          { from: 'them', name: '엄마', text: '됐다.\n밥은 꼭 먹어.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '입 안쪽이 쓰다.\n\n사과는 보냈는데, 마음까지 따라가진 못했다.',
      next: 'a1_bathroom',
    },
    a1_mom_angry_end: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '왜 들어왔어.' },
          { from: 'them', name: '엄마', text: '미안하다.\n밥은 먹고 가라.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '답장은 더 보내지 않았다.\n\n보낼수록 더 못난 말이 나올 것 같았다.',
      next: 'a1_bathroom',
    },
    a1_mom_ok_end: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'me', text: '알았어. 먹을게.' },
          { from: 'them', name: '엄마', text: '그래.\n밥 챙겨 먹고.' },
          { from: 'me', text: '방도 치울게.' },
          { from: 'them', name: '엄마', text: '그래.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '짧은 답장 하나에도 숨이 조금 길어졌다.',
      next: 'a1_bathroom',
    },
    a1_mom_ok_silent: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '알았어. 먹을게.' },
          { from: 'them', name: '엄마', text: '그래.\n밥 챙겨 먹고.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '고맙다는 말은 입 안에서 한 번 굴러가다 사라졌다.',
      next: 'a1_bathroom',
    },
    a1_mom_thanks_end: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'me', text: '밥 고마워.' },
          { from: 'them', name: '엄마', text: '그래.\n먹고 일 가라.' },
          { from: 'me', text: '방도 치울게.' },
          { from: 'them', name: '엄마', text: '그래.\n다녀와.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '짧은 한마디인데도, 방 안 공기가 조금 덜 차가웠다.',
      next: 'a1_bathroom',
    },
    a1_mom_thanks_silent: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'them', name: '엄마', text: '방이 그게 뭐고.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아라.' },
          { from: 'me', text: '밥 고마워.' },
          { from: 'them', name: '엄마', text: '그래.\n먹고 일 가라.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '더 보내면 괜히 목이 막힐 것 같았다.',
      next: 'a1_bathroom',
    },
    a1_mom_borrow_amount: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'me', text: '엄마. 돈 좀 빌릴 수 있어?' },
          { from: 'them', name: '엄마', text: '얼마나.' },
          { from: 'me', text: '오백.' },
          { from: 'them', name: '엄마', text: '계좌 보낼게.\n밥은 먹고.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '엄마는 이유를 묻지 않았다.\n\n그래서 더 무거웠다.',
      next: 'a1_bathroom',
    },
    a1_mom_borrow_cancel: {
      header: '1막: 고시원',
      image: 'assets/week1/gosiwon/fridge-note.png',
      phone: {
        screen: 'messages',
        statusbar: { time: '5:26', battery: 38 },
        contact: '엄마',
        revealText: 'afterFlow',
        holdMs: 900,
        messages: [
          { from: 'me', text: '엄마. 돈 좀 빌릴 수 있어?' },
          { from: 'them', name: '엄마', text: '얼마나.' },
          { from: 'me', text: '아냐. 됐어.' },
          { from: 'them', name: '엄마', text: '그래.\n밥은 꼭 먹어.' },
        ],
      },
      speaker: '{이름}(25)',
      text: '돈 얘기는 꺼내기도 전에 목에 걸렸다.',
      next: 'a1_bathroom',
    },
    a1_bathroom: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '나가기 전, 거울 앞에 멈춰 섰다.\n\n엉망이 된 머리와 뿔테 안경이\n자존감을 조금씩 깎아내리는 것 같았다.',
      choices: [
        {
          label: '그대로 나간다',
          next: 'a1_leave_plain',
          effects: { anger: 1, flags: { appearance: 'neglect', confidence: 'low' } },
        },
        {
          label: '꾸며 본다',
          next: 'a1_groom_cut_1',
          effects: { flags: { appearance: 'checked', confidence: 'seed' } },
        },
      ],
    },
    a1_oversleep: {
      header: '1막: 첫 아침',
      image: 'assets/01/00-1.png',     // 일러스트는 배경으로 유지
      // 일러스트가 먼저 뜨고 → 폰이 서서히 떠오르며 매니저 전화가 옴 → 부재중 목록으로
      phone: {
        statusbar: { time: '5:20', battery: 39 },
        sequence: ['ringing', 'missed'],
        revealText: 'afterFlow',
        acceptNext: 'a1_call_answer',
        acceptEffects: { flags: { firstCall: 'answered' } },
        afterFlowLabel: '전화 놓침',
        afterFlowEffects: { cash: -10000, flags: { firstCall: 'missed' } },
        caller: '매니저',
        number: '010-7442-8680',
        ringMs: 3400,
        missed: [
          { name: '매니저', number: '010-7442-8680', time: '오후 1:37', count: 3 },
        ],
      },
      speaker: '{이름}(25)',
      text: '1시간 지각.\n\n일당 -10,000원.',
      next: 'a1_bathroom_late',
    },
    a1_call_answer: {
      header: '1막: 첫 아침',
      image: 'assets/01/00-1.png',
      speaker: '매니저',
      text: '"{이름} 씨. 지금 어디예요?"\n\n"...죄송합니다. 바로 가겠습니다."\n\n"30분 안에 와요. 그럼 지각 처리까진 안 할게요."',
      next: 'a1_bathroom_rush',
    },
    a1_leave_plain: {
      header: '1막: 고시원',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '거울은 보지 않기로 했다.\n\n볼수록 늦어질 뿐이었다.\n아니, 볼수록 나가기 싫어질 뿐이었다.',
      next: 'a1_work_plain',
    },
    a1_groom_cut_1: {
      type: 'card',
      header: '1막: 고시원',
      big: '...',
      sub: '머리를 다듬고\n안경을 벗어본다.',
      next: 'a1_groom_cut_2',
    },
    a1_groom_cut_2: {
      type: 'card',
      header: '1막: 고시원',
      big: '눈을 뜬다',
      sub: '다시 거울을 본다.',
      next: 'a1_mirror_checked',
    },
    a1_mirror_checked: {
      header: '1막: 고시원',
      image: 'assets/01/02.png',
      speaker: '{이름}(25)',
      text: '잠깐, 딴사람처럼 보였다.\n\n그 정도 착각이면 오늘 하루는 버틸 수 있다.',
      next: 'a1_work_on_time',
    },
    a1_bathroom_late: {
      header: '1막: 첫 아침',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '고작 10,000원.\n누군가에겐 커피 몇 잔 값이고,\n나에겐 하루가 흔들리는 돈이다.',
      next: 'a1_work_late',
    },
    a1_bathroom_rush: {
      header: '1막: 첫 아침',
      image: 'assets/01/01.png',
      speaker: '{이름}(25)',
      text: '그래도 아직 완전히 늦은 건 아니다.\n지금 뛰면 된다.',
      next: 'a1_work_rush',
    },
    a1_work_on_time: {
      header: '1막: 마감조',
      image: { placeholder: '프랜차이즈 매장 외관\n(늦은 밤, 간판 불빛)' },
      speaker: '{이름}(25)',
      text: '프랜차이즈 매장에 도착했다.\n유니폼에서는 기름 냄새가 났고,\n포스기 옆에는 배달앱 리뷰 알림이 쌓여 있었다.\n\n오늘도 사람들은 돈 냄새가 나는 쪽으로 고개를 돌릴 것이다.',
      next: 'w1_card_checked',
    },
    a1_work_plain: {
      header: '1막: 마감조',
      image: { placeholder: '프랜차이즈 매장 외관\n(늦은 밤, 간판 불빛)' },
      speaker: '{이름}(25)',
      text: '프랜차이즈 매장에 도착했다.\n유니폼에서는 기름 냄새가 났고,\n포스기 옆에는 배달앱 리뷰 알림이 쌓여 있었다.\n\n출근은 했지만, 몸은 아직 고시원 방 안에 남아 있는 것 같았다.',
      next: 'w1_card_plain',
    },
    a1_work_late: {
      header: '1막: 마감조',
      image: { placeholder: '프랜차이즈 매장 뒷문\n(늦게 뛰어 들어오는 주인공)' },
      speaker: '{이름}(25)',
      text: '프랜차이즈 매장 뒷문을 밀고 들어가자,\n매니저의 시선이 먼저 날아왔다.\n\n"{이름} 씨. 첫날부터 이러면 곤란해요."\n\n출근은 했다.\n하지만 이미 하루는 마이너스에서 시작했다.',
      next: 'w1_card',
    },
    a1_work_rush: {
      header: '1막: 마감조',
      image: { placeholder: '프랜차이즈 매장 뒷문\n(숨이 찬 채 도착한 주인공)' },
      speaker: '{이름}(25)',
      text: '뒷문을 밀고 들어가자 숨이 턱까지 찼다.\n매니저는 시계를 봤다가, 한 번 혀를 찼다.\n\n"다음엔 바로 받으세요."\n\n간신히, 오늘 하루는 마이너스가 되지 않았다.',
      next: 'w1_card',
    },

    /* ========== 분기맵 (이름 정한 직후 표시) ========== */
    map_intro: {
      type: 'map',
      intro: true,
      header: '진행 분기',
      next: 'a1_wake',
    },

    /* ========== 1주차 — 엄마, 그리고 버스정류장 ========== */
    w1_card: { type: 'card', header: '1주차', big: '1주차', sub: '스물다섯, 연애가 하고 싶다', week: 1, next: 'w1_busstop_plain' },
    w1_card_plain: { type: 'card', header: '1주차', big: '1주차', sub: '스물다섯, 연애가 하고 싶다', week: 1, next: 'w1_busstop_plain' },
    w1_card_checked: { type: 'card', header: '1주차', big: '1주차', sub: '스물다섯, 연애가 하고 싶다', week: 1, next: 'w1_busstop_checked' },

    /* --- 아침: 엄마 밥 발견 → 메시지 루트 --- */
    w1_morning: {
      header: '1주차 · 아침',
      image: { placeholder: '고시원 307호 — 식어가는 밥 한 공기' },
      speaker: '{이름}(25)',
      text: '눈을 뜨니 책상 위에 밥과 반찬이 놓여 있었다.\n엄마가 다녀갔다.\n\n고맙다는 마음보다, 누가 내 방을 봤다는 게 먼저 떠올랐다.\n폰에는 엄마 메시지가 한 통.',
      choices: [
        { label: '엄마에게 답장한다', next: 'w1_mom_call' },
        { label: '무시하고 알바 갈 준비를 한다', next: 'w1_mom_ignore', effects: { flags: { mother_missed: true } } },
      ],
    },
    w1_mom_call: {
      header: '1주차 · 아침',
      image: { placeholder: '폰 메시지 화면 — 엄마' },
      speaker: '엄마', relationText: '메시지',
      text: '"어제 너 자고 있을 때 잠깐 들렀는데, 방이 너무 더럽더라.\n밥은 해놨으니까 먹고, 방 좀 치우고 살아."\n\n고마움보다, 감시당한 기분이 먼저 올라왔다.',
      choices: [
        { label: '"누가 들어오래. 내 방이잖아." (화낸다)', next: 'w1_mom_angry', set: { mother: -1 }, effects: { anger: 1 } },
        { label: '"알았어. 치울게." (수긍)', next: 'w1_mom_ok' },
        { label: '"밥은… 고마워." (감사)', next: 'w1_mom_thanks', set: { mother: 1 } },
        { label: '"엄마… 나 돈 좀 빌려줄 수 있어?" (부탁)', next: 'w1_mom_loan', effects: { cash: 5000000, flags: { mother_debt: true, guilt: true, pressure: true } } },
      ],
    },
    w1_mom_angry: {
      header: '1주차 · 아침',
      image: { placeholder: '엄마 — 말문이 막힌 얼굴' },
      speaker: '엄마',
      text: '"…그래. 미안하다, 엄마가."\n\n메시지는 거기서 멈췄다.\n이겼는데, 진 기분이었다.',
      next: 'w1_busstop_plain',
    },
    w1_mom_ok: {
      header: '1주차 · 아침',
      image: { placeholder: '고시원 — 식은 밥을 보는 주인공' },
      speaker: '엄마',
      text: '"그래. 밥 챙겨 먹고 일 가."\n\n별일 없이 대화가 끝났다.\n감정은, 그냥 눌렸다.',
      next: 'w1_busstop_plain',
    },
    w1_mom_thanks: {
      header: '1주차 · 아침',
      image: { placeholder: '엄마 — 잠시 말이 없다' },
      speaker: '엄마',
      text: '잠깐 말이 없던 엄마가, 작게 웃었다.\n"…그래. 먹고 일 가."\n\n별것 아닌 한마디에, 뭔가 풀렸다.',
      next: 'w1_busstop_plain',
    },
    w1_mom_loan: {
      header: '1주차 · 아침',
      image: { placeholder: '폰 — 입금 알림 5,000,000원' },
      speaker: '엄마',
      text: '"…얼마나 필요한데."\n망설임은 짧았다. 적금을 깬 모양이었다.\n\n통장에 500만 원이 찍혔다.\n돈은 들어왔는데, 가슴 한쪽이 무거워졌다.',
      next: 'w1_busstop_plain',
    },
    w1_mom_ignore: {
      header: '1주차 · 아침',
      image: { placeholder: '식은 밥 — 손대지 않은 채' },
      speaker: '{이름}(25)',
      text: '밥은 식어 있었다. 메시지는 보내지 않았다.\n그냥 옷을 입고 나왔다.\n\n나중에 후회할 걸 알면서도, 오늘은 그게 편했다.',
      next: 'w1_busstop_plain',
    },

    /* --- 버스정류장 헌팅 (외형 상태가 성공 가능성을 가른다) --- */
    w1_busstop_plain: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/b1-approach.png',
      speaker: '{이름}(25)',
      text: '정류장. 한 여자가 버스를 기다리고 있었다.\n\n말을 걸어야 한다고 생각했지만,\n내 셔츠와 눌린 머리가 먼저 마음에 걸렸다.\n\n스물다섯. 연애 한 번 못 해봤다.\n지금 말 안 걸면, 또 아무 일도 없을 거다.',
      choices: [
        { label: '억지로 말을 건다', next: 'w1_hunt_fail_plain' },
        { label: '그냥 버스를 기다린다 (포기)', next: 'w1_hunt_skip', effects: { anger: 1 } },
      ],
    },
    w1_busstop_checked: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/a1-approach.png',
      speaker: '{이름}(25)',
      text: '정류장. 한 여자가 버스를 기다리고 있었다.\n\n심장은 여전히 뛰었다.\n그래도 오늘은, 적어도 도망친 얼굴은 아니었다.\n\n말을 걸어볼 수는 있을 것 같았다.',
      choices: [
        { label: '[직설] "저기… 번호 좀 주세요."', next: 'w1_hunt_fail_checked' },
        { label: '[진심] "이상하게 들리겠지만, 지금 안 물어보면 평생 후회할 것 같아서요."', next: 'w1_hunt_success' },
        { label: '그냥 버스를 기다린다 (포기)', next: 'w1_hunt_skip', effects: { anger: 1 } },
      ],
    },
    w1_hunt_fail_plain: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/b2-fail.png',
      speaker: '여자',
      text: '"…네? 죄송한데, 좀."\n여자는 한 발 물러섰고, 마침 온 버스에 올라탔다.\n\n남은 건 정류장의 적막과,\n얼굴로 확 몰리는 열기.',
      next: 'w1_rage',
      effects: { anger: 4 },
    },
    w1_hunt_fail_checked: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/a1-approach.png',
      speaker: '여자',
      text: '"아... 죄송해요. 번호는 좀."\n\n말투가 험한 건 아니었다.\n그래서 더 정확하게 거절당한 기분이었다.',
      next: 'w1_rage',
      effects: { anger: 4 },
    },
    w1_rage: {
      header: '1주차 · 밤',
      image: { placeholder: '고시원 307호 — 폰만 켜진 어둠' },
      speaker: '{이름}(25)',
      text: '방에 돌아와 천장만 봤다.\n분노인지 수치인지 모를 게 명치에 뭉쳤다.\n\n홧김에 폰을 켰다. 증권 앱, 로또, 도박 사이트.\n"…어차피 이렇게 사는 거. 한 번 걸어볼까."',
      next: 'w2_card',
    },
    w1_hunt_success: {
      header: '1주차 · 정류장',
      image: 'assets/week1/busstop/a2-success.png',
      speaker: '여자', relationText: '이름 모를 그녀',
      text: '여자가 잠깐 멈칫하더니, 피식 웃었다.\n"…진짜 후회할 것 같아 보이긴 하네요."\n\n폰에 번호가 찍혔다.\n처음으로, 세상이 조금 달라 보였다.',
      next: 'w1_smitten',
      set: { her: 2 },
    },
    w1_smitten: {
      header: '1주차 · 밤',
      image: { placeholder: '폰 연락처 — 새 번호 하나' },
      speaker: '{이름}(25)',
      text: '들뜬 마음도 잠시.\n만나려면 돈이 든다. 카페도, 밥도, 옷도.\n\n통장을 봤다. 한숨이 나왔다.\n"…뭐라도, 빨리 불려야 하는데."',
      next: 'w2_card',
      effects: { flags: { pressure: true } },
    },
    w1_hunt_skip: {
      header: '1주차 · 밤',
      image: { placeholder: '버스 안 — 멀어지는 정류장' },
      speaker: '{이름}(25)',
      text: '결국 아무 말도 못 했다.\n버스가 그녀를, 그리고 또 한 번의 기회를 데려갔다.\n\n익숙한 후회가 명치에 쌓였다.\n이 무력함을, 뭐로든 덮고 싶었다.',
      next: 'w2_card',
    },

    /* ========== 2주차 — 첫 베팅 ========== */
    w2_card: { type: 'card', header: '2주차', big: '2주차', sub: '첫 베팅', week: 2, next: 'w2_1' },
    w2_1: {
      header: '2주차', image: { placeholder: '증권 / 도박 앱 화면' },
      speaker: '{이름}(25)',
      text: '통장 잔고를 봤다.\n\n이 돈을 어떻게 걸 것인가.',
      choices: [
        { label: '소액만, 절제해서 건다', next: 'w2_after', effects: { flags: { temperance: true } } },
        { label: '크게 건다', next: 'w2_after', effects: { flags: { bold_bet: true } } },
        {
          label: '분노에 맡기고 가진 돈을 전부 건다',
          next: 'w2_after',
          requires: { angerAtLeast: 5 },
          rage: true,
          effects: { setAnger: 0, flags: { allin: true, rage_bet: true } },
        },
      ],
    },
    w2_after: {
      header: '2주차', image: { placeholder: '고시원 — 새벽, 폰 불빛' },
      speaker: '{이름}(25)',
      text: '결과는 아직이다. 보상은 다음 주.\n\n잠이 오지 않는 밤, 뭐라도 해야 했다.',
      choices: [
        { label: '심심해서 AI랑 대화를 시작한다', next: 'w3_card', effects: { flags: { ai: true } } },
        { label: '도박 커뮤니티에 더 깊이 빠진다', next: 'w3_card', effects: { flags: { gamble_deep: true } } },
      ],
    },

    /* ========== 3주차 — 세계의 구조 ========== */
    w3_card: { type: 'card', header: '3주차', big: '3주차', sub: '세계의 구조', week: 3, next: 'w3_1' },
    w3_1: {
      header: '3주차', image: { placeholder: '차트와 뉴스가 뒤섞인 화면' },
      speaker: '{이름}(25)',
      text: '돈이 움직이는 걸 들여다보다,\n문득 그 너머의 구조가 눈에 들어오기 시작했다.\n부조리하게도, 세상은 숫자로 짜여 있었다.',
      choices: [
        { label: '차트 너머 시스템의 구조를 파고든다', next: 'w3_after', effects: { flags: { system_eye: true } } },
        { label: '그냥 오를지 내릴지에만 집중한다', next: 'w3_after' },
      ],
    },
    w3_after: {
      header: '3주차', image: { placeholder: '주인공 — 결과 직전의 긴장' },
      speaker: '{이름}(25)',
      text: '다음 주, 결과가 드러난다.\n이 한 주가 인생의 계급을 가른다.',
      next: 'w4_card',
    },

    /* ========== 4주차 — 2분기 (붕괴 / 생존) ========== */
    w4_card: { type: 'card', header: '4주차', big: '4주차', sub: '결과', week: 4, next: 'w4_choice' },
    w4_choice: {
      header: '4주차', image: { placeholder: '폰 화면 — 손익 숫자' },
      speaker: '{이름}(25)',
      text: '앱을 열었다. 숫자가 떠 있었다.',
      choices: [
        { label: '무너졌다 — 원금도, 빚도 감당이 안 된다', next: 'w4a', effects: { debt: 5000000, flags: { branch: 'A', invest_failed: true } } },
        { label: '살아남았다 — 수익이 났다', next: 'w4b', effects: { assets: 5000000, flags: { branch: 'B' } } },
      ],
    },
    w4a: {
      header: '4주차 · 붕괴', image: { placeholder: '고시원 — 바닥에 앉은 주인공' },
      speaker: '{이름}(25)',
      text: '바닥이었다. 연애도, 돈도, 전부 잃었다.\n남은 건 빚과, 텅 빈 방과, 켜진 폰 하나.',
      next: 'w5a_card',
    },
    w4b: {
      header: '4주차 · 생존', image: { placeholder: '통장 잔고가 불어난 화면' },
      speaker: '{이름}(25)',
      text: '살아남았다. 처음으로 돈이 돈을 불렀다.\n이제 선택만 남았다.',
      next: 'w5b_card',
    },

    /* ========== 5주차 — 진엔딩 4갈래 ========== */
    w5a_card: { type: 'card', header: '5주차', big: '5주차', sub: '바닥에서', week: 5, next: 'w5a_choice' },
    w5a_choice: {
      header: '5주차 · 붕괴', image: { placeholder: '어둠 속 폰 불빛 하나' },
      speaker: '{이름}(25)',
      text: '더 내려갈 곳도 없다.\n이 바닥에서, 무엇을 할 것인가.',
      choices: [
        { label: '다 포기하고 주저앉는다', next: 'e_dirt' },
        { label: '폰의 AI를 켜고, 함께 세계를 만들기 시작한다', next: 'e_true' },
      ],
    },
    w5b_card: { type: 'card', header: '5주차', big: '5주차', sub: '갈림길', week: 5, next: 'w5b_choice' },
    w5b_choice: {
      header: '5주차 · 생존', image: { placeholder: '상승하는 차트' },
      speaker: '{이름}(25)',
      text: '여기서 멈출 수도, 더 키울 수도 있다.',
      choices: [
        { label: '여기서 멈추고 만족한다', next: 'e_silver' },
        { label: '전부 걸어 더 크게 키운다', next: 'e_gold' },
      ],
    },

    /* ========== 엔딩 4개 ========== */
    e_dirt: {
      type: 'end', header: '엔딩',
      big: '흙수저 엔딩',
      sub: '변한 건 없었다.\n그는 여전히 307호에 있다.',
    },
    e_silver: {
      type: 'end', header: '엔딩',
      big: '은수저 엔딩',
      sub: '한 칸 올라섰다.\n평범한 하루를, 처음으로 가졌다.',
    },
    e_gold: {
      type: 'end', header: '엔딩',
      big: '금수저 엔딩',
      sub: '부자가 되었다.\n그런데 곁에는 아무도 없었다.',
    },
    e_true: {
      type: 'end', header: '🔒 진엔딩',
      big: '시스템을 깨달은 개발자',
      sub: '돈은 끝내 의미를 사지 못했다.\n돈을 깨고 나온 자만이, 다음 세계로 간다.\n\n— 배금도시의 문이 닫히고, 시뮬라크월드가 열린다.',
    },
  },
};
