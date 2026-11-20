import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { ScreenHeader } from "../../components";
import { useMyCrews } from "../../data/crews";
import { useFollowing } from "../../data/social";
import { CrewHome } from "../../features/crew/CrewHome";
import { FriendHome } from "../../features/social/FriendHome";
import { goBack } from "../../lib/nav";
import { tokens, useInsets, useTheme } from "../../theme";

/** A friend's (or, as "crew:<id>", a crew's) home on its own page (design app's 함께 tab). */
export default function FriendPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const following = useFollowing();
  const crews = useMyCrews();
  const crewId = id?.startsWith("crew:") ? id.slice(5) : null;
  const title = crewId ? crews.find((x) => x.id === crewId)?.name ?? "크루" : following.find((p) => p.id === id)?.nickname ?? "친구";
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title={title} onBack={() => goBack("/together")} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: tokens.layout.gutter / 2 }}>
        {crewId ? <CrewHome id={crewId} /> : id ? <FriendHome id={id} /> : null}
      </ScrollView>
    </View>
  );
}
