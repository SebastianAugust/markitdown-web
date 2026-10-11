"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { FileCard } from "@/components/FileCard";
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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-16 sm:py-24">
      <header className="mb-12 text-center">
        <h1 className="font-serif text-5xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-7xl">
          Turn documents into clean Markdown.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-muted text-balance">
          Drop in PDFs, Word, PowerPoint, Excel and more. Get back Markdown you can copy or download.
        </p>
      </header>

      <DropZone onFiles={add} />

      {items.length > 0 && (
        <section className="mt-12" aria-label="Files">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">{items.length} file{items.length > 1 ? "s" : ""}</h2>
            <button type="button" onClick={clearAll} className="min-h-9 rounded-md px-3 text-sm font-medium text-muted transition-colors duration-150 hover:text-fg">
              Clear list
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {items.map((it) => (
              <FileCard key={it.id} it={it} copied={copied === it.id} onCopy={() => copy(it)} onDownload={() => saveMd(it.file.name, it.markdown ?? "")} />
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto pt-20 text-center text-xs text-muted">
        Scanned PDFs, images, audio and archives aren&apos;t supported yet.
      </footer>
    </main>
  );
}
