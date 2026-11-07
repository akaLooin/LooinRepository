import { NewPasswordScreen } from "../../features/auth/NewPasswordScreen";
import { goBack } from "../../lib/nav";

export default function PasswordRoute() {
  return <NewPasswordScreen mode="change" onBack={() => goBack("/settings")} onDone={() => goBack("/settings")} />;
}
