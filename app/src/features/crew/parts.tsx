import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, BottomSheet, Button, RadioCheck, Sticker, StoredImage, VisibilityIcon } from "../../components";
import { selectActiveCategories, useDB } from "../../data/store";
import { crewList, type CrewCard } from "../../data/crews";
import { tokens, useTheme, visibleOn } from "../../theme";

/** A crew's picture, or our party clover when it has none. */
export function CrewImage({ uri, size, round }: { uri?: string; size: number; round?: boolean }) {
  const { c } = useTheme();
  const r = round ? size / 2 : tokens.radius.md;
  return uri ? <StoredImage uri={uri} label="크루 사진" style={{ width: size, height: size, borderRadius: r }} /> : (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
      <Sticker id="clover.party" size={size * 0.62} />
    </View>
  );
}

/** One crew in the 둘러보기 row (original: picture on top, name, 멤버 n). */
export function CrewCardView({ crew }: { crew: CrewCard }) {
  const { c } = useTheme();
  const W = 132;
  return (
    <Pressable onPress={() => router.push(`/crew/${crew.id}` as never)} accessibilityRole="button" accessibilityLabel={`${crew.name} 크루, 멤버 ${crew.members}명`}
      style={{ width: W, borderRadius: tokens.radius.md, overflow: "hidden", backgroundColor: c.surface }}>
      {crew.imageUri ? <StoredImage uri={crew.imageUri} label="" style={{ width: W, height: 96 }} /> : (
        <View style={{ width: W, height: 96, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><Sticker id="clover.party" size={60} /></View>
      )}
      <View style={{ padding: 10, gap: 2 }}>
        <AppText variant="body" weight={700} numberOfLines={1}>{crew.name}</AppText>
        <AppText variant="small" color="textMuted">{`멤버 ${crew.members}`}{crew.myStatus === "member" ? " · 참여 중" : crew.myStatus === "pending" ? " · 신청 중" : ""}</AppText>
      </View>
    </Pressable>
  );
}

/** "크루에 공유할 카테고리" (original): my categories with a check, 새 카테고리 and 확인. */
export function CategoryPickSheet({ visible, value, onPick, onClose }: { visible: boolean; value?: string; onPick: (id: string) => void; onClose: () => void }) {
  const { c } = useTheme();
  const cats = useDB(selectActiveCategories);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="크루에 공유할 카테고리">
      <ScrollView style={{ maxHeight: 320 }}>
        {cats.map((cat) => (
          <Pressable key={cat.id} onPress={() => onPick(cat.id)} accessibilityRole="radio" accessibilityState={{ checked: value === cat.id }} accessibilityLabel={cat.title}
            style={{ flexDirection: "row", alignItems: "center", height: 52, gap: 10 }}>
            <VisibilityIcon value={cat.visibility} color={c.textMuted} size={16} />
            <AppText variant="bodyLg" raw={visibleOn(cat.color, c.bg, c.text)} style={{ flex: 1 }} numberOfLines={1}>{cat.title}</AppText>
            <RadioCheck selected={value === cat.id} />
          </Pressable>
        ))}
        {cats.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 16 }}>카테고리를 먼저 만들어 주세요</AppText> : null}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}><Button kind="plain" label="새 카테고리" onPress={() => { onClose(); router.push("/categories/new" as never); }} /></View>
        <View style={{ flex: 1 }}><Button kind="sheetPrimary" label="확인" onPress={onClose} /></View>
      </View>
    </BottomSheet>
  );
}

/** The chosen category on the apply / create screens (original: "카테고리 · 👥 To Do ›"). */
export function CategoryRow({ id, onPress }: { id?: string; onPress: () => void }) {
  const { c } = useTheme();
  const cat = useDB((d) => d.categories.find((x) => x.id === id));
  return (
    <View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={cat ? `공유할 카테고리 ${cat.title}, 바꾸기` : "크루에 공유할 카테고리 선택"}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 52, paddingHorizontal: 16, borderRadius: tokens.radius.md, backgroundColor: c.surface }}>
        <AppText variant="body" style={{ flex: 1 }}>{cat ? "카테고리" : "크루에 공유할 카테고리 선택"}</AppText>
        {cat ? <><VisibilityIcon value={cat.visibility} color={c.textMuted} size={15} /><AppText variant="body" weight={700} raw={visibleOn(cat.color, c.surface, c.text)}>{cat.title}</AppText></> : null}
        <AppText variant="bodyLg" color="textMuted">›</AppText>
      </Pressable>
      <AppText variant="small" color="textMuted" style={{ marginTop: 8 }}>• 선택된 카테고리는 공개 설정과 관계없이 크루 멤버에게 공개돼요.</AppText>
    </View>
  );
}

/** 둘러보기's crew row (original): "크루", the 만들기 and 크루란? buttons, then the crews side by side. */
export function CrewRow() {
  const { c } = useTheme();
  const [crews, setCrews] = useState<CrewCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    let alive = true;
    crewList().then((l) => { if (alive) { setCrews(l); setError(null); } }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "불러오지 못했어요"); });
    return () => { alive = false; };
  }, []));
  const chip = (label: string, onPress: () => void, strong?: boolean) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: "center", backgroundColor: strong ? c.selectedBg : c.surface }}>
      <AppText variant="body" weight={600} color={strong ? "onSelected" : "text"}>{label}</AppText>
    </Pressable>
  );
  return (
    <View style={{ marginTop: 4, marginBottom: 16, gap: 10 }}>
      <AppText variant="bodyLg" weight={700} accessibilityRole="header">크루</AppText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {chip("만들기", () => router.push("/crew/new" as never), true)}
        {chip("크루란?", () => router.push("/crew/guide" as never))}
      </View>
      {error ? <AppText variant="helper" color="textMuted">{error}</AppText> : null}
      {crews?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginHorizontal: -tokens.layout.gutter }}
          contentInset={{ left: 0 }}>
          <View style={{ width: tokens.layout.gutter - 10 }} />
          {crews.map((cr) => <CrewCardView key={cr.id} crew={cr} />)}
          <View style={{ width: tokens.layout.gutter - 10 }} />
        </ScrollView>
      ) : crews ? <AppText variant="helper" color="textMuted">아직 크루가 없어요. 만들기로 첫 크루를 만들어 보세요.</AppText> : null}
    </View>
  );
}
