from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
ORDER_JS = ROOT / "assets" / "js" / "takara-pedido-web.js"
ORDER_HTML = ROOT / "pedido.html"
QUALITY_GATE = ROOT / "tools" / "takara_quality_gate.ps1"
README = ROOT / "apps-script" / "takara-pedidos-web" / "README.md"
DEPLOYMENT = ROOT / "docs" / "DEPLOYMENT.md"
ORDER_CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"

EXPECTED = {
    "payload": "TAKARA_WEB_ORDER_PAYLOAD_V2",
    "snapshot": "TAKARA_ORDER_SNAPSHOT_V2",
    "email": "TAKARA_PEDIDO_WEB_V2",
    "delivery": "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
    "script": "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1",
}

class ContractError(RuntimeError):
    pass

def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)
    print(f"[OK] {message}")

def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")

def main() -> int:
    code = read(CODE)
    order = read(ORDER_JS)
    page = read(ORDER_HTML)
    gate = read(QUALITY_GATE)
    readme = read(README)
    deployment = read(DEPLOYMENT)
    contract = read(ORDER_CONTRACT)

    for name, marker in EXPECTED.items():
        require(marker in code or marker in order, f"Contrato activo contiene {name}: {marker}")

    require(EXPECTED["payload"] in order, "Frontend emite payload V2")
    require(EXPECTED["snapshot"] in order, "Frontend emite snapshot V2")
    require(EXPECTED["email"] in code, "Apps Script emite correo V2")
    require(EXPECTED["script"] in code, "Apps Script usa versión V1.14.1 dual-stack")

    require("consiente_gestion_datos: true" in order, "Frontend usa consentimiento canónico de datos")
    require(
        "declara_derechos_y_autoriza_revision_imagen: true" in order,
        "Frontend usa declaración canónica de derechos/revisión",
    )
    require("acepta_politica_privacidad:" not in order, "Payload V2 no conserva alias de privacidad")
    require("acepta_contacto:" not in order, "Payload V2 no conserva alias acepta_contacto")
    require("acepta_revision:" not in order, "Payload V2 no conserva alias acepta_revision")

    # Los nombres históricos de checkbox pueden seguir siendo puente de UI.
    require('name="acepta_contacto"' in page and 'name="acepta_revision"' in page,
            "Checkboxes históricos quedan limitados a la UI")

    active_files = [
        ORDER_JS,
        ROOT / "tools" / "takara_test_entrega_pedido.js",
        ROOT / "tools" / "takara_test_personalizacion_pedido.js",
        ROOT / "tools" / "takara_test_ficha_visual_pedido.js",
        ROOT / "tools" / "takara_test_seguridad_foto_pedido.js",
        ROOT / "tools" / "takara_validar_entrega_pedido.py",
    ]
    forbidden = (
        "TAKARA_WEB_ORDER_PAYLOAD_V1",
        "TAKARA_PEDIDO_WEB_V1",
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_13_2_NATIONAL_MUNICIPALITY",
        "acepta_politica_privacidad:",
    )
    for path in active_files:
        text = read(path)
        for marker in forbidden:
            require(marker not in text, f"{path.name} no usa referencia activa obsoleta: {marker}")


    # Compatibilidad temporal deliberada para desplegar backend antes que frontend
    # sin romper pedidos V1 ya publicados. El frontend V2 sigue libre de aliases.
    require(
        'PAYLOAD_VERSION_V1_COMPAT: "TAKARA_WEB_ORDER_PAYLOAD_V1"' in code,
        "Apps Script declara compatibilidad V1 de transición de forma explícita",
    )
    require(
        'VERSION_PLANTILLA_V1_COMPAT: "TAKARA_PEDIDO_WEB_V1"' in code,
        "Apps Script conserva email V1 solo en la ruta compat",
    )
    require(
        "function detectarContratoPedido_(payload)" in code
        and "function normalizarPedidoV1Compat_(payload)" in code
        and "function validarPedidoV1Compat_(pedido)" in code
        and "function construirCuerpoInternoV1Compat_" in code,
        "Puente V1/V2 está encapsulado en funciones compat",
    )
    require(
        "Payload V2 declarado pero no compatible o incompleto." in code,
        "V2 incompleto falla cerrado y nunca baja a V1",
    )
    require(
        "acepta_politica_privacidad:" not in order
        and "acepta_contacto:" not in order
        and "acepta_revision:" not in order,
        "Frontend V2 no reintroduce aliases legacy",
    )

    personalization_validator = read(
        ROOT / "tools" / "takara_validar_personalizacion_pedido.py"
    )
    require(
        '"acepta_politica_privacidad:" not in source' in personalization_validator,
        "Validador de personalización exige ausencia del alias antiguo",
    )
    require(
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1"
        in personalization_validator,
        "Validador de personalización exige Apps Script V1.14.1 dual-stack",
    )

    require("takara-pedido-web.js?v=pedido-entrega-v2-2" in page, "HTML usa cache key V2.2 exacta")
    require("takara_validar_contrato_v2.py" in gate, "Quality Gate ejecuta auditoría V2")
    require("takara_test_order_contract_v2.js" in gate, "Quality Gate ejecuta test V2")

    order_contract_test = read(ROOT / "tools" / "takara_test_order_contract_v2.js")
    require(
        "optional_publication_consent_accepted: true" in order_contract_test,
        "Test V2 demuestra que publicar el resultado sigue siendo opcional",
    )
    require(
        "municipality_information_preserved: true" in order_contract_test,
        "Test V2 demuestra que municipio nacional informativo se conserva",
    )

    for doc, name in ((readme, "README"), (deployment, "DEPLOYMENT"), (contract, "ORDER_ENGINE_CONTRACT")):
        require(EXPECTED["script"] in doc, f"{name} documenta candidato V1.14.1 dual-stack")
        require(EXPECTED["payload"] in doc, f"{name} documenta payload V2")
        require(EXPECTED["snapshot"] in doc, f"{name} documenta snapshot V2")
        require(EXPECTED["email"] in doc, f"{name} documenta correo V2")

    require(
        "Versión publicada verificada mediante GET" in deployment
        and "endpoint productivo" in deployment,
        "DEPLOYMENT documenta V1.14.1 publicada y autoridad GET",
    )
    require(
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_12_3_OPTIONAL_SHOWCASE_CONSENT" not in deployment,
        "DEPLOYMENT no conserva V1.12.3 como versión pública activa",
    )

    print("[TAKARA_ORDER_CONTRACT_V2_STATIC_OK]")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
