import { useLocalSearchParams } from "expo-router";
import { DocScreen } from "../../../features/settings/MoreScreens";

export default function Doc() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <DocScreen name={name ?? "terms"} />;
}
