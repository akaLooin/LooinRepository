import Constants from "expo-constants";

const variant = (Constants.expoConfig?.extra as { variant?: string } | undefined)?.variant;

/**
 * The design trial (APP_VARIANT=design, a second app beside the usual one; see app.config.js). Screens that look
 * different in the trial check this; the usual app is unchanged until the user picks the new design.
 * The admin app (APP_VARIANT=admin, a third app) shows only the admin screens, in the design app's look.
 */
export const ADMIN_APP = variant === "admin";
export const DESIGN_TRIAL = variant === "design" || ADMIN_APP;
