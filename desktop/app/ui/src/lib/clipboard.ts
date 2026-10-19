// Copying text and images: through Tauri's clipboard inside the app, where
// the web clipboard API is not reliably granted, and through the browser's
// otherwise. Throws when neither works, so a button can say so.

import { inTauri } from "../api/client";

export async function copyText(text: string): Promise<void> {
  if (inTauri()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}

/** An image's bytes as PNG, the one type every clipboard takes: Tauri reads
 *  only PNG, so another type is drawn on a canvas and encoded again. */
async function asPng(bytes: ArrayBuffer, mediaType: string): Promise<Blob> {
  const blob = new Blob([bytes], { type: mediaType });
  if (mediaType === "image/png") return blob;
  const bitmap = await createImageBitmap(blob).catch(() => {
    throw new Error(`cannot read the image (${mediaType})`);
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("cannot encode the image as PNG"))), "image/png"),
  );
}

/** Copies an image, given its bytes and media type. */
export async function copyImage(bytes: ArrayBuffer, mediaType: string): Promise<void> {
  const png = await asPng(bytes, mediaType);
  if (inTauri()) {
    const { writeImage } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeImage(new Uint8Array(await png.arrayBuffer()));
    return;
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}
