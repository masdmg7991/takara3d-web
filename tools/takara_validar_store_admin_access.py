from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f"Existe {relative}")
    return path.read_text(encoding="utf-8-sig")


def extract_function(source: str, name: str) -> str:
    marker = f"function {name}("
    start = source.find(marker)
    require(start >= 0, f"Existe función {name}")
    brace = source.find("{", start)
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
                return source[start : i + 1]

        i += 1

    raise AssertionError(f"[FAIL] Cuerpo no balanceado {name}")


def main() -> int:
    access = read(
        "apps-script/takara-pedidos-web/StoreAdminAccess.gs"
    )
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    test = read("tools/takara_test_store_admin_access.js")

    require(
        'TAKARA_STORE_ADMIN_ACCESS_VERSION = '
        '"TAKARA_STORE_ADMIN_ACCESS_V1"' in access,
        "Versión exacta",
    )
    require(
        'TAKARA_STORE_ADMIN_OWNER_PROPERTY = '
        '"TAKARA_STORE_ADMIN_OWNER_EMAIL"' in access,
        "Property exacta",
    )
    require(
        'TAKARA_STORE_ADMIN_ROLE = "OWNER"' in access,
        "Rol exacto",
    )

    normalize = extract_function(access, "normalizeStoreAdminEmail_")
    configured = extract_function(
        access,
        "getConfiguredStoreAdminOwnerEmail_",
    )
    active = extract_function(access, "getActiveStoreAdminEmail_")
    gate = extract_function(access, "requireStoreAdminAccess_")

    require(
        ".trim().toLowerCase()" in normalize,
        "Normaliza email",
    )
    require(
        "PropertiesService.getScriptProperties()" in configured,
        "Owner desde ScriptProperties",
    )
    require(
        "STORE_ADMIN_CONFIGURATION_INVALID" in configured,
        "Configuración fail closed",
    )
    require(
        "Session.getActiveUser()" in active,
        "Identidad desde ActiveUser",
    )
    require(
        "STORE_ADMIN_UNAUTHENTICATED" in active,
        "Identidad fail closed",
    )
    require(
        "activeEmail !== ownerEmail" in gate,
        "Compara owner exacto",
    )
    require(
        "STORE_ADMIN_FORBIDDEN" in gate,
        "No-owner prohibido",
    )
    require(
        "Object.freeze({" in gate,
        "Descriptor inmutable",
    )
    require("email:" not in gate, "No expone owner email")

    for forbidden in (
        "SpreadsheetApp",
        "createStoreSheetsRepository_",
        "openById",
        "MailApp",
        "DriveApp",
        "function doGet(",
        "function doPost(",
        "store_id",
        "store_ref",
        "TAKARA_STORE_ATTRIBUTION_V1",
    ):
        require(
            forbidden not in access,
            f"F4A no contiene {forbidden}",
        )

    require(
        not re.search(
            r"[A-Za-z0-9._%+-]+@gmail\.com",
            access,
            flags=re.IGNORECASE,
        ),
        "No hardcodea Gmail",
    )

    for marker in (
        "# Takara Store Admin Contract",
        "TAKARA_STORE_ADMIN_ACCESS_V1",
        "Session.getActiveUser()",
        "TAKARA_STORE_ADMIN_OWNER_EMAIL",
        "ScriptProperties",
        "dedicated/restricted Apps Script Web App",
        "hidden URL",
        "STORE_ADMIN_CONFIGURATION_INVALID",
        "STORE_ADMIN_UNAUTHENTICATED",
        "STORE_ADMIN_FORBIDDEN",
        "Store Registry remains the unique Store persistence authority",
        "F4B",
        "F4G",
        "Admin UI exists yet",
    ):
        require(marker in contract, f"Contrato conserva {marker}")

    for marker in (
        "takara_validar_store_admin_access.py",
        "takara_test_store_admin_access.js",
    ):
        require(marker in quality, f"Quality Gate integra {marker}")

    for marker in (
        "invalid config fails closed",
        "invalid identity fails closed",
        "non-owner forbidden",
        "missing identity primitive denied",
        "uses ScriptProperties",
        "uses ActiveUser",
        "TAKARA_STORE_ADMIN_ACCESS_F4A_OK",
    ):
        require(marker in test, f"Test cubre {marker}")

    print(
        "[TAKARA_STORE_ADMIN_ACCESS_F4A_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())