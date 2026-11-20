import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// The panel uses the app's own Supabase values (app/.env.local), so there is nothing new to fill in.
// admin/.env.local with the same two names wins if it exists.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, "../app", "EXPO_PUBLIC_"), ...loadEnv(mode, ".", "EXPO_PUBLIC_") };
  return {
    plugins: [react()],
    base: "./",
    server: { port: 5180 },
    define: {
      __SUPABASE_URL__: JSON.stringify(env.EXPO_PUBLIC_SUPABASE_URL ?? ""),
      __SUPABASE_KEY__: JSON.stringify((env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim().replace(/^["']|["']$/g, "")),
    },
  };
});
