import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { AppText, KeyboardSpacer, ChevronLeft, Image as ImageIcon, Send, SmilePlus, Sticker, StoredImage } from "../../components";
import { loadThread, markRead, newMessageId, sendMessage, type Message, type Thread } from "../../data/chat";
import { usePrefs } from "../../data/prefs";
import { chatItems, isBigEmoji, mergeMessages } from "../../lib/chat";
import { pickPhoto } from "../../lib/photos";
import { setOpenChat } from "../../lib/push";
import { fontFamily, tokens, useInsets, useTheme } from "../../theme";
import { PersonSheet } from "../social/PersonSheet";
import { ReactionSheet } from "../social/ReactionSheet";

const POLL_MS = 3000;

/**
 * One conversation (user's recording of the original): back, the name in the middle and their picture on the right;
 * their picture and name at the top of the conversation; my messages on the right with 전송됨 (or 읽음) beside the last
 * one; at the bottom a photo button, the field "메시지 입력", a sticker/emoji button and send. New messages are fetched every
 * few seconds while the screen is open. A message that could not go out stays with "다시 보내기".
 */
export function ChatScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [thread, setThread] = useState<Omit<Thread, "messages"> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [profile, setProfile] = useState(false);
  const [olderLeft, setOlderLeft] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const stick = useRef(true); // keep the newest message in view unless the user scrolled up
  const latest = useRef<string | undefined>(undefined);

  const apply = useCallback((t: Thread, replace = false) => {
    setThread({ other: t.other, canSend: t.canSend, otherReadAt: t.otherReadAt, crew: t.crew });
    setMessages((old) => mergeMessages(replace ? old.filter((m) => m.status) : old, t.messages));
    const last = t.messages[t.messages.length - 1];
    if (last && (!latest.current || last.createdAt > latest.current)) latest.current = last.createdAt;
  }, []);

  // first load, then poll for new ones while the screen is in view
  useFocusEffect(useCallback(() => {
    if (!id) return;
    let alive = true;
    setOpenChat(`/chat/${id}`); // pushes for this conversation stay quiet while it is open
    loadThread(id).then((t) => {
      if (!alive) return;
      if (!t) { setError("볼 수 없는 대화예요"); return; }
      apply(t, true);
      setOlderLeft(t.messages.length >= 50);
      markRead(id);
    }).catch((e) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어요"));
    const timer = setInterval(() => {
      loadThread(id, { after: latest.current }).then((t) => {
        if (!alive || !t) return;
        const fresh = t.messages.some((m) => !m.mine);
        apply(t);
        if (fresh) markRead(id);
      }).catch(() => {}); // offline: try again next time
    }, POLL_MS);
    return () => { alive = false; clearInterval(timer); setOpenChat(null); };
  }, [id, apply]));

  // when the keyboard opens, keep the newest messages in view (the field itself rides on KeyboardSpacer below)
  useEffect(() => {
    if (Platform.OS === "web") return;
    const show = Keyboard.addListener("keyboardDidShow", () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50));
    return () => show.remove();
  }, []);

  const send = async (m: Message, local?: string) => {
    if (!id) return;
    setMessages((l) => mergeMessages(l, [{ ...m, status: "sending" }]));
    stick.current = true;
    try {
      const at = await sendMessage(id, { id: m.id, kind: m.kind, body: m.body, local });
      setMessages((l) => mergeMessages(l, [{ ...m, createdAt: at, status: undefined, photoUri: local ?? m.photoUri }]));
    } catch (e) {
      setMessages((l) => mergeMessages(l, [{ ...m, status: "failed" }]));
      setError(e instanceof Error ? e.message : "보내지 못했어요");
      setTimeout(() => setError(null), 3000);
    }
  };
  const draft = (kind: Message["kind"], body: string, photoUri?: string): Message =>
    ({ id: newMessageId(), kind, body, photoUri, mine: true, createdAt: new Date().toISOString() });
  const sendText = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    send(draft(isBigEmoji(body) ? "emoji" : "text", body.slice(0, 2000)));
  };
  const sendPhoto = async () => {
    const uri = await pickPhoto().catch(() => null);
    if (uri) send(draft("photo", "", uri), uri);
  };
  const retry = (m: Message) => send({ ...m, createdAt: new Date().toISOString() }, m.kind === "photo" ? m.photoUri : undefined);
  const loadOlder = () => {
    const first = messages.find((m) => !m.status);
    if (!id || !first) return;
    stick.current = false;
    loadThread(id, { before: first.createdAt }).then((t) => { if (t) { apply(t); setOlderLeft(t.messages.length >= 50); } }).catch(() => {});
  };

  const G = tokens.layout.gutter;
  const other = thread?.other;
  const items = chatItems(messages, prefs.use24h);
  const lastMine = [...messages].reverse().find((m) => m.mine);
  const stateOf = (m: Message) =>
    m.status === "sending" ? "보내는 중" : m.status === "failed" ? "전송 실패" : thread?.otherReadAt && thread.otherReadAt >= m.createdAt ? "읽음" : "전송됨";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: tokens.layout.headerHeight, flexDirection: "row", alignItems: "center", paddingHorizontal: G - 4, gap: 8 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/send" as never))} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <ChevronLeft size={28} color={c.text} strokeWidth={2.2} />
        </Pressable>
        <AppText variant="screenTitle" center numberOfLines={1} style={{ flex: 1 }} accessibilityRole="header">{other?.nickname ?? ""}</AppText>
        <Pressable onPress={() => (thread?.crew ? router.push(`/crew/${thread.crew.id}` as never) : other && setProfile(true))} accessibilityRole="button"
          accessibilityLabel={thread?.crew ? "크루 보기" : "프로필 보기"} style={{ width: 32, height: 32 }}>
          {other?.avatarUri ? <StoredImage uri={other.avatarUri} label="" style={{ width: 32, height: 32, borderRadius: 16 }} />
            : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surfaceStrong }} />}
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          stick.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={() => { if (stick.current) scroll.current?.scrollToEnd({ animated: false }); }}
      >
        {olderLeft ? (
          <Pressable onPress={loadOlder} accessibilityRole="button" style={{ alignSelf: "center", paddingVertical: 12 }}>
            <AppText variant="helper" color="textMuted">이전 메시지 보기</AppText>
          </Pressable>
        ) : other ? (
          <View style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
            {other.avatarUri ? <StoredImage uri={other.avatarUri} label="" style={{ width: 72, height: 72, borderRadius: 36 }} />
              : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceStrong }} />}
            <AppText variant="bodyLg" weight={700}>{other.nickname}</AppText>
            {thread?.crew ? (
              <View style={{ marginTop: 6, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: c.surface }}>
                <AppText variant="small" color="textMuted">{`대화방이 생성되었습니다 · 멤버 ${thread.crew.members}명`}</AppText>
              </View>
            ) : <AppText variant="helper" color="textMuted">{other.handle ? `@${other.handle} · ` : ""}{other.nickname}님과의 대화예요</AppText>}
          </View>
        ) : null}
        {!thread && !error ? <ActivityIndicator style={{ marginTop: 40 }} color={c.textMuted} /> : null}
        {items.map((it, k) => it.type === "day" ? (
          <View key={it.key} style={{ alignSelf: "center", marginVertical: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: c.surface }}>
            <AppText variant="small" color="textMuted">{it.label}</AppText>
          </View>
        ) : (
          <Bubble key={it.key} m={it.m} time={it.time} state={it.m === lastMine || it.m.status ? stateOf(it.m) : undefined}
            who={thread?.crew && !it.m.mine && it.m.sender && (() => { const p = items[k - 1]; return !(p && p.type === "msg" && p.m.sender?.id === it.m.sender?.id); })() ? it.m.sender : undefined}
            onRetry={it.m.status === "failed" ? () => retry(it.m) : undefined} tight={!it.last} />
        ))}
      </ScrollView>

      {error ? <AppText variant="helper" color="danger" center style={{ paddingVertical: 4 }}>{error}</AppText> : null}
      {thread && !thread.canSend ? (
        <View style={{ paddingVertical: 16, paddingBottom: 16 + insets.bottom }}>
          <AppText variant="body" color="textMuted" center>지금은 메시지를 보낼 수 없는 상대예요</AppText>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 + insets.bottom, backgroundColor: c.bg }}>
          <Pressable onPress={sendPhoto} disabled={!thread} hitSlop={6} accessibilityRole="button" accessibilityLabel="사진 보내기" style={{ height: 40, justifyContent: "center" }}>
            <ImageIcon size={24} color={c.textMuted} />
          </Pressable>
          <View style={{ flex: 1, minHeight: 40, borderRadius: 20, backgroundColor: c.surface, flexDirection: "row", alignItems: "flex-end", paddingLeft: 14, paddingRight: 6 }}>
            <TextInput value={text} onChangeText={setText} placeholder="메시지 입력" placeholderTextColor={c.textPlaceholder} multiline maxLength={2000}
              accessibilityLabel="메시지 입력" editable={!!thread}
              style={{ flex: 1, color: c.text, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, paddingVertical: 9, maxHeight: 120, outlineStyle: "none" as never }} />
            <Pressable onPress={() => { Keyboard.dismiss(); setEmoji(true); }} disabled={!thread} hitSlop={6} accessibilityRole="button" accessibilityLabel="스티커·이모지 보내기" style={{ height: 40, justifyContent: "center", paddingHorizontal: 4 }}>
              <SmilePlus size={22} color={c.textMuted} />
            </Pressable>
          </View>
          <Pressable onPress={sendText} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel="보내기"
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: text.trim() ? c.selectedBg : c.surface }}>
            <Send size={18} color={text.trim() ? c.onSelected : c.textMuted} />
          </Pressable>
        </View>
      )}
      <KeyboardSpacer />
      <ReactionSheet visible={emoji} onClose={() => setEmoji(false)} onPick={(e, kind) => { setEmoji(false); send(draft(kind, e)); }} />
      <PersonSheet person={profile && other ? other : null} onClose={() => setProfile(false)} />
    </View>
  );
}

function Bubble({ m, time, state, onRetry, tight, who }: { m: Message; time?: string; state?: string; onRetry?: () => void; tight: boolean; who?: Message["sender"] }) {
  const { c } = useTheme();
  const big = m.kind === "emoji" || (m.kind === "text" && isBigEmoji(m.body));
  const body = m.kind === "photo" ? (
    m.photoUri ? <StoredImage uri={m.photoUri} label="보낸 사진" style={{ width: 200, height: 200, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} />
      : <View style={{ width: 200, height: 200, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} />
  ) : m.kind === "sticker" ? (
    <Sticker id={m.body} size={120} />
  ) : big ? (
    <AppText style={{ fontSize: 44, lineHeight: 54 }}>{m.body}</AppText>
  ) : (
    <View style={{ maxWidth: 260, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: m.mine ? c.surfaceButton : c.surface }}>
      <AppText variant="bodyLg" selectable>{m.body}</AppText>
    </View>
  );
  const side = (
    <View style={{ alignItems: m.mine ? "flex-end" : "flex-start", justifyContent: "flex-end", gap: 1 }}>
      {state ? (
        <Pressable onPress={onRetry} disabled={!onRetry} accessibilityRole={onRetry ? "button" : undefined} accessibilityLabel={onRetry ? "다시 보내기" : state}>
          <AppText variant="small" color={state === "전송 실패" ? "danger" : "textMuted"}>{onRetry ? "전송 실패 · 다시 보내기" : state}</AppText>
        </Pressable>
      ) : null}
      {time ? <AppText variant="small" color="textMuted">{time}</AppText> : null}
    </View>
  );
  const row = (
    <View style={{ flexDirection: "row", justifyContent: m.mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6, marginBottom: tight ? 3 : 10, opacity: m.status === "sending" ? 0.6 : 1 }}>
      {m.mine ? side : null}
      {body}
      {m.mine ? null : side}
    </View>
  );
  // crew rooms: the sender's picture and name above the first of their messages
  if (!who) return row;
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {who.avatarUri ? <StoredImage uri={who.avatarUri} label="" style={{ width: 22, height: 22, borderRadius: 11 }} /> : <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.surfaceStrong }} />}
        <AppText variant="small" color="textSecondary">{who.nickname}</AppText>
      </View>
      {row}
    </View>
  );
}
