from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "tienda" / "index.html"
CSS = ROOT / "assets" / "css" / "takara-store-public.css"
JS = ROOT / "assets" / "js" / "takara-store-public.js"
TEST = ROOT / "tools" / "takara_test_store_public_client.js"


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

    require(
        'name="robots" content="noindex,nofollow,noarchive"' in html,
        "Store Public es noindex/nofollow/noarchive",
    )
    require(
        'name="googlebot" content="noindex,nofollow,noarchive"' in html,
        "Googlebot no indexa Store Public",
    )
    require('data-takara-store-app' in html, "Existe Store app root")
    require('data-store-endpoint=""' in html, "F2A no duplica endpoint")
    require('data-store-name' in html, "Existe nombre de Store autoritativo")
    require('data-store-active' in html, "Existe estado ACTIVE")
    require('data-store-error' in html, "Existe estado fail-closed")
    require(
        "assets/js/takara-store-public.js" in html,
        "Store Public carga cliente dedicado",
    )
    require(
        "assets/js/takara-config.js" in html,
        "Store Public reutiliza config comercial existente",
    )
    require(
        "data-store-order-frame" in html,
        "Store Public monta la superficie canónica de pedido sin duplicarla",
    )

    for forbidden in (
        'href="../index.html"',
        'href="/index.html"',
        'href="../productos.html"',
        'href="/productos.html"',
        'href="../pedido.html"',
        'href="/pedido.html"',
        "script.google.com/macros/s/",
        "data-takara-pedido-form",
    ):
        require(forbidden not in html, f"Store Public cerrado: no contiene {forbidden}")

    require("TAKARA_STORE_PUBLIC_CLIENT_V1" in js, "Cliente versionado")
    require("TAKARA_STORE_PUBLIC_API_V1" in js, "Cliente exige API V1")
    require("TAKARA_STORE_CONTEXT_V1" in js, "Cliente exige StoreContext V1")
    require("STORE_REF_PATTERN" in js, "Cliente valida store_ref")
    require("STORE_ENDPOINT_NOT_CONFIGURED" in js, "Endpoint ausente fail-closed")
    require("STORE_ENDPOINT_INVALID" in js, "Endpoint inválido fail-closed")
    require("STORE_CONTEXT_INTERNAL_ID_EXPOSED" in js, "store_id leak bloqueado")
    require("resolveStoreContextJsonp" in js, "Cliente usa resolver JSONP")
    require("referrerPolicy = \"no-referrer\"" in js, "JSONP no envía referrer")
    require("textContent" in js, "Render usa textContent")
    require("innerHTML" not in js, "Render no usa innerHTML")
    require("localStorage" not in js, "F2A no persiste atribución prematuramente")
    require("sessionStorage" not in js, "F2A no persiste atribución prematuramente")
    require("fetch(" not in js, "F2A no depende de CORS fetch")
    require("Math.random" not in js, "Callback no usa aleatoriedad débil")

    require(
        "TAKARA_STORE_PUBLIC_CLIENT_TEST_OK" in test,
        "Test conserva marcador final",
    )
    require("internal id leak" in test, "Test cubre store_id leak")
    require("missing endpoint performs no network preparation" in test, "Test cubre endpoint fail-closed")
    require("JSONP callback removed" in test, "Test cubre cleanup JSONP")
    require("inactive context" in test, "Test cubre INACTIVE")

    require(".takara-store-state" in css, "CSS define estados Store")
    require(".takara-store-order-frame" in css, "CSS define frame de pedido compartido")
    require("@media (max-width: 640px)" in css, "CSS responsive")

    print("[TAKARA_STORE_PUBLIC_F2A_STATIC_OK] 39 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())