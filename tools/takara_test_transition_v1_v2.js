/* TAKARA TRANSITION V1/V2 - DEPLOYMENT BRIDGE TEST */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CODE = path.join(ROOT, "apps-script", "takara-pedidos-web", "Code.gs");
const STORE_DOMAIN = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "StoreDomain.gs"
);
const STORE_ORDER_RESOLUTION = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "StoreOrderResolution.gs"
);
const ORDER_ATTRIBUTION = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "OrderAttribution.gs"
);

function fail(message) { throw new Error(message); }
function ok(condition, message) { if (!condition) fail(message); }

function loadServer() {
  const source = fs.readFileSync(CODE, "utf8");
  const context = {
    console, JSON, Math, Date, Object, Array, String, Number, Boolean, RegExp, isFinite,
    Utilities: {
      formatDate() { return "2026-08-11 00:30:00"; },
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput(value) {
        return { value, setMimeType() { return this; } };
      },
    },
  };
  vm.createContext(context);

  [STORE_DOMAIN, STORE_ORDER_RESOLUTION, ORDER_ATTRIBUTION].forEach(
    function (file) {
      vm.runInContext(
        fs.readFileSync(file, "utf8"),
        context,
        { filename: file }
      );
    }
  );

  vm.runInContext(source, context, { filename: CODE });
  return { context, source };
}

function personalizacion2() {
  return {
    version: "TAKARA_FRAME_TEXT_V1_4",
    geometry_contract: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
    orientacion: "vertical",
    numero_lados: 2,
    suplemento_unitario_eur: "6.00",
    color_texto: "ebano",
    color_texto_nombre: "Ébano",
    lados: { top: "Para siempre", right: "2026" },
  };
}

function v1Payload() {
  return {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V1",
    pedido_web_id: "TK-WEB-20260811-003000-A1B2C3",
    modo_transporte: "pedido_con_foto_base64",
    meta: {
      pagina_origen: "https://www.takara3d.es/pedido.html",
      entorno: "produccion",
    },
    cliente: {
      nombre: "Cliente V1 Compat",
      email: "cliente@example.com",
      telefono: "600123123",
    },
    producto: {
      producto: "Marco litofanía personalizado",
      codigo_producto: "MARCO_LITOFANIA_144X108",
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Rosewood",
      color_litofania: "Blanco natural",
      cantidad: 1,
      precio_mostrado_eur: "41.00",
      personalizacion_marco: personalizacion2(),
    },
    archivos: {
      foto_base64: "data:image/jpeg;base64,AAAA",
      nombre_archivo: "foto.jpg",
      content_type: "image/jpeg",
      size_bytes: 4,
    },
    mensaje_cliente: "Pedido legado durante transición.",
    control: {
      acepta_contacto: true,
      acepta_revision: true,
      acepta_politica_privacidad: "no",
      autoriza_publicacion_resultado: false,
    },
  };
}

function v2Payload() {
  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: "TK-WEB-20260811-003001-B1C2D3",
    creado_en_iso: "2026-08-10T22:30:01.000Z",
    modo_prueba: true,
    cliente: { nombre: "Cliente V2", email: "cliente@example.com", telefono: "600123123" },
    producto: {
      producto: "Marco litofanía personalizado",
      codigo_producto: "MARCO_LITOFANIA_144X108",
      variante_codigo: "vertical",
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Rosewood",
      color_litofania: "Blanco natural",
      atributos: { familia: "litofania" },
      extras: [{ codigo: "personalizacion_texto_2_lados", nombre: "Texto personalizado · 2 lados", precio_extra_eur: "6.00" }],
      cantidad: 1,
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "6.00",
      precio_unitario_final_eur: "41.00",
      precio_total_eur: "41.00",
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
      personalizacion_marco: personalizacion2(),
    },
    entrega: {
      version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
      modalidad_solicitada: "envio_seguimiento",
      modalidad_resuelta: "envio_seguimiento",
      codigo_postal: "15001",
      zona_codigo: "peninsula",
      zona_nombre: "España peninsular",
      area_codigo: "",
      fuente_decision: "codigo_postal_automatico",
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: "",
      localidad_informativa: "A Coruña",
      municipio_codigo: "15030",
      municipio_nombre: "A Coruña",
      provincia_nombre: "A Coruña",
      municipio_fuente: "cartociudad_automatico",
      precio_eur: "6.50",
      moneda: "EUR",
      estado_precio: "confirmado",
      direccion_completa_solicitada: false,
      texto_cliente: "Envío estándar con seguimiento a España peninsular por 6,50 €.",
    },
    totales: {
      version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "6.00",
      precio_unitario_final_eur: "41.00",
      subtotal_productos_eur: "41.00",
      precio_entrega_eur: "6.50",
      total_estimado_eur: "47.50",
      estado_total: "confirmado",
      moneda: "EUR",
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
    },
    archivos: { foto_base64: "data:image/jpeg;base64,AAAA", nombre_archivo: "foto.jpg", content_type: "image/jpeg", size_bytes: 4 },
    mensaje_cliente: "Prueba V2.",
    control: {
      consiente_gestion_datos: true,
      declara_derechos_y_autoriza_revision_imagen: true,
      autoriza_publicacion_resultado: false,
    },
    meta: { pagina_origen: "https://www.takara3d.es/pedido.html", entorno: "produccion" },
  };
  payload.snapshot_pedido = JSON.parse(JSON.stringify({
    snapshot_version: "TAKARA_ORDER_SNAPSHOT_V2",
    payload_version: payload.payload_version,
    pedido_web_id: payload.pedido_web_id,
    creado_en_iso: payload.creado_en_iso,
    modo_prueba: payload.modo_prueba,
    cliente: payload.cliente,
    producto: payload.producto,
    entrega: payload.entrega,
    totales: payload.totales,
    archivos: payload.archivos,
    mensaje_cliente: payload.mensaje_cliente,
    control: payload.control,
    meta: payload.meta,
  }));
  return payload;
}

function fakePhoto() {
  return {
    foto_recibida: true,
    enlace_drive: "https://drive.google.com/file/d/DRYRUN123/view",
    id_archivo_drive: "DRYRUN123",
    nombre_archivo_foto: "foto.jpg",
    tipo_archivo_foto: "image/jpeg",
    tamano_archivo_foto_bytes: 4,
    estado_archivo: "pendiente_descarga",
    nota_archivo: "test",
  };
}

function expectFailure(fn, pattern, label) {
  let error = null;
  try { fn(); } catch (e) { error = e; }
  ok(error, label + ": se esperaba rechazo");
  ok(pattern.test(String(error.message || error)), label + ": mensaje inesperado: " + String(error.message || error));
}

function main() {
  const { context, source } = loadServer();

  ok(source.includes('TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1'), "Versión dual-stack presente");
  ok(source.includes('PAYLOAD_VERSION_V1_COMPAT: "TAKARA_WEB_ORDER_PAYLOAD_V1"'), "V1 compat explícito");

  const v1Source = v1Payload();
  const v1 = context.normalizarPedido_(v1Source);
  v1.attribution =
    context.buildAuthoritativeOrderAttribution_(v1Source);
  context.validarPedido_(v1);
  ok(v1.contrato_entrada === "v1_compat", "V1 se enruta por compatibilidad explícita");
  ok(v1.control.autoriza_publicacion_resultado === false, "Publicación sigue opcional en V1");
  ok(v1.entrega.estado_precio === "pendiente_confirmacion", "V1 no inventa entrega durante transición");
  const bodyV1 = context.construirCuerpoInterno_(v1.pedido_web_id, new Date(), v1, fakePhoto(), null);
  ok(bodyV1.includes("[TAKARA_PEDIDO_WEB_V1]"), "V1 conserva marcador técnico");
  ok(bodyV1.includes("[ATRIBUCION]"), "V1 conserva sección de atribución");
  ok(
    bodyV1.includes("Versión atribución: TAKARA_STORE_ATTRIBUTION_V1"),
    "V1 conserva contrato de atribución"
  );
  ok(bodyV1.includes("Origen pedido: DIRECT"), "V1 sigue siendo DIRECT");
  ok(bodyV1.includes("Store ID: "), "V1 DIRECT no inventa Store ID");
  ok(
    bodyV1.includes("Store nombre snapshot: "),
    "V1 DIRECT no inventa Store nombre"
  );
  ok(bodyV1.includes("Acepta contacto: sí"), "V1 conserva control legacy");
  ok(bodyV1.includes("Acepta política privacidad: no"), "V1 conserva exactamente la privacidad enviada por la web pública");
  ok(!bodyV1.includes("[IMPORTES]"), "V1 no se convierte silenciosamente en email V2");

  const v1ParserPayload = v1Payload();
  v1ParserPayload.control.acepta_politica_privacidad = "sí";
  const v1Parser = context.normalizarPedido_(v1ParserPayload);
  v1Parser.attribution =
    context.buildAuthoritativeOrderAttribution_(v1ParserPayload);
  context.validarPedido_(v1Parser);
  const bodyV1Parser = context.construirCuerpoInterno_(
    v1Parser.pedido_web_id,
    new Date(),
    v1Parser,
    fakePhoto(),
    null
  );
  ok(bodyV1Parser.includes("Acepta política privacidad: sí"), "Fixture V1 compatible con parser conserva privacidad afirmativa");

  const badV1 = v1Payload();
  badV1.control.acepta_contacto = false;
  expectFailure(() => context.validarPedido_(context.normalizarPedido_(badV1)), /aceptación de contacto/i, "V1 consentimiento");

  const v2Source = v2Payload();
  const v2 = context.normalizarPedido_(v2Source);
  context.validarPedido_(v2);
  ok(v2.contrato_entrada === "v2", "V2 sigue en ruta primaria");

  // El correo V2 que se entrega a MicroFactory debe salir por la misma ruta
  // que producción: doPost() asigna recibido_apps_script_iso y el dry-run
  // devuelve el cuerpo técnico sin Drive ni correo. No fabricamos a mano un
  // campo que producción es responsable de crear.
  const dryRunResponse = context.doPost({
    postData: { contents: JSON.stringify(v2Source) },
    parameter: {},
  });
  const dryRun = JSON.parse(dryRunResponse.value);
  ok(dryRun.ok === true, "doPost V2 dry-run acepta el payload contractual");
  ok(dryRun.dry_run === true, "doPost V2 confirma modo dry-run sin efectos");
  ok(dryRun.version === "TAKARA_PEDIDO_WEB_V2", "doPost V2 devuelve plantilla V2");
  ok(
    dryRun.script === "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1",
    "doPost V2 devuelve versión dual-stack"
  );
  const bodyV2 = String(dryRun.technical_email_body || "");
  ok(bodyV2.includes("[TAKARA_PEDIDO_WEB_V2]"), "V2 conserva marcador técnico");
  ok(bodyV2.includes("[ATRIBUCION]"), "V2 conserva sección de atribución");
  ok(
    bodyV2.includes("Versión atribución: TAKARA_STORE_ATTRIBUTION_V1"),
    "V2 conserva contrato de atribución"
  );
  ok(bodyV2.includes("Origen pedido: DIRECT"), "V2 DIRECT sigue siendo DIRECT");
  ok(bodyV2.includes("[IMPORTES]"), "V2 conserva importes estructurados");
  ok(bodyV2.includes("Código postal: 15001"), "V2 conserva entrega postal");
  const receivedIsoMatch = bodyV2.match(/^Recibido Apps Script ISO:\s*(.+)$/m);
  ok(receivedIsoMatch, "V2 emite Recibido Apps Script ISO");
  ok(receivedIsoMatch[1] !== "undefined", "V2 nunca emite timestamp undefined");
  ok(!Number.isNaN(Date.parse(receivedIsoMatch[1])), "V2 emite timestamp ISO parseable");

  const badV2 = v2Payload();
  badV2.snapshot_pedido = {};
  expectFailure(() => context.normalizarPedido_(badV2), /Snapshot V2/i, "V2 incompleto no baja a V1");

  const unknown = v1Payload();
  unknown.payload_version = "TAKARA_WEB_ORDER_PAYLOAD_V9";
  expectFailure(() => context.normalizarPedido_(unknown), /no compatible/i, "Versión desconocida fail-closed");

  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "EMAIL_V1_PUBLIC_SHAPE.txt"), "Asunto: [TAKARA PEDIDO WEB] " + v1.pedido_web_id + "\n\n" + bodyV1 + "\n", "utf8");
    fs.writeFileSync(path.join(outDir, "EMAIL_V1_PARSER_COMPAT.txt"), "Asunto: [TAKARA PEDIDO WEB] " + v1Parser.pedido_web_id + "\n\n" + bodyV1Parser + "\n", "utf8");
    fs.writeFileSync(path.join(outDir, "EMAIL_V2.txt"), "Asunto: [TAKARA PEDIDO WEB] " + v2.pedido_web_id + "\n\n" + bodyV2 + "\n", "utf8");
  }

  console.log("[TAKARA_TRANSITION_V1_V2_TEST_OK] " + JSON.stringify({
    v1_accepted: true,
    v1_email_marker: true,
    v1_public_privacy_preserved_without_rewrite: true,
    v1_parser_compatible_fixture_emitted: true,
    v1_shipping_pending_not_zero: true,
    v2_primary: true,
    v1_v2_attribution_direct_preserved: true,
    f3c_authority_loaded_in_transition_vm: true,
    v2_email_emitted_through_real_doPost_dry_run: true,
    v2_received_apps_script_iso_valid: true,
    v2_incomplete_rejected_without_downgrade: true,
    unknown_version_rejected: true,
  }));
}

main();
