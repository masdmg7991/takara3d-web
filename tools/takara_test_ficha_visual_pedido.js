"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const ORDER_JS = path.join(ROOT, "assets", "js", "takara-pedido-web.js");
const ORDER_HTML = path.join(ROOT, "pedido.html");
const CODE_GS = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "Code.gs"
);

let checks = 0;

const TEST_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkM" +
  "EQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4I" +
  "CA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e" +
  "Hh4eHh7/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQF" +
  "BgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEI" +
  "I0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNk" +
  "ZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLD" +
  "xMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEB" +
  "AQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJB" +
  "UQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZH" +
  "SElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaan" +
  "qKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oA" +
  "DAMBAAIRAxEAPwD7LooooA//2Q==";

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }

  checks += 1;
  process.stdout.write("[OK] " + message + "\n");
}

function loadServerContext() {
  const sentEmails = [];
  const createdBlobs = [];
  const base64DecodeCalls = [];

  function createTestBlob(bytes, contentType, filename) {
    return {
      bytes: bytes,
      contentType: contentType,
      filename: filename,
      copyBlob: function () {
        return createTestBlob(
          Array.isArray(this.bytes) ? this.bytes.slice() : this.bytes,
          this.contentType,
          this.filename
        );
      },
      setName: function (name) {
        this.filename = name;
        return this;
      }
    };
  }

  const context = {
    MailApp: {
      sendEmail: function (options) {
        sentEmails.push(options);
      }
    },
    Utilities: {
      formatDate: function () {
        return "2026-07-29 12:00:00";
      },
      base64Decode: function (value) {
        const encoded = String(value || "");
        base64DecodeCalls.push(encoded.length);
        return Array.from(Buffer.from(encoded, "base64"));
      },
      newBlob: function (bytes, contentType, filename) {
        const blob = createTestBlob(bytes, contentType, filename);
        createdBlobs.push(blob);
        return blob;
      }
    },
    DriveApp: {},
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: function (text) {
        return {
          text: text,
          setMimeType: function () {
            return this;
          }
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
  context.sentEmails = sentEmails;
  context.createdBlobs = createdBlobs;
  context.base64DecodeCalls = base64DecodeCalls;
  return context;
}

function makeVisualFiles(overrides) {
  const jpegBytes = Buffer.from(TEST_JPEG_BASE64, "base64");
  return Object.assign({
    ficha_visual_base64: "data:image/jpeg;base64," + jpegBytes.toString("base64"),
    ficha_visual_nombre_archivo: "TK-WEB-TEST_vista_previa.jpg",
    ficha_visual_content_type: "image/jpeg",
    ficha_visual_size_bytes: jpegBytes.length,
    ficha_visual_version: "TAKARA_ORDER_VISUAL_PROOF_V1",
    ficha_visual_estado: "generada",
    ficha_visual_modo: "encendida"
  }, overrides || {});
}

function makeFolder() {
  const created = [];
  return {
    created: created,
    createFile: function (blob) {
      created.push(blob);
      return {
        getUrl: function () {
          return "https://drive.example/visual-proof";
        },
        getId: function () {
          return "visual-proof-id";
        }
      };
    }
  };
}

function makeOrder() {
  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: "TK-WEB-VISUAL-TEST",
    creado_en_iso: "2026-08-10T20:30:00.000Z",
    modo_prueba: true,
    cliente: {
      nombre: "Cliente prueba",
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
      color_marco: "Madera clara",
      color_litofania: "Blanco natural",
      atributos: { familia: "litofania" },
      extras: [{
        codigo: "personalizacion_texto_1_lado",
        nombre: "Texto personalizado · 1 lado",
        precio_extra_eur: "4.00"
      }],
      cantidad: 1,
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "4.00",
      precio_unitario_final_eur: "39.00",
      precio_total_eur: "39.00",
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
      personalizacion_marco: {
        version: "TAKARA_FRAME_TEXT_V1_4",
        geometry_contract: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
        orientacion: "vertical",
        activa: true,
        numero_lados: 1,
        suplemento_unitario_eur: "4.00",
        color_texto: "negro",
        color_texto_nombre: "Negro",
        lados: { top: "Siempre juntos" }
      }
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
      subtotal_productos_eur: "39.00",
      precio_entrega_eur: "0.00",
      total_estimado_eur: "39.00",
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
    },
    meta: {
      pagina_origen: "http://localhost/pedido.html",
      entorno: "local"
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

function makePhoto() {
  return {
    foto_recibida: true,
    enlace_drive: "https://drive.example/original",
    id_archivo_drive: "original-id",
    nombre_archivo_foto: "TK-WEB-TEST_original.jpg",
    tipo_archivo_foto: "image/jpeg",
    tamano_archivo_foto_bytes: 1000,
    estado_archivo: "pendiente_descarga",
    nota_archivo: ""
  };
}

function testStaticClientContract() {
  const source = fs.readFileSync(ORDER_JS, "utf8");
  const page = fs.readFileSync(ORDER_HTML, "utf8");

  [
    "TAKARA_ORDER_VISUAL_PROOF_V1",
    "captureVisualProof",
    "createOverlayImage",
    "waitForPreviewPhoto",
    "ficha_visual_base64",
    "ficha_visual_size_bytes",
    "VISUAL_PROOF_MAX_BYTES",
    "La ficha visual no pudo generarse; el pedido conserva todos los datos estructurados"
  ].forEach(function (marker) {
    ok(source.includes(marker), "Motor web conserva marcador: " + marker);
  });

  ok(
    page.includes("takara-pedido-web.js?v=pedido-entrega-v2-2"),
    "pedido.html invalida la caché del motor con ficha visual"
  );
  ok(
    source.includes("window.TAKARA_ORDER_VISUAL_PROOF_V1"),
    "Motor expone una API de prueba acotada"
  );
}

async function testClientComposition() {
  const drawCalls = [];
  const sourceTextNode = {};
  const cloneTextNode = {
    setAttribute: function () {},
    removeAttribute: function () {}
  };
  const cloneOverlay = {
    setAttribute: function () {},
    removeAttribute: function () {},
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [cloneTextNode];
    }
  };
  const sourceOverlay = {
    cloneNode: function () {
      return cloneOverlay;
    },
    querySelectorAll: function () {
      return [sourceTextNode];
    }
  };
  const sourceCanvas = {
    width: 1200,
    height: 900,
    style: {
      width: "600px",
      height: "450px"
    },
    getBoundingClientRect: function () {
      return { width: 600, height: 450 };
    }
  };
  const outputContext = {
    fillStyle: "",
    fillRect: function () {},
    drawImage: function () {
      drawCalls.push(Array.from(arguments));
    }
  };
  const outputCanvas = {
    width: 0,
    height: 0,
    getContext: function () {
      return outputContext;
    },
    toBlob: function (callback) {
      callback(new Blob([Buffer.alloc(2048)], { type: "image/jpeg" }));
    }
  };

  function TestImage() {
    this.onload = null;
    this.onerror = null;
  }
  Object.defineProperty(TestImage.prototype, "src", {
    set: function () {
      if (this.onload) this.onload();
    }
  });

  function TestFileReader() {
    this.result = "";
    this.onload = null;
    this.onerror = null;
  }
  TestFileReader.prototype.readAsDataURL = function (blob) {
    const self = this;
    blob.arrayBuffer().then(function (bytes) {
      self.result = "data:image/jpeg;base64," +
        Buffer.from(bytes).toString("base64");
      self.onload();
    }, function () {
      self.onerror();
    });
  };

  const windowObject = {
    location: {
      href: "http://localhost/pedido.html",
      hostname: "localhost",
      search: ""
    },
    console: {
      log: function () {},
      warn: function () {}
    },
    requestAnimationFrame: function (callback) {
      callback();
    },
    setTimeout: setTimeout,
    getComputedStyle: function () {
      return {
        fill: "rgb(21, 21, 21)",
        stroke: "rgba(255, 255, 255, 0.38)",
        strokeWidth: "0.75px",
        paintOrder: "stroke fill",
        fontFamily: "Georgia",
        fontWeight: "700",
        letterSpacing: "0.5px",
        textRendering: "geometricPrecision"
      };
    },
    URL: {
      createObjectURL: function () {
        return "blob:takara-test";
      },
      revokeObjectURL: function () {}
    }
  };
  const context = {
    window: windowObject,
    document: {
      addEventListener: function () {},
      querySelector: function (selector) {
        if (selector === "[data-takara-preview-canvas]") return sourceCanvas;
        if (selector === "[data-takara-frame-text-overlay]") return sourceOverlay;
        if (selector === "[data-takara-file-name]") {
          return {
            title: "foto-prueba.jpg",
            textContent: "foto-prueba.jpg"
          };
        }
        if (selector === "[data-takara-litho-mode].is-active") {
          return {
            getAttribute: function () {
              return "on";
            }
          };
        }
        return null;
      },
      querySelectorAll: function () {
        return [];
      },
      createElement: function (tagName) {
        if (tagName === "canvas") return outputCanvas;
        throw new Error("Elemento inesperado: " + tagName);
      }
    },
    console: windowObject.console,
    URLSearchParams: URLSearchParams,
    Uint8Array: Uint8Array,
    FileReader: TestFileReader,
    Image: TestImage,
    XMLSerializer: function XMLSerializer() {
      this.serializeToString = function () {
        return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      };
    },
    Blob: Blob,
    Buffer: Buffer,
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    JSON: JSON,
    Date: Date,
    Math: Math,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    setTimeout: setTimeout
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(ORDER_JS, "utf8"), context, {
    filename: ORDER_JS
  });

  const result = await context.window.TAKARA_ORDER_VISUAL_PROOF_V1.capture(
    "TK-WEB-VISUAL-TEST",
    "foto-prueba.jpg"
  );

  ok(result.status === "generada", "Cliente genera una ficha visual válida");
  ok(result.content_type === "image/jpeg", "Cliente codifica la ficha como JPEG");
  ok(result.size_bytes === 2048, "Cliente declara el tamaño binario real");
  ok(result.preview_mode === "encendida", "Cliente documenta el modo visible");
  ok(
    result.filename === "TK-WEB-VISUAL-TEST_vista_previa.jpg",
    "Cliente aplica nombre trazable"
  );
  ok(
    /^data:image\/jpeg;base64,/.test(result.data_url),
    "Cliente incorpora la ficha al payload en data URL"
  );
  ok(drawCalls.length === 2, "Composición incluye canvas y capa SVG de textos");
  ok(
    outputCanvas.width === 960 && outputCanvas.height === 720,
    "Cliente limita la ficha a 960 px sin deformarla"
  );
}

function testServerEmailOnly() {
  const server = loadServerContext();
  const files = makeVisualFiles();

  server.validarFichaVisual_(files);
  const visual = server.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    files
  );

  ok(visual.ficha_visual_recibida === true, "Servidor acepta la ficha JPEG válida");
  ok(visual.estado === "preparada", "Servidor prepara la ficha para los correos");
  ok(
    !Object.prototype.hasOwnProperty.call(visual, "enlace_drive"),
    "Servidor no crea metadatos Drive para la ficha"
  );
  ok(
    visual.nombre_archivo === "TK-WEB-TEST_vista_previa.jpg",
    "Servidor aplica nombre trazable por ID de pedido"
  );

  const order = server.normalizarPedido_(makeOrder());
  const photo = makePhoto();

  server.sentEmails.length = 0;
  server.enviarEmailInterno_(
    "Pedido de prueba",
    "Cuerpo técnico",
    "TK-WEB-TEST",
    order,
    photo,
    visual
  );
  server.enviarConfirmacionCliente_(
    "TK-WEB-TEST",
    order,
    photo,
    visual
  );

  ok(server.sentEmails.length === 2, "Se generan los dos correos");
  server.sentEmails.forEach(function (mail, index) {
    ok(
      mail.inlineImages &&
        mail.inlineImages.takaraOrderVisualProof === visual.blob,
      "Correo " + (index + 1) + " incorpora la ficha mediante CID"
    );
    ok(
      mail.htmlBody.includes('src="cid:takaraOrderVisualProof"'),
      "Correo " + (index + 1) + " muestra la ficha en HTML"
    );
  });
  ok(
    Array.isArray(server.sentEmails[0].attachments) &&
      server.sentEmails[0].attachments.length === 1,
    "Correo de Takara adjunta una copia JPG descargable"
  );
  ok(
    server.sentEmails[0].attachments[0] !== visual.blob,
    "Adjunto interno usa una copia independiente del blob inline"
  );
  ok(
    server.sentEmails[0].attachments[0].filename ===
      "TK-WEB-TEST_vista_previa.jpg",
    "Adjunto interno conserva el nombre trazable"
  );
  ok(
    !Object.prototype.hasOwnProperty.call(server.sentEmails[1], "attachments"),
    "Correo del cliente no incorpora adjunto descargable"
  );
  ok(
    !server.sentEmails[1].htmlBody.includes("representación orientativa"),
    "Correo cliente no añade texto nuevo junto a la imagen"
  );
  ok(
    !server.sentEmails[1].body.includes("FICHA VISUAL:"),
    "Correo de texto plano conserva su contenido anterior"
  );
}

function testVisualFailureCannotBlockOrder() {
  const server = loadServerContext();
  const invalidFiles = makeVisualFiles({
    ficha_visual_content_type: "image/png"
  });

  const result = server.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    invalidFiles
  );

  ok(result.ficha_visual_recibida === false, "Servidor descarta una ficha manipulada");
  ok(result.estado === "descartada", "Servidor registra el descarte");
  ok(!result.blob, "Ficha inválida no llega a los correos");

  const emptyResult = server.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    {
      ficha_visual_base64: "",
      ficha_visual_modo: "encendida"
    }
  );
  ok(emptyResult.estado === "no_generada", "Servidor acepta pedidos sin ficha visual");

  const order = server.normalizarPedido_(makeOrder());
  const photo = makePhoto();
  server.sentEmails.length = 0;
  server.enviarConfirmacionCliente_(
    "TK-WEB-TEST",
    order,
    photo,
    result
  );
  ok(server.sentEmails.length === 1, "El correo se envía aunque la ficha se descarte");
  ok(
    !server.sentEmails[0].inlineImages,
    "Una ficha descartada nunca se incrusta en el correo"
  );
}

function testVisualBinaryValidation() {
  const realJpeg = Buffer.from(TEST_JPEG_BASE64, "base64");
  const pngDisguised = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44
  ]);
  const cases = [
    {
      name: "PNG disfrazado como JPEG",
      bytes: pngDisguised
    },
    {
      name: "contenido textual disfrazado como JPEG",
      bytes: Buffer.from("contenido que no es una imagen", "utf8")
    },
    {
      name: "JPEG truncado sin marcador final",
      bytes: realJpeg.subarray(0, realJpeg.length - 2)
    },
    {
      name: "secuencia JPEG artificial demasiado corta",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    }
  ];

  cases.forEach(function (entry) {
    const server = loadServerContext();
    const before = server.createdBlobs.length;
    const result = server.prepararFichaVisualSegura_(
      "TK-WEB-TEST",
      makeVisualFiles({
        ficha_visual_base64:
          "data:image/jpeg;base64," + entry.bytes.toString("base64"),
        ficha_visual_size_bytes: entry.bytes.length
      })
    );

    ok(result.ficha_visual_recibida === false, "Servidor descarta " + entry.name);
    ok(result.estado === "descartada", "Servidor registra " + entry.name);
    ok(
      server.createdBlobs.length === before,
      "Servidor no crea blob para " + entry.name
    );
  });

  const sizeServer = loadServerContext();
  const sizeResult = sizeServer.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    makeVisualFiles({
      ficha_visual_size_bytes: realJpeg.length + 1
    })
  );
  ok(sizeResult.ficha_visual_recibida === false, "Servidor descarta tamaño declarado falso");
  ok(sizeResult.estado === "descartada", "Servidor registra el tamaño declarado falso");
  ok(sizeServer.createdBlobs.length === 0, "Tamaño falso no crea blob");

  const mimeServer = loadServerContext();
  const mimeResult = mimeServer.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    makeVisualFiles({
      ficha_visual_base64: "data:image/png;base64," + TEST_JPEG_BASE64
    })
  );
  ok(mimeResult.ficha_visual_recibida === false, "Servidor descarta MIME interno incoherente");
  ok(mimeResult.estado === "descartada", "Servidor registra MIME interno incoherente");
  ok(mimeServer.createdBlobs.length === 0, "MIME incoherente no crea blob");

  const oversizedBytes = Buffer.alloc((900 * 1024) + 1, 0x41);
  const oversizedServer = loadServerContext();
  const oversizedResult = oversizedServer.prepararFichaVisualSegura_(
    "TK-WEB-TEST",
    makeVisualFiles({
      ficha_visual_base64: oversizedBytes.toString("base64"),
      ficha_visual_size_bytes: 1
    })
  );
  ok(oversizedResult.ficha_visual_recibida === false, "Servidor descarta Base64 sobredimensionado");
  ok(oversizedResult.estado === "descartada", "Servidor registra Base64 sobredimensionado");
  ok(oversizedServer.createdBlobs.length === 0, "Base64 sobredimensionado no crea blob");
  ok(
    oversizedServer.base64DecodeCalls.length === 0,
    "Base64 sobredimensionado se rechaza antes de decodificar"
  );
}

function testPrivacyNormalizationFailClosed() {
  const server = loadServerContext();
  const cases = [
    { input: undefined, expected: "no", name: "valor ausente" },
    { input: "", expected: "no", name: "valor vacío" },
    { input: "desconocido", expected: "no", name: "valor desconocido" },
    { input: "no", expected: "no", name: "no explícito" },
    { input: "false", expected: "no", name: "false" },
    { input: "0", expected: "no", name: "cero" },
    { input: "si", expected: "sí", name: "si sin tilde" },
    { input: "sí", expected: "sí", name: "sí con tilde" },
    { input: "true", expected: "sí", name: "true" },
    { input: "1", expected: "sí", name: "uno" }
  ];

  cases.forEach(function (entry) {
    ok(
      server.normalizarPrivacidad_(entry.input) === entry.expected,
      "Privacidad fail-closed normaliza " + entry.name
    );
  });
}
async function main() {
  testStaticClientContract();
  testPrivacyNormalizationFailClosed();
  await testClientComposition();
  testServerEmailOnly();
  testVisualFailureCannotBlockOrder();
  testVisualBinaryValidation();
  process.stdout.write(
    "[TAKARA_ORDER_VISUAL_PROOF_TEST_OK] " + checks + " comprobaciones\n"
  );
}

try {
  main().catch(function (error) {
    process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
    process.exitCode = 1;
  });
} catch (error) {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
}
