export type Status = "queued" | "uploading" | "converting" | "done" | "error";
export type Item = {
  id: number;
  file: File;
  status: Status;
  progress: number;
  markdown?: string;
  error?: string;
};
