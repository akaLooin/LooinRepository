import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppText, BottomSheet, Button, ScreenHeader, useToast } from "../../components";
import type { Gender } from "../../data/types";
import { updateProfile, useDB } from "../../data/store";
import { goBack } from "../../lib/nav";
import { supabase } from "../../lib/supabase";
import { tokens, useInsets, useTheme } from "../../theme";
import { ActionSheet, BoxRow, Wheel } from "./parts";

const GENDER: Record<Gender, string> = { male: "남", female: "여", nonbinary: "비이진" };
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => thisYear - 99 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 계정 (original's screen): 비밀번호 재설정, 성별, 생년월, 계정 삭제하기. */
export function AccountScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const [sheet, setSheet] = useState<null | "gender" | "birth" | "delete">(null);
  const [toast, notice] = useToast();
  const [busy, setBusy] = useState(false);
  const [y0, m0] = (profile.birthMonth ?? `${thisYear - 25}-01`).split("-").map(Number);
  const [year, setYear] = useState(y0);
  const [month, setMonth] = useState(m0);
  const birthLabel = profile.birthMonth ? profile.birthMonth.replace("-", ".") : "등록안됨";

  const deleteAccount = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    setBusy(false);
    if (error) return notice("계정을 지우지 못했어요. 잠시 후 다시 시도해 주세요");
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="계정" onBack={() => goBack("/settings")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40, gap: 10 }}>
        {supabase ? <BoxRow label="비밀번호 재설정" onPress={() => router.push("/settings/password" as never)} /> : null}
        <View style={{ height: 14 }} />
        <BoxRow label="성별" value={profile.gender ? GENDER[profile.gender] : "등록안됨"} onPress={() => setSheet("gender")} />
        <BoxRow label="생년월" value={birthLabel} onPress={() => setSheet("birth")} />
        {supabase ? (
          <Pressable onPress={() => setSheet("delete")} accessibilityRole="button" style={{ alignSelf: "center", padding: 16, marginTop: 14 }}>
            <AppText variant="body" color="danger">계정 삭제하기</AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      <ActionSheet visible={sheet === "gender"} onClose={() => setSheet(null)}
        options={(Object.keys(GENDER) as Gender[]).map((g) => ({ label: GENDER[g], onPress: () => updateProfile({ gender: g }) }))} />
      <BottomSheet visible={sheet === "birth"} onClose={() => setSheet(null)} title="생년월">
        <View style={{ flexDirection: "row" }}>
          <Wheel label="연도" items={YEARS} value={year} onChange={setYear} format={(v) => `${v}년`} />
          <Wheel label="월" items={MONTHS} value={month} onChange={setMonth} format={(v) => `${v}월`} />
        </View>
        <View style={{ marginTop: 16 }}>
          <Button kind="sheetBlock" label="확인" onPress={() => { updateProfile({ birthMonth: `${year}-${String(month).padStart(2, "0")}` }); setSheet(null); }} />
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === "delete"} onClose={() => setSheet(null)} title="계정 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>할 일, 루틴, 카테고리, 사진까지 모두 지워지고 되돌릴 수 없어요.</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setSheet(null)} />
          <Button kind="danger" flex label="삭제" loading={busy} onPress={deleteAccount} />
        </View>
      </BottomSheet>
      {toast}
    </View>
  );
}
