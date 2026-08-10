"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CODE_GS = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "Code.gs"
);
let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }

  checks += 1;
  process.stdout.write("[OK] " + message + "\n");
}

function expectThrow(action, pattern, message) {
  let caught = null;

  try {
    action();
  } catch (error) {
    caught = error;
  }

  ok(caught && pattern.test(String(caught.message || caught)), message);
}

function loadServerContext() {
  const context = {
    Utilities: {
      base64Decode: function (value) {
        return Array.from(Buffer.from(String(value || ""), "base64"));
      },
      newBlob: function (bytes, contentType, filename) {
        return {
          bytes: bytes,
          contentType: contentType,
          filename: filename
        };
      }
    },
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    JSON: JSON,
    Date: Date,
    Math: Math,
    RegExp: RegExp,
    Error: Error,
    isFinite: isFinite,
    parseInt: parseInt,
    parseFloat: parseFloat,
    NaN: NaN
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(CODE_GS, "utf8"), context, {
    filename: CODE_GS
  });
  return context;
}

function validPayload() {
  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: "TK-WEB-SECURITY-TEST",
    creado_en_iso: "2026-08-10T20:30:00.000Z",
    modo_prueba: false,
    cliente: {
      nombre: "Cliente prueba",
      email: "cliente@example.com",
      telefono: "600123123"
    },
    meta: {
      pagina_origen: "https://takara3d.es/pedido.html",
      entorno: "produccion"
    },
    producto: {
      producto: "Marco litofania personalizado",
      codigo_producto: "MARCO_LITOFANIA_144X108",
      variante_codigo: "vertical",
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Madera clara",
      color_litofania: "Blanco natural",
      atributos: { familia: "litofania" },
      extras: [],
      cantidad: 1,
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "0.00",
      precio_unitario_final_eur: "35.00",
      precio_total_eur: "35.00",
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
      personalizacion_marco: null
    },
    entrega: {
      version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
      modalidad_solicitada: "entrega_local",
      modalidad_resuelta: "entrega_local",
      codigo_postal: "28911",
      zona_codigo: "leganes",
      zona_nombre: "Leganés",
      area_codigo: "leganes",
      fuente_decision: "codigo_postal_automatico",
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: "Leganés",
      localidad_informativa: "Leganés",
      municipio_codigo: "28074",
      municipio_nombre: "Leganés",
      provincia_nombre: "Madrid",
      municipio_fuente: "cartociudad_automatico",
      precio_eur: "0.00",
      moneda: "EUR",
      estado_precio: "confirmado",
      direccion_completa_solicitada: false,
      texto_cliente: "Entrega local gratuita en Leganés. Acordaremos contigo el día y el lugar."
    },
    totales: {
      version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
      subtotal_productos_eur: "35.00",
      precio_entrega_eur: "0.00",
      total_estimado_eur: "35.00",
      estado_total: "confirmado",
      moneda: "EUR"
    },
    archivos: {
      foto_base64: "data:image/jpeg;base64,/9j/2Q==",
      nombre_archivo: "foto-prueba.jpg",
      content_type: "image/jpeg",
      size_bytes: 4
    },
    mensaje_cliente: "",
    control: {
      consiente_gestion_datos: true,
      declara_derechos_y_autoriza_revision_imagen: true,
      autoriza_publicacion_resultado: false
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testRequiredPhoto(server) {
  const legitimate = validPayload();
  const legitimateOrder = server.normalizarPedido_(legitimate);

  server.validarPedido_(legitimateOrder);
  ok(true, "Servidor acepta un pedido contractual con foto original");

  const transportBypass = clone(legitimate);
  transportBypass.modo_transporte = "pedido_ligero_sin_foto_base64";
  transportBypass.archivos.foto_base64 = "";

  expectThrow(
    function () {
      server.validarPedido_(server.normalizarPedido_(transportBypass));
    },
    /Falta la foto/i,
    "Servidor rechaza el bypass por modo de transporte"
  );

  const presenceFlagBypass = clone(legitimate);
  presenceFlagBypass.archivos.foto_base64 = "";
  presenceFlagBypass.archivos.foto_base64_presente = true;

  expectThrow(
    function () {
      server.validarPedido_(server.normalizarPedido_(presenceFlagBypass));
    },
    /Falta la foto/i,
    "Servidor rechaza el bypass por bandera de presencia"
  );

  const testModeBypass = clone(legitimate);
  testModeBypass.modo_prueba = true;
  testModeBypass.archivos.foto_base64 = "";

  expectThrow(
    function () {
      server.validarPedido_(server.normalizarPedido_(testModeBypass));
    },
    /Falta la foto/i,
    "Servidor rechaza el bypass por modo de prueba"
  );
}

function testPhotoIntegrity(server) {
  const legitimate = validPayload();
  const order = server.normalizarPedido_(legitimate);
  const prepared = server.prepararFotoOriginal_(
    legitimate.pedido_web_id,
    order.archivos
  );

  ok(prepared.content_type === "image/jpeg", "Tipo real de foto detectado por firma");
  ok(prepared.size_bytes === 4, "Tamaño real de foto calculado en servidor");
  ok(
    prepared.nombre_archivo === "TK-WEB-SECURITY-TEST_original.jpg",
    "Nombre de foto controlado por el servidor"
  );

  const fakeImage = clone(legitimate);
  fakeImage.archivos.foto_base64 = "data:image/jpeg;base64,VEVTVA==";

  expectThrow(
    function () {
      const fakeOrder = server.normalizarPedido_(fakeImage);
      server.prepararFotoOriginal_(fakeImage.pedido_web_id, fakeOrder.archivos);
    },
    /JPG, PNG o WEBP/i,
    "Servidor rechaza texto disfrazado de imagen"
  );

  const wrongSize = clone(legitimate);
  wrongSize.archivos.size_bytes = 99;

  expectThrow(
    function () {
      const wrongSizeOrder = server.normalizarPedido_(wrongSize);
      server.prepararFotoOriginal_(wrongSize.pedido_web_id, wrongSizeOrder.archivos);
    },
    /tama.o real/i,
    "Servidor rechaza tamaño de foto manipulado"
  );
}

function testStaticContract() {
  const serverSource = fs.readFileSync(CODE_GS, "utf8");

  ok(
    !serverSource.includes("function esPedidoLigeroSinFoto_"),
    "El backend ya no contiene el bypass ligero"
  );
  ok(
    !serverSource.includes("payload.modo_prueba !== true"),
    "El backend no confia en modo_prueba para admitir pedidos"
  );
  ok(
    serverSource.indexOf("prepararFotoOriginal_") <
      serverSource.indexOf("asegurarCarpetaPedido_"),
    "La foto se valida antes de crear carpetas en Drive"
  );
}

function main() {
  const server = loadServerContext();
  testRequiredPhoto(server);
  testPhotoIntegrity(server);
  testStaticContract();
  process.stdout.write(
    "[TAKARA_ORDER_PHOTO_SECURITY_TEST_OK] " + checks + " comprobaciones\n"
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
}
