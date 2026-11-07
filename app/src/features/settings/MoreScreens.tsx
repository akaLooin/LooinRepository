import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { AppText, BellRing, BottomSheet, Button, ChevronDown, ChevronUp, RadioList, ScreenHeader, Sticker, STICKER_IDS, stickerLabel, ToggleRow, ValueRow, useToast } from "../../components";
import { setPref, usePrefs, type Audience } from "../../data/prefs";
import { setAllDiaryVisibility, syncNow, useSyncStatus } from "../../data/store";
import type { Visibility } from "../../data/types";
import { goBack } from "../../lib/nav";
import { supabase } from "../../lib/supabase";
import { registerPush, usePushStatus } from "../../lib/push";
import { tokens, useInsets, useTheme } from "../../theme";
import { Explain, SectionTitle } from "./parts";

function Page({ title, children, back = "/settings" }: { title: string; children: React.ReactNode; back?: string }) {
  const { c } = useTheme();
  const insets = useInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title={title} onBack={() => goBack(back)} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>{children}</ScrollView>
    </View>
  );
}

const AUDIENCE: Record<Audience, string> = { all: "모든 사람", followers: "팔로워", none: "아무도" };

/** 개인정보 보호 (original's sections). Friends come in phase 2; until then these are kept for then. */
export function PrivacyScreen() {
  const p = usePrefs();
  const [pick, setPick] = useState<null | "likesTodo" | "likesDiary" | "chatFrom" | "diaries">(null);
  const [draft, setDraft] = useState<string>("all");
  const [toast, notice] = useToast();
  const open = (k: "likesTodo" | "likesDiary" | "chatFrom") => { setDraft(p[k]); setPick(k); };
  const titles = { likesTodo: "할 일 좋아요 허용", likesDiary: "일기 좋아요 허용", chatFrom: "대화 수신 허용", diaries: "모든 일기의 공개설정 변경" };
  const DIARY: Record<Exclude<Visibility, "partial">, string> = { public: "전체 공개", followers: "팔로워", private: "나만 보기" };
  return (
    <Page title="개인정보 보호">
      <SectionTitle title="팔로우" />
      <ToggleRow title="수락한 사람만 팔로우 받기" value={p.followApproval} onChange={(v) => setPref("followApproval", v)} divider={false} />
      <Explain text="켜면 팔로우 요청을 내가 수락해야 팔로우돼요." />
      <SectionTitle title="차단" />
      <ValueRow title="차단 목록" value="" onPress={() => notice("차단한 사람이 없어요")} divider={false} />
      <Explain text="차단한 사람은 내 할 일과 일기를 볼 수 없고, 팔로우·좋아요·대화를 할 수 없어요." />
      <SectionTitle title="게시물" />
      <ValueRow title="할 일 좋아요 허용" value={AUDIENCE[p.likesTodo]} onPress={() => open("likesTodo")} />
      <ValueRow title="일기 좋아요 허용" value={AUDIENCE[p.likesDiary]} onPress={() => open("likesDiary")} />
      <ValueRow title="모든 일기의 공개설정 변경" value="" onPress={() => { setDraft("private"); setPick("diaries"); }} divider={false} />
      <Explain text="좋아요를 남길 수 있는 사람을 정해요. 지금까지 쓴 일기 전부의 공개 범위도 한 번에 바꿀 수 있어요." />
      <SectionTitle title="대화" />
      <ValueRow title="대화 수신 허용" value={AUDIENCE[p.chatFrom]} onPress={() => open("chatFrom")} divider={false} />
      <Explain text="메시지를 보낼 수 있는 사람을 정해요." />
      <SectionTitle title="검색" />
      <ToggleRow title="계정 검색 허용" value={p.searchable} onChange={(v) => setPref("searchable", v)} divider={false} />
      <Explain text="끄면 다른 사람이 검색으로 내 계정을 찾을 수 없어요." />
      <AppText variant="helper" color="textMuted" style={{ marginTop: 24 }}>친구 기능(2단계)을 만들면 여기 설정이 적용돼요. 일기 공개설정 변경은 지금 바로 적용돼요.</AppText>

      <BottomSheet visible={pick !== null} onClose={() => setPick(null)} title={pick ? titles[pick] : ""}>
        {pick === "diaries" ? (
          <RadioList value={draft} onChange={setDraft} options={(Object.keys(DIARY) as (keyof typeof DIARY)[]).map((v) => ({ value: v, label: DIARY[v] }))} />
        ) : (
          <RadioList value={draft} onChange={setDraft} options={(Object.keys(AUDIENCE) as Audience[]).map((v) => ({ value: v, label: AUDIENCE[v] }))} />
        )}
        <View style={{ marginTop: 20 }}>
          <Button kind="sheetPrimary" label="확인" onPress={() => {
            if (pick === "diaries") { setAllDiaryVisibility(draft as Visibility); notice("모든 일기의 공개 범위를 바꿨어요"); }
            else if (pick) setPref(pick, draft as Audience);
            setPick(null);
          }} />
        </View>
      </BottomSheet>
      {toast}
    </Page>
  );
}

/** 앱 권한 (original): which permissions the app has, with a button to allow the missing ones. */
export function PermissionsScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [canAsk, setCanAsk] = useState(true);
  const check = useCallback(async () => {
    if (Platform.OS === "web") return setGranted(false);
    const p = await Notifications.getPermissionsAsync();
    setGranted(p.granted);
    setCanAsk(p.canAskAgain);
  }, []);
  useEffect(() => { check(); }, [check]);
  const allow = async () => {
    if (Platform.OS === "web") return;
    if (!canAsk) return Linking.openSettings(); // asked before and refused: only the phone's settings can turn it on
    const r = await Notifications.requestPermissionsAsync();
    setGranted(r.granted);
    setCanAsk(r.canAskAgain);
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <ScreenHeader title="앱 권한" onBack={() => goBack("/settings")} />
      <View style={{ flex: 1, paddingHorizontal: tokens.layout.gutter, justifyContent: "center" }}>
        <View style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
          <BellRing size={44} color={c.text} />
          <AppText variant="sheetTitle">앱 권한</AppText>
          <AppText variant="body" color="textMuted" center>
            {granted ? "모든 권한이 허용되어 있어요.\n아래 완료하기를 눌러 돌아가세요." : "할 일 알림을 받으려면 알림 권한이 필요해요."}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.surfaceRow }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyLg" weight={600}>알림</AppText>
            <AppText variant="helper" color="textMuted">할 일 알림을 받을 수 있어요.</AppText>
          </View>
          <Pressable onPress={allow} disabled={!!granted} accessibilityRole="button" accessibilityLabel={granted ? "알림 권한 허용됨" : "알림 권한 허용"}
            style={{ height: 34, paddingHorizontal: 18, borderRadius: tokens.radius.pill, justifyContent: "center", backgroundColor: granted ? c.surfaceRow : c.text }}>
            <AppText variant="body" weight={600} color={granted ? "textMuted" : "bg"}>{granted ? "완료" : "허용"}</AppText>
          </Pressable>
        </View>
      </View>
      <View style={{ paddingHorizontal: tokens.layout.gutter }}>
        <Button kind="sheetPrimary" label="완료하기" onPress={() => goBack("/settings")} />
      </View>
    </View>
  );
}

/** 알림 (original's three switches). They are about friends, so they take effect in phase 2. */
export function NotificationSettingsScreen() {
  const p = usePrefs();
  const push = usePushStatus();
  return (
    <Page title="알림">
      <ToggleRow title="마케팅 정보 알림" value={p.notifyMarketing} onChange={(v) => setPref("notifyMarketing", v)} />
      <ToggleRow title="좋아요 소식 받기" value={p.notifyLikes} onChange={(v) => setPref("notifyLikes", v)} />
      <ToggleRow title="팔로잉의 소식 받기" value={p.notifyFollowing} onChange={(v) => setPref("notifyFollowing", v)} />
      {/* not in the original's list: added with 대화 */}
      <ToggleRow title="대화 메시지 받기" value={p.notifyChat} onChange={(v) => setPref("notifyChat", v)} divider={false} />
      <SectionTitle title="이 폰의 푸시 알림" />
      <AppText variant="body" color={push.state === "on" ? "text" : "textMuted"}>
        {push.state === "on" ? "켜져 있어요. 앱을 닫아도 메시지와 친구 소식이 와요." : push.state === "working" ? "확인하는 중…" : `꺼져 있어요: ${push.reason ?? ""}`}
      </AppText>
      {push.state === "off" && supabase ? (
        <Pressable onPress={() => registerPush()} accessibilityRole="button" style={{ alignSelf: "flex-start", paddingVertical: 10 }}>
          <AppText variant="body" color="saturday">다시 시도</AppText>
        </Pressable>
      ) : null}
      <AppText variant="helper" color="textMuted" style={{ marginTop: 20 }}>할 일 시간 알림과 리마인더는 ≡ 메뉴 → 리마인더 관리에서 정해요.</AppText>
    </Page>
  );
}

/** 공지사항: this app's own update notes (newest first). */
const NOTICES: { date: string; text: string }[] = [
  { date: "2026. 11. 7.", text: "폰에 직접 설치하는 앱(APK)이 나왔어요. 이제 PC 없이 쓸 수 있어요. 설정 화면을 새로 꾸미고, 비밀번호 찾기와 바꾸기를 넣었어요." },
  { date: "2026. 11. 7.", text: "캘린더를 옆으로 밀어 달을 넘길 수 있어요. 큰 날짜 제목을 누르면 오늘로 돌아와요. 할 일 메모와 알림 시간을 누르면 바로 고칠 수 있어요." },
  { date: "2026. 11. 6.", text: "할 일 시간 알림이 할 일 내용으로 와요. 할 일 아래에 알림 시간이 보여요." },
  { date: "2026. 11. 5.", text: "할 일을 길게 눌러 다른 카테고리로 옮길 수 있어요. 보관함은 홈 왼쪽 옆 화면이에요." },
  { date: "2026. 11. 4.", text: "보관함, 사진 인증, 리스트 메뉴, 바텀 시트 끌어 닫기가 생겼어요." },
];
export function NoticesScreen() {
  const { c } = useTheme();
  return (
    <Page title="공지사항">
      {NOTICES.map((n, i) => (
        <View key={i} style={{ paddingVertical: 16, borderBottomWidth: 1, borderColor: c.surfaceRow, gap: 8 }}>
          <AppText variant="body">{n.text}</AppText>
          <AppText variant="helper" color="textMuted">{n.date}</AppText>
        </View>
      ))}
    </Page>
  );
}

/** 내 스티커: stickers are not made yet (they need artwork of our own). */
export function StickersScreen() {
  return (
    <Page title="내 스티커">
      <AppText variant="bodyLg" weight={700} style={{ marginTop: 12 }}>클로버 친구들</AppText>
      <AppText variant="body" color="textMuted" style={{ marginTop: 4, marginBottom: 12 }}>우리 앱만의 스티커예요. 친구의 할 일에 반응하거나 대화에서 보낼 수 있어요.</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {STICKER_IDS.map((id) => (
          <View key={id} style={{ width: "25%", alignItems: "center", paddingVertical: 8, gap: 2 }}>
            <Sticker id={id} size={64} />
            <AppText variant="small" color="textMuted">{stickerLabel(id)}</AppText>
          </View>
        ))}
      </View>
    </Page>
  );
}

/** 정보: 이용약관, 개인정보 정책, 오픈소스 (our own short texts). */
export const DOCS: Record<string, { title: string; body: string }> = {
  terms: { title: "이용약관", body: "이 앱은 개인이 공부와 자기 일정 관리를 위해 만든 앱이에요. 판매하거나 광고를 넣지 않아요.\n\n앱에 적은 할 일, 일기, 사진은 본인 계정에만 저장되고, 본인만 고치거나 지울 수 있어요. 계정을 삭제하면 모두 함께 지워져요.\n\n앱은 있는 그대로 제공돼요. 중요한 일정은 다른 곳에도 함께 적어 두세요." },
  privacy: { title: "개인정보 정책", body: "모으는 것: 로그인용 이메일, 내가 적은 프로필(이름, 자기소개, ID, 관심사, 성별, 생년월), 할 일·일기·사진.\n\n쓰는 곳: 기기끼리 맞추기(동기화)에만 써요. 다른 곳에 주거나 팔지 않아요.\n\n저장 위치: Supabase(서울 리전) 서버와 내 폰.\n\n지우기: 설정 → 계정 → 계정 삭제하기를 누르면 서버의 모든 기록과 사진이 지워져요." },
  oss: { title: "오픈소스", body: "이 앱은 아래 오픈소스로 만들었어요. 고맙습니다.\n\n• React Native, Expo, Expo Router — MIT\n• Supabase JavaScript client — MIT\n• Lucide 아이콘 — ISC\n• react-native-svg — MIT\n• AsyncStorage — MIT\n• Pretendard 글꼴 — SIL Open Font License 1.1" },
};
export function AboutScreen({ open }: { open: (name: string) => void }) {
  return (
    <Page title="정보">
      {Object.entries(DOCS).map(([k, d], i, a) => <ValueRow key={k} title={d.title} value="" onPress={() => open(k)} divider={i < a.length - 1} />)}
    </Page>
  );
}
export function DocScreen({ name }: { name: string }) {
  const d = DOCS[name] ?? DOCS.terms;
  return (
    <Page title={d.title} back="/settings/about">
      <AppText variant="body" style={{ marginTop: 8, lineHeight: 24 }}>{d.body}</AppText>
    </Page>
  );
}

/** 문의하기: questions about this app, each opens its answer (as the original's list does). */
const FAQ: { q: string; a: string }[] = [
  { q: "다른 기기와 동기화가 안 돼요.", a: "인터넷에 연결된 상태에서 앱을 열면 자동으로 맞춰져요. 바로 맞추고 싶으면 설정 → 실험실 → 강제 동기화를 눌러 주세요. 두 기기 모두 같은 이메일로 로그인해야 해요." },
  { q: "예전 기록이 보이지 않아요.", a: "캘린더에서 그 날짜를 눌러 보세요. 큰 날짜 제목을 누르면 오늘로 돌아와요. 날짜가 없는 할 일은 보관함(홈에서 오른쪽으로 밀기)에 있어요." },
  { q: "할 일 시간 알림이 오지 않아요.", a: "설정 → 앱 권한에서 알림이 허용됐는지 확인해 주세요. 방해금지 모드나 배터리 절약 설정이 알림을 막을 수 있어요. ≡ 메뉴 → 리마인더 관리 아래의 알림 점검에서 10초 테스트를 해 볼 수 있어요." },
  { q: "비밀번호를 잊어버렸어요.", a: "로그인 화면의 \"비밀번호를 잊으셨나요?\"를 누르고 이메일을 넣으세요. 이 폰에서 메일의 링크를 누르면 새 비밀번호를 정할 수 있어요." },
  { q: "할 일을 다른 날이나 다른 카테고리로 옮기고 싶어요.", a: "할 일을 눌러 날짜 바꾸기, 내일 하기, 보관함으로 이동을 고를 수 있어요. 다른 카테고리로는 할 일을 길게 눌러 그 카테고리 제목 아래로 끌어 놓으면 돼요." },
  { q: "사진 인증은 어떻게 하나요?", a: "할 일을 완료한 뒤 그 할 일을 눌러 사진 인증을 고르세요. 사진은 폰에 먼저 저장되고, 인터넷이 될 때 서버로 올라가요." },
  { q: "사진이 회색으로 보여요.", a: "회색 칸에 이유가 적혀 있어요. \"서버에 사진 파일이 없어요\"라면 그 할 일의 사진을 다시 넣어 주세요." },
  { q: "카테고리를 접고 싶어요.", a: "설정 → 화면 → 카테고리 접기 펼치기를 켜면 카테고리 줄 오른쪽에 ∨ 버튼이 생겨요." },
  { q: "계정을 삭제하고 싶어요.", a: "설정 → 계정 → 계정 삭제하기를 누르세요. 할 일, 루틴, 일기, 사진이 모두 지워지고 되돌릴 수 없어요." },
];
export function FaqScreen() {
  const { c } = useTheme();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <Page title="문의하기">
      <AppText variant="body" color="textMuted" center style={{ marginVertical: 12 }}>자주 묻는 질문을 확인하세요.</AppText>
      <View style={{ gap: 10 }}>
        {FAQ.map((f, i) => {
          const on = openIdx === i;
          const Icon = on ? ChevronUp : ChevronDown;
          return (
            <Pressable key={i} onPress={() => setOpenIdx(on ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: on }}
              style={{ borderRadius: tokens.radius.md, backgroundColor: c.surfaceRow, padding: 16, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AppText variant="body" weight={600} style={{ flex: 1 }}>{`${i + 1}. ${f.q}`}</AppText>
                <Icon size={18} color={c.textMuted} />
              </View>
              {on ? <AppText variant="body" color="textSecondary">{f.a}</AppText> : null}
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}

/** 실험실 (original): 강제 동기화, plus how syncing stands. */
export function LabScreen() {
  const sync = useSyncStatus();
  const [toast, notice] = useToast();
  const line = !supabase ? "체험 모드: 이 기기에만 저장돼요"
    : sync.state === "syncing" ? "동기화 중…"
    : sync.state === "offline" ? `오프라인 · 보낼 변경 ${sync.pending}개`
    : sync.pending ? `보낼 변경 ${sync.pending}개` : "모두 동기화됨";
  return (
    <Page title="실험실">
      <ValueRow title="강제 동기화" value="" onPress={supabase ? async () => { await syncNow(); notice("동기화했어요"); } : undefined} divider={false} />
      <AppText variant="helper" color="textMuted">{line}</AppText>
      {sync.rejected.length ? (
        <AppText variant="helper" color="danger" style={{ marginTop: 8 }}>{`서버가 받지 않은 변경 ${sync.rejected.length}개 (예: 종료한 카테고리에 추가한 할 일, 다른 사람이 쓰는 ID)`}</AppText>
      ) : null}
      {toast}
    </Page>
  );
}
