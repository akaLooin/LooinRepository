/** The admin app's settings (table app_config) and how the app reads them. Pure, so it can be unit-tested. */
import { COLOR_ROLES, FEATURES, NUMBERS, TEXTS, type ColorRole, type FeatureKey, type NumberKey, type TextKey } from "./remoteCatalog";

export type AppConfig = {
  crews: boolean;
  notice: string | null;
  /** only what the admin changed; the rest uses the catalog's defaults */
  texts: Partial<Record<TextKey, string>>;
  features: Partial<Record<FeatureKey, boolean>>;
  numbers: Partial<Record<NumberKey, number>>;
  colors: { dark: Partial<Record<ColorRole, string>>; light: Partial<Record<ColorRole, string>> };
  maintenance: { on: boolean; message: string };
};

/** Crews are hidden in the design app until turned on (user, 2026-11-21); the usual app keeps them. */
export const configDefaults = (design: boolean): AppConfig => ({
  crews: !design, notice: null, texts: {}, features: {}, numbers: {}, colors: { dark: {}, light: {} }, maintenance: { on: false, message: "" },
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Rows of app_config → settings. Unknown keys, wrong types and out-of-range numbers are dropped, so a bad value
 * from the panel can never break the app. The usual app takes none of the design changes (it stays as decided).
 */
export function parseConfig(rows: { key: string; value: unknown }[], design: boolean): AppConfig {
  const out = configDefaults(design);
  for (const r of rows) {
    const v = r.value;
    if (r.key === "crews_enabled" && typeof v === "boolean") out.crews = design ? v : true;
    if (r.key === "home_notice") out.notice = typeof v === "string" && v.trim() ? v.trim() : null;
    if (!design) continue;
    if (r.key === "texts" && isObj(v)) {
      for (const [k, s] of Object.entries(v)) if (k in TEXTS && typeof s === "string" && s.trim() && s.length <= 80) out.texts[k as TextKey] = s.trim();
    }
    if (r.key === "features" && isObj(v)) {
      for (const [k, b] of Object.entries(v)) if (k in FEATURES && typeof b === "boolean") out.features[k as FeatureKey] = b;
    }
    if (r.key === "numbers" && isObj(v)) {
      for (const [k, n] of Object.entries(v)) {
        const spec = NUMBERS[k as NumberKey];
        if (spec && typeof n === "number" && Number.isFinite(n)) out.numbers[k as NumberKey] = Math.min(spec.max, Math.max(spec.min, Math.round(n)));
      }
    }
    if (r.key === "colors" && isObj(v)) {
      for (const scheme of ["dark", "light"] as const) {
        const set = v[scheme];
        if (!isObj(set)) continue;
        for (const [k, hex] of Object.entries(set)) if (k in COLOR_ROLES && typeof hex === "string" && HEX.test(hex)) out.colors[scheme][k as ColorRole] = hex.toLowerCase();
      }
    }
    if (r.key === "maintenance" && isObj(v)) {
      out.maintenance = { on: v.on === true, message: typeof v.message === "string" ? v.message.slice(0, 300) : "" };
    }
  }
  return out;
}

/** A text with the admin's change, else the default; `{date}` filled in when given. */
export const textOf = (cfg: AppConfig, key: TextKey, vars?: { date?: string }) => {
  const s = cfg.texts[key] ?? TEXTS[key].def;
  return vars?.date !== undefined ? s.replace("{date}", vars.date) : s;
};
export const featureOn = (cfg: AppConfig, key: FeatureKey) => cfg.features[key] ?? true;
export const numberOf = (cfg: AppConfig, key: NumberKey) => cfg.numbers[key] ?? NUMBERS[key].def;
