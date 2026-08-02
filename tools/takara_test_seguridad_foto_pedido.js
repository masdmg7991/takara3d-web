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
  return {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V1",
    pedido_web_id: "TK-WEB-SECURITY-TEST",
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
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Madera clara",
      color_litofania: "Blanco natural",
      cantidad: 1,
      precio_mostrado_eur: "35.00",
      personalizacion_marco: null
    },
    archivos: {
      foto_base64: "data:image/jpeg;base64,/9j/2Q==",
      nombre_archivo: "foto-prueba.jpg",
      content_type: "image/jpeg",
      size_bytes: 4
    },
    control: {
      acepta_contacto: true,
      acepta_revision: true
    }
  };
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
