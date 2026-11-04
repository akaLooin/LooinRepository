/** On the web a photo is a data URL, which fetch reads directly. */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return (await fetch(uri)).arrayBuffer();
}
