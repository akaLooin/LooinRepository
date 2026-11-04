import { useEffect, useState } from "react";
import { Image, View, type ImageStyle, type StyleProp } from "react-native";
import { supabase } from "../lib/supabase";
import { isUploaded, splitStored } from "../lib/photoPaths";
import { useTheme } from "../theme";

const cache = new Map<string, { url: string; until: number }>();

/** Turns a stored photo ("todo-photos/<uid>/x.jpg") into a viewable URL; local photos show directly. */
async function resolve(uri: string): Promise<string | null> {
  if (!isUploaded(uri)) return uri;
  const hit = cache.get(uri);
  if (hit && hit.until > Date.now()) return hit.url;
  if (!supabase) return null;
  const { bucket, path } = splitStored(uri);
  if (bucket === "avatars") {
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    cache.set(uri, { url, until: Date.now() + 86400000 });
    return url;
  }
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  cache.set(uri, { url: data.signedUrl, until: Date.now() + 3300000 });
  return data.signedUrl;
}

export function StoredImage({ uri, style, label }: { uri?: string; style: StyleProp<ImageStyle>; label?: string }) {
  const { c } = useTheme();
  const [url, setUrl] = useState<string | null>(uri && !isUploaded(uri) ? uri : null);
  useEffect(() => {
    let alive = true;
    if (uri) resolve(uri).then((u) => alive && setUrl(u));
    else setUrl(null);
    return () => { alive = false; };
  }, [uri]);
  if (!url) return <View style={[style as object, { backgroundColor: c.surfaceStrong }]} role="img" accessibilityLabel={label} />;
  return <Image source={{ uri: url }} style={style} role="img" accessibilityLabel={label} />;
}
