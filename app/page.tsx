"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { BottomSheets, TopSheets } from "@/components/BackgroundSheets";
import { Desk } from "@/components/Desk";
import { FileRow } from "@/components/FileRow";
import { checkFile } from "@/lib/formats";
import type { Item } from "@/lib/types";

let nextId = 1;

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
  const [copied, setCopied] = useState<number | null>(null);
  const running = useRef(false);
  const queue = useRef<Item[]>([]);

  const patch = (id: number, p: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  async function convertOne(it: Item) {
    let blobUrl: string | undefined;
    try {
      patch(it.id, { status: "uploading", progress: 0 });
      // Abort if no progress event arrives for 60 s, so a hung upload cannot freeze the queue.
      const ctl = new AbortController();
      let stall: ReturnType<typeof setTimeout>;
      const arm = () => {
        clearTimeout(stall);
        stall = setTimeout(() => ctl.abort(new Error("Upload stalled (no progress for 60 s).")), 60_000);
      };
      arm();
      let blob;
      try {
        blob = await upload(it.file.name, it.file, {
          access: "private",
          handleUploadUrl: "/api/blob-token",
          multipart: it.file.size > 5 * 1024 * 1024,
          abortSignal: ctl.signal,
          onUploadProgress: ({ percentage }) => {
            arm();
            patch(it.id, { progress: Math.round(percentage) });
          },
        });
      } catch (e) {
        throw ctl.signal.aborted ? (ctl.signal.reason as Error) : e;
      } finally {
        clearTimeout(stall!);
      }
      blobUrl = blob.url;
      patch(it.id, { status: "converting" });
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: blob.url, filename: it.file.name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't convert this file. Try again or check the format.");
      patch(it.id, { status: "done", markdown: data.markdown ?? "" });
    } catch (e) {
      patch(it.id, { status: "error", error: (e as Error).message || "Couldn't convert this file. Try again or check the format." });
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
    setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 2000);
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <TopSheets />
      <main className="relative z-10 mx-auto flex min-h-dvh max-w-[900px] flex-col px-4 pb-10 pt-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent font-mono text-[11px] font-semibold text-white" aria-hidden="true">M&darr;</span>
            <span className="font-semibold">Markdown Converter</span>
          </div>
          <span className="text-[13px] text-muted">Powered by MarkItDown</span>
        </header>

        <section className="py-12 text-center sm:py-16">
          <h1 className="font-display text-[clamp(2.1rem,7vw,3rem)] font-bold leading-[1.05] text-balance" style={{ letterSpacing: "-1.6px" }}>
            Turn documents into clean <em className="marker">Markdown.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] text-muted text-balance">
            Put your documents on the desk. We&apos;ll turn each one into tidy .md.
          </p>
        </section>

        <div className="relative">
          <BottomSheets />
          <Desk items={items} onFiles={add} />
        </div>

        {items.length > 0 && (
          <section className="mt-6" aria-label="Files">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={clearAll} className="min-h-8 rounded-md px-2 text-[13px] font-medium text-muted transition-colors duration-150 hover:text-ink">
                Clear list
              </button>
            </div>
            <ul className="flex flex-col gap-[7px]">
              {items.map((it) => (
                <FileRow key={it.id} it={it} copied={copied === it.id} onCopy={() => copy(it)} onDownload={() => saveMd(it.file.name, it.markdown ?? "")} />
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto flex items-center justify-center gap-1.5 pt-12 text-center text-xs text-muted-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
          <span>Files are uploaded to temporary storage, converted, and deleted right after. Nothing is kept.</span>
        </footer>
      </main>
    </div>
  );
}
