"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { checkFile, SUPPORTED } from "@/lib/formats";

type Status = "queued" | "uploading" | "converting" | "done" | "error";
type Item = {
  id: number;
  file: File;
  status: Status;
  progress: number;
  markdown?: string;
  error?: string;
};

const LOW_CONTENT = 20;
let nextId = 1;

const btn =
  "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors";
const btnPrimary = `${btn} bg-accent text-accent-fg hover:bg-accent-hover`;
const btnGhost = `${btn} border border-line hover:bg-surface`;

function saveMd(name: string, text: string) {
  const base = name.replace(/\.[^.]+$/, "");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  a.download = `${base}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const running = useRef(false);
  const queue = useRef<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const patch = (id: number, p: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function convertOne(it: Item) {
    let blobUrl: string | undefined;
    try {
      patch(it.id, { status: "uploading", progress: 0 });
      const blob = await upload(it.file.name, it.file, {
        access: "public",
        handleUploadUrl: "/api/blob-token",
        multipart: it.file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => patch(it.id, { progress: Math.round(percentage) }),
      });
      blobUrl = blob.url;
      patch(it.id, { status: "converting" });
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: blob.url, filename: it.file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Conversion failed (HTTP ${res.status}).`);
      patch(it.id, { status: "done", markdown: data.markdown ?? "" });
    } catch (e) {
      patch(it.id, { status: "error", error: (e as Error).message || "Something went wrong." });
    } finally {
      if (blobUrl) {
        fetch("/api/blob-delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: blobUrl }),
        }).catch(() => {});
      }
    }
  }

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) await convertOne(queue.current.shift()!);
    running.current = false;
  }

  function add(files: FileList | File[]) {
    const fresh: Item[] = Array.from(files).map((file) => {
      const error = checkFile(file.name, file.size);
      return { id: nextId++, file, status: error ? "error" : "queued", progress: 0, error: error ?? undefined };
    });
    setItems((xs) => [...xs, ...fresh]);
    queue.current.push(...fresh.filter((f) => f.status === "queued"));
    drain();
  }

  function clearAll() {
    queue.current = [];
    setItems((xs) => xs.filter((x) => x.status === "uploading" || x.status === "converting"));
  }

  async function copy(it: Item) {
    await navigator.clipboard.writeText(it.markdown ?? "");
    setCopied(it.id);
    setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 1500);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-16 sm:py-24">
      <header className="mb-10">
        <h1 className="text-5xl font-bold tracking-tight">Markdown Converter</h1>
        <p className="mt-3 text-muted">
          Drop documents, get Markdown. Files are deleted right after conversion.
        </p>
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          drag ? "border-accent bg-surface" : "border-line"
        }`}
      >
        <p className="text-lg font-medium">Drag files here</p>
        <p className="mt-1 text-sm text-muted">
          {SUPPORTED.join(", ")} &middot; up to 100 MB each
        </p>
        <button type="button" onClick={() => input.current?.click()} className={`${btnPrimary} mt-6`}>
          Choose files
        </button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={SUPPORTED.map((e) => `.${e}`).join(",")}
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }}
        />
      </div>

      {items.length > 0 && (
        <section className="mt-10" aria-label="Files">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">{items.length} file{items.length > 1 ? "s" : ""}</h2>
            <button type="button" onClick={clearAll} className={btnGhost}>
              Clear all
            </button>
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {items.map((it) => (
              <li key={it.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="min-w-0 truncate font-medium [overflow-wrap:anywhere]" title={it.file.name}>{it.file.name}</span>
                  <StatusLabel it={it} />
                </div>
                {it.status === "uploading" && (
                  <div role="progressbar" aria-label={`Uploading ${it.file.name}`} aria-valuenow={it.progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${it.progress}%` }} />
                  </div>
                )}
                {it.status === "error" && <p className="text-sm text-err">{it.error}</p>}
                {it.status === "done" && (
                  <>
                    {(it.markdown ?? "").trim().length < LOW_CONTENT && (
                      <p className="text-sm text-warn">
                        Warning: the result is almost empty. This is likely a scanned PDF; OCR is not supported.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => copy(it)} className={btnGhost}>
                        {copied === it.id ? "Copied" : "Copy"}
                      </button>
                      <button type="button" onClick={() => saveMd(it.file.name, it.markdown ?? "")} className={btnPrimary}>
                        Download
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-16 text-sm text-muted">
        Nothing is stored. Scanned PDFs, images, audio and archives are not supported.
      </footer>
    </main>
  );
}

function StatusLabel({ it }: { it: Item }) {
  const text: Record<Status, string> = {
    queued: "Queued",
    uploading: `Uploading ${it.progress}%`,
    converting: "Converting",
    done: "Done",
    error: "Error",
  };
  const color: Record<Status, string> = {
    queued: "text-muted", uploading: "text-accent", converting: "text-accent", done: "text-ok", error: "text-err",
  };
  return (
    <span className={`shrink-0 text-sm font-medium ${color[it.status]}`} aria-live="polite">
      {text[it.status]}
    </span>
  );
}
