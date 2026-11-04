import { File } from "expo-file-system";

/**
 * Reads a photo saved on the phone. fetch(file://...).arrayBuffer() returned a few bytes instead of the photo
 * on Android, so the uploaded files were empty; the file system module reads the real bytes.
 */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
