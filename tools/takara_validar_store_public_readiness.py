from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "tienda" / "index.html"
CSS = ROOT / "assets" / "css" / "takara-store-public.css"
JS = ROOT / "assets" / "js" / "takara-store-public.js"
TEST = ROOT / "tools" / "takara_test_store_public_readiness.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    html = read(HTML)
    css = read(CSS)
    js = read(JS)
    test = read(TEST)

    for marker in (
        'name="robots" content="noindex,nofollow,noarchive"',
        'name="googlebot" content="noindex,nofollow,noarchive"',
        'name="referrer" content="no-referrer"',
        'aria-busy="true"',
        'role="status"',
        'aria-live="polite"',
        'aria-atomic="true"',
        'aria-labelledby="takara-store-active-title"',
        'aria-labelledby="takara-store-error-title"',
        "<noscript>",
        "data-store-order-frame",
    ):
        require(marker in html, f"Store Public readiness conserva {marker}")

    for forbidden in (
        "data-cf-beacon",
        "cloudflareinsights",
        "googletagmanager",
        "gtag(",
        'href="../index.html"',
        'href="/index.html"',
        'href="../productos.html"',
        'href="/productos.html"',
        'href="../pedido.html"',
        'href="/pedido.html"',
        "/qr",
        "store_id",
    ):
        require(forbidden not in html, f"Store Public cerrado no contiene {forbidden}")

    require(
        'root.setAttribute("aria-busy",' in js,
        "JS sincroniza aria-busy con estado",
    )
    require(
        "document.title = context.display_name;" in js,
        "Título ACTIVE usa solo el nombre autoritativo de la tienda",
    )
    require(
        'document.title = "Tienda no disponible";' in js,
        "Título error es neutro",
    )
    require(
        'ORDER_FRAME_URL = "/pedido.html?channel=store"' in js,
        "Store reutiliza el documento canónico de pedido",
    )
    require(
        'form.setAttribute("data-takara-order-channel", "STORE")' in js,
        "Store marca explícitamente el canal antes de habilitar el pedido",
    )
    require("innerHTML" not in js, "No render inseguro innerHTML")
    require("localStorage" not in js, "F2 no persiste atribución")
    require("sessionStorage" not in js, "F2 no persiste atribución")
    require("fetch(" not in js, "JSONP sigue siendo transporte")
    require("TAKARA_STORE_QR_URL_V1" in js, "F2C QR contract conservado")
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in js,
        "F2B shared endpoint conservado",
    )

    require("@media (prefers-reduced-motion: reduce)" in css, "Reduced motion")
    require(".takara-store-shell noscript" in css, "Noscript presentation")
    require("@media (max-width: 640px)" in css, "Responsive conservado")

    require(
        "TAKARA_STORE_PUBLIC_READINESS_F2E_OK" in test,
        "Functional test marker",
    )
    require("internal id no network" in test, "Test internal identity fail-closed")
    require("noscript fail-closed" in test, "Test no-JS fail-closed")
    require("no direct-order escape" in test, "Test closed navigation")

    print("[TAKARA_STORE_PUBLIC_READINESS_F2E_STATIC_OK] 41 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())