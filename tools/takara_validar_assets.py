from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"}
TEXT_EXTENSIONS = {
    ".html", ".css", ".js", ".md", ".json", ".xml", ".txt",
    ".gs", ".py", ".ps1", ".yml", ".yaml",
}
REFERENCE_THRESHOLD = 200 * 1024
MAX_SINGLE_ASSET = 2_500_000
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def main() -> int:
    texts = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        try:
            texts.append((path, path.read_text(encoding="utf-8-sig")))
        except UnicodeDecodeError:
            continue

    images = [
        path for path in ASSETS.rglob("*")
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    require(bool(images), "Existen assets de imagen")

    total_bytes = sum(path.stat().st_size for path in images)
    large = []
    for path in images:
        size = path.stat().st_size
        require(size <= MAX_SINGLE_ASSET, f"Asset dentro de limite: {path.relative_to(ROOT)}")
        if size < REFERENCE_THRESHOLD:
            continue

        rel = path.relative_to(ROOT).as_posix()
        basename = path.name
        refs = [
            source for source, text in texts
            if source != path and (rel in text or basename in text)
        ]
        require(bool(refs), f"Asset pesado tiene consumidor: {rel}")
        large.append(path)

    print(
        "[TAKARA_ASSET_HYGIENE_OK] "
        f'{{"checks":{checks},"images":{len(images)},'
        f'"large_referenced":{len(large)},"bytes":{total_bytes}}}'
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
