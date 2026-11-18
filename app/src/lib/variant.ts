import Constants from "expo-constants";

/**
 * The design trial (APP_VARIANT=design, a second app beside the usual one; see app.config.js). Screens that look
 * different in the trial check this; the usual app is unchanged until the user picks the new design.
 */
export const DESIGN_TRIAL = (Constants.expoConfig?.extra as { variant?: string } | undefined)?.variant === "design";
