"""POST {url, filename, images?} -> {markdown}, or a zip (name.md + images/) when images were extracted.
Downloads a Vercel Blob to /tmp, converts, cleans up."""
import base64
import io
import json
import os
import re
import tempfile
import urllib.request
import zipfile
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

MAX_BYTES = 100 * 1024 * 1024
ALLOWED = {"pdf", "docx", "pptx", "xlsx", "xls", "csv", "html", "htm", "json", "xml", "txt", "epub"}
BLOB_SUFFIX = ".blob.vercel-storage.com"

IMG_MIN = 80  # px; smaller figures are icons, rules, small logos
IMG_MAX_W = 1200
IMG_DPI = 110
FIG_LIMIT = 8  # more figure regions than this on one PDF page -> render the whole page once instead
ZIP_LIMIT = 4_300_000  # Vercel caps a function response at 4.5 MB


class ConvertError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def check_url(url):
    u = urlparse(url)
    if u.scheme != "https" or not (u.hostname or "").endswith(BLOB_SUFFIX):
        raise ConvertError(400, "URL is not a Vercel Blob URL.")


def download(url, path):
    # Private blobs: the token goes in the Authorization header. Never log the URL.
    req = urllib.request.Request(url, headers={"authorization": f"Bearer {os.environ.get('BLOB_READ_WRITE_TOKEN', '')}"})
    with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
        if int(r.headers.get("Content-Length") or 0) > MAX_BYTES:
            raise ConvertError(413, "File is larger than 100 MB.")
        total = 0
        while chunk := r.read(1024 * 1024):
            total += len(chunk)
            if total > MAX_BYTES:
                raise ConvertError(413, "File is larger than 100 MB.")
            f.write(chunk)


def delete_blob(url):
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        return
    # Same call @vercel/blob's del() makes: POST https://vercel.com/api/blob/delete {"urls": [...]}
    req = urllib.request.Request(
        "https://vercel.com/api/blob/delete",
        data=json.dumps({"urls": [url]}).encode(),
        method="POST",
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json",
            "x-api-version": "12",
        },
    )
    try:
        urllib.request.urlopen(req, timeout=15).close()
    except Exception:
        pass  # the browser also calls /api/blob-delete as a backup


def encode_image(im, max_w=IMG_MAX_W, quality=80):
    """-> (bytes, ext). JPEG, or PNG only when the image really uses transparency."""
    if im.width > max_w:
        im = im.resize((max_w, max(1, round(im.height * max_w / im.width))))
    buf = io.BytesIO()
    if im.mode in ("RGBA", "LA", "P") and "A" in im.convert("RGBA").getbands() and im.convert("RGBA").getchannel("A").getextrema()[0] < 255:
        im.convert("RGBA").save(buf, "PNG", optimize=True)
        return buf.getvalue(), "png"
    im.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue(), "jpg"


def ruled_text(page, paths, r):
    """Only straight axis-aligned rules/boxes around a lot of text: a table or form, not a diagram."""
    if len(page.get_text("words", clip=r)) / (r.get_area() / 1000) < 0.25:
        return False
    for d in paths:
        if d["rect"].intersects(r):
            for it in d["items"]:
                if it[0] in ("c", "qu") or (it[0] == "l" and it[1].x != it[2].x and it[1].y != it[2].y):
                    return False
    return True


def figure_regions(page):
    """Raster images and vector-graphic clusters worth keeping, in reading order (top to bottom)."""
    import pymupdf

    full = page.rect
    min_pt = IMG_MIN * 72 / IMG_DPI
    rects = [pymupdf.Rect(i["bbox"]) & full for i in page.get_image_info()]
    draws = page.cluster_drawings(x_tolerance=15, y_tolerance=15)
    if draws:  # ruled tables are drawings too; pymupdf4llm already turns those into markdown tables
        tables = [pymupdf.Rect(t.bbox) for t in page.find_tables(strategy="lines_strict").tables]
        draws = [d for d in draws if not any((d & t).get_area() > 0.5 * min(d.get_area(), t.get_area()) for t in tables)]
        paths = page.get_drawings()
        draws = [d for d in draws if not ruled_text(page, paths, d)]
    rects += [d for d in draws if d.get_area() < 0.85 * full.get_area()]  # drop page frames/backgrounds
    rects = [r for r in rects if r.width >= min_pt and r.height >= min_pt]
    merged = []
    for r in rects:
        r = pymupdf.Rect(r)
        while hit := next((m for m in merged if (m + (-4, -4, 4, 4)).intersects(r)), None):
            merged.remove(hit)
            r |= hit
        merged.append(r)
    return sorted(merged, key=lambda r: (round(r.y0), r.x0))


def pdf_with_images(path):
    """-> (markdown, {"images/pNNN_figK.jpg": bytes}). Figure positions are marked with text tokens
    so pymupdf4llm puts them in true reading order (its own write_images appends them after the page text)."""
    import pymupdf
    import pymupdf4llm
    from PIL import Image

    doc = pymupdf.open(path)
    files, marks = {}, {}  # marks: page index -> [(token, link)]
    for page in doc:
        n = page.number + 1
        regions = figure_regions(page)
        whole = len(regions) > FIG_LIMIT
        if whole:
            regions = [page.rect]
        page_marks = []
        for k, r in enumerate(regions, 1):
            pix = page.get_pixmap(clip=r, dpi=IMG_DPI)
            data, _ = encode_image(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
            name = f"p{n:03d}_fig{k}.jpg"
            files[f"images/{name}"] = data
            page_marks.append((f"ZZFIG{n}X{k}ZZ", f"![Gambar halaman {n}](images/{name})", r))
        if page_marks and not whole:
            for _, _, r in page_marks:
                page.add_redact_annot(r, fill=False)  # drop the text inside figures: the image already shows it
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
            for token, _, r in page_marks:
                # just above the figure: pymupdf4llm drops text that sits inside a vector graphic
                page.insert_text((r.x0, max(r.y0 - 3, 10)), token, fontsize=10)
        marks[page.number] = page_marks
    chunks = pymupdf4llm.to_markdown(doc, page_chunks=True, ignore_images=True)
    pages = []
    for i, chunk in enumerate(chunks):
        text = chunk["text"]
        for token, link, r in marks.get(i, []):
            if token in text:
                text = re.sub(rf"[ \t]*{token}[ \t]*", f"\n\n{link}\n\n", text)
            else:  # token lost (e.g. figure flush with the page top): keep the image anyway
                text = f"{link}\n\n{text}" if r.y0 < 40 else f"{text}\n\n{link}"
        pages.append(text)
    md = re.sub(r"\n{3,}", "\n\n", "\n\n-----\n\n".join(pages)).strip() + "\n"
    return md, files


DATA_URI = re.compile(r"!\[([^\]]*)\]\(data:image/([\w.+-]+);base64,([A-Za-z0-9+/=\s]+)\)|<!-- Slide number: (\d+) -->")


def extract_data_uris(md):
    """Replace inline base64 images (docx, pptx, html, ...) with links into images/. -> (markdown, files)."""
    from PIL import Image

    files, state = {}, {"slide": None, "n": 0, "k": {}}

    def sub(m):
        if m.group(4):
            state["slide"] = int(m.group(4))
            return m.group(0)
        alt, kind, b64 = m.group(1), m.group(2).lower(), m.group(3)
        try:
            raw = base64.b64decode(b64)
            if kind.startswith("svg"):
                data, ext = raw, "svg"
            else:
                im = Image.open(io.BytesIO(raw))
                if im.width < IMG_MIN or im.height < IMG_MIN:
                    return ""
                data, ext = encode_image(im)
        except Exception:
            return ""  # undecodable (e.g. EMF/WMF): drop it rather than ship a broken link
        slide = state["slide"]
        if slide is None:
            state["n"] += 1
            stem, label = f"fig{state['n']:03d}", f"Gambar {state['n']}"
        else:
            k = state["k"][slide] = state["k"].get(slide, 0) + 1
            stem, label = f"s{slide:03d}_fig{k}", f"Gambar slide {slide}"
        files[f"images/{stem}.{ext}"] = data
        return f"![{alt.strip() or label}](images/{stem}.{ext})"

    return DATA_URI.sub(sub, md), files


def build_zip(name, md, files):
    """-> zip bytes (name.md + images/). Shrinks images in steps if it would exceed ZIP_LIMIT."""
    from PIL import Image

    def pack():
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(f"{name}.md", md)
            for path, data in files.items():  # images are already compressed
                z.writestr(path, data, compress_type=zipfile.ZIP_STORED)
        return buf.getvalue()

    out = pack()
    for max_w, quality in ((900, 65), (700, 50)):
        if len(out) <= ZIP_LIMIT:
            return out
        for path, data in files.items():
            if not path.endswith(".svg"):
                files[path] = encode_image(Image.open(io.BytesIO(data)), max_w, quality)[0]
        out = pack()
    if len(out) > ZIP_LIMIT:
        raise ConvertError(413, f"Hasil ZIP ({len(files)} gambar) melebihi batas 4,5 MB. Matikan \u201cSertakan gambar\u201d atau pecah dokumennya.")
    return out


def convert(url, filename, images=False):
    """-> (markdown, files). files maps zip paths to bytes; it is empty when no images were kept."""
    ext = os.path.splitext(filename)[1].lstrip(".").lower()
    if ext not in ALLOWED:
        raise ConvertError(415, f"Unsupported format: .{ext or '?'}")
    check_url(url)
    path = None
    try:
        fd, path = tempfile.mkstemp(suffix=f".{ext}", dir="/tmp")
        os.close(fd)
        download(url, path)
        from markitdown import MarkItDown  # lazy: keeps cold-start errors inside the handler

        if images and ext == "pdf":
            return pdf_with_images(path)
        md = MarkItDown(enable_plugins=False).convert(path, keep_data_uris=images).text_content
        return extract_data_uris(md) if images else (md, {})
    finally:
        if path and os.path.exists(path):
            os.remove(path)
        delete_blob(url)


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload, ctype="application/json", extra=()):
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", ctype)
        self.send_header("content-length", str(len(body)))
        for k, v in extra:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)))
            url, filename, images = data["url"], data["filename"], data.get("images") is True
            if not isinstance(url, str) or not isinstance(filename, str):
                raise KeyError
        except Exception:
            return self._send(400, {"error": "Expected JSON {url, filename}."})
        try:
            md, files = convert(url, filename, images)
            if not files:
                return self._send(200, {"markdown": md})
            name = re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", os.path.splitext(os.path.basename(filename))[0]) or "document"
            self._send(200, build_zip(name, md, files), "application/zip", [("x-image-count", str(len(files)))])
        except ConvertError as e:
            self._send(e.status, {"error": str(e)})
        except Exception as e:  # never echo document content, only the exception type
            self._send(422, {"error": f"Could not convert this file ({type(e).__name__})."})
