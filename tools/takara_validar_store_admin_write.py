from pathlib import Path
import json

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
            if ch == "\n": line_comment = False
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
            if escaped: escaped = False
            elif ch == "\\": escaped = True
            elif ch == quote: quote = ""
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
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[start:i + 1]
        i += 1
    raise AssertionError(f"[FAIL] Cuerpo no balanceado {name}")

def main() -> int:
    write = read("apps-script/takara-pedidos-web/StoreAdminWrite.gs")
    bridge = read("apps-script/takara-pedidos-web/StoreAdminUiBridge.gs")
    ui = read("apps-script/takara-pedidos-web/StoreAdminUi.html")
    access = read("apps-script/takara-pedidos-web/StoreAdminAccess.gs")
    admin_read = read("apps-script/takara-pedidos-web/StoreAdminRead.gs")
    runtime = read("apps-script/takara-pedidos-web/StoreRuntime.gs")
    registry = read("apps-script/takara-pedidos-web/StoreRegistry.gs")
    sheets = read("apps-script/takara-pedidos-web/StoreSheetsRepository.gs")
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    test = read("tools/takara_test_store_admin_write.js")
    f4c_test = read("tools/takara_test_store_admin_ui.js")

    require(
        'TAKARA_STORE_ADMIN_WRITE_VERSION = "TAKARA_STORE_ADMIN_WRITE_V1"'
        in write,
        "F4D write contract exacto",
    )

    for marker in (
        '"display_name"', '"contact_name"', '"email"', '"phone"',
        '"address_line"', '"postal_code"', '"city"', '"province"', '"notes"',
    ):
        require(marker in write, f"Whitelist conserva {marker}")

    create_fn = extract_function(write, "createStoreAdmin_")
    update_fn = extract_function(write, "updateStoreAdmin_")
    input_fn = extract_function(write, "assertStoreAdminWriteInput_")

    require(
        create_fn.index("requireStoreAdminAccess_()")
        < create_fn.index("createStoreRuntime_(createInput)"),
        "Create autoriza antes de Runtime",
    )
    require(
        update_fn.index("requireStoreAdminAccess_()")
        < update_fn.index("updateStoreRuntime_(normalizedStoreId, updatePatch)"),
        "Update autoriza antes de Runtime",
    )
    require("assertStoreId_(storeId)" in update_fn, "Update valida store_id")
    require(
        "toStoreAdminReadModel_(" in create_fn
        and "toStoreAdminReadModel_(" in update_fn,
        "Mutaciones devuelven modelo F4B",
    )
    require("unexpected.length" in input_fn, "Whitelist fail-closed")
    require(
        "STORE_ADMIN_INPUT_FORBIDDEN_FIELD" in input_fn,
        "Campo prohibido tiene error",
    )
    require(
        "STORE_ADMIN_DISPLAY_NAME_REQUIRED" in input_fn,
        "Create exige display_name",
    )
    require("STORE_ADMIN_INPUT_EMPTY" in input_fn, "Patch vacío rechazado")

    for dependency in (
        "SpreadsheetApp", "PropertiesService", "LockService",
        "createStoreSheetsRepository_", "MailApp", "DriveApp",
        "function doGet(", "function doPost(",
    ):
        require(dependency not in write, f"AdminWrite no contiene {dependency}")

    require('mode: "MANAGE"' in bridge, "Bridge opera en modo MANAGE")
    for marker in (
        "listStoresAdmin_()", "getStoreAdmin_(storeId)",
        "createStoreAdmin_(input)", "updateStoreAdmin_(storeId, patch)",
    ):
        require(marker in bridge, f"Bridge reutiliza {marker}")

    for dependency in (
        "SpreadsheetApp", "PropertiesService", "createStoreSheetsRepository_",
    ):
        require(dependency not in bridge, f"Bridge no contiene {dependency}")

    for marker in (
        "Nueva tienda", "Editar tienda", "Crear tienda", "Guardar cambios",
        "createStoreAdminUiStore", "updateStoreAdminUiStore",
        'result.mode !== "MANAGE"', "ACTIVE/INACTIVE se gestiona en F4E",
        "TAKARA_STORE_ADMIN_PREVIEW_DATA",
    ):
        require(marker in ui, f"UI F4D conserva {marker}")

    for forbidden in (
        'name = "status"', 'name="status"', "Desactivar tienda",
        "Activar tienda", "Eliminar tienda", "SpreadsheetApp",
        "TAKARA_STORE_ADMIN_OWNER_EMAIL",
    ):
        require(forbidden not in ui, f"UI F4D excluye {forbidden}")

    require("innerHTML" not in ui, "UI sigue sin innerHTML")
    require("textContent" in ui, "UI sigue usando textContent")

    require(
        'TAKARA_STORE_ADMIN_ACCESS_VERSION = "TAKARA_STORE_ADMIN_ACCESS_V1"'
        in access,
        "F4A intacta",
    )
    require(
        'TAKARA_STORE_ADMIN_READ_VERSION = "TAKARA_STORE_ADMIN_READ_V1"'
        in admin_read,
        "F4B intacta",
    )
    require(
        "function createStoreRuntime_(" in runtime
        and "function updateStoreRuntime_(" in runtime,
        "Runtime canónico conserva create/update",
    )
    require(
        "function createStoreService_(" in registry
        and "function updateStoreService_(" in registry,
        "Store Service conserva create/update",
    )
    require(
        "createStoreSheetsRepository_" in runtime,
        "Runtime sigue composition root",
    )
    require(
        "function createStoreSheetsRepository_(" in sheets,
        "Sheets adapter canónico único",
    )

    for marker in (
        "## F4D authorized create + inspect/edit",
        "TAKARA_STORE_ADMIN_WRITE_V1", "StoreAdminWrite", "F4A", "F4B",
        "F4E", "same F4C Admin UI", "status",
        "Store Registry remains the unique Store persistence authority",
    ):
        require(marker in contract, f"Contrato F4D conserva {marker}")

    for marker in (
        "takara_validar_store_admin_write.py",
        "takara_test_store_admin_write.js",
        "takara_validar_store_admin_ui.py",
        "takara_test_store_admin_ui.js",
        "takara_validar_store_admin_read.py",
        "takara_test_store_admin_read.js",
    ):
        require(marker in quality, f"QG conserva {marker}")

    require("READ_ONLY" not in f4c_test, "F4C no congela modo READ_ONLY")

    for marker in (
        '"store_id"', '"store_public_code"', '"status"', '"created_at"',
        '"updated_at"', '"deactivated_at"', '"version"', '"source_type"',
        '"store_attribution"',
    ):
        require(marker in test, f"Test cubre prohibido {marker}")

    require(
        '"STORE_ADMIN_INPUT_FORBIDDEN_FIELD"' in test
        and "createCalls === beforeCreate" in test
        and "updateCalls === beforeUpdate" in test,
        "Test demuestra reject-before-runtime",
    )
    require(
        "createCalls === createBeforeDeny" in test
        and "updateCalls === updateBeforeDeny" in test,
        "Test demuestra auth-before-write",
    )
    require(
        "context.createStoreAdminUiStore" in test
        and "context.updateStoreAdminUiStore" in test,
        "Test cubre bridge create/update",
    )
    require(
        "TAKARA_STORE_ADMIN_WRITE_F4D_OK" in test,
        "Test conserva marcador funcional",
    )

    print(
        "[TAKARA_STORE_ADMIN_WRITE_F4D_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())