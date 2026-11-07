import { useEffect, useRef, useState } from "react";
import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { AppText } from "./AppText";
import { supabase } from "../lib/supabase";
import { isUploaded, localCopy, splitStored } from "../lib/photoPaths";
import { useTheme } from "../theme";

const cache = new Map<string, { url: string; until: number }>();
const lastError = new Map<string, string>(); // why the last link request for a photo failed (shown in the grey box)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Turns a stored photo ("todo-photos/<uid>/x.jpg") into a viewable URL; local photos show directly.
 * Private photos need a signed link, which needs the sign-in to be loaded. Right after the app opens the sign-in
 * may still be loading or refreshing, and the link request failed: the photo stayed grey for good. So it waits
 * for the sign-in and tries again a few times before giving up.
 */
async function resolve(uri: string, fresh = false): Promise<string | null> {
  if (!isUploaded(uri)) return uri;
  const hit = cache.get(uri);
  if (!fresh && hit && hit.until > Date.now()) return hit.url;
  if (!supabase) return null;
  const { bucket, path } = splitStored(uri);
  if (bucket === "avatars") {
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    cache.set(uri, { url, until: Date.now() + 86400000 });
    return url;
  }
  for (const delay of [0, 1000, 3000, 8000]) {
    if (delay) await wait(delay);
    try {
      await supabase.auth.getSession(); // waits until the saved sign-in is loaded (and refreshed if expired)
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (error) lastError.set(uri, error.message);
      if (data?.signedUrl) {
        cache.set(uri, { url: data.signedUrl, until: Date.now() + 3300000 });
        return data.signedUrl;
      }
    } catch (e) {
      lastError.set(uri, String(e)); // offline or not signed in yet: try again
    }
  }
  return null;
}

/** A plain reason for the grey box. A missing file (deleted in Storage) needs the photo added again. */
const whyNot = (uri: string) => {
  const e = lastError.get(uri) ?? "";
  return /not.?found/i.test(e) ? "서버에 사진 파일이 없어요. 사진을 다시 넣어 주세요" : `링크를 만들지 못했어요 (${e || "?"})`;
};

/** What to show first: the photo on this device if there is one, else nothing until the stored one resolves. */
const initial = (uri?: string) => (!uri ? null : isUploaded(uri) ? (localCopy(uri) ?? null) : uri);

export function StoredImage({ uri, style, label }: { uri?: string; style: StyleProp<ImageStyle>; label?: string }) {
  const { c } = useTheme();
  const [url, setUrl] = useState<string | null>(initial(uri));
  const [failed, setFailed] = useState<string | null>(null);
  const retried = useRef(false);
  useEffect(() => {
    let alive = true;
    const first = initial(uri);
    setUrl(first);
    setFailed(null);
    retried.current = false;
    if (uri && !first) resolve(uri).then((u) => { if (!alive) return; setUrl(u); if (!u) setFailed(whyNot(uri)); });
    return () => { alive = false; };
  }, [uri]);
  // The local copy may be gone (cache cleared) or a link may have expired: fetch a fresh link once.
  const onError = () => {
    if (!uri) return;
    if (!isUploaded(uri)) { setUrl(null); setFailed("이 폰에 없는 사진이에요 (아직 업로드되지 않음)"); return; }
    if (retried.current) { setUrl(null); setFailed("내려받지 못했어요"); return; }
    retried.current = true;
    resolve(uri, true).then((u) => { setUrl(u); if (!u) setFailed(whyNot(uri)); });
  };
  if (!url) {
    // When a photo cannot be shown, say why (and which file), so it can be checked against Supabase Storage
    const file = uri ? uri.split("/").pop() : "";
    return (
      <View style={[style as object, { backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center", padding: 8 }]} role="img" accessibilityLabel={label}>
        {failed ? <AppText variant="helper" color="textMuted" center>{`사진을 불러오지 못했어요: ${failed}\n${file}`}</AppText> : null}
      </View>
    );
  }
  return <Image source={{ uri: url }} style={style} role="img" accessibilityLabel={label} onError={onError} />;
}
