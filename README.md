# Markdown Converter

Personal web app: upload documents, get Markdown (Microsoft [markitdown](https://github.com/microsoft/markitdown)).
Next.js UI, Python serverless function, Vercel Blob for large uploads. Nothing is stored after conversion.

**The Vercel Blob store must be Private** (SDK `@vercel/blob` >= 2.3).

Formats: pdf, docx, pptx, xlsx, xls, csv, html, htm, json, xml, txt, epub (max 100 MB). No OCR, audio or zip.

Images ("Sertakan gambar", on by default): the result is a ZIP with `<name>.md` and `images/`, links relative, no base64.
PDF: text via pymupdf4llm, figures (raster and vector diagrams) rendered as cropped regions at 110 dpi, JPEG q80, max 1200 px wide,
files named `pNNN_figK.jpg`; images under 80x80 px are dropped; a page with more than 8 regions falls back to one full-page render.
DOCX/PPTX/others: inline images are written to `images/`. A document without images still returns plain `.md`.
The ZIP must stay under ~4.3 MB (Vercel's 4.5 MB response cap): images are shrunk in steps, then the request fails with a clear message.

## Run locally

`next dev` does not run the Python function, so use `vercel dev`.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm install
npm i -g vercel && vercel login && vercel link   # once
vercel env pull .env.local                       # pulls BLOB_READ_WRITE_TOKEN (needs a Blob store, see DEPLOY.md)
vercel dev                                       # http://localhost:3000
```

Python-only check (no Blob needed): `.venv/bin/pip install reportlab python-docx && .venv/bin/python scripts/test_convert.py`

Deploying: see [DEPLOY.md](DEPLOY.md).
