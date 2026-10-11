import { extOf } from "@/lib/formats";
import type { Item } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

const HUE: Record<string, number> = {
  pdf: 25, docx: 250, pptx: 50, xlsx: 150, xls: 150, csv: 175,
  html: 300, htm: 300, json: 90, xml: 330, txt: 270, epub: 200,
};

const LOW_CONTENT = 20;

const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 max-sm:w-full";
const btnPrimary = `${btn} bg-accent text-accent-fg hover:bg-accent-hover`;
const btnGhost = `${btn} border border-line hover:bg-bg`;

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Middle ellipsis in CSS: the head truncates, the last characters never do. */
function FileName({ name }: { name: string }) {
  const head = name.slice(0, -10);
  const tail = name.slice(-10);
  return (
    <span className="flex min-w-0 text-sm font-medium" title={name}>
      <span className="truncate">{head}</span>
      <span className="shrink-0">{tail}</span>
    </span>
  );
}

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 8.5 3.5 3.5L13 4.5" />
  </svg>
);

export function FileCard({ it, copied, onCopy, onDownload }: {
  it: Item;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const ext = extOf(it.file.name);
  return (
    <li className="card-in relative overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="badge flex h-10 w-12 shrink-0 items-center justify-center rounded-md text-xs font-semibold tracking-wide uppercase" style={{ "--h": HUE[ext] ?? 260 } as React.CSSProperties}>
            {ext.slice(0, 4) || "file"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <FileName name={it.file.name} />
            <span className="tnum text-xs text-muted">{formatSize(it.file.size)}</span>
          </div>
          <StatusBadge it={it} />
        </div>

        {it.status === "error" && <p className="text-sm text-err">{it.error}</p>}

        {it.status === "done" && (
          <>
            {(it.markdown ?? "").trim().length < LOW_CONTENT && (
              <p className="text-sm text-warn">
                No text found. This looks like a scanned PDF, and scanned pages aren&apos;t supported yet.
              </p>
            )}
            <div className="flex gap-2 max-sm:flex-col">
              <button type="button" onClick={onCopy} className={btnGhost}>
                {copied ? <><Check /> Copied</> : "Copy Markdown"}
              </button>
              <button type="button" onClick={onDownload} className={btnPrimary}>
                Download .md
              </button>
            </div>
          </>
        )}
      </div>

      {(it.status === "uploading" || it.status === "converting") && (
        <div
          role="progressbar"
          aria-label={`${it.status === "uploading" ? "Uploading" : "Converting"} ${it.file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={it.status === "uploading" ? it.progress : undefined}
          className="absolute inset-x-0 bottom-0 h-0.5 bg-line"
        >
          <div
            className={`h-full bg-accent transition-[width] duration-200 ${it.status === "converting" ? "pulse-line" : ""}`}
            style={{ width: it.status === "uploading" ? `${it.progress}%` : "100%" }}
          />
        </div>
      )}
    </li>
  );
}
