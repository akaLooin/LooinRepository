import { Redirect } from "expo-router";

// The reset mail's link opens todomateclone://reset-password. The sign-in gate (AuthGate) reads the link and shows
// the new-password screen; this route only keeps the router from showing "page not found" for that address.
export default function ResetPasswordRoute() {
  return <Redirect href="/" />;
}
