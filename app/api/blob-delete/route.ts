import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isBlobUrl } from "@/lib/formats";

// Backup cleanup: the Python function normally deletes the blob itself.
// del() on an already-deleted URL is a no-op, and we swallow errors either way.
export async function POST(request: Request) {
  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url || !isBlobUrl(url)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await del(url);
  } catch {
    /* already gone or transient; nothing to do */
  }
  return NextResponse.json({ ok: true });
}
