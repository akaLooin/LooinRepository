import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  AppText, BottomSheet, Button, ChevronDown, ConfirmDialog, ZoomPhoto, Image, MoodGauge, MoodMark, KeyboardSpacer, RadioCheck, ScreenHeader, Slider, SmilePlus, Sticker, StoredImage, Thermometer,
  useToast, VisibilityIcon, type Visibility,
} from "../../components";
import { saveDiary, selectDiary, useDB } from "../../data/store";
import { reactionsOnMine, type Reaction } from "../../data/social";
import { pickPhoto } from "../../lib/photos";
import { parseDay, today, weekday } from "../../lib/dates";
import { contrast, fontFamily, tokens, useTheme } from "../../theme";
import { VISIBILITY_LABEL } from "../categories/CategoryEditScreen";
import { ReactionSheet } from "../social/ReactionSheet";
import { DIARY_COLORS } from "./colors";

const ORDER: Visibility[] = ["public", "followers", "partial", "private"];
const WD = "일월화수목금토";

/**
 * S09, as in the user's recording of the original: the mood on top is a sticker (or an emoji) picked from the panel,
 * with its 기분 온도 (0–100°) under it; name, date and who can see it; the text; photos full width with a "−" to take
 * them out. At the bottom: background colour (a big grid, previewed live, 확인 to keep), photo, 기분 온도 (original:
 * the sticker is picked on top, the temperature from the bottom button, user's correction). Closing with changes
 * asks whether to leave without a 임시 저장 (draft kept on this phone and offered back next time; user's request).
 */
export function DiaryScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date && params.date !== "today" ? params.date : today();
  const { c } = useTheme();
  const insets = useInsets();
  const existing = useDB(selectDiary(date));
  const profile = useDB((d) => d.profile);
  const [emoji, setEmoji] = useState(existing?.emoji);
  const [temp, setTemp] = useState<number | null | undefined>(existing?.moodTemp);
  const [body, setBody] = useState(existing?.body ?? "");
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? "private");
  const [bg, setBg] = useState<string | undefined>(existing?.backgroundColor);
  const [images, setImages] = useState<string[]>(existing?.imagePaths ?? []);
  const [sheet, setSheet] = useState<null | "mood" | "temp" | "visibility" | "color">(null);
  const [draftBg, setDraftBg] = useState<string | undefined>(bg);
  const [draftTemp, setDraftTemp] = useState(50);
  const [asking, setAsking] = useState(false);
  const [toast, notice] = useToast();
  // stickers and emoji friends left on this diary (shown under it, with who sent them)
  const [received, setReceived] = useState<Reaction[]>([]);
  useEffect(() => {
    if (!existing) return;
    let alive = true;
    reactionsOnMine(date, date).then((r) => { if (alive) setReceived(r.diaries[existing.id] ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [date, existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 임시 저장: a draft kept on this phone per day, offered back when the diary is opened again
  const draftKey = `todomate:diary-draft:${date}`;
  useEffect(() => {
    AsyncStorage.getItem(draftKey).then((v) => {
      if (!v) return;
      const d = JSON.parse(v) as { emoji?: string; temp?: number | null; body: string; visibility: Visibility; bg?: string; images: string[] };
      setEmoji(d.emoji); setTemp(d.temp ?? undefined); setBody(d.body ?? ""); setVisibility(d.visibility ?? "private"); setBg(d.bg); setImages(d.images ?? []);
      notice("임시 저장한 일기를 불러왔어요");
    }).catch(() => {});
  }, [draftKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveDraft = () => AsyncStorage.setItem(draftKey, JSON.stringify({ emoji, temp, body, visibility, bg, images })).catch(() => {});
  const dropDraft = () => AsyncStorage.removeItem(draftKey).catch(() => {});

  const shownBg = sheet === "color" ? draftBg : bg;
  const background = shownBg ?? c.bg;
  const ink = shownBg ? (contrast(c.checkWhite, shownBg) >= 4.5 ? c.checkWhite : c.onSelected) : c.text;
  const inkMuted = shownBg ? (ink === c.checkWhite ? c.textSecondary : c.surfaceStrong) : c.textMuted;
  const { y, m, d } = parseDay(date);
  const changed = (emoji ?? "") !== (existing?.emoji ?? "") || (temp ?? null) !== (existing?.moodTemp ?? null) || body !== (existing?.body ?? "")
    || visibility !== (existing?.visibility ?? "private") || (bg ?? "") !== (existing?.backgroundColor ?? "") || images.join() !== (existing?.imagePaths ?? []).join();
  const done = () => {
    dropDraft();
    saveDiary(date, { emoji, body: body.trim(), visibility, backgroundColor: bg, imagePaths: images, ...(temp !== undefined ? { moodTemp: temp } : {}) });
    goBack("/");
  };
  const close = () => (changed ? setAsking(true) : goBack("/"));

  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top }}>
      <ScreenHeader title="일기" close onBack={close} right={{ label: "완료", onPress: done }} ink={shownBg ? ink : undefined} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 8, marginVertical: 8 }}>
          <Pressable onPress={() => setSheet("mood")} accessibilityRole="button" accessibilityLabel={emoji ? "오늘의 기분 스티커 바꾸기" : "오늘의 기분 고르기"}>
            {emoji ? <MoodMark value={emoji} size={72} /> : (
              <View style={{ width: 72, height: 72, alignItems: "center", justifyContent: "center" }}>
                <Svg width={72} height={72} style={{ position: "absolute" }}>
                  <Circle cx={36} cy={36} r={32} stroke={inkMuted} strokeWidth={2.5} strokeDasharray="6 6" fill="none" />
                </Svg>
                <SmilePlus size={32} color={inkMuted} />
              </View>
            )}
          </Pressable>
          {typeof temp === "number" ? (
            <Pressable onPress={() => { setDraftTemp(temp); setSheet("temp"); }} accessibilityRole="button" accessibilityLabel={`기분 온도 ${temp}도, 바꾸기`}>
              <MoodGauge temp={temp} ink={ink} track={inkMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <StoredImage uri={profile.avatarUri} label="프로필 사진" style={{ width: 46, height: 46, borderRadius: 23 }} />
          <View style={{ gap: 2 }}>
            <AppText variant="bodyLg" weight={700} raw={ink}>{profile.nickname || "나"}</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <AppText variant="body" raw={ink}>{`${y}년 ${m}월 ${d}일 ${WD[weekday(date)]}요일`}</AppText>
              <Pressable onPress={() => setSheet("visibility")} accessibilityRole="button" accessibilityLabel={`공개 범위 ${VISIBILITY_LABEL[visibility]}, 바꾸기`} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <VisibilityIcon value={visibility} color={inkMuted} size={15} />
                <AppText variant="body" raw={ink}>{VISIBILITY_LABEL[visibility]}</AppText>
                <ChevronDown size={14} color={inkMuted} />
              </Pressable>
            </View>
          </View>
        </View>
        {images.map((u, i) => (
          <View key={u + i}>
            <ZoomPhoto uri={u} label={`일기 사진 ${i + 1}`} others={false}><StoredImage uri={u} label={`일기 사진 ${i + 1}`} style={{ width: "100%", aspectRatio: 1, borderRadius: tokens.radius.lg }} /></ZoomPhoto>
            <Pressable onPress={() => setImages((xs) => xs.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`일기 사진 ${i + 1} 빼기`} hitSlop={8}
              style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: c.surfaceButton, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 12, height: 2.5, borderRadius: 1, backgroundColor: c.text }} />
            </Pressable>
          </View>
        ))}
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="오늘은 어떤 하루였나요?"
          placeholderTextColor={inkMuted}
          accessibilityLabel="일기 내용"
          style={{ minHeight: images.length ? 120 : 320, color: ink, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, lineHeight: 26, textAlignVertical: "top", outlineStyle: "none" as never }}
        />
        {received.length ? (
          <View style={{ gap: 10, marginTop: 8 }} accessibilityLabel="받은 반응">
            <AppText variant="helper" raw={inkMuted}>받은 반응 {received.length}</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {received.map((r, i) => (
                <View key={i} style={{ alignItems: "center", gap: 2, width: 64 }}>
                  {r.kind === "sticker" ? <Sticker id={r.value} size={52} /> : <AppText style={{ fontSize: 34, lineHeight: 52 }}>{r.value}</AppText>}
                  <AppText variant="small" raw={inkMuted} numberOfLines={1}>{r.nickname ?? ""}</AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ flexDirection: "row", gap: 14, paddingHorizontal: tokens.layout.gutter, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.surfaceButton }}>
        <Pressable onPress={() => { setDraftBg(bg); setSheet("color"); }} accessibilityRole="button" accessibilityLabel="배경색" style={{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", flexDirection: "row", flexWrap: "wrap" }}>
          {[DIARY_COLORS[1], DIARY_COLORS[20], DIARY_COLORS[33], DIARY_COLORS[39]].map((col) => <View key={col} style={{ width: "50%", height: "50%", backgroundColor: col ?? c.bg }} />)}
        </Pressable>
        <Pressable onPress={async () => {
            if (images.length >= 4) return notice("사진은 4장까지 넣을 수 있어요");
            const uri = await pickPhoto().catch(() => null);
            if (uri) setImages((xs) => [...xs, uri]);
          }} accessibilityRole="button" accessibilityLabel="사진 넣기" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Image size={21} color={c.menuPhoto} />
        </Pressable>
        <Pressable onPress={() => { setDraftTemp(temp ?? 50); setSheet("temp"); }} accessibilityRole="button" accessibilityLabel="기분 온도"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Thermometer size={21} color={tokens.sticker.heart} />
        </Pressable>
      </View>
      <KeyboardSpacer />

      <ReactionSheet visible={sheet === "mood"} current={emoji} onClose={() => setSheet(null)}
        onPick={(v) => { setSheet(null); if (v === emoji) { setEmoji(undefined); setTemp(temp === undefined ? undefined : null); } else setEmoji(v); }} />

      <BottomSheet visible={sheet === "temp"} onClose={() => setSheet(null)} title="기분 온도">
        <AppText center style={{ fontSize: 40, lineHeight: 52, fontFamily: fontFamily(700), marginVertical: 8 }} accessibilityLiveRegion="polite">{`${draftTemp}°`}</AppText>
        <Slider value={draftTemp} onChange={setDraftTemp} label="기분 온도" color={tokens.sticker.heart} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <AppText variant="small" color="textMuted">0°</AppText>
          <AppText variant="small" color="textMuted">100°</AppText>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {typeof temp === "number" ? <View style={{ flex: 1 }}><Button kind="danger" label="지우기" onPress={() => { setTemp(null); setSheet(null); }} /></View> : null}
          <View style={{ flex: 1 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setTemp(draftTemp); setSheet(null); }} /></View>
        </View>
      </BottomSheet>

      <BottomSheet visible={sheet === "visibility"} onClose={() => setSheet(null)} title="공개설정">
        {ORDER.map((v) => (
          <Pressable key={v} onPress={() => { setVisibility(v); setSheet(null); }} accessibilityRole="radio" accessibilityState={{ checked: visibility === v }}
            style={{ flexDirection: "row", alignItems: "center", height: 58, gap: 14 }}>
            <VisibilityIcon value={v} color={c.textMuted} size={22} />
            <AppText variant="bodyLg" style={{ flex: 1 }}>{VISIBILITY_LABEL[v]}</AppText>
            <RadioCheck selected={visibility === v} />
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet visible={sheet === "color"} onClose={() => setSheet(null)} title="색상 선택">
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
          {DIARY_COLORS.map((col) => {
            const on = (draftBg ?? null) === col;
            return (
              <Pressable key={col ?? "none"} onPress={() => setDraftBg(col ?? undefined)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                accessibilityLabel={col ? `배경 ${col}` : "배경 없음"} style={{ width: "16.66%", alignItems: "center" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: on ? 2.5 : 0, borderColor: c.text }}>
                  <View style={{ width: on ? 30 : 34, height: on ? 30 : 34, borderRadius: 17, backgroundColor: col ?? c.surfaceButton, alignItems: "center", justifyContent: "center" }}>
                    {col ? null : <View style={{ width: 20, height: 2, backgroundColor: c.textMuted, transform: [{ rotate: "-45deg" }] }} />}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ marginTop: 20 }}><Button kind="sheetPrimary" label="확인" onPress={() => { setBg(draftBg); setSheet(null); }} /></View>
      </BottomSheet>

      <ConfirmDialog visible={asking} message="임시 저장하지 않고 나갈까요?" cancel="임시 저장" ok="나가기" danger
        onCancel={() => { setAsking(false); saveDraft().then(() => goBack("/")); }}
        onOk={() => { setAsking(false); dropDraft(); goBack("/"); }} />
      {toast}
    </View>
  );
}
