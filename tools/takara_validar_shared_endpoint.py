from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = "https://script.google.com/macros/s/AKfycbzdrgKXZ0NbRWgx4huEi80K5MIEu3ytX217yEf6H5mQXK03-KN5W1NlMPD7W614tZ03-Q/exec"

PRODUCTION = [
    ROOT / "assets" / "js" / "takara-config.js",
    ROOT / "assets" / "js" / "takara-pedido-web.js",
    ROOT / "assets" / "js" / "takara-store-public.js",
    ROOT / "pedido.html",
    ROOT / "tienda" / "index.html",
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    texts = {path: read(path) for path in PRODUCTION}
    config = texts[ROOT / "assets" / "js" / "takara-config.js"]
    order = texts[ROOT / "assets" / "js" / "takara-pedido-web.js"]
    store = texts[ROOT / "assets" / "js" / "takara-store-public.js"]
    pedido = texts[ROOT / "pedido.html"]
    tienda = texts[ROOT / "tienda" / "index.html"]
    deployment = read(ROOT / "docs" / "DEPLOYMENT.md")

    occurrences = sum(text.count(ENDPOINT) for text in texts.values())
    require(occurrences == 1, "Una única URL Apps Script literal en producción")
    require(ENDPOINT in config, "La URL vive solo en config central")
    require("TAKARA_APPS_SCRIPT_ENDPOINT_V1" in config, "Contrato endpoint versionado")
    require("TAKARA_GET_APPS_SCRIPT_ENDPOINT" in config, "Getter endpoint central")
    require("servicios: Object.freeze" in config, "Servicios config inmutables")

    require('data-takara-endpoint=""' in pedido, "Pedido no tiene endpoint literal")
    require(ENDPOINT not in pedido, "Pedido HTML no duplica URL")
    require(
        pedido.index("takara-config.js") < pedido.index("takara-pedido-web.js"),
        "Pedido carga config antes del motor",
    )
    require("TAKARA_PEDIDO_ENDPOINT_V1" in order, "Pedido expone adapter endpoint V1")
    require("TAKARA_GET_APPS_SCRIPT_ENDPOINT" in order, "Pedido consume autoridad central")
    require(
        'form.setAttribute("data-takara-endpoint", endpoint)' in order,
        "Pedido materializa endpoint solo en runtime",
    )

    require(ENDPOINT not in tienda, "Store HTML no duplica URL")
    require(
        tienda.index("takara-config.js") < tienda.index("takara-store-public.js"),
        "Store carga config antes del cliente",
    )
    require("getCentralAppsScriptEndpoint" in store, "Store consume endpoint central")
    require("TAKARA_GET_APPS_SCRIPT_ENDPOINT" in store, "Store usa getter canonico")
    require(
        'root.getAttribute("data-store-endpoint")' not in store,
        "Store no acepta autoridad endpoint desde markup",
    )

    require(
        "## Autoridad compartida del endpoint Apps Script" in deployment,
        "Deployment documenta autoridad compartida",
    )
    require(
        "`assets/js/takara-config.js`" in deployment,
        "Deployment identifica archivo autoridad",
    )
    require(
        "supersede cualquier referencia anterior" in deployment,
        "Deployment invalida autoridad histórica de pedido.html",
    )

    print("[TAKARA_SHARED_APPS_SCRIPT_ENDPOINT_STATIC_OK] 35 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())