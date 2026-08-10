/* TAKARA ORDER CONTRACT V2 - CROSS CONTRACT TEST */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function loadAppsScript(codePath) {
  const source = fs.readFileSync(codePath, "utf8");
  const context = {
    console,
    JSON,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    isFinite,
    Utilities: {
      formatDate: function () {
        return "2026-08-10 22:30:00";
      }
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: function (value) {
        return {
          value: value,
          setMimeType: function () {
            return this;
          }
        };
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function basePayload() {
  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: "TK-WEB-20260810-223000-A1B2C3",
    creado_en_iso: "2026-08-10T20:30:00.000Z",
    modo_prueba: true,
    cliente: {
      nombre: "Cliente Contrato V2",
      email: "cliente@example.com",
      telefono: "600123123"
    },
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
      extras: [
        {
          codigo: "personalizacion_texto_2_lados",
          nombre: "Texto personalizado · 2 lados",
          precio_extra_eur: "6.00"
        }
      ],
      cantidad: 1,
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "6.00",
      precio_unitario_final_eur: "41.00",
      precio_total_eur: "41.00",
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
      personalizacion_marco: {
        version: "TAKARA_FRAME_TEXT_V1_4",
        geometry_contract: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
        orientacion: "vertical",
        numero_lados: 2,
        suplemento_unitario_eur: "6.00",
        color_texto: "ebano",
        color_texto_nombre: "Ébano",
        lados: {
          top: "Para siempre",
          right: "2026"
        }
      }
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
      texto_cliente:
        "Envío estándar con seguimiento a España peninsular por 6,50 €."
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
      pricing_version: "TAKARA_PRICING_V1"
    },
    archivos: {
      foto_base64: "data:image/jpeg;base64,AAAA",
      nombre_archivo: "foto.jpg",
      content_type: "image/jpeg",
      size_bytes: 123456
    },
    mensaje_cliente: "Prueba controlada V2.",
    control: {
      consiente_gestion_datos: true,
      declara_derechos_y_autoriza_revision_imagen: true,
      autoriza_publicacion_resultado: false
    },
    meta: {
      pagina_origen: "https://www.takara3d.es/pedido.html",
      entorno: "produccion"
    }
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
    meta: payload.meta
  }));
  return payload;
}

function normalizeAndValidate(context, payload) {
  const pedido = context.normalizarPedido_(payload);
  pedido.recibido_apps_script_iso = "2026-08-10T20:30:01.000Z";
  context.validarPedido_(pedido);
  return pedido;
}

function expectFailure(context, payload, pattern) {
  let error = null;
  try {
    normalizeAndValidate(context, payload);
  } catch (caught) {
    error = caught;
  }
  assert(error, "Se esperaba rechazo y el caso fue aceptado");
  assert(
    pattern.test(String(error.message || error)),
    "Mensaje de rechazo inesperado: " + String(error.message || error)
  );
}

function buildEmail(context, payload) {
  const pedido = normalizeAndValidate(context, payload);
  const foto = {
    foto_recibida: true,
    enlace_drive: "https://drive.google.com/file/d/DRYRUN/view",
    id_archivo_drive: "DRYRUN",
    nombre_archivo_foto: "foto.jpg",
    tipo_archivo_foto: "image/jpeg",
    tamano_archivo_foto_bytes: 123456,
    estado_archivo: "pendiente_descarga"
  };
  const subject = context.construirAsunto_(payload.pedido_web_id, pedido);
  const body = context.construirCuerpoInterno_(
    payload.pedido_web_id,
    new Date("2026-08-10T20:30:01.000Z"),
    pedido,
    foto,
    null
  );
  return "Asunto: " + subject + "\n\n" + body + "\n";
}

function run() {
  const repo = path.resolve(process.argv[2] || ".");
  const codePath = path.join(
    repo,
    "apps-script",
    "takara-pedidos-web",
    "Code.gs"
  );
  const context = loadAppsScript(codePath);

  const valid = basePayload();
  const normalizedValid = normalizeAndValidate(context, valid);
  assert(
    normalizedValid.control.autoriza_publicacion_resultado === false,
    "El consentimiento de publicación debe poder permanecer desmarcado"
  );
  assert(
    normalizedValid.entrega.municipio_codigo === "15030" &&
      normalizedValid.entrega.municipio_nombre === "A Coruña" &&
      normalizedValid.entrega.municipio_fuente === "cartociudad_automatico",
    "El municipio nacional informativo debe sobrevivir a la normalización"
  );
  const email = buildEmail(context, valid);

  [
    "[TAKARA_PEDIDO_WEB_V2]",
    "[CLIENTE]",
    "[PRODUCTO]",
    "[IMPORTES]",
    "[ENTREGA]",
    "[ARCHIVOS]",
    "[MENSAJE CLIENTE]",
    "[CONTROL]",
    "[TECNICO]",
    "Código postal: 15001",
    "Ubicación código: 15030",
    "Ubicación nombre: A Coruña",
    "Precio entrega EUR: 6.50",
    "Total estimado EUR: 47.50",
    "Payload version: TAKARA_WEB_ORDER_PAYLOAD_V2",
    "Snapshot version: TAKARA_ORDER_SNAPSHOT_V2"
  ].forEach(function (token) {
    assert(email.includes(token), "Falta en email V2: " + token);
  });

  assert(
    !email.includes("Acepta política privacidad:"),
    "V2 no debe emitir el alias antiguo de privacidad"
  );
  assert(
    !email.includes("ID MicroFactory:"),
    "V2 no debe depender de ID MicroFactory legacy"
  );

  const missingSnapshot = basePayload();
  delete missingSnapshot.snapshot_pedido;
  expectFailure(context, missingSnapshot, /snapshot/i);

  const tamperedSnapshot = basePayload();
  tamperedSnapshot.snapshot_pedido.totales.total_estimado_eur = "1.00";
  expectFailure(context, tamperedSnapshot, /snapshot/i);

  const tamperedDelivery = basePayload();
  tamperedDelivery.entrega.precio_eur = "0.00";
  tamperedDelivery.snapshot_pedido.entrega.precio_eur = "0.00";
  expectFailure(context, tamperedDelivery, /entrega|política/i);

  const tamperedProduct = basePayload();
  tamperedProduct.producto.precio_base_eur = "1.00";
  tamperedProduct.snapshot_pedido.producto.precio_base_eur = "1.00";
  expectFailure(context, tamperedProduct, /precio base|catálogo/i);

  const unknownProduct = basePayload();
  unknownProduct.producto.codigo_producto = "PRODUCTO_FUTURO_TEST";
  unknownProduct.snapshot_pedido.producto.codigo_producto =
    "PRODUCTO_FUTURO_TEST";
  expectFailure(context, unknownProduct, /Producto no publicado/i);

  const incompleteV2 = basePayload();
  incompleteV2.payload_version = "TAKARA_WEB_ORDER_PAYLOAD_V2_INCOMPLETO";
  incompleteV2.snapshot_pedido.payload_version =
    "TAKARA_WEB_ORDER_PAYLOAD_V2_INCOMPLETO";
  expectFailure(context, incompleteV2, /V2 declarado/i);

  const emitIndex = process.argv.indexOf("--emit");
  if (emitIndex >= 0) {
    const target = process.argv[emitIndex + 1];
    if (!target) fail("--emit requiere ruta");
    fs.writeFileSync(target, email, "utf8");
  }

  console.log(
    "TAKARA_ORDER_CONTRACT_V2_TEST_OK " +
    JSON.stringify({
      valid_email: true,
      snapshot_missing_rejected: true,
      snapshot_tamper_rejected: true,
      delivery_tamper_rejected: true,
      product_price_tamper_rejected: true,
      unknown_product_rejected_by_emitter_catalog: true,
      incomplete_v2_rejected: true,
      optional_publication_consent_accepted: true,
      municipality_information_preserved: true
    })
  );
}

run();
