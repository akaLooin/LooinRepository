import { useEffect, useRef, useState } from "react";
import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { supabase } from "../lib/supabase";
import { isUploaded, localCopy, splitStored } from "../lib/photoPaths";
import { useTheme } from "../theme";

const cache = new Map<string, { url: string; until: number }>();
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
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        cache.set(uri, { url: data.signedUrl, until: Date.now() + 3300000 });
        return data.signedUrl;
      }
    } catch {
      // offline or not signed in yet: try again
    }
  }
  return null;
}

/** What to show first: the photo on this device if there is one, else nothing until the stored one resolves. */
const initial = (uri?: string) => (!uri ? null : isUploaded(uri) ? (localCopy(uri) ?? null) : uri);

export function StoredImage({ uri, style, label }: { uri?: string; style: StyleProp<ImageStyle>; label?: string }) {
  const { c } = useTheme();
  const [url, setUrl] = useState<string | null>(initial(uri));
  const retried = useRef(false);
  useEffect(() => {
    let alive = true;
    const first = initial(uri);
    setUrl(first);
    retried.current = false;
    if (uri && !first) resolve(uri).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [uri]);
  // The local copy may be gone (cache cleared) or a link may have expired: fetch a fresh link once.
  const onError = () => {
    if (!uri || !isUploaded(uri) || retried.current) return;
    retried.current = true;
    resolve(uri, true).then(setUrl);
  };
  if (!url) return <View style={[style as object, { backgroundColor: c.surfaceStrong }]} role="img" accessibilityLabel={label} />;
  return <Image source={{ uri: url }} style={style} role="img" accessibilityLabel={label} onError={onError} />;
}
