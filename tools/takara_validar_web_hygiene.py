from __future__ import annotations

from datetime import date
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "sitemap.xml"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}

PUBLIC_PAGES = {
    "https://takara3d.es/": ROOT / "index.html",
    "https://takara3d.es/productos.html": ROOT / "productos.html",
    "https://takara3d.es/pedido.html": ROOT / "pedido.html",
    "https://takara3d.es/contacto.html": ROOT / "contacto.html",
    "https://takara3d.es/qr": ROOT / "qr" / "index.html",
}

checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def meta_content(html: str, name: str) -> str:
    match = re.search(
        rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']+)',
        html,
        re.I,
    )
    return match.group(1).strip() if match else ""


def canonical(html: str) -> str:
    match = re.search(
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)',
        html,
        re.I,
    )
    return match.group(1).strip() if match else ""


def last_commit_date(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    try:
        return subprocess.check_output(
            ["git", "log", "-1", "--format=%cs", "--", rel],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def main() -> int:
    for url, path in PUBLIC_PAGES.items():
        html = read(path)
        require("<title>" in html.lower(), f"{path.name} tiene title")
        require(canonical(html) == url, f"{path.name} canonical exacto")
        require(meta_content(html, "robots").lower() == "index, follow", f"{path.name} indexable")
        require(len(re.findall(r"<h1\b", html, re.I)) == 1, f"{path.name} tiene un H1")
        require('property="og:title"' in html, f"{path.name} tiene og:title")

    not_found = read(ROOT / "404.html")
    robots_404 = meta_content(not_found, "robots").lower()
    require("noindex" in robots_404, "404 es noindex")
    require("follow" in robots_404, "404 permite seguir enlaces")
    require(len(re.findall(r"<h1\b", not_found, re.I)) == 1, "404 tiene un H1")

    store = read(ROOT / "tienda" / "index.html")
    require("noindex" in meta_content(store, "robots").lower(), "Store white-label no se indexa")

    sitemap_text = read(SITEMAP)
    tree = ET.fromstring(sitemap_text)
    rows = {}
    for node in tree.findall("s:url", NS):
        loc = (node.findtext("s:loc", default="", namespaces=NS) or "").strip()
        lastmod = (node.findtext("s:lastmod", default="", namespaces=NS) or "").strip()
        require(loc not in rows, f"Sitemap sin URL duplicada: {loc}")
        rows[loc] = lastmod

    require(set(rows) == set(PUBLIC_PAGES), "Sitemap contiene exactamente paginas publicas indexables")
    require("https://takara3d.es/404.html" not in rows, "Sitemap excluye 404")
    require("https://takara3d.es/tienda/" not in rows, "Sitemap excluye Store noindex")

    today = date.today().isoformat()
    for url, path in PUBLIC_PAGES.items():
        lastmod = rows[url]
        require(re.fullmatch(r"\d{4}-\d{2}-\d{2}", lastmod) is not None, f"lastmod valido: {url}")
        require(lastmod <= today, f"lastmod no esta en el futuro: {url}")
        git_date = last_commit_date(path)
        if git_date:
            require(lastmod >= git_date, f"lastmod cubre ultimo commit de {path.relative_to(ROOT)}")

    print(f"[TAKARA_WEB_HYGIENE_OK] {{\"checks\":{checks},\"urls\":{len(rows)}}}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
