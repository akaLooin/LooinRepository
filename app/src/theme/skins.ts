import type { FontFace } from "./fonts";
import type { Palette } from "./tokens";

/**
 * 스킨 (user, 2026-11-23): whole looks the user can own and switch in 설정 → 스킨; a shop to get more comes later.
 * A skin sets colours (and so light or dark), may set a font, a shape (square corners) and a decoration.
 * Each one only borrows a mood: no characters, logos, names or pictures from any film, game or brand.
 *
 * - 황혼의 재즈 (twilight jazz): a city evening turning to night: deep indigo and violet sky, warm gold lamplight,
 *   a pink-orange horizon, small twinkling stars.
 * - 8비트 모험 (8-bit adventure): an old handheld game's adventure: cream paper, black pixel frames, square corners,
 *   a pixel font, bright red and blue.
 */
export type SkinId = "default" | "twilight" | "pixel";
export type Skin = {
  id: SkinId;
  name: string;
  desc: string;
  /** forced light or dark; null = the 테마 setting decides */
  scheme: "dark" | "light" | null;
  colors: Partial<Palette>;
  font?: FontFace;
  /** square corners and black frames */
  square?: boolean;
  decor?: "stars";
  /** a few colours for the preview card in 설정 → 스킨 */
  swatch: string[];
};

export const SKINS: Record<SkinId, Skin> = {
  default: { id: "default", name: "립마크 기본", desc: "깔끔한 기본 모습. 테마 설정(다크·라이트)을 따라요.", scheme: null, colors: {}, swatch: ["#000000", "#1c1c1c", "#00ff7f", "#ffffff"] },
  twilight: {
    id: "twilight", name: "황혼의 재즈", desc: "해 질 녘 도시의 보랏빛 하늘, 금빛 가로등, 반짝이는 별.", scheme: "dark", decor: "stars",
    swatch: ["#151235", "#2a2462", "#f5c542", "#ff8fa8"],
    colors: {
      bg: "#151235", surface: "#211c4f", surfaceRaised: "#1c1846", surfaceInput: "#29235f", surfaceRow: "#2c2666", surfaceButton: "#332c70",
      surfaceStrong: "#3a3279", selectedDay: "#3a3279", text: "#f8f1e3", textSecondary: "#d4cdef", textMuted: "#a19ccf", textPlaceholder: "#7f79ad",
      iconInactive: "#7f79ad", accent: "#f5c542", onAccent: "#151235", sunday: "#ff8fa8", saturday: "#86cdff", dday: "#ff8fa8", sectionLine: "#2f2966",
      todayCell: "#3a3279", divider: "#2f2966", grabber: "#4a4290", cloverEmpty: "#3d3678", selectedBg: "#f5c542", onSelected: "#151235",
      toggleOn: "#f5c542", toggleOff: "#3d3678", dropTarget: "#4a3f8f", spanDone: "#4a4290", hourLine: "#2a2560", nowLine: "#ff8fa8", danger: "#ff7a8a",
      cloverNumber: "#f8f1e3", info: "#86cdff", play: "#f5c542",
    },
  },
  pixel: {
    id: "pixel", name: "8비트 모험", desc: "옛 휴대용 게임기 속 모험처럼. 네모난 창, 검은 테두리, 픽셀 글씨.", scheme: "light", font: "galmuri", square: true,
    swatch: ["#f4efdc", "#ffffff", "#d8402e", "#2f5fcf"],
    colors: {
      bg: "#f4efdc", surface: "#fffdf4", surfaceRaised: "#fffdf4", surfaceInput: "#efe8cf", surfaceRow: "#e8e0c2", surfaceButton: "#e8e0c2",
      surfaceStrong: "#e2d9b8", selectedDay: "#e2d9b8", text: "#1d1d1d", textSecondary: "#3c3c3c", textMuted: "#6d6a5c", textPlaceholder: "#9b977f",
      iconInactive: "#8d8970", accent: "#d8402e", onAccent: "#ffffff", sunday: "#d8402e", saturday: "#2f5fcf", dday: "#d8402e", sectionLine: "#1d1d1d",
      todayCell: "#e2d9b8", divider: "#cfc6a5", grabber: "#1d1d1d", cloverEmpty: "#cfc6a5", selectedBg: "#1d1d1d", onSelected: "#fffdf4",
      toggleOn: "#2f5fcf", toggleOff: "#cfc6a5", dropTarget: "#f2c94c", spanDone: "#b9b193", hourLine: "#e2d9b8", nowLine: "#d8402e", danger: "#d8402e",
      cloverNumber: "#1d1d1d", info: "#2f5fcf", play: "#d8402e", checkWhite: "#ffffff",
    },
  },
};

export const SKIN_ORDER: SkinId[] = ["default", "twilight", "pixel"];
export const skinOf = (id: string | undefined): Skin => SKINS[(id as SkinId) in SKINS ? (id as SkinId) : "default"];

/** Square corners for the pixel skin (pills too, so buttons look like a game's menu boxes). */
export const pixelRadius = (r: number) => Math.min(r, 3);
