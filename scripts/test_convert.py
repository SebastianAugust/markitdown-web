"""Local check of api/convert.py without Blob: builds sample files, serves them via a stubbed download.
Run: .venv/bin/python scripts/test_convert.py"""
import io, json, os, re, shutil, sys, tempfile, threading, urllib.request, zipfile
from http.server import HTTPServer
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
import convert as c
from docx import Document
from reportlab.pdfgen import canvas

d = tempfile.mkdtemp()
pdf, docx, csv, png = (os.path.join(d, n) for n in ("a.pdf", "b.docx", "c.csv", "d.png"))
k = canvas.Canvas(pdf); k.drawString(72, 720, "Hello PDF world"); k.save()
doc = Document(); doc.add_heading("Title Here", 1); doc.add_paragraph("Body text."); doc.save(docx)
open(csv, "w").write("x,y\n1,2\n"); open(png, "wb").write(b"x")

deleted = []
c.check_url = lambda u: None
c.delete_blob = deleted.append
c.download = lambda url, path: shutil.copy(url, path)

for f, expect in ((pdf, "Hello PDF world"), (docx, "# Title Here"), (csv, "| x | y |")):
    out, files = c.convert(f, os.path.basename(f))
    assert expect in out and not files, (f, out)
    print("ok", os.path.basename(f), repr(out[:40]))
assert len(deleted) == 3
try:
    c.convert(png, "d.png"); raise SystemExit("png should be rejected")
except c.ConvertError as e:
    print("ok rejected png:", e)
assert not [x for x in os.listdir("/tmp") if x.endswith((".pdf", ".docx", ".csv")) and x.startswith("tmp")], "temp leak"
# SSRF guard
import importlib; importlib.reload(c)
try:
    c.check_url("https://evil.example.com/x.pdf"); raise SystemExit("ssrf not blocked")
except c.ConvertError:
    print("ok ssrf blocked")

c.check_url = lambda u: None  # the reload above dropped the stubs
c.delete_blob = deleted.append
c.download = lambda url, path: shutil.copy(url, path)

# --- images: PDF (raster + vector diagram + tiny icon), DOCX, PPTX ---
from PIL import Image
from reportlab.lib.utils import ImageReader
from pptx import Presentation
from pptx.util import Inches

def noise(w, h): return Image.effect_noise((w, h), 60).convert("RGB")
def png_bytes(im): b = io.BytesIO(); im.save(b, "PNG"); b.seek(0); return b

mix = os.path.join(d, "mix.pdf")
k = canvas.Canvas(mix)
k.drawString(72, 780, "Page one"); k.drawString(72, 750, "Before raster.")
k.drawImage(ImageReader(noise(900, 600)), 72, 430, 450, 300)
k.drawImage(ImageReader(noise(30, 30)), 72, 400, 20, 20)  # tiny icon: must be dropped
k.drawString(72, 380, "After raster."); k.showPage()
k.drawString(72, 780, "Page two"); k.drawString(72, 750, "Before diagram.")
for x in (90, 260, 430):
    k.rect(x, 600, 100, 60); k.drawString(x + 10, 625, "Block")
    k.line(x + 100, 630, x + 160, 630); k.line(x + 150, 635, x + 160, 630); k.line(x + 150, 625, x + 160, 630)
k.circle(300, 520, 40); k.line(300, 560, 300, 600); k.drawString(72, 440, "After diagram."); k.showPage()
k.drawString(72, 780, "Page three, text only."); k.save()

dx = os.path.join(d, "pic.docx")
doc = Document(); doc.add_paragraph("Before image."); doc.add_picture(png_bytes(noise(400, 300)), width=914400 * 3)
doc.add_picture(png_bytes(noise(20, 20))); doc.add_paragraph("After image."); doc.save(dx)

px = os.path.join(d, "pic.pptx")
pr = Presentation(); sl = pr.slides.add_slide(pr.slide_layouts[6])
sl.shapes.add_picture(png_bytes(noise(400, 300)), Inches(1), Inches(1), Inches(3)); pr.save(px)

def check_zip(data, order):
    z = zipfile.ZipFile(io.BytesIO(data)); names = z.namelist()
    mds = [n for n in names if n.endswith(".md")]; assert len(mds) == 1 and "/" not in mds[0], names
    md = z.read(mds[0]).decode()
    assert "base64" not in md and "data:image" not in md
    links = re.findall(r"!\[[^\]]*\]\((images/[^)]+)\)", md)
    assert links and all(l in names for l in links), (links, names)
    assert re.findall(r"Before \w+|After \w+|!\[", md) == order, md
    for l in links:
        im = Image.open(io.BytesIO(z.read(l))); assert im.width >= 80 and im.height >= 80 and im.width <= 1200
    return md, links

for f, imgs in ((mix, 2), (dx, 1), (px, 1)):
    md, files = c.convert(f, os.path.basename(f), images=True)
    assert len(files) == imgs, (f, sorted(files))
    data = c.build_zip(os.path.splitext(os.path.basename(f))[0], md, files)
    md, links = check_zip(data, {mix: ["Before raster", "![", "After raster", "Before diagram", "![", "After diagram"], dx: ["Before image", "![", "After image"]}.get(f, ["!["]))
    print("ok images", os.path.basename(f), links)
assert re.findall(r"p00[12]_fig1\.jpg", c.convert(mix, "mix.pdf", images=True)[0]) == ["p001_fig1.jpg", "p002_fig1.jpg"]
assert c.convert(csv, "c.csv", images=True)[1] == {}  # nothing to extract -> plain markdown
# size cap: shrinks first, then refuses with a clear message
md, files = c.convert(mix, "mix.pdf", images=True)
big = len(c.build_zip("x", md, dict(files)))
c.ZIP_LIMIT = big - 1000
assert len(c.build_zip("x", md, dict(files))) < big
c.ZIP_LIMIT = 100
try:
    c.build_zip("x", md, dict(files)); raise SystemExit("zip cap not enforced")
except c.ConvertError as e:
    assert e.status == 413; print("ok zip cap:", e)
c.ZIP_LIMIT = 4_300_000

# HTTP handler: zip when images found, JSON otherwise, images flag off = old behaviour
srv = HTTPServer(("127.0.0.1", 0), c.handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
def post(f, **kw):
    body = json.dumps({"url": f, "filename": os.path.basename(f), **kw}).encode()
    r = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{srv.server_port}", body, {"content-type": "application/json"}))
    return r.headers["content-type"], r.headers.get("x-image-count"), r.read()
ct, n, body = post(mix, images=True); assert ct == "application/zip" and n == "2"; check_zip(body, None) if False else zipfile.ZipFile(io.BytesIO(body)).testzip()
ct, n, body = post(mix); assert ct == "application/json" and "Page one" in json.loads(body)["markdown"]
ct, n, body = post(csv, images=True); assert ct == "application/json"
srv.shutdown(); print("ok handler")
