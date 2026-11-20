/**
 * What the admin app can change in the design app without a new release (user, 2026-11-21: "앱 자체를 수정하는
 * 다양한 기능", so small changes need no Claude). One list shared by the app (defaults, where each value is used) and
 * the admin app (labels for the editor). Pure data: keys are stored on the server, so never rename one.
 */

/** Words on screen. `{date}` in a text is replaced where noted. */
export const TEXTS = {
  "tab.home": { label: "아래 탭: 홈", def: "홈" },
  "tab.calendar": { label: "아래 탭: 달력", def: "달력" },
  "tab.together": { label: "아래 탭: 커뮤니티", def: "커뮤니티" },
  "tab.me": { label: "아래 탭: 프로필", def: "프로필" },
  "home.greeting.night": { label: "홈 인사 (0~5시)", def: "늦은 밤이에요" },
  "home.greeting.morning": { label: "홈 인사 (5~12시)", def: "좋은 아침이에요" },
  "home.greeting.afternoon": { label: "홈 인사 (12~18시)", def: "좋은 오후예요" },
  "home.greeting.evening": { label: "홈 인사 (18시~)", def: "좋은 저녁이에요" },
  "home.today": { label: "홈 카드: 오늘", def: "오늘" },
  "home.week": { label: "홈 카드: 이번 주", def: "이번 주" },
  "home.dday": { label: "홈 카드: 디데이", def: "디데이" },
  "home.coming": { label: "홈 카드: 다가오는 중요한 날", def: "다가오는 중요한 날" },
  "home.shortcuts": { label: "홈 카드: 바로가기", def: "바로가기" },
  "home.notice": { label: "홈 공지 제목", def: "공지" },
  "agenda.allday": { label: "달력 목록: 종일", def: "종일" },
  "agenda.morning": { label: "달력 목록: 오전", def: "오전" },
  "agenda.afternoon": { label: "달력 목록: 오후", def: "오후" },
  "agenda.evening": { label: "달력 목록: 저녁", def: "저녁" },
  "agenda.todo": { label: "달력 목록: 시간 없는 할 일", def: "To Do" },
  "agenda.important": { label: "할 일 오른쪽 표시: 중요", def: "중요" },
  "agenda.ddayMark": { label: "디데이 줄 오른쪽 표시", def: "디데이" },
  "agenda.diary": { label: "일기 카드 (안 쓴 날)", def: "이날의 일기 쓰기" },
  "agenda.empty": { label: "할 일이 없을 때 안내", def: "아래 칸에 할 일을 적어 보세요" },
  "quickadd.placeholder": { label: "아래 입력줄 안내 ({date} = 날짜)", def: "{date}에 할 일 추가" },
  "community.title": { label: "커뮤니티 제목", def: "커뮤니티" },
  "community.feed": { label: "커뮤니티: 친구 소식", def: "친구 소식" },
  "community.find": { label: "커뮤니티: 친구 찾기", def: "친구 찾기" },
  "community.addFriend": { label: "커뮤니티: 친구 추가 버튼", def: "친구 추가" },
  "profile.title": { label: "프로필 제목", def: "프로필" },
  "profile.done": { label: "프로필 기록: 완료한 할 일", def: "완료한 할 일" },
  "profile.month": { label: "프로필 기록: 이번 달", def: "이번 달" },
  "profile.streak": { label: "프로필 기록: 연속 기록", def: "연속 기록" },
} as const;
export type TextKey = keyof typeof TEXTS;

/** Parts that can be shown or hidden (all shown by default). */
export const FEATURES = {
  "home.todayCard": { label: "홈: 오늘 카드", group: "홈" },
  "home.weekCard": { label: "홈: 이번 주 카드", group: "홈" },
  "home.ddayCard": { label: "홈: 디데이 카드", group: "홈" },
  "home.comingCard": { label: "홈: 다가오는 중요한 날 카드", group: "홈" },
  "home.shortcutsCard": { label: "홈: 바로가기 카드", group: "홈" },
  "home.quickAdd": { label: "홈: 아래 입력줄", group: "홈" },
  "agenda.ddays": { label: "달력: 그날 디데이 줄", group: "달력" },
  "agenda.diaryCard": { label: "달력: 일기 카드", group: "달력" },
  "agenda.groupCount": { label: "달력: 카테고리 완료 수", group: "달력" },
  "tab.together": { label: "아래 탭: 커뮤니티 보이기", group: "탭" },
  "profile.stats": { label: "프로필: 기록 3칸", group: "프로필" },
} as const;
export type FeatureKey = keyof typeof FEATURES;

/** Numbers with a safe range. */
export const NUMBERS = {
  weekStarSize: { label: "이번 주 카드 별 크기", def: 30, min: 18, max: 42, step: 2, unit: "" },
  holdMs: { label: "꾹 눌러 옮기기 시작 시간", def: 300, min: 150, max: 800, step: 50, unit: "ms" },
  comingDays: { label: "중요한 날: 며칠 앞까지", def: 30, min: 7, max: 120, step: 7, unit: "일" },
  comingCount: { label: "중요한 날: 보이는 개수", def: 5, min: 1, max: 10, step: 1, unit: "개" },
  weekPeekCount: { label: "이번 주 카드: 할 일 보이는 개수", def: 6, min: 2, max: 15, step: 1, unit: "개" },
  ddayCount: { label: "디데이 카드: 보이는 개수", def: 3, min: 1, max: 8, step: 1, unit: "개" },
  textScale: { label: "글자 크기 (본문)", def: 100, min: 80, max: 140, step: 5, unit: "%" },
  titleScale: { label: "글자 크기 (제목)", def: 100, min: 80, max: 140, step: 5, unit: "%" },
} as const;
export type NumberKey = keyof typeof NUMBERS;

/** Colour roles that can be changed, per theme. Empty = the app's own colour. */
export const COLOR_ROLES = {
  accent: "강조 색 (오늘 날짜·버튼)",
  bg: "배경",
  surface: "카드 배경",
  surfaceStrong: "진한 카드 · 고른 칸",
  text: "글자",
  textMuted: "흐린 글자",
  sunday: "일요일 · 공휴일",
  saturday: "토요일",
  dday: "디데이",
  sectionLine: "구분선",
  todayCell: "달력 오늘 칸",
  danger: "삭제 · 경고",
} as const;
export type ColorRole = keyof typeof COLOR_ROLES;

/** 홈 cards, in their default order (the admin app can reorder them; a card left out goes last). */
export const HOME_CARDS = {
  today: "오늘",
  week: "이번 주",
  dday: "디데이",
  coming: "다가오는 중요한 날",
  shortcuts: "바로가기",
} as const;
export type HomeCard = keyof typeof HOME_CARDS;
