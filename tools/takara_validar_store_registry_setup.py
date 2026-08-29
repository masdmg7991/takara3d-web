from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SETUP = ROOT / "apps-script" / "takara-pedidos-web" / "StoreRegistrySetup.gs"
SHEETS = ROOT / "apps-script" / "takara-pedidos-web" / "StoreSheetsRepository.gs"
TEST = ROOT / "tools" / "takara_test_store_registry_setup.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    setup = read(SETUP)
    sheets = read(SHEETS)
    test = read(TEST)

    for marker in (
        "TAKARA_STORE_REGISTRY_SPREADSHEET_NAME",
        "withStoreRegistrySetupLock_",
        "configureStoreRegistrySheet_",
        "provisionStoreRegistry_",
        "getStoreRegistryHealth_",
        "SpreadsheetApp.create",
        "PropertiesService.getScriptProperties",
        "LockService.getScriptLock",
        "setProperty",
        "assertStoreRegistrySchema_",
    ):
        require(marker in setup, f"Setup conserva {marker}")

    for forbidden in (
        "doGet",
        "doPost",
        "MailApp",
        "DriveApp",
        "deleteRow",
        "deleteStore",
    ):
        require(forbidden not in setup, f"Setup no implementa {forbidden}")

    require(
        "TAKARA_STORE_REGISTRY_SPREADSHEET_ID" in sheets,
        "Sheets adapter conserva propiedad canonica",
    )
    require(
        not re.search(r'openById\(\s*["\'][^"\']+["\']\s*\)', setup),
        "Setup no hardcodea spreadsheet id",
    )
    require(
        'spreadsheet_id' not in setup,
        "Health/setup no exponen spreadsheet_id",
    )
    require(
        "TAKARA_STORE_REGISTRY_SETUP_TEST_OK" in test,
        "Test setup conserva marcador final",
    )
    require("existing invalid schema fail closed" in test, "Test cubre schema existente")
    require("busy setup creates nothing" in test, "Test cubre lock ocupado")
    require("health hides spreadsheet id" in test, "Test cubre health privado")

    print("[TAKARA_STORE_REGISTRY_SETUP_STATIC_OK] 25 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())