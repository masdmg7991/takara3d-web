from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"}
RUNTIME_TEXT_EXTENSIONS = {".html", ".css", ".js", ".json", ".xml"}
REFERENCE_THRESHOLD = 200 * 1024
MAX_SINGLE_ASSET = 2_500_000
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return ""


def normalized_src(value: str) -> str:
    return re.sub(r"\s+", "", value or "").split("?", 1)[0].split("#", 1)[0]


def main() -> int:
    runtime_texts = []
    html_texts = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        suffix = path.suffix.lower()
        if suffix not in RUNTIME_TEXT_EXTENSIONS:
            continue
        text = read_text(path)
        runtime_texts.append((path, text))
        if suffix == ".html":
            html_texts.append((path, text))

    images = [
        path for path in ASSETS.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    require(bool(images), "Existen assets de imagen")

    total_bytes = sum(path.stat().st_size for path in images)
    large = []
    for path in images:
        size = path.stat().st_size
        rel = path.relative_to(ROOT).as_posix()
        require(size <= MAX_SINGLE_ASSET, f"Asset dentro de limite: {rel}")
        if size < REFERENCE_THRESHOLD:
            continue

        basename = path.name
        refs = [
            source for source, text in runtime_texts
            if rel in text or basename in text
        ]
        require(bool(refs), f"Asset pesado tiene consumidor web real: {rel}")
        large.append(path)

    literal_images = 0
    for html_path, html in html_texts:
        for match in re.finditer(r"<img\b[^>]*>", html, re.I | re.S):
            tag = match.group(0)
            src_match = re.search(r"\bsrc\s*=\s*\"([^\"]+)\"", tag, re.I | re.S)
            if not src_match:
                continue
            src = normalized_src(src_match.group(1))
            if not src.startswith("assets/") or ("$" + "{") in src:
                continue
            target = ROOT / src
            if not target.is_file() or target.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            literal_images += 1
            require(
                re.search(r"\bwidth\s*=\s*\"\d+\"", tag, re.I) is not None,
                f"Imagen HTML declara width: {html_path.relative_to(ROOT)} -> {src}",
            )
            require(
                re.search(r"\bheight\s*=\s*\"\d+\"", tag, re.I) is not None,
                f"Imagen HTML declara height: {html_path.relative_to(ROOT)} -> {src}",
            )

    require(literal_images > 0, "Se validaron imagenes HTML locales con src literal")

    print(
        "[TAKARA_ASSET_HYGIENE_OK] "
        f'{{"checks":{checks},"images":{len(images)},'
        f'"large_runtime_referenced":{len(large)},'
        f'"literal_html_images":{literal_images},"bytes":{total_bytes}}}'
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
