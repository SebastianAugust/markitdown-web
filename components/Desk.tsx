"use client";

import { useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { Papers } from "./Papers";

// Three procedural grain layers: [id, blend, opacity, warp freq, warp oct/seed, grain freq, grain oct/seed, scale, colour matrix]
const GRAIN = [
  ["g-main", "multiply", 0.8, "0.0032 0.022", [2, 5], "0.0016 0.15", [5, 9], 110, "0 0 0 0 0.42  0 0 0 0 0.2  0 0 0 0 0.05  2.8 0 0 0 -1.2"],
  ["g-fibre", "multiply", 0.45, "0.004 0.03", [2, 14], "0.006 0.75", [2, 3], 40, "0 0 0 0 0.45  0 0 0 0 0.22  0 0 0 0 0.06  1.9 0 0 0 -0.75"],
  ["g-honey", "screen", 0.32, "0.003 0.03", [2, 21], "0.0022 0.11", [4, 17], 90, "0 0 0 0 1  0 0 0 0 0.88  0 0 0 0 0.66  2.4 0 0 0 -1.05"],
] as const;

function Pencil() {
  return (
    <svg className="absolute bottom-9 left-[4%] z-[2] hidden rotate-[14deg] drop-shadow-[0_4px_4px_rgba(30,15,3,0.5)] sm:block" width="132" height="16" viewBox="0 0 132 16" aria-hidden="true">
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

function Mug() {
  return (
    <svg className="absolute bottom-8 right-[5%] z-[2] hidden sm:block" width="110" height="96" viewBox="0 0 110 96" aria-hidden="true">
      <circle cx="36" cy="52" r="34" fill="none" stroke="rgb(90 45 15 / 0.35)" strokeWidth="3" strokeDasharray="150 60" />
      <g style={{ filter: "drop-shadow(0 5px 5px rgb(30 15 3 / 0.5))" }}>
        <rect x="76" y="34" width="26" height="26" rx="12" fill="none" stroke="#f4efe6" strokeWidth="7" />
        <circle cx="58" cy="44" r="36" fill="#f4efe6" />
        <circle cx="58" cy="44" r="29" fill="#e4ddd0" />
        <circle cx="58" cy="44" r="26" fill="#3a1f0e" />
        <path d="M42 34a19 19 0 0 1 14-8" fill="none" stroke="rgb(255 225 180 / 0.55)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Washi({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute h-[19px] w-[58px] ${className}`} style={{ background: "rgb(255 214 102 / 0.82)" }} />;
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
        className="desk relative z-10 block cursor-pointer overflow-hidden rounded-[4px] shadow-[0_34px_60px_rgba(0,0,0,0.7),0_6px_12px_rgba(0,0,0,0.5)]"
      >
        <div className="desk-surface relative overflow-hidden">
          <div className="wood" aria-hidden="true">
            {GRAIN.map(([id, blend, opacity, wf, [wo, ws], gf, [go, gs], scale, matrix]) => (
              <svg key={id} style={{ mixBlendMode: blend, opacity }}>
                <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                  <feTurbulence type="fractalNoise" baseFrequency={wf} numOctaves={wo} seed={ws} result="warp" />
                  <feTurbulence type="fractalNoise" baseFrequency={gf} numOctaves={go} seed={gs} result="grain" />
                  <feDisplacementMap in="grain" in2="warp" scale={scale} xChannelSelector="R" yChannelSelector="G" />
                  <feColorMatrix type="matrix" values={matrix} />
                </filter>
                <rect width="100%" height="100%" filter={`url(#${id})`} />
              </svg>
            ))}
          </div>

          <div className="absolute inset-0" style={{ background: "linear-gradient(transparent 62%, rgb(120 64 22 / 0.28))" }} />
          <div className="absolute left-[12%] top-[38%] h-px w-44 rotate-[-2deg]" style={{ background: "rgb(255 238 205 / 0.3)" }} />
          <div className="absolute right-[18%] top-[71%] h-px w-32 rotate-[3deg]" style={{ background: "rgb(255 238 205 / 0.3)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 30%, rgb(255 244 220 / 0.16) 42%, transparent 54%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 28%, rgb(255 236 190 / 0.22), transparent 58%), radial-gradient(ellipse at 50% 45%, transparent 38%, rgb(14 7 1 / 0.62) 100%)" }} />
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: "rgb(255 240 210 / 0.55)" }} />
          <div className="desk-outline absolute inset-3.5 rounded-[4px]" />

          <Mug />
          <Pencil />
          <Papers items={items} />

          <div className="absolute inset-x-3 bottom-4 z-[70] flex justify-center sm:bottom-5">
            <div
              className="relative -rotate-[1.2deg] rounded-[4px] px-[18px] py-[13px] text-[#1d1b17] shadow-[0_14px_16px_-4px_rgba(0,0,0,0.5),0_3px_4px_rgba(0,0,0,0.35)]"
              style={{ background: "#fffdf8" }}
            >
              <Washi className="-left-4 -top-2 rotate-[-24deg]" />
              <Washi className="-right-4 -top-2 rotate-[24deg]" />
              <div className="flex items-center gap-3.5 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full" style={{ background: "#eef1ff", color: "#2a43d6" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 15V4m-4.5 4.5L12 4l4.5 4.5" />
                      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-display text-[17px] font-bold leading-tight">Drop your files here</p>
                    <p className="mt-0.5 text-xs" style={{ color: "#6f695c" }}>PDF, DOCX, PPTX, XLSX and more &middot; up to 100 MB</p>
                  </div>
                </div>
                <span className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-medium text-white" style={{ background: "#3b55e6" }}>
                  Choose files
                </span>
              </div>
            </div>
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
