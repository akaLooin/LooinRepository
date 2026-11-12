import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Animated, Image, Modal, PanResponder, Pressable, StatusBar, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { reportContent } from "../data/report";
import { isUploaded } from "../lib/photoPaths";
import { savePhoto } from "../lib/savePhoto";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Ellipsis, X } from "./icons";
import { resolve } from "./StoredImage";

/**
 * 사진 크게 보기 (user's feature): any photo opens full screen. Two fingers zoom in and out (1×–5×), one finger moves
 * a zoomed photo, a double tap zooms to 2.5× and back. Holding the photo offers 사진 저장, and for someone else's
 * photo 신고하기. Opened from anywhere with openPhoto(); the viewer is mounted once at the app root.
 */
type Shown = { uri: string; label?: string; others?: boolean };
let shown: Shown | null = null;
const listeners = new Set<() => void>();
export function openPhoto(p: Shown) { shown = p; listeners.forEach((l) => l()); }
const close = () => { shown = null; listeners.forEach((l) => l()); };
const useShown = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => shown, () => shown);

const MAX = 5;
const dist = (e: GestureResponderEvent) => {
  const [a, b] = e.nativeEvent.touches;
  return a && b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 0;
};

export function PhotoViewerHost() {
  const { c } = useTheme();
  const p = useShown();
  const { width, height } = useWindowDimensions();
  const [url, setUrl] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | "menu" | "report">(null);
  const [toast, setToast] = useState<string | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const g = useRef({ s: 1, x: 0, y: 0, startS: 1, startX: 0, startY: 0, d0: 0, lastTap: 0, hold: null as ReturnType<typeof setTimeout> | null, moved: false });

  useEffect(() => {
    setUrl(null); setMenu(null);
    g.current = { ...g.current, s: 1, x: 0, y: 0 };
    scale.setValue(1); tx.setValue(0); ty.setValue(0);
    if (p) resolve(p.uri).then(setUrl).catch(() => setUrl(null));
  }, [p, scale, tx, ty]);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };
  const apply = (s: number, x: number, y: number) => {
    const k = Math.max(1, Math.min(MAX, s));
    // keep the photo from sliding out of view
    const lim = (v: number, size: number) => Math.max(-(size * (k - 1)) / 2, Math.min((size * (k - 1)) / 2, v));
    g.current.s = k; g.current.x = k === 1 ? 0 : lim(x, width); g.current.y = k === 1 ? 0 : lim(y, height);
    scale.setValue(k); tx.setValue(g.current.x); ty.setValue(g.current.y);
  };
  const glideTo = (k: number) => {
    g.current.s = k; g.current.x = 0; g.current.y = 0;
    Animated.parallel([
      Animated.timing(scale, { toValue: k, duration: 180, useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const st = g.current;
      st.startS = st.s; st.startX = st.x; st.startY = st.y; st.d0 = dist(e); st.moved = false;
      if (st.hold) clearTimeout(st.hold);
      st.hold = setTimeout(() => { if (!st.moved) setMenu("menu"); }, 550);
    },
    onPanResponderMove: (e, gs) => {
      const st = g.current;
      if (Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6 || e.nativeEvent.touches.length > 1) { st.moved = true; if (st.hold) clearTimeout(st.hold); }
      if (e.nativeEvent.touches.length > 1) {
        const d = dist(e);
        if (!st.d0) st.d0 = d;
        if (st.d0) apply((st.startS * d) / st.d0, st.startX, st.startY);
      } else if (st.s > 1) {
        apply(st.s, st.startX + gs.dx, st.startY + gs.dy);
      }
    },
    onPanResponderRelease: (_e, gs) => {
      const st = g.current;
      if (st.hold) clearTimeout(st.hold);
      if (!st.moved && Math.abs(gs.dx) < 6 && Math.abs(gs.dy) < 6) {
        const now = Date.now();
        if (now - st.lastTap < 280) { glideTo(st.s > 1 ? 1 : 2.5); st.lastTap = 0; } else st.lastTap = now;
      }
      // a finger lifted mid-pinch: the next move starts from here
      st.startS = st.s; st.startX = st.x; st.startY = st.y; st.d0 = 0;
    },
  }), [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return null;
  const save = () => {
    setMenu(null);
    if (!url) return;
    savePhoto(url).then((r) => say(r === "saved" ? "사진을 저장했어요" : "사진 저장 권한이 필요해요")).catch(() => say("저장하지 못했어요"));
  };
  const report = (reason: string) => {
    setMenu(null);
    reportContent("photo", p.uri, reason).then(() => say("신고를 받았어요. 확인 후 조치할게요")).catch((e) => say(e instanceof Error ? e.message : "신고하지 못했어요"));
  };
  const sheetRow = (label: string, on: () => void, color?: "danger" | "saturday") => (
    <Pressable key={label} onPress={on} accessibilityRole="button" style={{ height: 54, alignItems: "center", justifyContent: "center" }}>
      <AppText variant="bodyLg" color={color ?? "text"}>{label}</AppText>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: c.scrimSolid }} {...responder.panHandlers} accessibilityLabel={p.label ?? "사진 크게 보기"}
        accessibilityHint="두 손가락으로 확대, 길게 누르면 저장">
        {url ? (
          <Animated.View style={{ flex: 1, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
            <Image source={{ uri: url }} resizeMode="contain" style={{ flex: 1 }} accessibilityIgnoresInvertColors />
          </Animated.View>
        ) : <ActivityIndicator style={{ flex: 1 }} color={c.textMuted} />}
      </View>
      <Pressable onPress={close} hitSlop={14} accessibilityRole="button" accessibilityLabel="닫기"
        style={{ position: "absolute", top: 44, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceButton, alignItems: "center", justifyContent: "center" }}>
        <X size={22} color={c.text} />
      </Pressable>
      <Pressable onPress={() => setMenu("menu")} hitSlop={14} accessibilityRole="button" accessibilityLabel="사진 메뉴"
        style={{ position: "absolute", top: 44, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceButton, alignItems: "center", justifyContent: "center" }}>
        <Ellipsis size={22} color={c.text} />
      </Pressable>
      {menu ? (
        <Pressable style={{ position: "absolute", inset: 0, backgroundColor: tokens.scrim, justifyContent: "flex-end" }} onPress={() => setMenu(null)} accessibilityLabel="메뉴 닫기">
          <View style={{ margin: 14, marginBottom: 30, borderRadius: tokens.radius.lg, backgroundColor: c.surfaceRaised, overflow: "hidden" }}>
            {menu === "menu" ? [
              sheetRow("사진 저장", save),
              ...(p.others ? [sheetRow("신고하기", () => setMenu("report"), "danger")] : []),
              sheetRow("취소", () => setMenu(null), "saturday"),
            ] : [
              <AppText key="t" variant="helper" color="textMuted" center style={{ paddingTop: 14 }}>신고하는 이유를 골라 주세요</AppText>,
              ...["스팸이나 광고", "부적절하거나 불쾌한 사진", "다른 사람의 사진을 허락 없이 올림", "기타"].map((r) => sheetRow(r, () => report(r))),
              sheetRow("취소", () => setMenu(null), "saturday"),
            ]}
          </View>
        </Pressable>
      ) : null}
      {toast ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 60, alignItems: "center" }}>
          <View style={{ backgroundColor: c.surfaceStrong, borderRadius: tokens.radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}>
            <AppText variant="body">{toast}</AppText>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

/**
 * A photo in a list that opens the viewer when tapped, or when two fingers spread on it (user's feature).
 * `others`: someone else's photo (the viewer then offers 신고하기).
 */
export function ZoomPhoto({ uri, label, others, style, children }: { uri: string; label: string; others?: boolean; style?: object; children: React.ReactNode }) {
  const pinch = useRef(0);
  const open = () => openPhoto({ uri, label, others });
  return (
    <Pressable onPress={open} accessibilityRole="imagebutton" accessibilityLabel={`${label}, 크게 보기`} style={style}
      onTouchStart={(e) => { pinch.current = e.nativeEvent.touches.length > 1 ? Math.hypot(e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX, e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY) : 0; }}
      onTouchMove={(e) => {
        const [a, b] = e.nativeEvent.touches;
        if (!a || !b) return;
        const d = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
        if (!pinch.current) pinch.current = d;
        else if (d > pinch.current * 1.15) { pinch.current = 0; open(); }
      }}>
      {children}
    </Pressable>
  );
}

/** Is this a photo the signed-in person took? (Uploaded paths carry the owner's id: "<bucket>/<owner>/<file>".) */
export const isOthersPhoto = (uri: string, myId: string | null) => isUploaded(uri) && !!myId && uri.split("/")[1] !== myId;
