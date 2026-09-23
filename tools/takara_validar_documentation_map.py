from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MAP = DOCS / "README.md"
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def main() -> int:
    require(MAP.is_file(), "Existe docs/README.md")
    text = MAP.read_text(encoding="utf-8-sig")
    docs = sorted(
        path for path in DOCS.glob("*.md")
        if path.name != "README.md"
    )
    require(bool(docs), "Existen documentos técnicos")
    require("## Mapa de autoridad documental" in text, "Existe mapa de autoridad documental")
    require("## Evidencia, no autoridad" in text, "Existe sección de evidencia no autoritativa")
    require("## Reglas de prioridad" in text, "Existe frontera del registro documental")

    registry = text.split("## Reglas de prioridad", 1)[0]
    for path in docs:
        count = registry.count(f"`{path.name}`")
        require(count == 1, f"{path.name} tiene una única inscripción en autoridad/evidencia")

    print(
        "[TAKARA_DOCUMENTATION_MAP_OK] "
        + json.dumps({"checks": checks, "documents": len(docs)}, ensure_ascii=False, separators=(",", ":"))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
