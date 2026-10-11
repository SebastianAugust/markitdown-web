import type { Item, Status } from "@/lib/types";

const color: Record<Status, string> = {
  queued: "text-muted",
  uploading: "text-accent",
  converting: "text-accent",
  done: "text-ok",
  error: "text-err",
};

export function StatusBadge({ it }: { it: Item }) {
  const text: Record<Status, string> = {
    queued: "Waiting",
    uploading: `Uploading ${it.progress}%`,
    converting: "Converting…",
    done: "Ready",
    error: "Failed",
  };
  return (
    <span role="status" aria-live="polite" className={`shrink-0 text-sm font-medium transition-colors duration-200 ${color[it.status]}`}>
      {text[it.status]}
    </span>
  );
}
