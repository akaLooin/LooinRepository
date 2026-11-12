// Saves a photo to the phone's gallery (사진 크게 보기 → 길게 누르기 → 사진 저장).
import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export async function savePhoto(url: string): Promise<"saved" | "denied"> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return "denied";
  // a photo from the server is downloaded first; one on this phone is saved as it is
  let local = url;
  if (/^https?:/.test(url)) {
    const dir = new Directory(Paths.cache, "saved-photos");
    if (!dir.exists) dir.create();
    const file = await File.downloadFileAsync(url, new File(dir, `photo-${Date.now()}.jpg`));
    local = file.uri;
  }
  await MediaLibrary.saveToLibraryAsync(local);
  return "saved";
}
