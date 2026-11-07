import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  AppText, BottomSheet, Button, ChevronDown, Image, RadioCheck, ScreenHeader, SmilePlus, Sticker, StoredImage, useToast, VisibilityIcon, X, type Visibility,
} from "../../components";
import { saveDiary, selectDiary, useDB } from "../../data/store";
import { reactionsOnMine, type Reaction } from "../../data/social";
import { pickPhoto } from "../../lib/photos";
import { parseDay, today, weekday } from "../../lib/dates";
import { contrast, fontFamily, tokens, useTheme } from "../../theme";
import { VISIBILITY_LABEL } from "../categories/CategoryEditScreen";

const MOODS = ["😀", "😊", "🥰", "😌", "🙂", "😐", "😴", "🥱", "😢", "😭", "😡", "😰", "🤒", "🥳", "🤩", "😎", "🤔", "😇"];
// Background tints a diary can take (user content, so not theme tokens). null = the theme background.
const BACKGROUNDS: (string | null)[] = [null, "#2E2A3D", "#1F3A33", "#3A2A2A", "#3A3420", "#1E2F45", "#F4EDE1", "#E3F1E8", "#FCE8EC"];
const ORDER: Visibility[] = ["public", "followers", "partial", "private"];
const WD = "일월화수목금토";

/** S09: one diary per day. Opens on the date in the route ("today" works too). */
export function DiaryScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = params.date && params.date !== "today" ? params.date : today();
  const { c } = useTheme();
  const insets = useInsets();
  const existing = useDB(selectDiary(date));
  const profile = useDB((d) => d.profile);
  const [emoji, setEmoji] = useState(existing?.emoji);
  const [body, setBody] = useState(existing?.body ?? "");
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? "private");
  const [bg, setBg] = useState<string | undefined>(existing?.backgroundColor);
  const [images, setImages] = useState<string[]>(existing?.imagePaths ?? []);
  const [sheet, setSheet] = useState<null | "emoji" | "visibility" | "color">(null);
  const [toast, notice] = useToast();
  // stickers and emoji friends left on this diary (shown under it, with who sent them)
  const [received, setReceived] = useState<Reaction[]>([]);
  useEffect(() => {
    if (!existing) return;
    let alive = true;
    reactionsOnMine(date, date).then((r) => { if (alive) setReceived(r.diaries[existing.id] ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [date, existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const background = bg ?? c.bg;
  const ink = bg ? (contrast("#FFFFFF", bg) >= 4.5 ? "#FFFFFF" : "#111111") : c.text;
  const inkMuted = bg ? (ink === "#FFFFFF" ? "#C8C8C8" : "#555555") : c.textMuted;
  const { y, m, d } = parseDay(date);
  const done = () => {
    saveDiary(date, { emoji, body: body.trim(), visibility, backgroundColor: bg, imagePaths: images });
    goBack("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: background, paddingTop: insets.top }}>
      <ScreenHeader title="일기" close onBack={() => goBack("/")} right={{ label: "완료", onPress: done }} ink={bg ? ink : undefined} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setSheet("emoji")} accessibilityRole="button" accessibilityLabel={emoji ? `오늘의 기분 ${emoji}, 바꾸기` : "오늘의 기분 고르기"} style={{ alignSelf: "center", marginVertical: 8 }}>
          {emoji ? (
            <AppText variant="timer" style={{ fontSize: 64, lineHeight: 80 }}>{emoji}</AppText>
          ) : (
            <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
              <Svg width={80} height={80} style={{ position: "absolute" }}>
                <Circle cx={40} cy={40} r={36} stroke={inkMuted} strokeWidth={2.5} strokeDasharray="6 6" fill="none" />
              </Svg>
              <SmilePlus size={36} color={inkMuted} />
            </View>
          )}
        </Pressable>
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
        <TextInput
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="오늘 하루를 남겨 보세요"
          placeholderTextColor={inkMuted}
          accessibilityLabel="일기 내용"
          style={{ minHeight: images.length ? 200 : 320, color: ink, fontFamily: fontFamily(400), fontSize: tokens.type.bodyLg.size, lineHeight: 26, textAlignVertical: "top", outlineStyle: "none" as never }}
        />
        {images.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {images.map((u, i) => (
              <View key={u + i}>
                <StoredImage uri={u} label={`일기 사진 ${i + 1}`} style={{ width: 110, height: 110, borderRadius: tokens.radius.md }} />
                <Pressable onPress={() => setImages((xs) => xs.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`일기 사진 ${i + 1} 빼기`} hitSlop={8}
                  style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: c.scrimSolid, alignItems: "center", justifyContent: "center" }}>
                  <X size={14} color={c.onIcon} strokeWidth={3} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
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

      <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: tokens.layout.gutter, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.surfaceButton }}>
        <Pressable onPress={() => setSheet("color")} accessibilityRole="button" accessibilityLabel="배경색" style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", flexDirection: "row", flexWrap: "wrap", borderWidth: 2, borderColor: c.surfaceStrong }}>
          {["#FF8A8A", "#FFD36E", "#7FE3A6", "#7FB6FF"].map((col) => <View key={col} style={{ width: "50%", height: "50%", backgroundColor: col }} />)}
        </Pressable>
        <Pressable onPress={async () => {
            if (images.length >= 4) return notice("사진은 4장까지 넣을 수 있어요");
            const uri = await pickPhoto().catch(() => null);
            if (uri) setImages((xs) => [...xs, uri]);
          }} accessibilityRole="button" accessibilityLabel="사진 넣기" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
          <Image size={22} color={c.menuPhoto} />
        </Pressable>
      </View>

      <BottomSheet visible={sheet === "emoji"} onClose={() => setSheet(null)} title="오늘의 기분">
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          {MOODS.map((e) => (
            <Pressable key={e} onPress={() => { setEmoji(e); setSheet(null); }} accessibilityRole="button" accessibilityLabel={e}
              style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: e === emoji ? c.surfaceStrong : "transparent" }}>
              <AppText variant="monthTitle" style={{ fontSize: 30, lineHeight: 38 }}>{e}</AppText>
            </Pressable>
          ))}
        </View>
        {emoji ? <View style={{ marginTop: 16 }}><Button kind="plain" label="기분 지우기" onPress={() => { setEmoji(undefined); setSheet(null); }} /></View> : null}
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

      <BottomSheet visible={sheet === "color"} onClose={() => setSheet(null)} title="배경색">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {BACKGROUNDS.map((col) => (
            <Pressable key={col ?? "none"} onPress={() => { setBg(col ?? undefined); setSheet(null); }} accessibilityRole="button" accessibilityLabel={col ? `배경 ${col}` : "기본 배경"}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: col ?? c.bg, borderWidth: (bg ?? null) === col ? 3 : 1, borderColor: (bg ?? null) === col ? c.text : c.surfaceStrong }} />
          ))}
        </View>
      </BottomSheet>
      {toast}
    </View>
  );
}
