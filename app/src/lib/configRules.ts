/** The admin panel's switches (table app_config) and how the app reads them. Pure, so it can be unit-tested. */
export type AppConfig = { crews: boolean; notice: string | null };

/** Crews are hidden in the design app until turned on (user, 2026-11-21); the usual app keeps them. */
export const configDefaults = (design: boolean): AppConfig => ({ crews: !design, notice: null });

/** Rows of app_config → settings. Unknown keys and wrong types are ignored; the usual app never hides crews. */
export function parseConfig(rows: { key: string; value: unknown }[], design: boolean): AppConfig {
  const out = configDefaults(design);
  for (const r of rows) {
    if (r.key === "crews_enabled" && typeof r.value === "boolean") out.crews = design ? r.value : true;
    if (r.key === "home_notice") out.notice = typeof r.value === "string" && r.value.trim() ? r.value.trim() : null;
  }
  return out;
}
