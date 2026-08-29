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
    bridge = read("apps-script/takara-pedidos-web/StoreAdminUiBridge.gs")
    write = read("apps-script/takara-pedidos-web/StoreAdminWrite.gs")
    ui = read("apps-script/takara-pedidos-web/StoreAdminUi.html")
    access = read("apps-script/takara-pedidos-web/StoreAdminAccess.gs")
    runtime = read("apps-script/takara-pedidos-web/StoreRuntime.gs")
    registry = read("apps-script/takara-pedidos-web/StoreRegistry.gs")
    sheets = read("apps-script/takara-pedidos-web/StoreSheetsRepository.gs")
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    test = read("tools/takara_test_store_admin_system_f4f.js")

    require(
        'TAKARA_STORE_ADMIN_DEPLOYMENT_BOUNDARY_VERSION ='
        in bridge
        and '"TAKARA_STORE_ADMIN_DEPLOYMENT_V1"' in bridge,
        "Deployment boundary version exacta",
    )

    deployment = extract_function(
        bridge,
        "getStoreAdminUiDeploymentOutput_",
    )

    require(
        deployment.index("requireStoreAdminAccess_();")
        < deployment.index('createHtmlOutputFromFile("StoreAdminUi")'),
        "Deployment autoriza antes de HtmlService",
    )
    require(
        'createHtmlOutputFromFile("StoreAdminUi")' in deployment,
        "Deployment sirve StoreAdminUi canónica",
    )
    require(
        '.setTitle("Takara · Store Admin")' in deployment,
        "Deployment fija título Admin",
    )

    for forbidden in (
        "SpreadsheetApp",
        "PropertiesService",
        "createStoreSheetsRepository_",
        "function doGet(",
        "function doPost(",
    ):
        require(
            forbidden not in bridge,
            f"Bridge deployment excluye {forbidden}",
        )

    for marker in (
        "getStoreAdminUiBootstrap",
        "getStoreAdminUiStore",
        "createStoreAdminUiStore",
        "updateStoreAdminUiStore",
        "activateStoreAdminUiStore",
        "deactivateStoreAdminUiStore",
    ):
        require(marker in bridge, f"SystemScenario conserva {marker}")

    require(
        "function requireStoreAdminAccess_" in access,
        "F4A sigue siendo autoridad de acceso",
    )
    require(
        "function createStoreAdmin_" in write
        and "function updateStoreAdmin_" in write
        and "function activateStoreAdmin_" in write
        and "function deactivateStoreAdmin_" in write,
        "AdminWrite conserva CRUD parcial + lifecycle",
    )
    require(
        "function createStoreRuntime_" in runtime
        and "function updateStoreRuntime_" in runtime
        and "function activateStoreRuntime_" in runtime
        and "function deactivateStoreRuntime_" in runtime,
        "Runtime canónico conserva operaciones",
    )
    require(
        "function setStoreStatusService_" in registry,
        "Store Service conserva lifecycle authority",
    )
    require(
        "function createStoreSheetsRepository_" in sheets,
        "Sheets adapter canónico permanece único",
    )

    for forbidden in (
        'name = "status"',
        'name="status"',
        "Eliminar tienda",
        "SpreadsheetApp",
        "TAKARA_STORE_ADMIN_OWNER_EMAIL",
    ):
        require(forbidden not in ui, f"UI excluye {forbidden}")

    require("innerHTML" not in ui, "UI sigue sin innerHTML")

    for marker in (
        "## F4F Admin deployment boundary + SystemScenario",
        "TAKARA_STORE_ADMIN_DEPLOYMENT_V1",
        "getStoreAdminUiDeploymentOutput_",
        "requireStoreAdminAccess_",
        "StoreAdminUi",
        "`doGet`",
        "`doPost`",
        "F5",
        "SystemScenario",
    ):
        require(marker in contract, f"Contrato F4F conserva {marker}")

    for marker in (
        "takara_validar_store_admin_system_f4f.py",
        "takara_test_store_admin_system_f4f.js",
        "takara_validar_store_admin_lifecycle.py",
        "takara_test_store_admin_lifecycle.js",
    ):
        require(marker in quality, f"QG conserva {marker}")

    for marker in (
        "deployment boundary denies non-owner",
        "denied deployment reaches zero HtmlService calls",
        "SystemScenario creates Store",
        "SystemScenario edits Store",
        "SystemScenario rejects browser status patch",
        "SystemScenario deactivates Store",
        "SystemScenario reactivates Store",
        "denied create writes zero",
        "denied update writes zero",
        "denied activate writes zero",
        "denied deactivate writes zero",
    ):
        require(marker in test, f"SystemScenario cubre {marker}")

    print(
        "[TAKARA_STORE_ADMIN_SYSTEM_F4F_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())