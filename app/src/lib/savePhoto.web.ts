// Web: the browser downloads the photo.
export async function savePhoto(url: string): Promise<"saved" | "denied"> {
  const a = document.createElement("a");
  a.href = url;
  a.download = `photo-${Date.now()}.jpg`;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "saved";
}
