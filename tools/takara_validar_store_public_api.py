from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps-script" / "takara-pedidos-web" / "StorePublicApi.gs"
TEST = ROOT / "tools" / "takara_test_store_public_api.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    api = read(API)
    test = read(TEST)

    for marker in (
        "TAKARA_STORE_PUBLIC_API_V1",
        "store.resolve",
        "isStorePublicResolveRequest_",
        "getStorePublicRef_",
        "storePublicErrorCode_",
        "resolveStorePublicApi_",
        "resolveStoreContextRuntime_",
        "STORE_PUBLIC_REF_REQUIRED",
        "STORE_PUBLIC_ACTION_INVALID",
        "STORE_RESOLUTION_FAILED",
    ):
        require(marker in api, f"Public API conserva {marker}")

    for forbidden in (
        "SpreadsheetApp",
        "PropertiesService",
        "LockService",
        "MailApp",
        "DriveApp",
        "doGet",
        "doPost",
        "createStoreRuntime_",
        "updateStoreRuntime_",
        "activateStoreRuntime_",
        "deactivateStoreRuntime_",
        "deleteStore",
        "store_id",
    ):
        require(forbidden not in api, f"Public API no posee/incluye {forbidden}")

    require(
        "TAKARA_STORE_PUBLIC_API_TEST_OK" in test,
        "Test public API conserva marcador final",
    )
    require("client cannot inject store_id" in test, "Test cubre store_id manipulado")
    require("unexpected backend detail not leaked" in test, "Test cubre no leakage")
    require("STORE_INACTIVE" in test, "Test cubre INACTIVE fail-closed")
    require("STORE_NOT_FOUND" in test, "Test cubre Store inexistente")

    print("[TAKARA_STORE_PUBLIC_API_STATIC_OK] 29 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())