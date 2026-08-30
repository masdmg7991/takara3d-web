#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validación estática del cálculo postal automático de entrega Takara F3."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "assets" / "data" / "catalogo.json"
DELIVERY_CORE = ROOT / "assets" / "js" / "core" / "takara-delivery.js"
POSTAL_CORE = ROOT / "assets" / "js" / "core" / "takara-postal-national.js"
POSTAL_MAP = ROOT / "assets" / "data" / "takara-postal-national-v1.json"
DELIVERY_UI = ROOT / "assets" / "js" / "takara-pedido-delivery.js"
DELIVERY_CSS = ROOT / "assets" / "css" / "takara-pedido-delivery.css"
ORDER_JS = ROOT / "assets" / "js" / "takara-pedido-web.js"
ORDER_HTML = ROOT / "pedido.html"
CODE_GS = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
ORDER_CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"
DEPLOYMENT = ROOT / "docs" / "DEPLOYMENT.md"
SEO_CONTRACT = ROOT / "docs" / "SEO_STRUCTURED_DATA_CONTRACT.md"

VERSION = "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC"
PAYLOAD_V2 = "TAKARA_WEB_ORDER_PAYLOAD_V2"
SNAPSHOT_V2 = "TAKARA_ORDER_SNAPSHOT_V2"
EMAIL_V2 = "TAKARA_PEDIDO_WEB_V2"
PUBLIC_BACKEND = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2"
BACKEND = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1"
POSTAL_VERSION = "TAKARA_POSTAL_NATIONAL_V1_2026_08_03"
SNAPSHOT = "TAKARA_F3_ZONAS_POSTALES_OFICIALES_2026_08_03"
EXPECTED_FREE = ["28911", "28912", "28913", "28915", "28916", "28918", "28919"]
EXPECTED_NEARBY = {
    "carabanchel": ["28019", "28025"],
    "getafe_villaverde": ["28021"],
    "getafe": ["28901", "28902", "28903", "28904", "28905", "28906", "28907", "28909"],
    "alcorcon": ["28921", "28922", "28923", "28924"],
    "mostoles": ["28931", "28932", "28933", "28934", "28935", "28937", "28938"],
    "alcorcon_mostoles": ["28936"],
    "mostoles_fuenlabrada": ["28942"],
    "fuenlabrada": ["28943", "28944", "28945", "28946", "28947"],
}
EXPECTED_AMBIGUOUS = {
    "28011", "28024", "28041", "28044", "28047", "28054", "28668",
    "28670", "28914", "28917", "28925", "28939", "28941",
}
EXPECTED_SPECIAL = {"07", "35", "38", "51", "52"}
CHECKS = 0


def read_utf8(path: Path) -> str:
    data = path.read_bytes()
    if data.startswith(b"\xef\xbb\xbf"):
        data = data[3:]
    return data.decode("utf-8")


def require(condition: bool, message: str) -> None:
    global CHECKS
    if not condition:
        raise AssertionError(f"[FAIL] {message}")
    CHECKS += 1
    print(f"[OK] {message}")


def validate_files() -> None:
    for path in (
        CATALOG, DELIVERY_CORE, POSTAL_CORE, POSTAL_MAP, DELIVERY_UI, DELIVERY_CSS,
        ORDER_JS, ORDER_HTML, CODE_GS, ORDER_CONTRACT, DEPLOYMENT, SEO_CONTRACT,
    ):
        require(path.is_file(), f"Existe {path.relative_to(ROOT)}")


def validate_catalog() -> None:
    delivery = json.loads(read_utf8(CATALOG)).get("entrega")
    require(isinstance(delivery, dict), "Catálogo contiene política de entrega")
    require(delivery.get("version") == VERSION, "Catálogo conserva contrato postal V2")
    require(delivery.get("decision") == "codigo_postal_automatico", "La tarifa se decide por código postal")
    require(delivery.get("moneda") == "EUR", "Catálogo conserva moneda EUR")
    require(delivery.get("direccion_completa_en_solicitud") is False, "Catálogo excluye dirección completa inicial")
    require(delivery.get("cantidad_maxima_tarifa_peninsular_fija") == 1, "Tarifa peninsular fija se limita a una unidad")

    prices = delivery.get("precios_eur") or {}
    require(prices == {"leganes": 0.0, "madrid_sur_cercano": 3.0, "peninsula_seguimiento": 6.5}, "Tarifas 0,00 / 3,00 / 6,50 EUR exactas")

    snapshot = delivery.get("fuente_snapshot") or {}
    require(snapshot.get("version") == SNAPSHOT, "Catálogo identifica el snapshot postal oficial")
    require(snapshot.get("atribucion") == "CartoCiudad (IGN/CNIG) y Ayuntamiento de Madrid", "Catálogo conserva atribución oficial")
    require(re.fullmatch(r"[0-9A-F]{64}", snapshot.get("informe_sha256", "")) is not None, "Snapshot conserva hash del informe")
    require(re.fullmatch(r"[0-9A-F]{64}", snapshot.get("candidato_sha256", "")) is not None, "Snapshot conserva hash del candidato")

    automatic = delivery.get("automatico") or {}
    require(automatic.get("leganes_gratis") == EXPECTED_FREE, "Catálogo conserva 7 CP exclusivos de Leganés")
    require(automatic.get("madrid_sur_3_eur_por_area") == EXPECTED_NEARBY, "Catálogo conserva 29 CP seguros de zona cercana")
    require(sum(map(len, EXPECTED_NEARBY.values())) == 29, "Mapa automático cercano contiene 29 códigos")

    ambiguous = delivery.get("codigos_ambiguos") or {}
    require(set(ambiguous) == EXPECTED_AMBIGUOUS, "Catálogo conserva los 13 CP con tarifa ambigua")
    for postal, options in ambiguous.items():
        require(len(options) >= 2, f"{postal} ofrece al menos dos ubicaciones oficiales")
        codes = [item.get("code") for item in options]
        require(len(codes) == len(set(codes)), f"{postal} no duplica ubicaciones")
        require(all(item.get("price_eur") in (0.0, 3.0, 6.5) for item in options), f"{postal} solo usa tarifas contractuales")
        require(all(item.get("mode") in ("entrega_local", "envio_seguimiento") for item in options), f"{postal} solo usa modalidades derivadas")

    require(set((delivery.get("prefijos_coste_pendiente") or {}).keys()) == EXPECTED_SPECIAL, "Catálogo conserva destinos especiales")

    national = delivery.get("mapa_municipios_nacional") or {}
    require(national.get("version") == POSTAL_VERSION, "Catálogo referencia mapa nacional V1")
    require(national.get("ruta") == "assets/data/takara-postal-national-v1.json", "Catálogo conserva ruta del mapa nacional")
    require(national.get("carga") == "diferida_al_completar_codigo_postal", "Mapa nacional se carga de forma diferida")
    require(national.get("uso") == "autocompletado_informativo_sin_decidir_tarifa", "Municipio nacional no decide la tarifa")
    require(national.get("prioridad") == "reglas_comerciales_madrid_sur", "Reglas comerciales conservan prioridad")


def validate_national_map() -> None:
    data = json.loads(read_utf8(POSTAL_MAP))
    require(data.get("version") == POSTAL_VERSION, "Mapa nacional conserva versión V1")
    stats = data.get("stats") or {}
    require(stats == {
        "postal_codes": 10851,
        "automatic": 7282,
        "selection": 3422,
        "review": 147,
        "municipalities": 8085,
    }, "Mapa nacional conserva estadísticas auditadas")
    require(POSTAL_MAP.stat().st_size < 700_000, "Mapa nacional compacto permanece por debajo de 700 KB")

    municipalities = data.get("municipalities") or {}
    postal_codes = data.get("postal_codes") or {}
    require(len(municipalities) == 8085, "Mapa conserva 8.085 municipios")
    require(len(postal_codes) == 10851, "Mapa conserva 10.851 códigos postales")

    counts = {"a": 0, "s": 0, "r": 0}
    valid = True
    for postal, record in postal_codes.items():
        if re.fullmatch(r"\d{5}", postal) is None or not isinstance(record, list) or not record:
            valid = False
            break
        kind = record[0]
        if kind not in counts:
            valid = False
            break
        counts[kind] += 1
        if (kind == "a" and len(record) != 2) or (kind == "s" and len(record) < 3) or (kind == "r" and len(record) != 1):
            valid = False
            break
        if any(code not in municipalities for code in record[1:]):
            valid = False
            break

    require(valid, "Todos los registros nacionales son compactos y referencialmente válidos")
    require(counts == {"a": 7282, "s": 3422, "r": 147}, "Mapa nacional cuadra por tipo de resolución")
    require(postal_codes.get("28915") == ["a", "28074"], "28915 identifica Leganés automáticamente")
    require(postal_codes.get("50000") is None, "50000 no inventa municipio")
    require(postal_codes.get("01118") == ["r"], "01118 queda en revisión interprovincial")
    require(data.get("source", {}).get("provider") == "IGN/CNIG", "Mapa conserva atribución IGN/CNIG")

def validate_frontend() -> None:
    page = read_utf8(ORDER_HTML)
    core = read_utf8(DELIVERY_CORE)
    postal_core = read_utf8(POSTAL_CORE)
    ui = read_utf8(DELIVERY_UI)
    css = read_utf8(DELIVERY_CSS)
    order = read_utf8(ORDER_JS)

    for marker in (
        'type="hidden" name="modalidad_entrega"',
        'name="codigo_postal_entrega"',
        'name="ubicacion_entrega_codigo"',
        'name="ubicacion_entrega_nombre"',
        'name="localidad_entrega_informativa"',
        'name="municipio_entrega_codigo"',
        'name="municipio_entrega_nombre"',
        'name="provincia_entrega_nombre"',
        'name="municipio_entrega_fuente"',
        "data-takara-delivery-panel",
        "data-takara-delivery-postal",
        "data-takara-delivery-locality",
        "data-takara-delivery-municipality",
        "data-takara-delivery-location",
        "calcularemos automáticamente la opción de entrega más económica",
        "Leganés gratis · zona cercana de Madrid Sur 3 € · resto de Península 6,50 €",
        "La dirección completa se solicitará únicamente después",
        "assets/css/takara-pedido-delivery.css?v=entrega-v2-2",
        "assets/js/core/takara-delivery.js?v=entrega-v2-2",
        "assets/js/core/takara-postal-national.js?v=postal-nacional-v1",
        "assets/js/takara-pedido-delivery.js?v=entrega-v2-2",
        "assets/js/takara-pedido-web.js?v=pedido-entrega-v2-2",
        "assets/js/takara-pedido-premium.js?v=entrega-v2-2",
    ):
        require(marker in page, f"pedido.html conserva marcador: {marker}")

    require("data-takara-delivery-mode" not in page, "Cliente no ve selector manual de modalidad")
    require("modalidad_entrega_visible" not in page, "Cliente no puede elegir una tarifa")
    require("data-takara-delivery-zone" not in page, "Tarifas no repiten la zona calculada")
    require(not re.search(r'name=["\'](?:direccion|calle|numero|número|piso|puerta)["\']', page, re.I), "Solicitud inicial no contiene dirección completa")

    for marker in (
        "TAKARA DELIVERY CORE V2", f'const VERSION = "{VERSION}"',
        "TAKARA_DELIVERY_CORE_V2", "AUTO_FREE_CODES", "AUTO_NEARBY_BY_AREA",
        "AMBIGUOUS_BY_POSTAL", "getLocationOptions", "classifyPostalCode",
        "DECISION_AUTOMATIC", "DECISION_OFFICIAL_SELECTION",
        "PRICE_LOCAL_FREE = 0", "PRICE_LOCAL_NEARBY = 3",
        "PRICE_MAINLAND_TRACKED = 6.5", "FIXED_MAINLAND_MAX_QUANTITY = 1",
        "function quote", "function calculateTotals",
    ):
        require(marker in core, f"Core conserva marcador: {marker}")
    require("fetch(" not in core and "XMLHttpRequest" not in core, "Core no depende de servicios externos en tiempo real")

    for marker in (
        "TAKARA POSTAL NATIONAL CORE V1", POSTAL_VERSION,
        "loadMap", "resolve", "DEFAULT_URL", "force-cache",
        "statusAutomatic", "statusSelection", "statusManual",
    ):
        require(marker in postal_core, f"Core nacional conserva marcador: {marker}")
    require("fetch(" in postal_core, "Core nacional carga el mapa bajo demanda")
    require("evidence_addresses" not in postal_core, "Core nacional no incorpora millones de evidencias")

    for marker in (
        "TAKARA PEDIDO DELIVERY UI V2.2", "TAKARA_DELIVERY_UI_V2",
        "getLocationOptions", "updateCommercialLocationOptions", "bindPostalBridge",
        "bindMunicipalityBridge", "bindLocationBridge", "bindSubmitGuard",
        "postalApi.loadMap", "applyNationalResolution", "applyManualFallback",
    ):
        require(marker in ui, f"UI conserva marcador: {marker}")
    require("bindModeBridge" not in ui, "UI elimina puente de modalidad manual")
    require("TAKARA PEDIDO DELIVERY UI V2.2" in css, "CSS de entrega conserva versión V2.2")
    require("body.pedido-premium" in css and "@import" not in css, "CSS permanece aislado y sin imports")

    for marker in (
        f'const DELIVERY_VERSION = "{VERSION}"',
        'getTakaraCore("TAKARA_DELIVERY_CORE_V2")',
        "postalCode: codigoPostalEntrega", "locationCode: ubicacionEntregaCodigo",
        "fuente_decision: quote.decision_source", "ubicacion_codigo: quote.location_code",
        "municipio_codigo", "municipio_nombre", "provincia_nombre", "municipio_fuente",
        "payload.entrega = delivery", "payload.totales = totals",
        'return getEnvironment() === "local";', "direccion_completa_solicitada: false",
    ):
        require(marker in order, f"Motor web conserva marcador: {marker}")


def validate_server() -> None:
    source = read_utf8(CODE_GS)
    for marker in (
        BACKEND, VERSION, PAYLOAD_V2, SNAPSHOT_V2, EMAIL_V2, "DELIVERY_AUTOMATIC_FREE_POSTAL_CODES",
        "DELIVERY_AUTOMATIC_NEARBY_BY_AREA", "DELIVERY_AMBIGUOUS_POSTAL_OPTIONS",
        "DELIVERY_SPECIAL_PREFIX_LABELS", "opcionesUbicacionEntrega_",
        "buscarOpcionUbicacionEntrega_", "clasificarCodigoPostalEntrega_",
        "calcularCotizacionEntrega_", "normalizarEntregaPedido_",
        "validarEntregaPedido_", "fuente_decision", "ubicacion_requerida",
        "ubicacion_codigo", "ubicacion_nombre", "localidad_informativa",
        "municipio_codigo", "municipio_nombre", "provincia_nombre", "municipio_fuente",
        "normalizarLocalidadInformativa_", "normalizarMunicipioInformativo_", "[ENTREGA]",
        "construirBloqueEntregaClienteTexto_", "construirFilasEntregaEmailPremium_",
        "legacy_sin_entrega", "direccion_completa_solicitada",
    ):
        require(marker in source, f"Apps Script conserva marcador: {marker}")

    require('DELIVERY_PRICE_LOCAL_FREE_EUR: "0.00"' in source, "Servidor conserva Leganés 0,00 EUR")
    require('DELIVERY_PRICE_LOCAL_NEARBY_EUR: "3.00"' in source, "Servidor conserva zona cercana 3,00 EUR")
    require('DELIVERY_PRICE_MAINLAND_TRACKED_EUR: "6.50"' in source, "Servidor conserva Península 6,50 EUR")
    require("validarEntregaPedido_(pedido.entrega, pedido.totales);" in source, "Validación principal ejecuta contrato de entrega")
    require("deliverySource.codigo_postal" in source and "deliverySource.ubicacion_codigo" in source, "Servidor recalcula desde CP y ubicación oficial")
    require("deliverySource.modalidad" not in source[source.index("const quote = calcularCotizacionEntrega_"):source.index("const deliveryCents =")], "Servidor no usa la modalidad del cliente para cotizar")
    require("precio de entrega" in source.lower() and "total estimado" in source.lower(), "Servidor rechaza precio y total incoherentes")


def validate_docs() -> None:
    order_contract = read_utf8(ORDER_CONTRACT)
    deployment = read_utf8(DEPLOYMENT)
    seo = read_utf8(SEO_CONTRACT)
    for marker in (
        "### 7.3 Entrega y cálculo inicial", VERSION, SNAPSHOT,
        "7 códigos exclusivos de Leganés", "29 códigos seguros", "13 códigos compartidos",
        "28917", "28044", "6,50 EUR", "dos o más unidades",
        "servidor es la\nfuente de verdad", "dirección completa",
    ):
        require(marker in order_contract, f"Contrato de pedido documenta: {marker}")
    require(PUBLIC_BACKEND in deployment, "DEPLOYMENT documenta backend público V1.14.1")
    require(BACKEND in deployment, "DEPLOYMENT documenta candidato local V1.14.2")
    require("Versión publicada verificada mediante GET" in deployment, "DEPLOYMENT documenta verificación GET del backend publicado")
    require("endpoint productivo" in deployment and "no una etiqueta histórica" in deployment, "DEPLOYMENT fija autoridad de despliegue en endpoint productivo")
    require(PAYLOAD_V2 in deployment and SNAPSHOT_V2 in deployment and EMAIL_V2 in deployment, "DEPLOYMENT documenta payload, snapshot y correo V2")
    require(VERSION in seo and "todavía no autoriza a publicar `shippingDetails`" in seo, "Contrato SEO mantiene shippingDetails pendiente")
    require("hasMerchantReturnPolicy" in seo, "Contrato SEO mantiene pendiente política de devoluciones")


def main() -> int:
    validate_files()
    validate_catalog()
    validate_national_map()
    validate_frontend()
    validate_server()
    validate_docs()
    print(f"[TAKARA_DELIVERY_CONTRACT_OK] {CHECKS} comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
