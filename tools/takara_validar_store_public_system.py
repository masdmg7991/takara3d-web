from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST = ROOT / "tools" / "takara_test_store_public_system.js"
STORE_JS = ROOT / "assets" / "js" / "takara-store-public.js"
CONFIG_JS = ROOT / "assets" / "js" / "takara-config.js"
HTML = ROOT / "tienda" / "index.html"

BACKEND = ROOT / "apps-script" / "takara-pedidos-web"
BACKEND_MODULES = (
    "StoreDomain.gs",
    "StoreRegistry.gs",
    "StoreSheetsRepository.gs",
    "StoreRegistrySetup.gs",
    "StoreRuntime.gs",
    "StorePublicApi.gs",
    "StoreHttpBridge.gs",
)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    test = read(TEST)
    store_js = read(STORE_JS)
    config_js = read(CONFIG_JS)
    html = read(HTML)

    for module in BACKEND_MODULES:
        require((BACKEND / module).is_file(), f"Existe backend {module}")

    for marker in (
        "TAKARA_STORE_PUBLIC_SYSTEM_F2D_OK",
        "provisionStoreRegistry_",
        "createStoreRuntime_",
        "buildStorePublicUrl",
        "DOMContentLoaded",
        "action=store.resolve",
        "deactivateStoreRuntime_",
        "activateStoreRuntime_",
        "same physical QR reflects authoritative rename",
        "invalid identity makes no network request",
        "missing Store ref makes no network request",
    ):
        require(marker in test, f"System test conserva {marker}")

    require(
        "TAKARA_STORE_QR_URL_V1" in store_js,
        "F2D atraviesa QR contract F2C",
    )
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in store_js,
        "F2D atraviesa shared endpoint F2B",
    )
    require(
        "TAKARA_APPS_SCRIPT_ENDPOINT_V1" in config_js,
        "Config conserva endpoint contract",
    )
    require(
        "data-store-name" in html,
        "Store page tiene destino nombre",
    )
    require(
        "data-takara-pedido-form" not in html,
        "F2 no duplica motor de pedido",
    )

    for forbidden in (
        "fetch(",
        "localStorage",
        "sessionStorage",
    ):
        require(
            forbidden not in store_js,
            f"Store client no introduce {forbidden}",
        )

    require(
        "store_id" not in html,
        "HTML no expone store_id",
    )

    print("[TAKARA_STORE_PUBLIC_SYSTEM_F2D_STATIC_OK] 29 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())