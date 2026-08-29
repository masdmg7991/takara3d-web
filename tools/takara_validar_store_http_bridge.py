from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BRIDGE = ROOT / "apps-script" / "takara-pedidos-web" / "StoreHttpBridge.gs"
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
TEST = ROOT / "tools" / "takara_test_store_http_bridge.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    bridge = read(BRIDGE)
    code = read(CODE)
    test = read(TEST)

    for marker in (
        "TAKARA_STORE_HTTP_BRIDGE_V1",
        "isStoreHttpRequest_",
        "getStoreJsonpCallback_",
        "buildStoreJsonpOutput_",
        "buildStoreJsonOutput_",
        "routeStorePublicGet_",
        "ContentService.MimeType.JAVASCRIPT",
        "ContentService.MimeType.JSON",
        "STORE_PUBLIC_CALLBACK_INVALID",
        "takaraStoreCb_",
    ):
        require(marker in bridge, f"HTTP bridge conserva {marker}")

    require(
        "function doGet(e)" in code,
        "Code.gs doGet recibe evento",
    )
    require(
        "const storeResponse = routeStorePublicGet_(e);" in code,
        "Code.gs delega Store GET al bridge",
    )
    require(
        "if (storeResponse !== null)" in code
        and "return json_({" in code,
        "Code.gs conserva fallback health",
    )

    for marker in (
        'service: "Takara Pedidos Web"',
        "version: CFG.VERSION_PLANTILLA",
        "script: CFG.VERSION_SCRIPT",
        'status: "online"',
    ):
        require(marker in code, f"Health conserva {marker}")

    require(
        'VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2"'
        in code,
        "Order backend version remains frozen until release closure",
    )

    for forbidden in (
        "SpreadsheetApp",
        "PropertiesService",
        "LockService",
        "MailApp",
        "DriveApp",
        "createStoreRuntime_",
        "updateStoreRuntime_",
        "activateStoreRuntime_",
        "deactivateStoreRuntime_",
        "deleteStore",
    ):
        require(forbidden not in bridge, f"HTTP bridge no posee {forbidden}")

    require(
        "TAKARA_STORE_HTTP_BRIDGE_TEST_OK" in test,
        "HTTP bridge test conserva marcador final",
    )
    require(
        "unsupported Store action fails closed instead of health fallback" in test,
        "Test cubre acción Store no soportada",
    )
    require(
        "invalid callback never reflected as executable code" in test,
        "Test cubre callback injection",
    )
    require(
        "health GET is not intercepted" in test,
        "Test cubre compatibilidad health",
    )

    print("[TAKARA_STORE_HTTP_BRIDGE_STATIC_OK] 31 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())