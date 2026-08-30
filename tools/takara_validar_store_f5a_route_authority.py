from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
BRIDGE = ROOT / "apps-script" / "takara-pedidos-web" / "StoreAdminUiBridge.gs"
CONFIG = ROOT / "assets" / "js" / "takara-config.js"
STORE_PUBLIC_JS = ROOT / "assets" / "js" / "takara-store-public.js"
STORE_PUBLIC = ROOT / "tienda" / "index.html"

F5A_ORIGINAL_CODE_SHA = (
    "B6E1421D215A8894E5327591328276A3"
    "E474107AC23D3DB126787253BE3CC943"
)
F5A_ORIGINAL_DOPOST_SHA = (
    "9168F4A6B383DF2CCEF203A40A2B0DE5"
    "3359BE4BD7F713BD4BCBC5E3A7F9C6C2"
)

checks = 0

def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1

def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")

def extract_function(source: str, name: str) -> str:
    pattern = re.compile(
        rf"(?m)^[ \t]*function[ \t]+{re.escape(name)}[ \t]*\("
    )
    matches = list(pattern.finditer(source))
    require(
        len(matches) == 1,
        f"Existe una única función {name}; count={len(matches)}",
    )

    start = matches[0].start()
    brace = source.find("{", matches[0].end())
    require(brace >= 0, f"{name} tiene cuerpo")

    depth = 0
    quote = ""
    escaped = False
    line_comment = False
    block_comment = False
    i = brace

    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = ""
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue

        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue

        if ch in ('"', "'", "`"):
            quote = ch
            i += 1
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[start:i + 1]

        i += 1

    raise AssertionError(f"[FAIL] Cuerpo no balanceado {name}")

def parameter_tokens(function_source: str) -> list[str]:
    tokens = set()
    for match in re.finditer(
        r"\be\s*\.\s*parameter\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)",
        function_source,
    ):
        tokens.add(match.group(1))
    for match in re.finditer(
        r"\be\s*\.\s*parameter\s*\[\s*['\"]([^'\"]+)['\"]\s*\]",
        function_source,
    ):
        tokens.add(match.group(1))
    return sorted(tokens)

def called_identifiers(function_source: str) -> list[str]:
    names = set(
        re.findall(
            r"(?<![\w.$])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(",
            function_source,
        )
    )
    names.difference_update(
        {"function", "if", "for", "while", "switch", "catch"}
    )
    return sorted(names)

def main() -> int:
    code_bytes = CODE.read_bytes()
    code_sha = hashlib.sha256(code_bytes).hexdigest().upper()

    code = read(CODE)
    bridge = read(BRIDGE)
    config = read(CONFIG)
    store_public_js = read(STORE_PUBLIC_JS)
    store_public = read(STORE_PUBLIC)

    do_get = extract_function(code, "doGet")
    do_post = extract_function(code, "doPost")

    post_sha = hashlib.sha256(
        do_post.encode("utf-8")
    ).hexdigest().upper()

    require(
        post_sha == F5A_ORIGINAL_DOPOST_SHA,
        "F5A preserva autoridad POST exacta",
    )
    require(
        "getStoreAdminUiDeploymentOutput_" in bridge,
        "F4F Admin deployment boundary sigue presente",
    )
    require(
        not re.search(
            r"(?m)^[ \t]*function[ \t]+doGet[ \t]*\(",
            bridge,
        ),
        "StoreAdminUiBridge no crea segundo doGet",
    )
    require(
        not re.search(
            r"(?m)^[ \t]*function[ \t]+doPost[ \t]*\(",
            bridge,
        ),
        "StoreAdminUiBridge no crea segundo doPost",
    )

    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in config,
        "Endpoint central sigue en takara-config.js",
    )
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in store_public_js,
        "Store Public JS sigue consumiendo endpoint central",
    )

    config_ref = store_public.find("takara-config.js")
    store_js_ref = store_public.find("takara-store-public.js")
    require(config_ref >= 0, "Store Public carga config")
    require(store_js_ref >= 0, "Store Public carga consumer")
    require(config_ref < store_js_ref, "Config carga antes del consumer")

    admin_integrated = (
        'e.parameter.route' in do_get
        and '"store-admin"' in do_get
        and "getStoreAdminUiDeploymentOutput_" in do_get
    )

    result = {
        "checks": checks,
        "code_sha": code_sha,
        "f5a_original_code_sha": F5A_ORIGINAL_CODE_SHA,
        "doGet_body_sha": hashlib.sha256(
            do_get.encode("utf-8")
        ).hexdigest().upper(),
        "doPost_body_sha": post_sha,
        "doGet_parameter_tokens": parameter_tokens(do_get),
        "doGet_called_identifiers": called_identifiers(do_get),
        "admin_route_integrated": admin_integrated,
        "route_authority": "Code.gs::doGet",
        "post_authority": "Code.gs::doPost",
        "admin_boundary": (
            "StoreAdminUiBridge.gs::"
            "getStoreAdminUiDeploymentOutput_"
        ),
        "endpoint_authority": "assets/js/takara-config.js",
        "store_public_endpoint_consumer": (
            "assets/js/takara-store-public.js"
        ),
    }

    print(
        "[TAKARA_STORE_F5A_ROUTE_AUTHORITY_OK] "
        + json.dumps(
            result,
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())