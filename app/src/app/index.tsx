import { Redirect } from "expo-router";

// Until the real home screen exists (replica-build), open the design gallery.
export default function Index() {
  return <Redirect href="/design" />;
}
