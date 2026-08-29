from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ORDER_JS = ROOT / "assets" / "js" / "takara-pedido-web.js"
ORDER_CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"
F2_CLOSURE = ROOT / "docs" / "STORE_PUBLIC_F2_CLOSURE.md"
F2_VALIDATOR = ROOT / "tools" / "takara_validar_store_public_f2.py"
TEST = ROOT / "tools" / "takara_test_order_store_context.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    order_js = read(ORDER_JS)
    contract = read(ORDER_CONTRACT)
    closure = read(F2_CLOSURE)
    f2_validator = read(F2_VALIDATOR)
    test = read(TEST)

    for marker in (
        'STORE_CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1"',
        '"TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1"',
        "STORE_REF_PATTERN",
        "normalizeVerifiedStoreContext",
        "setVerifiedOrderStoreContext",
        "clearOrderStoreContext",
        "getOrderStoreContextTransport",
        "getOrderStoreContextMeta",
        "TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1",
        "setVerifiedContext:",
        "getTransport:",
        "getMeta:",
    ):
        require(marker in order_js, f"Order Store bridge conserva {marker}")

    require(
        "Object.freeze({" in order_js,
        "Transport Store se congela",
    )
    require(
        "store_context: transport" in order_js,
        "Meta STORE contiene StoreContext sanitizado",
    )
    require(
        "}, getOrderStoreContextMeta())," in order_js,
        "buildPayload añade StoreContext de forma aditiva",
    )
    require(
        "meta: payload.meta || {}" in order_js,
        "snapshot hereda payload.meta sin contrato paralelo",
    )

    for forbidden in (
        "source_type: \"STORE\"",
        "source_type: 'STORE'",
        "store_id:",
        "TAKARA_STORE_ATTRIBUTION_V1",
    ):
        require(
            forbidden not in order_js,
            f"Frontend no deriva autoridad {forbidden}",
        )

    require(
        'allowedKeys = [' in order_js,
        "StoreContext usa allowlist",
    )
    require(
        '"version",' in order_js
        and '"store_ref",' in order_js
        and '"display_name",' in order_js
        and '"status",' in order_js,
        "Allowlist cubre StoreContext público exacto",
    )
    require(
        'value.status !== "ACTIVE"' in order_js,
        "Contexto INACTIVE se rechaza",
    )
    require(
        "unexpectedKeys.length > 0" in order_js,
        "Campos inesperados fail-closed",
    )

    for marker in (
        "## StoreContext transport bridge (F3A)",
        "`TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1`",
        "`meta.store_context = { version, store_ref }`",
        "Payload DIRECT: `meta.store_context` ausente.",
        "`store_id` nunca se acepta ni se transporta desde navegador.",
        "la autoridad para resolver `store_ref`",
        "F3B/F3C",
    ):
        require(marker in contract, f"Order contract conserva {marker}")

    for marker in (
        "## Post-F2 ownership",
        "Desde F3, `takara-pedido-web.js` puede transportar `TAKARA_STORE_CONTEXT_V1`",
        "La autoridad de atribución pertenece al backend de pedido de F3.",
    ):
        require(marker in closure, f"F2 closure migrada conserva {marker}")

    require(
        "ORDER_JS" not in f2_validator,
        "F2 regression ya no congela el order engine futuro",
    )
    require(
        "ORDER_HTML" not in f2_validator,
        "F2 regression ya no congela pedido.html futuro",
    )
    require(
        "Store Public itself must never become attribution authority"
        in f2_validator,
        "F2 regression conserva ownership permanente",
    )
    require(
        "TAKARA_STORE_PUBLIC_F2_CLOSURE_STATIC_OK] 59 comprobaciones"
        in f2_validator,
        "F2 gate evolucionado mantiene marcador",
    )

    require(
        "TAKARA_ORDER_STORE_CONTEXT_F3A_OK" in test,
        "Functional test marker",
    )
    for marker in (
        "DIRECT starts without StoreContext",
        "transport exact two fields",
        "store_id injection",
        "source_type injection",
        "inactive Store",
        "clear returns DIRECT state",
    ):
        require(marker in test, f"Functional test cubre {marker}")

    print("[TAKARA_ORDER_STORE_CONTEXT_F3A_STATIC_OK] 48 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())