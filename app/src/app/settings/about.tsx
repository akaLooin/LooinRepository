import { router } from "expo-router";
import { AboutScreen } from "../../features/settings/MoreScreens";

export default function About() {
  return <AboutScreen open={(name) => router.push(`/settings/doc/${name}` as never)} />;
}
