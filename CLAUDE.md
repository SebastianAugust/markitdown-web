# markitdown-web

Document -> Markdown converter. Personal use, Vercel Hobby.

## Stack
Next.js (App Router, TS) + Tailwind v4; Python function `api/convert.py` (markitdown); `@vercel/blob` client upload.

## Layout
- `app/page.tsx` single-page UI, sequential per-file queue (upload -> convert -> delete blob)
- `app/api/blob-token/route.ts` handleUpload token (ext + 100 MB checks)
- `app/api/blob-delete/route.ts` backup blob delete
- `api/convert.py` download to /tmp, convert, delete file + blob (finally)
- `lib/formats.ts` shared allowed formats / size / Blob-URL check
- `scripts/test_convert.py` local Python test, no Blob

## Commands
- `vercel dev` run everything (next dev does NOT run Python)
- `npm run build` production build
- `.venv/bin/python scripts/test_convert.py` conversion test
- Never log document content.
