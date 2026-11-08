import { FlexWidget, ListWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import type { WidgetModel } from "./model";

type Hex = `#${string}`;
const BG: Hex = "#000000";
const TEXT: Hex = "#FFFFFF";
const MUTED: Hex = "#8A8A8A";
const EMPTY = "#333333";

/** Our four-leaf clover (same shape as the app's), as SVG for the widget. */
function clover(fill: string, tick: boolean) {
  // the same shape as the app's clover (components/Clover.tsx): four circles at the corners
  const lobes = [[7.54, 7.54], [16.46, 7.54], [7.54, 16.46], [16.46, 16.46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.54" fill="${fill}"/>`).join("");
  const check = tick ? `<path d="M7 12.5 L10.5 16 L17 8.5" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${lobes}${check}</svg>`;
}
/** a white tick on a near-white category would vanish: use black there */
const tickOn = (hex: string) => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const lum = ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114;
  return lum > 235;
};
function cloverFor(color: string, done: boolean) {
  if (!done) return clover(EMPTY, false);
  return tickOn(color) ? clover(color, false).replace("</svg>", `<path d="M7 12.5 L10.5 16 L17 8.5" stroke="#000000" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`) : clover(color, true);
}

/**
 * Home-screen widget: today's to-dos with clover checkboxes (original has one; its look is unseen, so this follows
 * the app). Tapping a clover checks it; tapping the title opens the app.
 */
export function TodayWidget({ model }: { model: WidgetModel }) {
  return (
    <FlexWidget style={{ height: "match_parent", width: "match_parent", backgroundColor: BG, borderRadius: 22, padding: 14, flexDirection: "column" }}>
      <FlexWidget clickAction="OPEN_APP" accessibilityLabel="앱 열기"
        style={{ width: "match_parent", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10 }}>
        <TextWidget text="오늘 할 일" style={{ fontSize: 16, color: TEXT, fontWeight: "700" }} />
        <TextWidget text={model.signedOut ? "" : model.rows.length ? (model.left ? `${model.dateLabel} · ${model.left}개 남음` : `${model.dateLabel} · 다 했어요`) : model.dateLabel}
          style={{ fontSize: 12, color: MUTED }} />
      </FlexWidget>
      {model.signedOut || model.rows.length === 0 ? (
        <FlexWidget clickAction="OPEN_APP" style={{ width: "match_parent", height: "match_parent", alignItems: "center", justifyContent: "center" }}>
          <TextWidget text={model.signedOut ? "앱을 열어 로그인해 주세요" : "오늘 할 일이 없어요. 눌러서 추가하기"} style={{ fontSize: 13, color: MUTED }} />
        </FlexWidget>
      ) : (
        <ListWidget style={{ width: "match_parent", height: "match_parent" }}>
          {model.rows.map((r) => (
            <FlexWidget key={r.id} style={{ width: "match_parent", flexDirection: "row", alignItems: "center", paddingVertical: 6 }}>
              <SvgWidget svg={cloverFor(r.color, r.done)} style={{ width: 22, height: 22, marginRight: 10 }}
                clickAction="TOGGLE" clickActionData={{ id: r.id }} accessibilityLabel={`${r.title}, ${r.done ? "완료됨" : "미완료"}`} />
              <FlexWidget clickAction="OPEN_APP" style={{ width: "match_parent" }}>
                <TextWidget text={r.title} maxLines={1} truncate="END" style={{ fontSize: 15, color: r.done ? MUTED : TEXT }} />
              </FlexWidget>
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
