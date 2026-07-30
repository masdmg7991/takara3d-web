"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const ORDER_JS = path.join(ROOT, "assets", "js", "takara-pedido-web.js");
const PRICING_JS = path.join(ROOT, "assets", "js", "core", "takara-pricing.js");
const SNAPSHOT_JS = path.join(ROOT, "assets", "js", "core", "takara-order-snapshot.js");
const CATALOG_JSON = path.join(ROOT, "assets", "data", "catalogo.json");
const CODE_GS = path.join(ROOT, "apps-script", "takara-pedidos-web", "Code.gs");

const SIDE_ORDER = ["top", "right", "bottom", "left"];
const SIDE_TEXT = {
  top: "Siempre juntos",
  right: "2026",
  bottom: "Nuestro tesoro",
  left: "M & L"
};
const EXPECTED_SUPPLEMENT = { 0: "0.00", 1: "4.00", 2: "6.00", 3: "8.00", 4: "8.00" };
const EXPECTED_UNIT = { 0: "35.00", 1: "39.00", 2: "41.00", 3: "43.00", 4: "43.00" };

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

function makeRawPersonalization(count, overrides) {
  if (count === 0) return "";

  const sides = {};
  SIDE_ORDER.slice(0, count).forEach(function (side) {
    sides[side] = SIDE_TEXT[side];
  });

  return JSON.stringify(Object.assign({
    version: "TAKARA_FRAME_TEXT_V1_4",
    geometry_contract: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
    orientacion: "vertical",
    numero_lados: count,
    suplemento_unitario_eur: EXPECTED_SUPPLEMENT[count],
    color_texto: "negro",
    color_texto_nombre: "Negro",
    lados: sides
  }, overrides || {}));
}

function loadClientOrderApi() {
  const context = {
    window: {
      location: { href: "http://localhost/pedido.html", hostname: "localhost", search: "" },
      console: console
    },
    document: {
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    },
    console: console,
    URLSearchParams: URLSearchParams,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    JSON: JSON,
    Date: Date,
    Math: Math,
    RegExp: RegExp,
    Error: Error
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(ORDER_JS, "utf8"), context, { filename: ORDER_JS });
  return context.window.TAKARA_FRAME_TEXT_ORDER_V1;
}

function loadPricingContext() {
  const context = { window: {}, console: console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(PRICING_JS, "utf8"), context, { filename: PRICING_JS });
  vm.runInContext(fs.readFileSync(SNAPSHOT_JS, "utf8"), context, { filename: SNAPSHOT_JS });
  return context.window;
}

function loadFullClientContext(catalog) {
  const context = {
    window: {
      location: { href: "http://localhost/pedido.html", hostname: "localhost", search: "" },
      console: {
        log: console.log,
        warn: function () {}
      },
      crypto: {
        getRandomValues: function (bytes) {
          bytes.fill(7);
          return bytes;
        }
      }
    },
    document: {
      addEventListener: function () {},
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    },
    console: console,
    URLSearchParams: URLSearchParams,
    Uint8Array: Uint8Array,
    FileReader: function FileReader() {
      this.result = "";
      this.onload = null;
      this.onerror = null;
      this.readAsDataURL = function (file) {
        this.result = file.dataUrl;
        this.onload();
      };
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
    Promise: Promise
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(PRICING_JS, "utf8"), context, { filename: PRICING_JS });
  vm.runInContext(fs.readFileSync(SNAPSHOT_JS, "utf8"), context, { filename: SNAPSHOT_JS });
  context.window.TAKARA_CATALOGO_CORE_V1 = {
    loadCatalog: function () {
      return Promise.resolve(catalog);
    }
  };

  const orderSource = fs.readFileSync(ORDER_JS, "utf8");
  const closingMarker = "\n}());";
  const closingIndex = orderSource.lastIndexOf(closingMarker);
  ok(closingIndex > 0, "Motor web permite instrumentación contractual de prueba");
  const instrumented = orderSource.slice(0, closingIndex) +
    "\n  window.__TAKARA_ORDER_INTERNAL_TEST = Object.freeze({" +
    "\n    buildPayload: buildPayload," +
    "\n    enrichPayloadWithCatalogSnapshot: enrichPayloadWithCatalogSnapshot" +
    "\n  });" +
    orderSource.slice(closingIndex);

  vm.runInContext(instrumented, context, { filename: ORDER_JS });
  return context;
}

function loadServerContext() {
  const sentEmails = [];
  const context = {
    console: console,
    MailApp: {
      sendEmail: function (options) {
        sentEmails.push(options);
      }
    },
    Utilities: {
      formatDate: function () { return "2026-07-29 12:00:00"; }
    },
    DriveApp: {},
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: function (text) {
        return {
          text: text,
          setMimeType: function () { return this; }
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
  vm.runInContext(fs.readFileSync(CODE_GS, "utf8"), context, { filename: CODE_GS });
  context.sentEmails = sentEmails;
  return context;
}

function buildServerPayload(personalization, count, overrides) {
  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V1",
    pedido_web_id: "TK-WEB-TEST01",
    modo_prueba: true,
    cliente: {
      nombre: "Cliente prueba",
      email: "cliente@example.com",
      telefono: "600123123"
    },
    meta: {
      pagina_origen: "http://localhost/pedido.html",
      entorno: "local"
    },
    producto: {
      producto: "Marco litofanía personalizado",
      codigo_producto: "MARCO_LITOFANIA_144X108",
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Madera clara",
      color_litofania: "Blanco natural",
      cantidad: 1,
      precio_mostrado_eur: EXPECTED_UNIT[count],
      personalizacion_marco: personalization
    },
    archivos: {},
    mensaje_cliente: "Prueba contractual",
    control: {
      acepta_contacto: true,
      acepta_revision: true,
      acepta_politica_privacidad: "sí"
    }
  };

  return Object.assign(payload, overrides || {});
}

function testClientParserAndPricing() {
  const orderApi = loadClientOrderApi();
  const pricingWindow = loadPricingContext();
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));

  ok(orderApi && typeof orderApi.parse === "function", "API contractual de personalización disponible");
  ok(orderApi.parse("", "vertical") === null, "Pedido sin texto conserva personalización nula");

  for (let count = 1; count <= 4; count += 1) {
    const parsed = orderApi.parse(makeRawPersonalization(count), "vertical");
    const extraCode = orderApi.extraCodeForSideCount(count);
    const snapshot = pricingWindow.TAKARA_ORDER_SNAPSHOT_V1.build({
      catalog: catalog,
      selection: {
        product_code: "MARCO_LITOFANIA_144X108",
        variant_code: "vertical",
        extra_codes: [extraCode],
        quantity: 1
      },
      cliente: {},
      archivos: {},
      meta: {}
    });

    ok(parsed.numero_lados === count, "Cliente conserva " + count + " lado(s)");
    ok(parsed.suplemento_unitario_eur === EXPECTED_SUPPLEMENT[count], "Cliente conserva suplemento de " + count + " lado(s)");
    ok(snapshot.producto.precio_unitario_final_eur === EXPECTED_UNIT[count], "Catálogo calcula precio final de " + count + " lado(s)");
  }

  expectThrow(
    function () {
      orderApi.parse(makeRawPersonalization(1, { suplemento_unitario_eur: "8.00" }), "vertical");
    },
    /suplemento/i,
    "Cliente rechaza suplemento manipulado"
  );
  expectThrow(
    function () {
      orderApi.parse(makeRawPersonalization(1, { orientacion: "horizontal" }), "vertical");
    },
    /orientaci/i,
    "Cliente rechaza orientación incoherente"
  );
  expectThrow(
    function () {
      orderApi.parse(makeRawPersonalization(1, { lados: { top: "", fake: "x" } }), "vertical");
    },
    /lado no permitido/i,
    "Cliente rechaza lados ajenos al contrato"
  );
  expectThrow(
    function () {
      orderApi.parse(makeRawPersonalization(1, { lados: { top: { value: "texto" } } }), "vertical");
    },
    /formato v/i,
    "Cliente rechaza textos que no sean cadenas"
  );
}

async function testFullClientPayload() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  const context = loadFullClientContext(catalog);
  const fields = {
    nombre: { value: "Cliente prueba" },
    email: { value: "cliente@example.com" },
    whatsapp: { value: "600123123" },
    cantidad: { value: "2" },
    formato: { value: "vertical" },
    color_marco: { value: "actual", checked: true },
    personalizacion_marco: { value: makeRawPersonalization(2) },
    notas: { value: "Pedido end-to-end" },
    acepta_contacto: { checked: true },
    acepta_revision: { checked: true }
  };
  const photo = {
    name: "foto.jpg",
    type: "image/jpeg",
    size: 1024,
    dataUrl: "data:image/jpeg;base64,VEVTVA=="
  };
  const form = {
    querySelector: function (selector) {
      if (selector === "[data-takara-photo-input]") {
        return { files: [photo] };
      }

      const match = selector.match(/^\[name="([^"]+)"\](?::checked)?$/);
      if (!match) return null;

      const field = fields[match[1]] || null;
      if (selector.endsWith(":checked") && (!field || !field.checked)) return null;
      return field;
    }
  };

  const basePayload = await context.window.__TAKARA_ORDER_INTERNAL_TEST.buildPayload(form);
  const payload = await context.window.__TAKARA_ORDER_INTERNAL_TEST.enrichPayloadWithCatalogSnapshot(basePayload);

  ok(payload.producto.personalizacion_marco.numero_lados === 2, "Payload real conserva dos lados");
  ok(payload.producto.personalizacion_marco.lados.top === SIDE_TEXT.top, "Payload real conserva texto superior");
  ok(payload.producto.personalizacion_marco.lados.right === SIDE_TEXT.right, "Payload real conserva texto derecho");
  ok(payload.producto.precio_unitario_final_eur === "41.00", "Payload real calcula 41,00 EUR por unidad");
  ok(payload.producto.precio_total_eur === "82.00", "Payload real calcula 82,00 EUR para dos unidades");
  ok(payload.snapshot_pedido.producto.personalizacion_marco.numero_lados === 2, "Snapshot real conserva personalización");
  ok(payload.snapshot_pedido.producto.extras[0].codigo === "personalizacion_texto_2_lados", "Snapshot real conserva extra contractual");
  ok(
    payload.archivos.ficha_visual_estado === "no_generada",
    "Un fallo de ficha visual no bloquea el payload estructurado"
  );
}

function testServerAndEmails() {
  const server = loadServerContext();
  const noTextPayload = buildServerPayload(null, 0);
  const noTextOrder = server.normalizarPedido_(noTextPayload);

  server.validarPedido_(noTextOrder, noTextPayload);
  ok(noTextOrder.producto.personalizacion_marco.activa === false, "Servidor conserva pedido sin texto");

  const photo = {
    foto_recibida: true,
    enlace_drive: "https://drive.example/file",
    id_archivo_drive: "drive-test",
    nombre_archivo_foto: "test.jpg",
    tipo_archivo_foto: "image/jpeg",
    tamano_archivo_foto_bytes: 1234,
    estado_archivo: "pendiente_descarga",
    nota_archivo: ""
  };

  for (let count = 1; count <= 4; count += 1) {
    const personalization = JSON.parse(makeRawPersonalization(count));
    const payload = buildServerPayload(personalization, count);
    const order = server.normalizarPedido_(payload);

    server.validarPedido_(order, payload);

    const internalText = server.construirCuerpoInterno_(
      "TK-WEB-TEST01",
      new Date("2026-07-29T10:00:00Z"),
      order,
      photo
    );
    const internalHtml = server.construirHtmlInterno_("TK-WEB-TEST01", order, photo);
    const customerHtml = server.construirHtmlConfirmacionPedidoCliente_("TK-WEB-TEST01", order, photo);

    server.sentEmails.length = 0;
    server.enviarConfirmacionCliente_("TK-WEB-TEST01", order, photo);
    const customerText = server.sentEmails[0].body;

    ok(internalText.includes("[PERSONALIZACION_MARCO]"), "Correo interno plano incluye bloque contractual");
    ok(internalText.includes("Texto superior: " + SIDE_TEXT.top), "Correo interno plano incluye texto superior");
    ok(internalHtml.includes("Texto en el marco"), "Correo interno HTML incluye personalización");
    ok(customerText.includes("TEXTO EN EL MARCO"), "Correo cliente plano incluye personalización");
    ok(customerText.includes("Superior: " + SIDE_TEXT.top), "Correo cliente plano incluye texto superior");
    ok(customerHtml.includes("Texto en el marco"), "Correo cliente HTML incluye personalización");
    ok(customerHtml.includes(EXPECTED_UNIT[count].replace(".", ",") + " €"), "Correo cliente muestra precio final de " + count + " lado(s)");

    SIDE_ORDER.slice(0, count).forEach(function (side) {
      ok(internalText.includes(SIDE_TEXT[side]), "Correo interno conserva lado " + side);
      ok(customerText.includes(SIDE_TEXT[side]), "Correo cliente conserva lado " + side);
      ok(customerHtml.includes(SIDE_TEXT[side].replace("&", "&amp;")), "Correo HTML conserva lado " + side);
    });
  }

  const tamperedSupplement = JSON.parse(makeRawPersonalization(1));
  tamperedSupplement.suplemento_unitario_eur = "8.00";
  expectThrow(
    function () {
      const payload = buildServerPayload(tamperedSupplement, 1);
      const order = server.normalizarPedido_(payload);
      server.validarPedido_(order, payload);
    },
    /suplemento/i,
    "Servidor rechaza suplemento manipulado"
  );

  const tamperedPrice = JSON.parse(makeRawPersonalization(1));
  expectThrow(
    function () {
      const payload = buildServerPayload(tamperedPrice, 1);
      payload.producto.precio_mostrado_eur = "35.00";
      const order = server.normalizarPedido_(payload);
      server.validarPedido_(order, payload);
    },
    /precio/i,
    "Servidor rechaza precio sin suplemento"
  );

  const mismatchedSides = JSON.parse(makeRawPersonalization(2));
  delete mismatchedSides.lados.right;
  expectThrow(
    function () {
      const payload = buildServerPayload(mismatchedSides, 2);
      const order = server.normalizarPedido_(payload);
      server.validarPedido_(order, payload);
    },
    /no coinciden/i,
    "Servidor rechaza número de lados incoherente"
  );

  const invalidTextType = JSON.parse(makeRawPersonalization(1));
  invalidTextType.lados.top = { value: "texto" };
  expectThrow(
    function () {
      const payload = buildServerPayload(invalidTextType, 1);
      server.normalizarPedido_(payload);
    },
    /formato v/i,
    "Servidor rechaza textos que no sean cadenas"
  );

  const htmlSensitive = JSON.parse(makeRawPersonalization(1));
  htmlSensitive.lados.top = "<b>Tesoro & luz</b>";
  const htmlPayload = buildServerPayload(htmlSensitive, 1);
  const htmlOrder = server.normalizarPedido_(htmlPayload);
  server.validarPedido_(htmlOrder, htmlPayload);
  const safeHtml = server.construirHtmlConfirmacionPedidoCliente_(
    "TK-WEB-TEST01",
    htmlOrder,
    photo
  );
  ok(safeHtml.includes("&lt;b&gt;Tesoro &amp; luz&lt;/b&gt;"), "Correo HTML escapa el texto del cliente");
  ok(!safeHtml.includes("<b>Tesoro & luz</b>"), "Correo HTML no interpreta etiquetas del cliente");
}

function testStaticTransportContract() {
  const source = fs.readFileSync(ORDER_JS, "utf8");

  ok(source.includes('value(form, "personalizacion_marco")'), "Motor de pedido lee el campo oculto");
  ok(source.includes("extra_codes: extraCodes"), "Motor de pedido envía el suplemento al catálogo");
  ok(source.includes("personalizacion_marco: personalizacionMarco"), "Payload y snapshot conservan la personalización");
}

async function main() {
  testClientParserAndPricing();
  await testFullClientPayload();
  testServerAndEmails();
  testStaticTransportContract();
  process.stdout.write("[TAKARA_FRAME_TEXT_ORDER_TEST_OK] " + checks + " comprobaciones\n");
}

main().catch(function (error) {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
});
