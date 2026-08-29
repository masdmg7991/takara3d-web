from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

DOMAIN = ROOT / "apps-script" / "takara-pedidos-web" / "StoreDomain.gs"
REGISTRY = ROOT / "apps-script" / "takara-pedidos-web" / "StoreRegistry.gs"
SHEETS = ROOT / "apps-script" / "takara-pedidos-web" / "StoreSheetsRepository.gs"
README = ROOT / "apps-script" / "takara-pedidos-web" / "README.md"
QUALITY = ROOT / "tools" / "takara_quality_gate.ps1"
TEST = ROOT / "tools" / "takara_test_store_registry.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    domain = read(DOMAIN)
    registry = read(REGISTRY)
    sheets = read(SHEETS)
    readme = read(README)
    quality = read(QUALITY)
    test = read(TEST)

    for marker in (
        "TAKARA_STORE_SYSTEM_CONTRACT_V1",
        "TAKARA_STORE_REGISTRY_V1",
        "TAKARA_STORE_CONTEXT_V1",
        "ACTIVE",
        "INACTIVE",
        "STO_",
        "store_public_code",
        "toStoreContext_",
    ):
        require(marker in domain, f"Domain conserva {marker}")

    for forbidden in ("SpreadsheetApp", "LockService", "PropertiesService", "MailApp", "DriveApp"):
        require(forbidden not in domain, f"Domain no depende de {forbidden}")
        require(forbidden not in registry, f"Application no depende de {forbidden}")

    for marker in (
        "withWriteLock",
        "nextStoreSequence",
        "findById",
        "findByPublicCode",
        "insert",
        "update",
        "resolveStoreContextService_",
        "setStoreStatusService_",
    ):
        require(marker in registry, f"Application conserva {marker}")

    for marker in (
        "TAKARA_STORE_REGISTRY_SPREADSHEET_ID",
        "SpreadsheetApp.openById",
        "PropertiesService.getScriptProperties",
        "LockService.getScriptLock",
        "tryLock",
        "releaseLock",
        "TAKARA_STORE_REGISTRY_HEADERS",
        "store_public_code",
    ):
        require(marker in sheets, f"Sheets adapter conserva {marker}")

    require("deleteRow" not in sheets, "Sheets adapter no implementa delete físico")
    require("deleteStore" not in registry, "Application no implementa delete")
    require(
        not re.search(r'openById\(\s*["\'][^"\']+["\']\s*\)', sheets),
        "Spreadsheet ID no está hardcodeado",
    )

    require("StoreDomain.gs" in readme, "README documenta StoreDomain")
    require("StoreRegistry.gs" in readme, "README documenta StoreRegistry")
    require("StoreSheetsRepository.gs" in readme, "README documenta StoreSheetsRepository")
    require("takara_validar_store_registry.py" in quality, "Quality Gate ejecuta validator Store")
    require("takara_test_store_registry.js" in quality, "Quality Gate ejecuta test Store")
    require("TAKARA_STORE_REGISTRY_CORE_TEST_OK" in test, "Test Store conserva marcador final")

    print("[TAKARA_STORE_REGISTRY_STATIC_OK] 38 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())