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

def phase_roadmap(contract: str) -> list[str]:
    lines = contract.splitlines()
    headers = [
        index
        for index, line in enumerate(lines)
        if line.strip() == "## Phase roadmap"
    ]
    require(len(headers) == 1, "Phase roadmap único")
    start = headers[0] + 1
    end = len(lines)
    for index in range(start, len(lines)):
        if lines[index].strip().startswith("## "):
            end = index
            break
    return [line.strip() for line in lines[start:end] if line.strip()]

def main() -> int:
    access = read("apps-script/takara-pedidos-web/StoreAdminAccess.gs")
    admin_read = read("apps-script/takara-pedidos-web/StoreAdminRead.gs")
    write = read("apps-script/takara-pedidos-web/StoreAdminWrite.gs")
    bridge = read("apps-script/takara-pedidos-web/StoreAdminUiBridge.gs")
    ui = read("apps-script/takara-pedidos-web/StoreAdminUi.html")
    runtime = read("apps-script/takara-pedidos-web/StoreRuntime.gs")
    registry = read("apps-script/takara-pedidos-web/StoreRegistry.gs")
    sheets = read("apps-script/takara-pedidos-web/StoreSheetsRepository.gs")
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    phase_test = read("tools/takara_test_store_admin_phase_f4.js")

    expected_roadmap = [
        "- F4A — owner-only Admin access authority",
        "- F4B — authorized Store list/read",
        "- F4C — tangible Admin UI foundation",
        "- F4D — authorized Store create + inspect/edit",
        "- F4E — authorized ACTIVE/INACTIVE lifecycle",
        "- F4F — Admin deployment boundary + SystemScenario",
        "- F4G — cumulative F4 phase closure",
    ]

    roadmap = phase_roadmap(contract)

    require(
        "## F4A access authority" in contract,
        "F4A historical certified section remains accepted",
    )
    require(
        "## F4C tangible read-only Admin UI" in contract,
        "F4C historical certified section remains accepted",
    )

    for expected in expected_roadmap:
        require(
            roadmap.count(expected) == 1,
            f"Roadmap conserva exactamente {expected}",
        )

    section_headers = [
        line.strip()
        for line in contract.splitlines()
        if line.strip().startswith("## F4")
    ]

    for ticket in (
        "F4A",
        "F4B",
        "F4C",
        "F4D",
        "F4E",
        "F4F",
        "F4G",
    ):
        prefix = f"## {ticket} "
        matches = [
            header
            for header in section_headers
            if header.startswith(prefix)
        ]
        require(
            len(matches) == 1,
            f"Contrato contiene una sección única para {ticket}",
        )

    require(
        "function requireStoreAdminAccess_" in access,
        "F4A owner access authority presente",
    )
    require(
        "function listStoresAdmin_" in admin_read
        and "function getStoreAdmin_" in admin_read,
        "F4B read authority presente",
    )
    require(
        "function createStoreAdmin_" in write
        and "function updateStoreAdmin_" in write,
        "F4D create/edit authority presente",
    )
    require(
        "function activateStoreAdmin_" in write
        and "function deactivateStoreAdmin_" in write,
        "F4E lifecycle authority presente",
    )

    for marker in (
        "getStoreAdminUiBootstrap",
        "getStoreAdminUiStore",
        "createStoreAdminUiStore",
        "updateStoreAdminUiStore",
        "activateStoreAdminUiStore",
        "deactivateStoreAdminUiStore",
        "getStoreAdminUiDeploymentOutput_",
    ):
        require(marker in bridge, f"Bridge conserva {marker}")

    require(
        '"TAKARA_STORE_ADMIN_DEPLOYMENT_V1"' in bridge,
        "F4F deployment version exacta",
    )
    require(
        "function doGet(" not in bridge
        and "function doPost(" not in bridge,
        "F4 no introduce route handler Admin",
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

    require(
        "function createStoreRuntime_" in runtime
        and "function updateStoreRuntime_" in runtime
        and "function activateStoreRuntime_" in runtime
        and "function deactivateStoreRuntime_" in runtime,
        "Runtime canónico conserva Store mutations",
    )
    require(
        "function setStoreStatusService_" in registry,
        "Store Service conserva lifecycle authority",
    )
    require(
        "function createStoreSheetsRepository_" in sheets,
        "Sheets repository canónico permanece",
    )

    for marker in (
        "takara_validar_store_admin_access.py",
        "takara_validar_store_admin_read.py",
        "takara_validar_store_admin_ui.py",
        "takara_validar_store_admin_write.py",
        "takara_validar_store_admin_lifecycle.py",
        "takara_validar_store_admin_system_f4f.py",
        "takara_validar_store_admin_phase_f4.py",
        "takara_test_store_admin_access.js",
        "takara_test_store_admin_read.js",
        "takara_test_store_admin_ui.js",
        "takara_test_store_admin_write.js",
        "takara_test_store_admin_lifecycle.js",
        "takara_test_store_admin_system_f4f.js",
        "takara_test_store_admin_phase_f4.js",
    ):
        require(marker in quality, f"QG conserva {marker}")

    for marker in (
        "TAKARA_STORE_ADMIN_ACCESS_F4A_OK",
        "TAKARA_STORE_ADMIN_READ_F4B_OK",
        "TAKARA_STORE_ADMIN_UI_F4C_OK",
        "TAKARA_STORE_ADMIN_WRITE_F4D_OK",
        "TAKARA_STORE_ADMIN_LIFECYCLE_F4E_OK",
        "TAKARA_STORE_ADMIN_SYSTEM_F4F_OK",
    ):
        require(marker in phase_test, f"F4G agrega marker {marker}")

    require(
        "routeIntegration: false" in phase_test,
        "F4G congela route integration fuera de F4",
    )

    for marker in (
        "F4A",
        "F4B",
        "F4C",
        "F4D",
        "F4E",
        "F4F",
        "F4G",
        "phase closed",
        "F5",
        "no push",
        "no deployment",
    ):
        require(marker in contract, f"Closure contract conserva {marker}")

    print(
        "[TAKARA_STORE_ADMIN_PHASE_F4_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())