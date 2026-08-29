from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps-script" / "takara-pedidos-web"
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
    access = read("apps-script/takara-pedidos-web/StoreAdminAccess.gs")
    admin_read = read("apps-script/takara-pedidos-web/StoreAdminRead.gs")
    registry = read("apps-script/takara-pedidos-web/StoreRegistry.gs")
    sheets = read("apps-script/takara-pedidos-web/StoreSheetsRepository.gs")
    runtime = read("apps-script/takara-pedidos-web/StoreRuntime.gs")
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    test = read("tools/takara_test_store_admin_read.js")
    public_api = read("apps-script/takara-pedidos-web/StorePublicApi.gs")
    http_bridge = read("apps-script/takara-pedidos-web/StoreHttpBridge.gs")

    require(
        'TAKARA_STORE_ADMIN_ACCESS_VERSION = "TAKARA_STORE_ADMIN_ACCESS_V1"'
        in access,
        "F4A access authority intacta",
    )
    require(
        'TAKARA_STORE_ADMIN_READ_VERSION = "TAKARA_STORE_ADMIN_READ_V1"'
        in admin_read,
        "F4B read contract exacto",
    )

    list_admin = extract_function(admin_read, "listStoresAdmin_")
    get_admin = extract_function(admin_read, "getStoreAdmin_")
    projection = extract_function(admin_read, "toStoreAdminReadModel_")

    for fn_name, source in (
        ("listStoresAdmin_", list_admin),
        ("getStoreAdmin_", get_admin),
    ):
        require(
            source.index("requireStoreAdminAccess_()")
            < source.index(
                "listStoresRuntime_()"
                if fn_name == "listStoresAdmin_"
                else "getStoreRuntime_(storeId)"
            ),
            f"{fn_name} autoriza antes del Runtime",
        )

    require(
        "Object.freeze(stores)" in list_admin,
        "Lista Admin inmutable",
    )
    require(
        "Object.freeze({" in projection,
        "Modelo Admin inmutable",
    )

    for marker in (
        "contract_version: TAKARA_STORE_ADMIN_READ_VERSION",
        "store_id: assertStoreId_(store.store_id)",
        "store_public_code: assertStorePublicCode_(store.store_public_code)",
        "status: assertStoreStatus_(store.status)",
        "display_name: normalizeStoreDisplayName_(store.display_name)",
        "email: normalizeStoreOptionalText_(store.email, 254)",
        "notes: normalizeStoreOptionalText_(store.notes, 1000)",
    ):
        require(marker in projection, f"Projection conserva {marker}")

    for forbidden in (
        "SpreadsheetApp",
        "PropertiesService",
        "LockService",
        "createStoreSheetsRepository_",
        "openById",
        "createStoreRuntime_",
        "updateStoreRuntime_",
        "activateStoreRuntime_",
        "deactivateStoreRuntime_",
        "deleteStore",
    ):
        require(
            forbidden not in admin_read,
            f"AdminRead no posee {forbidden}",
        )

    read_port = extract_function(
        registry,
        "assertStoreReadRepositoryPort_",
    )
    get_service = extract_function(registry, "getStoreService_")
    list_service = extract_function(registry, "listStoresService_")

    require(
        '"findById", "listAll"' in read_port,
        "Read port estrecho exige findById + listAll",
    )
    require(
        "assertStoreRepositoryPort_" not in read_port,
        "Read port no ensancha contrato histórico",
    )
    require(
        "repo.findById(normalizedStoreId)" in get_service,
        "get service usa findById",
    )
    require(
        'STORE_NOT_FOUND' in get_service,
        "get service falla cerrado si no existe",
    )
    require(
        "repo.listAll()" in list_service,
        "list service usa listAll",
    )
    require(
        ".sort(function (left, right)" in list_service,
        "list service ordena determinísticamente",
    )
    require(
        "localeCompare" in list_service,
        "orden se basa en store_id",
    )

    require(
        "listAll: function ()" in sheets,
        "Sheets adapter implementa listAll",
    )
    require(
        ".map(storeRowToRecord_)" in sheets,
        "listAll reutiliza mapping canónico",
    )

    require(
        "function getStoreRuntime_(storeId)" in runtime,
        "Runtime compone get",
    )
    require(
        "function listStoresRuntime_()" in runtime,
        "Runtime compone list",
    )
    require(
        "getStoreService_(" in runtime,
        "Runtime get consume Store Service",
    )
    require(
        "listStoresService_(" in runtime,
        "Runtime list consume Store Service",
    )

    for marker in (
        "## F4B authorized Store list/read",
        "TAKARA_STORE_ADMIN_READ_V1",
        "assertStoreReadRepositoryPort_",
        "listStoresAdmin_()",
        "getStoreAdmin_(store_id)",
        "zero Registry",
        "reads.",
        "Store Registry remains the unique Store persistence authority",
        "F4C",
    ):
        require(marker in contract, f"Contrato F4B conserva {marker}")

    for marker in (
        "takara_validar_store_admin_read.py",
        "takara_test_store_admin_read.js",
        "takara_validar_store_admin_access.py",
        "takara_test_store_admin_access.js",
        "takara_validar_order_phase_f3.py",
    ):
        require(marker in quality, f"QG conserva {marker}")

    for marker in (
        "admin list includes ACTIVE and INACTIVE",
        "admin list deterministic by store_id",
        "admin can inspect inactive store",
        "non-owner list denied before Registry",
        "config failure before Registry",
        "identity failure before Registry",
        "F4B exposes no create",
        "AdminRead does not own infrastructure",
        "TAKARA_STORE_ADMIN_READ_F4B_OK",
    ):
        require(marker in test, f"Test F4B cubre {marker}")

    for forbidden in (
        "store.admin",
        "admin.list",
        "admin.get",
        "listStoresAdmin_",
        "getStoreAdmin_",
    ):
        require(
            forbidden not in public_api,
            f"Public API no expone {forbidden}",
        )
        require(
            forbidden not in http_bridge,
            f"HTTP Bridge público no expone {forbidden}",
        )

    print(
        "[TAKARA_STORE_ADMIN_READ_F4B_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())