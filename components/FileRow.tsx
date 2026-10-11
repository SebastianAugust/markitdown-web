import { extOf } from "@/lib/formats";
import { tagClass } from "@/lib/filetype";
import type { Item } from "@/lib/types";

const LOW_CONTENT = 20;

const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 8.5 3.5 3.5L13 4.5" />
  </svg>
);

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileRow({ it, copied, onCopy, onDownload }: {
  it: Item;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const ext = extOf(it.file.name);
  const status =
    it.status === "queued" ? "Waiting…"
    : it.status === "uploading" ? `Uploading ${it.progress}%`
    : it.status === "converting" ? "Converting…"
    : it.status === "done" ? null
    : "Failed";

  return (
    <li className="row-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-[rgba(255,235,200,0.08)] bg-card px-3.5 py-2 shadow-[0_5px_14px_rgba(0,0,0,0.4)]">
      <span className={`tag flex h-[26px] w-[34px] shrink-0 items-center justify-center rounded-[5px] font-mono text-[9.5px] font-semibold uppercase ${tagClass(ext).replace("t-", "r-")}`}>
        {ext.slice(0, 4) || "file"}
      </span>

      <div className="min-w-0 flex-1 basis-40">
        <div className="flex items-baseline">
          <span className="truncate text-[13.5px] font-medium" title={it.file.name}>{it.file.name}</span>
          <span role="status" aria-live="polite" className={`ml-2 shrink-0 text-xs ${it.status === "done" ? "flex items-center gap-1 text-ok" : it.status === "error" ? "text-err" : "text-muted"}`}>
            {it.status === "done" ? <><Check /> Converted &middot; {formatSize(it.file.size)}</> : status}
          </span>
        </div>
        {it.status === "error" && <p className="mt-0.5 text-xs text-err [overflow-wrap:anywhere]">{it.error}</p>}
        {it.status === "done" && (it.markdown ?? "").trim().length < LOW_CONTENT && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--warn)" }}>No text found. This looks like a scanned PDF, and scanned pages aren&apos;t supported yet.</p>
        )}
      </div>

      {it.status === "uploading" && (
        <div role="progressbar" aria-label={`Uploading ${it.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={it.progress} className="h-[3px] w-[140px] max-w-full overflow-hidden rounded-full bg-track">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${it.progress}%` }} />
        </div>
      )}
      {it.status === "converting" && <span className="spinner spinner-dark" aria-hidden="true" />}

      {it.status === "done" && (
        <div className="flex gap-2 max-sm:w-full">
          <button type="button" onClick={onCopy} className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-[7px] bg-btn px-3 text-xs font-medium text-white transition-colors duration-150 hover:bg-btn-hover max-sm:flex-1">
            {copied ? <>Copied <Check size={13} /></> : "Copy Markdown"}
          </button>
          <button type="button" onClick={onDownload} className="inline-flex min-h-8 items-center justify-center rounded-[7px] border border-[rgba(255,235,200,0.25)] px-3 text-xs font-medium transition-colors duration-150 hover:bg-[rgba(255,235,200,0.08)] max-sm:flex-1">
            Download .md
          </button>
        </div>
      )}
    </li>
  );
}
