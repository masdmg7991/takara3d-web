from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

HTML = ROOT / "tienda" / "index.html"
STORE_JS = ROOT / "assets" / "js" / "takara-store-public.js"
CONFIG_JS = ROOT / "assets" / "js" / "takara-config.js"
PRODUCT_QR = ROOT / "qr" / "index.html"

CLOSURE = ROOT / "docs" / "STORE_PUBLIC_F2_CLOSURE.md"
SYSTEM = ROOT / "docs" / "STORE_PUBLIC_SYSTEM_SCENARIO.md"
READINESS = ROOT / "docs" / "STORE_PUBLIC_READINESS.md"

TESTS = {
    "F2A functional": ROOT / "tools" / "takara_test_store_public_client.js",
    "F2A static": ROOT / "tools" / "takara_validar_store_public_f2a.py",
    "F2B functional": ROOT / "tools" / "takara_test_shared_endpoint.js",
    "F2B static": ROOT / "tools" / "takara_validar_shared_endpoint.py",
    "F2C functional": ROOT / "tools" / "takara_test_store_qr_contract.js",
    "F2C static": ROOT / "tools" / "takara_validar_store_qr_contract.py",
    "F2D functional": ROOT / "tools" / "takara_test_store_public_system.js",
    "F2D static": ROOT / "tools" / "takara_validar_store_public_system.py",
    "F2E functional": ROOT / "tools" / "takara_test_store_public_readiness.js",
    "F2E static": ROOT / "tools" / "takara_validar_store_public_readiness.py",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    html = read(HTML)
    store_js = read(STORE_JS)
    config_js = read(CONFIG_JS)
    product_qr = read(PRODUCT_QR)
    closure = read(CLOSURE)
    system = read(SYSTEM)
    readiness = read(READINESS)

    for label, path in TESTS.items():
        require(path.is_file(), f"Existe gate {label}")

    # F2A
    require(
        'name="robots" content="noindex,nofollow,noarchive"' in html,
        "F2A noindex",
    )
    require("data-takara-store-app" in html, "F2A Store root")
    require("data-store-active" in html, "F2A ACTIVE state")
    require("data-store-error" in html, "F2A error state")
    require("data-takara-pedido-form" not in html, "F2A no duplica pedido")

    # F2B
    require(
        "TAKARA_APPS_SCRIPT_ENDPOINT_V1" in config_js,
        "F2B endpoint contract",
    )
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in config_js,
        "F2B getter authority",
    )
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in store_js,
        "F2B Store consumes authority",
    )

    # F2C
    require("TAKARA_STORE_QR_URL_V1" in store_js, "F2C QR contract")
    require(
        'STORE_PUBLIC_CANONICAL_ORIGIN = "https://takara3d.es"' in store_js,
        "F2C canonical origin",
    )
    require(
        'STORE_PUBLIC_CANONICAL_PATH = "/tienda/"' in store_js,
        "F2C canonical path",
    )
    require("buildStorePublicUrl" in store_js, "F2C URL builder")
    require("parseStorePublicUrl" in store_js, "F2C URL parser")

    # F2D
    for marker in (
        "Store QR URL V1",
        "config endpoint V1",
        "JSONP",
        "Store HTTP Bridge",
        "Public API",
        "Runtime",
        "Registry",
        "StoreContext V1",
    ):
        require(marker in system, f"F2D SystemScenario conserva {marker}")

    # F2E
    for marker in (
        'name="referrer" content="no-referrer"',
        'aria-busy="true"',
        'role="status"',
        "<noscript>",
        "data-store-order-frame",
    ):
        require(marker in html, f"F2E readiness conserva {marker}")

    for forbidden in (
        "data-cf-beacon",
        "cloudflareinsights",
        "googletagmanager",
        "gtag(",
        'href="../index.html"',
        'href="../productos.html"',
        'href="../pedido.html"',
    ):
        require(forbidden not in html, f"F2E closed flow no contiene {forbidden}")

    require(
        "la atribución persistente de pedido sigue fuera de F2" in readiness,
        "F2E congela frontera F3",
    )

    # Hard boundaries.
    for forbidden in (
        "store_id",
        "store_public_code",
        "TAKARA_STORE_CONTEXT_V1",
        "TAKARA_STORE_QR_URL_V1",
    ):
        require(
            forbidden not in product_qr,
            f"Product QR no conoce {forbidden}",
        )

    # Permanent F2 ownership boundary. Future phases may evolve the order
    # engine, but Store Public itself must never become attribution authority.
    for forbidden in (
        "TAKARA_STORE_ATTRIBUTION_V1",
        "source_type:",
        "snapshot_pedido",
        "pedido_web_id",
    ):
        require(
            forbidden not in html,
            f"F2 Store HTML no posee {forbidden}",
        )
        require(
            forbidden not in store_js,
            f"F2 Store client no posee {forbidden}",
        )

    # Closure contract.
    for marker in (
        "# Store Public F2 Closure",
        "F2A:",
        "F2B:",
        "F2C:",
        "F2D:",
        "F2E:",
        "F2 no introduce todavía atribución persistente en el pedido.",
        "la atribución Store del pedido pertenece exclusivamente a F3.",
        "F2F no añade una nueva autoridad de producto.",
        "## Post-F2 ownership",
        "Desde F3, `takara-pedido-web.js` puede transportar `TAKARA_STORE_CONTEXT_V1`",
        "La autoridad de atribución pertenece al backend de pedido de F3.",
    ):
        require(marker in closure, f"F2 closure conserva {marker}")

    # Evidence/test markers: real horizontal + readiness must remain.
    system_test = read(TESTS["F2D functional"])
    readiness_test = read(TESTS["F2E functional"])
    qr_test = read(TESTS["F2C functional"])

    require(
        "TAKARA_STORE_PUBLIC_SYSTEM_F2D_OK" in system_test,
        "F2D horizontal marker",
    )
    require(
        "same physical QR reflects authoritative rename" in system_test,
        "F2D rename horizontal",
    )
    require(
        "invalid identity makes no network request" in system_test,
        "F2D invalid fail-closed",
    )
    require(
        "TAKARA_STORE_PUBLIC_READINESS_F2E_OK" in readiness_test,
        "F2E readiness marker",
    )
    require(
        "noscript fail-closed" in readiness_test,
        "F2E no-JS gate",
    )
    require(
        "TAKARA_STORE_QR_CONTRACT_TEST_OK" in qr_test,
        "F2C QR marker",
    )

    print("[TAKARA_STORE_PUBLIC_F2_CLOSURE_STATIC_OK] 59 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())