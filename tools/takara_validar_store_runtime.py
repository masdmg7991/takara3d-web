from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "apps-script" / "takara-pedidos-web" / "StoreRuntime.gs"
SHEETS = ROOT / "apps-script" / "takara-pedidos-web" / "StoreSheetsRepository.gs"
TEST = ROOT / "tools" / "takara_test_store_runtime_integration.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    runtime = read(RUNTIME)
    sheets = read(SHEETS)
    test = read(TEST)

    for marker in (
        "getStoreRuntimeRepository_",
        "getStoreRuntimeDependencies_",
        "createStoreRuntime_",
        "resolveStoreContextRuntime_",
        "updateStoreRuntime_",
        "activateStoreRuntime_",
        "deactivateStoreRuntime_",
    ):
        require(marker in runtime, f"Runtime conserva {marker}")

    for forbidden in (
        "SpreadsheetApp",
        "PropertiesService",
        "LockService",
        "MailApp",
        "DriveApp",
        "doGet",
        "doPost",
    ):
        require(forbidden not in runtime, f"Runtime no crea dependencia/autoridad {forbidden}")

    for marker in (
        "TAKARA_STORE_REGISTRY_SPREADSHEET_ID",
        "SpreadsheetApp.openById",
        "PropertiesService.getScriptProperties",
        "LockService.getScriptLock",
        "tryLock",
        "releaseLock",
    ):
        require(marker in sheets, f"Sheets adapter conserva {marker}")

    require(
        not re.search(r'openById\(\s*["\'][^"\']+["\']\s*\)', sheets),
        "Spreadsheet ID no hardcodeado",
    )
    require("deleteRow" not in sheets, "Sheets adapter no implementa DELETE fisico")
    require("deleteStoreRuntime_" not in runtime, "Runtime no implementa DELETE")
    require(
        "TAKARA_STORE_RUNTIME_INTEGRATION_TEST_OK" in test,
        "Test runtime conserva marcador final",
    )
    require("TAKARA_STORE_REGISTRY_SPREADSHEET_ID" in test, "Test cubre ScriptProperties")
    require("STORE_REGISTRY_BUSY" in test, "Test cubre lock busy")
    require("STORE_REGISTRY_SCHEMA_INVALID" in test, "Test cubre schema fail-closed")
    require("STORE_REGISTRY_NOT_CONFIGURED" in test, "Test cubre config fail-closed")
    require("store_id" in test and "does not expose store_id" in test, "Test cubre frontera browser")

    print("[TAKARA_STORE_RUNTIME_STATIC_OK] 31 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())