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
    write = read("apps-script/takara-pedidos-web/StoreAdminWrite.gs")
    bridge = read("apps-script/takara-pedidos-web/StoreAdminUiBridge.gs")
    ui = read("apps-script/takara-pedidos-web/StoreAdminUi.html")
    runtime = read("apps-script/takara-pedidos-web/StoreRuntime.gs")
    registry = read("apps-script/takara-pedidos-web/StoreRegistry.gs")
    sheets = read("apps-script/takara-pedidos-web/StoreSheetsRepository.gs")
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    test = read("tools/takara_test_store_admin_lifecycle.js")
    f4d_test = read("tools/takara_test_store_admin_write.js")

    activate = extract_function(write, "activateStoreAdmin_")
    deactivate = extract_function(write, "deactivateStoreAdmin_")

    require(
        activate.index("requireStoreAdminAccess_()")
        < activate.index("activateStoreRuntime_(normalizedStoreId)"),
        "Activate autoriza antes de Runtime",
    )
    require(
        deactivate.index("requireStoreAdminAccess_()")
        < deactivate.index("deactivateStoreRuntime_(normalizedStoreId)"),
        "Deactivate autoriza antes de Runtime",
    )
    require(
        "assertStoreId_(storeId)" in activate
        and "assertStoreId_(storeId)" in deactivate,
        "Lifecycle valida immutable store_id",
    )
    require(
        "toStoreAdminReadModel_(" in activate
        and "toStoreAdminReadModel_(" in deactivate,
        "Lifecycle devuelve F4B read model",
    )

    for dependency in (
        "SpreadsheetApp",
        "PropertiesService",
        "LockService",
        "createStoreSheetsRepository_",
        "function doGet(",
        "function doPost(",
    ):
        require(dependency not in write, f"AdminWrite no contiene {dependency}")

    require(
        "activateStoreAdmin_(storeId)" in bridge,
        "Bridge delega activate",
    )
    require(
        "deactivateStoreAdmin_(storeId)" in bridge,
        "Bridge delega deactivate",
    )

    for marker in (
        "Desactivar",
        "Activar",
        "activateStoreAdminUiStore",
        "deactivateStoreAdminUiStore",
        "changeStoreLifecycle",
        "window.confirm",
        "ACTIVE/INACTIVE se gestiona mediante una operación",
    ):
        require(marker in ui, f"UI F4E conserva {marker}")

    for forbidden in (
        'name = "status"',
        'name="status"',
        "Eliminar tienda",
        "SpreadsheetApp",
        "TAKARA_STORE_ADMIN_OWNER_EMAIL",
    ):
        require(forbidden not in ui, f"UI F4E excluye {forbidden}")

    require("innerHTML" not in ui, "UI sigue sin innerHTML")
    require(
        "Nueva tienda" in ui
        and "Editar tienda" in ui
        and "Guardar cambios" in ui,
        "F4D create/edit permanece",
    )

    require(
        "function activateStoreRuntime_(" in runtime
        and "function deactivateStoreRuntime_(" in runtime,
        "Runtime canónico conserva lifecycle",
    )
    require(
        "function setStoreStatusService_(" in registry,
        "Store Service sigue siendo autoridad lifecycle",
    )
    require(
        "function createStoreSheetsRepository_(" in sheets,
        "Sheets adapter canónico único",
    )

    for marker in (
        "## F4E authorized ACTIVE/INACTIVE lifecycle",
        "activateStoreAdmin_",
        "deactivateStoreAdmin_",
        "activateStoreRuntime_",
        "deactivateStoreRuntime_",
        "no DELETE",
        "same Admin UI",
        "F4F",
    ):
        require(marker in contract, f"Contrato F4E conserva {marker}")

    for marker in (
        "takara_validar_store_admin_lifecycle.py",
        "takara_test_store_admin_lifecycle.js",
        "takara_validar_store_admin_write.py",
        "takara_test_store_admin_write.js",
        "takara_validar_store_admin_ui.py",
        "takara_test_store_admin_ui.js",
    ):
        require(marker in quality, f"QG conserva {marker}")

    for marker in (
        "denied activate reaches zero Runtime writes",
        "denied deactivate reaches zero Runtime writes",
        "invalid activate reaches zero Runtime writes",
        "invalid deactivate reaches zero Runtime writes",
        "activate uses canonical Runtime",
        "deactivate uses canonical Runtime",
    ):
        require(marker in test, f"Test F4E cubre {marker}")

    require(
        "Desactivar tienda" not in f4d_test
        and "Activar tienda" not in f4d_test,
        "F4D regression ya no congela ausencia de lifecycle",
    )

    print(
        "[TAKARA_STORE_ADMIN_LIFECYCLE_F4E_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())