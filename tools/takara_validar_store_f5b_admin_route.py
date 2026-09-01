from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
BRIDGE = ROOT / "apps-script" / "takara-pedidos-web" / "StoreAdminUiBridge.gs"
CONTRACT = ROOT / "docs" / "STORE_ADMIN_CONTRACT.md"
QUALITY = ROOT / "tools" / "takara_quality_gate.ps1"

F5A_CODE_SHA = (
    "B6E1421D215A8894E5327591328276A3"
    "E474107AC23D3DB126787253BE3CC943"
)
F5A_DOGET_SHA = (
    "31F07EAFFA4A91F4C080FC1F912C2239"
    "4F8EEA318BD4FF824107979838AE7809"
)
CURRENT_VERSION = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"

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

def main() -> int:
    code = read(CODE)
    bridge = read(BRIDGE)
    contract = read(CONTRACT)
    quality = read(QUALITY)

    do_get = extract_function(code, "doGet")
    do_post = extract_function(code, "doPost")

    code_sha = hashlib.sha256(CODE.read_bytes()).hexdigest().upper()
    do_get_sha = hashlib.sha256(
        do_get.encode("utf-8")
    ).hexdigest().upper()
    do_post_sha = hashlib.sha256(
        do_post.encode("utf-8")
    ).hexdigest().upper()

    require(code_sha != F5A_CODE_SHA, "F5B cambia Code.gs")
    require(do_get_sha != F5A_DOGET_SHA, "F5B cambia doGet")
    require(
        '"store-admin"' not in do_post
        and "getStoreAdminUiDeploymentOutput_" not in do_post,
        "Admin route permanece fuera de doPost",
    )

    require(
        code.count(CURRENT_VERSION) == 1,
        "VERSION_SCRIPT actual exacta una vez",
    )
    require(
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2"
        not in code,
        "Versión anterior retirada",
    )

    route_pos = do_get.find("e.parameter.route")
    admin_value_pos = do_get.find('"store-admin"')
    admin_call_pos = do_get.find(
        "getStoreAdminUiDeploymentOutput_()"
    )
    public_call_pos = do_get.find("routeStorePublicGet_(")

    require(route_pos >= 0, "doGet inspecciona route")
    require(admin_value_pos >= 0, "route store-admin exacta")
    require(admin_call_pos >= 0, "doGet llama Admin boundary")
    require(public_call_pos >= 0, "doGet conserva Store Public")
    require(
        route_pos < admin_call_pos < public_call_pos,
        "Admin branch precede al fallback Store Public",
    )

    require(
        do_get.count("getStoreAdminUiDeploymentOutput_()") == 1,
        "Admin boundary se invoca una vez desde doGet",
    )
    require(
        do_get.count("routeStorePublicGet_(") == 1,
        "Store Public mantiene una delegación desde doGet",
    )

    require(
        "getStoreAdminUiDeploymentOutput_" in bridge,
        "F4F Admin boundary permanece",
    )
    require(
        "requireStoreAdminAccess_();" in bridge,
        "Admin boundary sigue owner-only",
    )

    for forbidden in (
        "function doGet(",
        "function doPost(",
        "SpreadsheetApp",
    ):
        require(
            forbidden not in bridge,
            f"Bridge no duplica {forbidden}",
        )

    for marker in (
        "## F5B integrate Admin into existing doGet authority",
        "?route=store-admin",
        "Code.gs::doGet",
        "routeStorePublicGet_",
        "getStoreAdminUiDeploymentOutput_",
        "fail closed",
        "no push",
        "no deployment",
    ):
        require(marker in contract, f"Contrato F5B contiene {marker}")

    for marker in (
        "takara_validar_store_f5b_admin_route.py",
        "takara_test_store_f5b_admin_route.js",
        "takara_validar_store_f5a_route_authority.py",
        "takara_validar_store_admin_phase_f4.py",
    ):
        require(marker in quality, f"QG conserva {marker}")

    print(
        "[TAKARA_STORE_F5B_ADMIN_ROUTE_STATIC_OK] "
        + json.dumps(
            {
                "checks": checks,
                "code_sha": code_sha,
                "doGet_sha": do_get_sha,
                "doPost_sha": do_post_sha,
            },
            separators=(",", ":"),
        )
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())