import { useLocalSearchParams } from "expo-router";
import { updateProfile, useDB } from "../../../data/store";
import { EditFieldScreen } from "../../../features/settings/parts";
import { goBack } from "../../../lib/nav";

/** 이름 (30), 자기소개 (200), ID (20): one field per screen with 확인, as in the original. */
export default function EditProfileField() {
  const { field } = useLocalSearchParams<{ field: string }>();
  const profile = useDB((d) => d.profile);
  const back = () => goBack("/profile");
  if (field === "bio")
    return <EditFieldScreen title="자기소개" initial={profile.bio} max={200} multiline placeholder="자기소개 입력" onSave={(v) => updateProfile({ bio: v })} onBack={back} />;
  if (field === "handle")
    return (
      <EditFieldScreen title="ID" initial={profile.handle ?? ""} max={20} placeholder="영문, 숫자, _ ." onBack={back}
        validate={(v) => (v && !/^[A-Za-z0-9_.]{2,20}$/.test(v) ? "ID는 영문, 숫자, _ . 로 2~20자예요" : undefined)}
        onSave={(v) => updateProfile({ handle: v })} />
    );
  return (
    <EditFieldScreen title="이름" initial={profile.nickname} max={30} placeholder="이름" onBack={back}
      validate={(v) => (v ? undefined : "이름을 입력해 주세요")} onSave={(v) => updateProfile({ nickname: v })} />
  );
}
