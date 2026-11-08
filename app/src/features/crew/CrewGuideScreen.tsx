import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, ChevronDown, ChevronUp, ScreenHeader, Sticker } from "../../components";
import { goBack } from "../../lib/nav";
import { tokens, useInsets, useTheme } from "../../theme";

// Our own words (the original's guide text is not copied).
const POINTS = [
  { sticker: "clover.cheer", title: "함께 해요", body: "같은 목표를 가진 사람들과 모여 하루하루 할 일을 끝내요. 혼자보다 꾸준해져요." },
  { sticker: "clover.love", title: "응원해요", body: "크루 멤버가 끝낸 할 일을 보고 스티커로 반응하며 서로 힘을 보태요." },
  { sticker: "clover.hundred", title: "자라요", body: "최근 7일 동안 끝낸 할 일 수로 순위가 매겨져요. 작은 기록이 쌓여 큰 변화가 돼요." },
];
const FAQ = [
  { q: "크루에 어떻게 들어가나요?", a: "둘러보기에서 크루를 고르고 참가 신청하기를 눌러요. 메시지와 공유할 카테고리를 정해 보내면, 크루장이 수락했을 때 멤버가 돼요." },
  { q: "크루에서 무엇이 공유되나요?", a: "참가할 때 고른 카테고리 하나의 할 일이에요. 그 카테고리는 공개 설정과 관계없이 크루 멤버에게 보여요. 다른 카테고리와 일기는 공유되지 않아요." },
  { q: "공유할 카테고리를 바꿀 수 있나요?", a: "크루 화면 오른쪽 위 ⋯ → 공유할 카테고리 바꾸기에서 바꿀 수 있어요." },
  { q: "순위는 어떻게 정해지나요?", a: "최근 7일 동안 공유한 카테고리에서 끝낸 할 일 수가 많은 순서예요. 1~3등에게는 메달이 붙어요." },
  { q: "크루를 나가거나 없애려면?", a: "⋯ → 크루 나가기를 눌러요. 크루장은 나갈 수 없고, 크루 삭제로 크루를 없앨 수 있어요." },
];

/** 크루란? (original: 크루 가이드, an introduction and frequently asked questions). */
export function CrewGuideScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="크루 가이드" onBack={() => goBack("/explore")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 48, gap: 22 }}>
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 4 }}>{["clover.party", "clover.cheer", "clover.sparkle"].map((s) => <Sticker key={s} id={s} size={56} />)}</View>
          <AppText variant="screenTitle" style={{ fontSize: 28, lineHeight: 36 }} accessibilityRole="header">크루와 함께 꾸준해져요</AppText>
          <AppText variant="body" color="textSecondary">크루는 비슷한 목표를 가진 사람들의 모임이에요. 서로의 하루를 보며 응원하고, 함께 끝까지 해내요.</AppText>
        </View>
        {POINTS.map((p) => (
          <View key={p.title} style={{ flexDirection: "row", gap: 14 }}>
            <Sticker id={p.sticker} size={48} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="bodyLg" weight={700}>{p.title}</AppText>
              <AppText variant="body" color="textSecondary">{p.body}</AppText>
            </View>
          </View>
        ))}
        <AppText variant="bodyLg" weight={700} style={{ marginTop: 8 }}>자주 묻는 질문</AppText>
        {FAQ.map((f, i) => (
          <View key={f.q} style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, overflow: "hidden" }}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 }}>
              <AppText variant="body" weight={600} style={{ flex: 1 }}>{`${i + 1}. ${f.q}`}</AppText>
              {open === i ? <ChevronUp size={18} color={c.textMuted} /> : <ChevronDown size={18} color={c.textMuted} />}
            </Pressable>
            {open === i ? <AppText variant="body" color="textSecondary" style={{ paddingHorizontal: 14, paddingBottom: 14 }}>{f.a}</AppText> : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
