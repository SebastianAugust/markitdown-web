"use client";

import { useRef, useState } from "react";
import { SUPPORTED } from "@/lib/formats";
import { DocIllustration } from "./DocIllustration";

export function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const open = () => input.current?.click();

  return (
    <div>
      <div className="mb-5 flex justify-center"><DocIllustration /></div>
      <div className="paper" data-drag={drag}>
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose files to convert, or drop them here"
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
          }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          className="paper-body cursor-pointer px-6 py-14 text-center"
        >
          <p className="text-2xl font-semibold tracking-tight">Drop your files here</p>
          <p className="mt-2 text-muted">or choose from your device</p>
          <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-muted">
            {SUPPORTED.map((e) => e.toUpperCase()).join(", ")} &middot; up to 100 MB each
          </p>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        accept={SUPPORTED.map((e) => `.${e}`).join(",")}
        onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }}
      />
      <p className="mt-5 text-center text-sm text-muted">
        Files are uploaded to temporary storage, converted, and deleted right after. Nothing is kept.
      </p>
    </div>
  );
}
