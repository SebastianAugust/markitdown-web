export type Status = "queued" | "uploading" | "converting" | "done" | "error";
export type Item = {
  id: number;
  file: File;
  status: Status;
  progress: number;
  markdown?: string;
  /** "Sertakan gambar" was on when the file was added. */
  images: boolean;
  /** Result as a zip (name.md + images/) when images were extracted; then `markdown` is unset. */
  zip?: Blob;
  imageCount?: number;
  error?: string;
};
