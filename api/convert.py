"""POST {url, filename} -> {markdown}. Downloads a Vercel Blob to /tmp, converts, cleans up."""
import json
import os
import tempfile
import urllib.request
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse

MAX_BYTES = 100 * 1024 * 1024
ALLOWED = {"pdf", "docx", "pptx", "xlsx", "xls", "csv", "html", "htm", "json", "xml", "txt", "epub"}
BLOB_SUFFIX = ".blob.vercel-storage.com"


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


def convert(url, filename):
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

        return MarkItDown(enable_plugins=False).convert(path).text_content
    finally:
        if path and os.path.exists(path):
            os.remove(path)
        delete_blob(url)


class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("content-length") or 0)))
            url, filename = data["url"], data["filename"]
            if not isinstance(url, str) or not isinstance(filename, str):
                raise KeyError
        except Exception:
            return self._send(400, {"error": "Expected JSON {url, filename}."})
        try:
            self._send(200, {"markdown": convert(url, filename)})
        except ConvertError as e:
            self._send(e.status, {"error": str(e)})
        except Exception as e:  # never echo document content, only the exception type
            self._send(422, {"error": f"Could not convert this file ({type(e).__name__})."})
