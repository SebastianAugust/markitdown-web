export type Kind = "doc" | "grid" | "slide";

export const kindOf = (ext: string): Kind =>
  ["xlsx", "xls", "csv"].includes(ext) ? "grid" : ext === "pptx" ? "slide" : "doc";

/** Tag colour class (defined in globals.css); unknown types fall back to neutral. */
export const tagClass = (ext: string) =>
  `t-${["pdf", "docx", "xlsx", "pptx", "epub"].includes(ext) ? ext : ext === "xls" ? "xlsx" : "other"}`;

/** Deterministic pseudo-random in [0,1) from an id and a salt. */
export function rnd(i: number, k: number) {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
