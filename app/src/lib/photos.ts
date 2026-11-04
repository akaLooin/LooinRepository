import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

const MAX_SIDE = 1600; // keeps uploads small (replica/architecture.md: 1600px, JPEG 80%)

/** Opens the phone's photo picker and returns a resized JPEG on this device, or null if the user cancelled. */
export async function pickPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const ctx = ImageManipulator.manipulate(a.uri);
  if (Math.max(a.width || 0, a.height || 0) > MAX_SIDE) ctx.resize(a.width >= a.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const img = await ctx.renderAsync();
  // On the web the saved URI is a blob: that dies on reload, so keep the bytes as a data URL there.
  const web = Platform.OS === "web";
  const out = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: web });
  return web && out.base64 ? `data:image/jpeg;base64,${out.base64}` : out.uri;
}

export { BUCKETS, isUploaded, splitStored, type Bucket } from "./photoPaths";
