from __future__ import annotations

import json
import re
from decimal import Decimal
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ORDER_JS = ROOT / "assets" / "js" / "takara-pedido-web.js"
ORDER_HTML = ROOT / "pedido.html"
CATALOG_JSON = ROOT / "assets" / "data" / "catalogo.json"
CODE_GS = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
FRAME_CONTRACT = ROOT / "docs" / "FRAME_TEXT_CONTRACT.md"
ORDER_CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"

EXPECTED_EXTRAS = {
    "personalizacion_texto_1_lado": Decimal("4.00"),
    "personalizacion_texto_2_lados": Decimal("6.00"),
    "personalizacion_texto_3_lados": Decimal("8.00"),
    "personalizacion_texto_4_lados": Decimal("8.00"),
}


class ContractError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)
    print(f"[OK] {message}")


def read_utf8(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def validate_catalog() -> None:
    catalog = json.loads(read_utf8(CATALOG_JSON))
    products = catalog.get("productos", [])
    product = next(
        (item for item in products if item.get("codigo") == "MARCO_LITOFANIA_144X108"),
        None,
    )
    require(product is not None, "Catálogo contiene el marco 144x108")

    extras = {
        item.get("codigo"): item
        for item in product.get("extras", [])
        if item.get("codigo") in EXPECTED_EXTRAS
    }
    require(set(extras) == set(EXPECTED_EXTRAS), "Catálogo contiene los cuatro suplementos por lados")

    for code, expected_price in EXPECTED_EXTRAS.items():
        extra = extras[code]
        actual_price = Decimal(str(extra.get("precio_extra_eur")))
        require(actual_price == expected_price, f"{code} conserva {expected_price:.2f} EUR")
        require(extra.get("estado") == "activo", f"{code} está activo")
        require(extra.get("visible_en_web") is False, f"{code} no crea una llamada comercial adicional")


def validate_client() -> None:
    source = read_utf8(ORDER_JS)
    page = read_utf8(ORDER_HTML)
    markers = [
        'value(form, "personalizacion_marco")',
        "parseFrameTextPersonalization",
        "FRAME_TEXT_EXTRA_CODE_BY_COUNT",
        "extra_codes: extraCodes",
        "personalizacion_marco: personalizacionMarco",
        "payload.snapshot_pedido",
        "TAKARA_FRAME_TEXT_ORDER_V1",
    ]

    for marker in markers:
        require(marker in source, f"Motor web conserva contrato: {marker}")

    require(
        re.search(
            r"const\s+personalizacionMarco\s*=\s*parseFrameTextPersonalization\s*\(",
            source,
        )
        is not None,
        "Motor web valida la personalización antes de construir el payload",
    )
    build_payload_source = source[
        source.index("async function buildPayload")
        : source.index("function parseFrameTextPersonalization")
    ]
    require(
        build_payload_source.index('value(form, "personalizacion_marco")')
        < build_payload_source.index("personalizacion_marco: personalizacionMarco"),
        "Motor web lee el campo antes de enviarlo",
    )
    require(
        "takara-pedido-web.js?v=pedido-entrega-v2-2" in page,
        "pedido.html fuerza la versión corregida del motor de envío",
    )
    require(
        "assets/css/styles.css?v=pedido-consentimiento-color-v1" in page,
        "pedido.html fuerza la recarga del CSS del consentimiento",
    )
    require(
        "TAKARA_WEB_ORDER_PAYLOAD_V2" in source
        and "TAKARA_ORDER_SNAPSHOT_V2" in source,
        "Frontend usa payload y snapshot V2",
    )
    require(
        "consiente_gestion_datos: true" in source
        and "declara_derechos_y_autoriza_revision_imagen: true" in source,
        "Frontend emite controles canónicos V2",
    )
    require(
        "acepta_politica_privacidad:" not in source,
        "Frontend V2 elimina el alias antiguo de privacidad",
    )
    require(
        "Hemos recibido tu solicitud" not in source,
        "Frontend F1A no afirma recepción opaca del pedido",
    )
    require(
        'data-takara-accept-proxy="acepta_revision" checked' not in page
        and 'data-takara-accept-proxy="acepta_contacto" checked' not in page,
        "Consentimientos visibles no están premarcados",
    )
    require(
        'name="autoriza_publicacion_resultado" value="si"' in page
        and 'name="autoriza_publicacion_resultado" value="si" required' not in page,
        "Consentimiento de publicación es opcional y no está premarcado",
    )
    require(
        'data-takara-accept-proxy="autoriza_publicacion_resultado"' in page,
        "Consentimiento opcional visible está conectado al formulario real",
    )
    require(
        "Esta opción no se aplicará a trabajos que incluyan imágenes de menores de edad." in page,
        "La exclusión de menores aparece en el formulario",
    )
    require(
        "Resultado final (opcional)." not in page
        and "<strong>Opcional.</strong>" not in page
        and "La autorización opcional se refiere" not in page,
        "La interfaz no etiqueta la casilla con la palabra opcional",
    )
    require(
        "autoriza_publicacion_resultado: autorizaPublicacionResultado" in source,
        "Frontend envía el consentimiento opcional",
    )


def validate_server_and_emails() -> None:
    source = read_utf8(CODE_GS)
    markers = [
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1",
        "TAKARA_PEDIDO_WEB_V2",
        "TAKARA_WEB_ORDER_PAYLOAD_V2",
        "TAKARA_ORDER_SNAPSHOT_V2",
        "normalizarPersonalizacionMarco_",
        "validarPersonalizacionMarco_",
        "FRAME_TEXT_PRICE_BY_SIDE_COUNT",
        "[PERSONALIZACION_MARCO]",
        "Texto superior:",
        "Texto derecho:",
        "Texto inferior:",
        "Texto izquierdo:",
        "construirBloquePersonalizacionClienteTexto_",
        "construirFilasPersonalizacionEmailPremium_",
        "construirBloqueDesglosePrecioClienteTexto_",
        "construirFilasDesglosePrecioEmailPremium_",
        "autoriza_publicacion_resultado",
        "Publicaci\\u00F3n del resultado final",
    ]

    for marker in markers:
        require(marker in source, f"Apps Script conserva contrato: {marker}")

    require(
        source.count("construirFilasPersonalizacionEmailPremium_(") >= 3,
        "Los dos correos HTML consumen la personalización",
    )
    require(
        source.count("construirBloquePersonalizacionClienteTexto_(") >= 2,
        "El correo de texto plano del cliente consume la personalización",
    )
    require(
        "validarPersonalizacionMarco_(" in source[
            source.index("function validarPedido_") : source.index("function construirAsunto_")
        ],
        "La validación del pedido bloquea personalizaciones incoherentes",
    )


def validate_documentation() -> None:
    frame_contract = read_utf8(FRAME_CONTRACT)
    order_contract = read_utf8(ORDER_CONTRACT)

    require(
        "FRAME_TEXT_EMAIL_INTEGRATION_V1" in frame_contract,
        "Contrato de letras documenta integración con correo",
    )
    require(
        "La integración definitiva" not in frame_contract,
        "Contrato ya no declara la integración como trabajo futuro",
    )
    require(
        "personalizacion_marco" in order_contract,
        "Contrato de pedido documenta el campo personalizacion_marco",
    )
    require(
        "control.autoriza_publicacion_resultado" in order_contract,
        "Contrato de pedido documenta el consentimiento opcional",
    )


def main() -> int:
    validate_catalog()
    validate_client()
    validate_server_and_emails()
    validate_documentation()
    print("[TAKARA_FRAME_TEXT_ORDER_CONTRACT_OK]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
