from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps-script" / "takara-pedidos-web"
TEST = ROOT / "tools" / "takara_test_store_backend_f1.js"
CONTRACT = ROOT / "docs" / "STORE_SYSTEM_CONTRACT.md"
CODE = APP / "Code.gs"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    modules = {
        name: read(APP / name)
        for name in (
            "StoreDomain.gs",
            "StoreRegistry.gs",
            "StoreSheetsRepository.gs",
            "StoreRegistrySetup.gs",
            "StoreRuntime.gs",
            "StorePublicApi.gs",
            "StoreHttpBridge.gs",
        )
    }
    test = read(TEST)
    contract = read(CONTRACT)
    code = read(CODE)

    expected_markers = {
        "StoreDomain.gs": (
            "TAKARA_STORE_SYSTEM_CONTRACT_V1",
            "TAKARA_STORE_REGISTRY_V1",
            "TAKARA_STORE_CONTEXT_V1",
            "ACTIVE",
            "INACTIVE",
        ),
        "StoreRegistry.gs": (
            "createStoreService_",
            "resolveStoreContextService_",
            "updateStoreService_",
            "setStoreStatusService_",
        ),
        "StoreSheetsRepository.gs": (
            "TAKARA_STORE_REGISTRY_SPREADSHEET_ID",
            "SpreadsheetApp.openById",
            "LockService.getScriptLock",
        ),
        "StoreRegistrySetup.gs": (
            "provisionStoreRegistry_",
            "getStoreRegistryHealth_",
            "SpreadsheetApp.create",
        ),
        "StoreRuntime.gs": (
            "createStoreRuntime_",
            "resolveStoreContextRuntime_",
            "activateStoreRuntime_",
            "deactivateStoreRuntime_",
        ),
        "StorePublicApi.gs": (
            "TAKARA_STORE_PUBLIC_API_V1",
            "store.resolve",
            "resolveStorePublicApi_",
        ),
        "StoreHttpBridge.gs": (
            "TAKARA_STORE_HTTP_BRIDGE_V1",
            "routeStorePublicGet_",
            "takaraStoreCb_",
        ),
    }

    for filename, markers in expected_markers.items():
        source = modules[filename]
        for marker in markers:
            require(marker in source, f"{filename} conserva {marker}")

    require(
        "const storeResponse = routeStorePublicGet_(e);" in code,
        "Code.gs conecta Store GET al bridge",
    )
    require(
        "function doPost(e)" in code,
        "Code.gs conserva doPost",
    )

    for marker in (
        "TAKARA_STORE_SYSTEM_CONTRACT_V1",
        "PRODUCT_QR != STORE_QR",
        "TAKARA_STORE_REGISTRY_V1",
        "TAKARA_STORE_CONTEXT_V1",
        "TAKARA_STORE_ATTRIBUTION_V1",
        "/tienda/?s=<store_public_code>",
    ):
        require(marker in contract, f"Contrato Store conserva {marker}")

    require(
        "TAKARA_STORE_BACKEND_F1_HORIZONTAL_OK" in test,
        "Horizontal test conserva marcador final",
    )
    for phrase in (
        "rename preserves physical Store QR code",
        "INACTIVE Store fails closed with safe code",
        "normal health GET falls through untouched",
        "public write action cannot fall through to health",
        "invalid callback produces non-executable JSON",
        "second provision creates no second authority",
        "store_id never crosses public boundary",
        "busy setup creates no spreadsheet",
    ):
        require(phrase in test, f"Horizontal test cubre {phrase}")

    require("deleteRow" not in modules["StoreSheetsRepository.gs"], "Registry no borra filas")
    require("deleteStore" not in modules["StoreRegistry.gs"], "Application no expone delete")
    require("store_id" not in modules["StorePublicApi.gs"], "Public API no conoce store_id")
    require("MailApp" not in modules["StoreHttpBridge.gs"], "HTTP Store no envía correo")
    require("DriveApp" not in modules["StoreHttpBridge.gs"], "HTTP Store no usa Drive")

    print("[TAKARA_STORE_BACKEND_F1_STATIC_OK] 58 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())