import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { AppText, Check, ChevronLeft, ConfirmDialog, Crown, Ellipsis, StoredImage, useToast } from "../../components";
import { cancelCrewApplication, crewDetail, takeCrewFlash, deleteCrew, leaveCrew, respondCrew, setCrewCategory, type CrewDetail } from "../../data/crews";
import { medalOf } from "../../lib/crew";
import { timeAgo } from "../../lib/friend";
import { today } from "../../lib/dates";
import { goBack } from "../../lib/nav";
import { tokens, useInsets, useTheme, visibleOn } from "../../theme";
import { ActionSheet } from "../settings/parts";
import { PersonSheet } from "../social/PersonSheet";
import type { Person } from "../../data/social";
import { CategoryPickSheet, CrewImage } from "./parts";

/**
 * A crew (original, user's recording): picture, name, description, 멤버 n명, the 참가 신청하기 button (참가 신청 중
 * while waiting, tap to take it back), then the members ranked by what they finished this week in the category they
 * share with the crew ("○○에서 n개의 할 일을 완료 · 1일 전"), medals for the top three and a crown on the leader.
 * Members also see each other's shared to-dos of the day; the leader sees the requests to accept.
 */
export function CrewScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [crew, setCrew] = useState<CrewDetail | null | undefined>(undefined);
  const [toast, notice] = useToast();
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [ask, setAsk] = useState<null | "cancel" | "leave" | "delete">(null);
  const [picking, setPicking] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const load = useCallback(() => {
    if (!id) return;
    const m = takeCrewFlash();
    if (m) notice(m);
    crewDetail(id, today()).then((d) => { setCrew(d); setError(null); }).catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"));
  }, [id, notice]);
  useFocusEffect(load);
  const act = (f: () => Promise<unknown>, done?: string) => f().then(() => { if (done) notice(done); load(); }).catch((e) => notice(e instanceof Error ? e.message : "잠시 뒤에 다시 해 주세요"));
  const G = tokens.layout.gutter;
  const medal = [c.medalGold, c.medalSilver, c.medalBronze];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: tokens.layout.headerHeight, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: G - 4 }}>
        <Pressable onPress={() => goBack("/explore")} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로 가기"><ChevronLeft size={28} color={c.text} strokeWidth={2.2} /></Pressable>
        {crew && (crew.myStatus === "member" || crew.isOwner) ? (
          <Pressable onPress={() => setMenu(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="크루 메뉴"><Ellipsis size={24} color={c.text} /></Pressable>
        ) : null}
      </View>
      {crew === undefined ? (error ? <AppText variant="body" color="textMuted" center style={{ marginTop: 60, paddingHorizontal: G }}>{error}</AppText> : <ActivityIndicator style={{ marginTop: 60 }} color={c.textMuted} />)
        : crew === null ? <AppText variant="body" color="textMuted" center style={{ marginTop: 60 }}>없어진 크루예요</AppText> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingBottom: 40 }}>
          <View style={{ alignItems: "center", gap: 6, marginBottom: 18 }}>
            <CrewImage uri={crew.imageUri} size={96} round />
            <AppText variant="sheetTitle" accessibilityRole="header" style={{ marginTop: 8 }}>{crew.name}</AppText>
            {crew.description ? <AppText variant="body" color="textSecondary" center>{crew.description}</AppText> : null}
            <AppText variant="helper" color="textMuted">{`멤버 ${crew.memberList.length}명`}</AppText>
          </View>
          {crew.isOwner ? null : crew.myStatus === "member" ? null : (
            <Pressable onPress={() => (crew.myStatus === "pending" ? setAsk("cancel") : router.push(`/crew/apply?id=${crew.id}` as never))} accessibilityRole="button"
              style={{ height: 46, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, marginBottom: 18 }}>
              <AppText variant="body" weight={600}>{crew.myStatus === "pending" ? "참가 신청 중" : "참가 신청하기"}</AppText>
            </Pressable>
          )}

          {crew.requests?.length ? (
            <View style={{ marginBottom: 18, gap: 10 }}>
              <AppText variant="bodyLg" weight={700}>{`참가 신청 ${crew.requests.length}`}</AppText>
              {crew.requests.map((q) => (
                <View key={q.person.id} style={{ borderRadius: tokens.radius.md, backgroundColor: c.surface, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar uri={q.person.avatarUri} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" weight={700}>{q.person.nickname}</AppText>
                      <AppText variant="small" color="textMuted">{`${q.category ? `${q.category.title} 공유 · ` : ""}${timeAgo(q.createdAt)}`}</AppText>
                    </View>
                  </View>
                  {q.message ? <AppText variant="body">{q.message}</AppText> : null}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <SmallButton label="거절" onPress={() => act(() => respondCrew(crew.id, q.person.id, false), "거절했어요")} />
                    <SmallButton label="수락" strong onPress={() => act(() => respondCrew(crew.id, q.person.id, true), `${q.person.nickname}님이 멤버가 됐어요`)} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {crew.memberList.map((m, i) => {
            const rank = medalOf(i, m.doneCount);
            return (
              <View key={m.person.id} style={{ paddingVertical: 10, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Pressable onPress={() => setPerson(m.person)} accessibilityRole="button" accessibilityLabel={`${m.person.nickname}${m.isOwner ? ", 크루장" : ""}`}>
                    <Avatar uri={m.person.avatarUri} />
                    {m.isOwner ? (
                      <View style={{ position: "absolute", right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: c.crown, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}>
                        <Crown size={9} color={c.onIcon} fill={c.onIcon} />
                      </View>
                    ) : null}
                  </Pressable>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText variant="body" weight={700} numberOfLines={1}>{m.person.nickname}</AppText>
                    {m.doneCount > 0 && m.category ? (
                      <AppText variant="small" color="textSecondary" numberOfLines={2}>
                        <AppText variant="small" weight={700} raw={visibleOn(m.category.color, c.bg, c.text)}>{m.category.title}</AppText>
                        {`에서 ${m.doneCount}개의 할 일을 완료${m.lastDoneAt ? ` ${timeAgo(m.lastDoneAt)}` : ""}`}
                      </AppText>
                    ) : <AppText variant="small" color="textMuted">크루 멤버에게 공개된 할 일입니다.</AppText>}
                  </View>
                  {rank ? (
                    <View accessibilityLabel={`${rank}등`} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: medal[rank - 1], alignItems: "center", justifyContent: "center" }}>
                      <AppText variant="small" weight={800} raw={c.onMedal}>{rank}</AppText>
                    </View>
                  ) : null}
                </View>
                {m.today?.length ? (
                  <View style={{ marginLeft: 56, gap: 4 }} accessibilityLabel={`${m.person.nickname}의 오늘 할 일`}>
                    {m.today.map((t, k) => (
                      <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: t.isDone ? (m.category?.color ?? c.accent) : c.cloverEmpty }}>
                          {t.isDone ? <Check size={11} color={c.checkWhite} strokeWidth={3} /> : null}
                        </View>
                        <AppText variant="helper" color={t.isDone ? "textMuted" : "text"} numberOfLines={1} style={{ flex: 1 }}>{t.title}</AppText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
          <AppText variant="small" color="textMuted" style={{ marginTop: 12 }}>순위는 최근 7일 동안 크루에 공유한 카테고리에서 끝낸 할 일 수예요.</AppText>
        </ScrollView>
      )}
      <ActionSheet visible={menu} onClose={() => setMenu(false)} options={crew ? [
        { label: "공유할 카테고리 바꾸기", onPress: () => setPicking(true) },
        crew.isOwner ? { label: "크루 삭제", danger: true, onPress: () => setAsk("delete") } : { label: "크루 나가기", danger: true, onPress: () => setAsk("leave") },
      ] : []} />
      <CategoryPickSheet visible={picking} value={crew?.myCategoryId} onClose={() => setPicking(false)}
        onPick={(cat) => crew && act(() => setCrewCategory(crew.id, cat), "공유할 카테고리를 바꿨어요")} />
      <ConfirmDialog visible={ask === "cancel"} message="참가 신청을 취소하시겠습니까?" ok="삭제" danger onCancel={() => setAsk(null)}
        onOk={() => { setAsk(null); if (crew) act(() => cancelCrewApplication(crew.id), "참가 신청을 취소했어요"); }} />
      <ConfirmDialog visible={ask === "leave"} message="크루에서 나갈까요?" ok="나가기" danger onCancel={() => setAsk(null)}
        onOk={() => { setAsk(null); if (crew) act(() => leaveCrew(crew.id), "크루에서 나왔어요"); }} />
      <ConfirmDialog visible={ask === "delete"} message="크루를 삭제할까요? 멤버와 순위가 모두 사라져요." ok="삭제" danger onCancel={() => setAsk(null)}
        onOk={() => { setAsk(null); if (crew) deleteCrew(crew.id).then(() => goBack("/explore")).catch((e) => notice(String(e?.message ?? e))); }} />
      <PersonSheet person={person} onClose={() => setPerson(null)} />
      {toast}
    </View>
  );
}

function Avatar({ uri }: { uri?: string }) {
  const { c } = useTheme();
  return uri ? <StoredImage uri={uri} label="" style={{ width: 44, height: 44, borderRadius: 22 }} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceStrong }} />;
}

function SmallButton({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flex: 1, height: 38, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: strong ? c.selectedBg : c.surfaceButton }}>
      <AppText variant="body" weight={600} color={strong ? "onSelected" : "text"}>{label}</AppText>
    </Pressable>
  );
}
