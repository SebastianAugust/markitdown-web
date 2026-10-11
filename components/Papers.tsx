"use client";

import { useEffect, useRef, useState } from "react";
import { extOf } from "@/lib/formats";
import { kindOf, rnd, tagClass } from "@/lib/filetype";
import type { Item } from "@/lib/types";

type Placed = { id: number; ext: string; status: Item["status"]; left: string; top: string; rot: number; s: number; delay: number };

/** Row-ish scatter across the desk; shrinks and adds rows as the count grows. */
function layout(items: Item[]) {
  const n = items.length;
  const rows = n <= 5 ? 1 : n <= 10 ? 2 : Math.ceil(Math.sqrt(n / 2.5));
  const cols = Math.ceil(n / rows);
  const spacing = Math.min(1 / cols, 0.19);
  const cellH = (0.74 * 310) / rows;
  const s = Math.min(1, (cellH / 196) * 1.15, ((spacing * 900) / 150) * 1.25);
  return items.map((it, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const c = i - r * cols;
    const x = 0.5 + (c - (inRow - 1) / 2) * spacing + (rnd(it.id, 1) - 0.5) * 0.024;
    const y = 0.06 + ((r + 0.5) * 0.74) / rows + (rnd(it.id, 2) - 0.5) * 0.08;
    return { s, left: `${(x * 100).toFixed(2)}%`, top: `calc(var(--dh) * ${y.toFixed(3)})`, rot: -7 + rnd(it.id, 3) * 13 };
  });
}

function Skeleton({ id, ext }: { id: number; ext: string }) {
  const kind = kindOf(ext);
  const line = (k: number, strong = false) => (
    <div key={k} className="h-1 rounded-sm" style={{ width: `${55 + rnd(id, k) * 45}%`, background: strong ? "var(--skel-strong)" : "var(--skel)", height: strong ? 6 : 4 }} />
  );
  if (kind === "grid")
    return (
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 15 }, (_, k) => (
          <div key={k} className="h-2.5 rounded-sm" style={{ background: k < 3 ? "var(--skel-strong)" : "var(--skel)", width: `${60 + rnd(id, k + 20) * 40}%` }} />
        ))}
      </div>
    );
  if (kind === "slide")
    return (
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex h-16 flex-col justify-end gap-1.5 rounded-sm p-2" style={{ background: "var(--skel)" }}>
          <div className="h-1.5 w-2/3 rounded-sm" style={{ background: "var(--skel-strong)" }} />
          <div className="h-1 w-1/2 rounded-sm" style={{ background: "var(--skel-strong)" }} />
        </div>
        {line(30)}{line(31)}
      </div>
    );
  return <div className="mt-3 flex flex-col gap-2">{line(10, true)}{[11, 12, 13, 14, 15, 16, 17].map((k) => line(k))}</div>;
}

function Hint({ status }: { status: Item["status"] }) {
  if (status === "converting") return <span className="spinner absolute right-2 top-2" />;
  if (status === "done")
    return (
      <svg className="absolute right-2 top-2 text-ok" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 8.5 3.5 3.5L13 4.5" />
      </svg>
    );
  return null;
}

export function Papers({ items }: { items: Item[] }) {
  const delays = useRef(new Map<number, number>());
  const last = useRef(new Map<number, Placed>());
  const [leaving, setLeaving] = useState<Placed[]>([]);

  // Stagger papers that arrive in the same batch by 120 ms each (set once per id).
  let fresh = 0;
  for (const it of items) if (!delays.current.has(it.id)) delays.current.set(it.id, 120 * fresh++);

  const pos = layout(items);
  const placed: Placed[] = items.map((it, i) => ({ id: it.id, ext: extOf(it.file.name), status: it.status, delay: delays.current.get(it.id)!, ...pos[i] }));

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    const gone = [...last.current.values()].filter((p) => !ids.has(p.id));
    last.current = new Map(placed.map((p) => [p.id, p]));
    if (!gone.length) return;
    setLeaving((l) => [...l, ...gone]);
    const t = setTimeout(() => setLeaving((l) => l.filter((p) => !gone.includes(p))), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const paper = (p: Placed, out = false) => (
    <div key={`${p.id}${out ? "-out" : ""}`} className="paper-pos" style={{ left: p.left, top: p.top, zIndex: 3 + (p.id % 50) }}>
      <div
        className={`paper relative ${out ? "paper-out" : "paper-in"}`}
        style={{ "--rot": `${p.rot}deg`, "--s": p.s, "--delay": `${p.delay}ms` } as React.CSSProperties}
      >
        <span className={`tag inline-block rounded px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${tagClass(p.ext)}`}>{p.ext || "file"}</span>
        <Hint status={p.status} />
        <Skeleton id={p.id} ext={p.ext} />
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {leaving.map((p) => paper(p, true))}
      {placed.map((p) => paper(p))}
    </div>
  );
}
