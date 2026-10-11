"use client";

import { useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { Papers } from "./Papers";

const joins: [number, number[]][] = [[0, [18, 61]], [1, [37, 83]], [2, [12, 52, 90]]];

function Pencil() {
  return (
    <svg className="absolute bottom-10 right-[5%] z-[6] hidden -rotate-[8deg] drop-shadow-[0_3px_3px_rgba(30,15,3,0.45)] sm:block" width="132" height="16" viewBox="0 0 132 16" aria-hidden="true">
      <polygon points="26,1 26,15 3,8" fill="#e9c9a0" />
      <polygon points="9,5.2 9,10.8 3,8" fill="#3a3a3a" />
      <rect x="26" y="1" width="84" height="14" fill="#f2c230" />
      <rect x="26" y="7.5" width="84" height="1.2" fill="#d9a514" />
      <rect x="110" y="1" width="12" height="14" fill="#b9bcc0" />
      <rect x="113" y="1" width="1.2" height="14" fill="#8e9195" />
      <rect x="117" y="1" width="1.2" height="14" fill="#8e9195" />
      <rect x="122" y="1" width="10" height="14" rx="3" fill="#e88f9a" />
    </svg>
  );
}

export function Desk({ items, onFiles }: { items: Item[]; onFiles: (files: FileList) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const open = () => input.current?.click();

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={0}
        data-drag={drag}
        aria-label="Add files. Drop them on the desk, or press Enter to choose files."
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        className="desk relative z-10 block cursor-pointer overflow-hidden rounded-2xl shadow-[0_30px_50px_rgba(50,28,8,0.38),0_4px_8px_rgba(50,28,8,0.3)]"
      >
        <div className="desk-surface relative">
          {[1, 2, 3].map((n, i) => (
            <div key={n} className={`plank-${n} absolute inset-x-0`} style={{ top: `${i * 33.333}%`, height: "33.334%" }} />
          ))}

          <svg className="absolute inset-0 h-full w-full opacity-75 mix-blend-multiply" aria-hidden="true">
            <filter id="wood-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.004 0.22" numOctaves="4" seed="7" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.28  0 0 0 0 0.14  0 0 0 0 0.04  0 0 0 1.7 -0.55" />
            </filter>
            <rect width="100%" height="100%" filter="url(#wood-grain)" />
          </svg>
          <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, rgb(70 36 10 / 0.06) 0 1px, transparent 1px 6px)" }} />

          {[33.333, 66.666].map((y) => (
            <div key={y} className="absolute inset-x-0 h-0.5" style={{ top: `${y}%`, background: "rgb(45 22 5 / 0.5)", boxShadow: "0 1px 0 rgb(255 235 200 / 0.35)" }} />
          ))}
          {joins.flatMap(([p, xs]) =>
            xs.map((x) => (
              <div key={`${p}-${x}`} className="absolute w-px" style={{ left: `${x}%`, top: `${p * 33.333}%`, height: "33.334%", background: "rgb(45 22 5 / 0.35)" }} />
            )),
          )}

          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgb(255 244 220 / 0.32), transparent 65%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgb(40 18 2 / 0.38) 100%)" }} />
          <div className="desk-outline absolute inset-3.5 rounded-[10px]" />

          <Papers items={items} />
          <Pencil />

          <div
            className="absolute bottom-4 left-[44%] z-[8] max-w-[88%] -translate-x-1/2 rounded px-4 py-1.5 text-center text-[12.5px] font-semibold text-[#4a3410] shadow-[0_2px_4px_rgba(30,15,3,0.4),inset_0_1px_0_rgba(255,250,225,0.6)]"
            style={{ background: "linear-gradient(#f3e0a8, #c4a25a)" }}
          >
            Drop files on the desk &middot; or <u>choose files</u>
          </div>
        </div>
        <div className="desk-edge" />
      </div>

      <input
        ref={input}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        accept={[".pdf", ".docx", ".pptx", ".xlsx", ".xls", ".csv", ".html", ".htm", ".json", ".xml", ".txt", ".epub"].join(",")}
        onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
