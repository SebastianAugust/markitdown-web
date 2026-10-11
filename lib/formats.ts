export const MAX_BYTES = 100 * 1024 * 1024;

export const SUPPORTED = [
  "pdf", "docx", "pptx", "xlsx", "xls", "csv",
  "html", "htm", "json", "xml", "txt", "epub",
] as const;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Returns an error message, or null if the file is acceptable. */
export function checkFile(name: string, size: number): string | null {
  const ext = extOf(name);
  if (!name.includes(".") || !(SUPPORTED as readonly string[]).includes(ext)) {
    return ["jpg", "jpeg", "png", "gif", "webp", "mp3", "wav", "m4a", "zip"].includes(ext)
      ? `.${ext} files (images, audio, archives) are not supported.`
      : `Unsupported format. Supported: ${SUPPORTED.join(", ")}.`;
  }
  if (size > MAX_BYTES) return "File is larger than 100 MB.";
  if (size === 0) return "File is empty.";
  return null;
}

/** Blob URLs live on this host family; anything else is refused server-side. */
export const isBlobUrl = (u: string) => {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === "https:" && hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
};
