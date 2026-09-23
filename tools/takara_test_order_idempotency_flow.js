const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "apps-script", "takara-pedidos-web");
const code = fs.readFileSync(path.join(APP, "Code.gs"), "utf8");
const idempotency = fs.readFileSync(path.join(APP, "OrderIdempotency.gs"), "utf8");
let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function extractFunction(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("Missing function " + name);
  const brace = source.indexOf("{", start);
  let depth = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i], next = source[i + 1] || "";
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch.charCodeAt(0) === 96) { quote = ch; continue; }
    if (ch === "{") depth += 1;
    if (ch === "}") { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error("Unbalanced function " + name);
}

function createStore() {
  const values = Object.create(null);
  return {
    getProperty(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setProperty(key, value) { values[key] = String(value); return this; },
    deleteProperty(key) { delete values[key]; return this; },
    getProperties() { return Object.assign({}, values); },
    snapshot() { return Object.assign({}, values); }
  };
}

function makePayload(id, overrides) {
  const base = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: id,
    modo_prueba: false,
    cliente: { nombre: "Cliente", email: "cliente@example.test", telefono: "600000000" },
    producto: { codigo_producto: "MARCO_LITOFANIA_144X108", cantidad: 1 },
    archivos: {
      foto_base64: "data:image/jpeg;base64,QUJDRA==",
      content_type: "image/jpeg",
      size_bytes: 4,
      ficha_visual_base64: "data:image/jpeg;base64,RUZHSA==",
      ficha_visual_content_type: "image/jpeg",
      ficha_visual_size_bytes: 4,
      ficha_visual_nombre: "preview.jpg",
      ficha_visual_estado: "generada",
      ficha_visual_modo: "encendida"
    },
    control: { autoriza_publicacion_resultado: false },
    meta: {}
  };
  return Object.assign(base, overrides || {});
}
function createHarness(initialPayload) {
  const store = createStore();
  const lock = {
    held: false,
    tryLock() { if (this.held) return false; this.held = true; return true; },
    releaseLock() { this.held = false; }
  };
  const runtime = {
    payload: initialPayload,
    failAfter: "",
    uuid: 0,
    effects: { folder: 0, photo: 0, internalEmail: 0, clientEmail: 0 }
  };

  const context = {
    console, Object, Array, String, Number, Boolean, Date, Error, JSON, Math, RegExp,
    CFG: {
      VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V2",
      VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_15_0_ORDER_IDEMPOTENCY_V1",
      ESTADO_ARCHIVO_INICIAL: "pendiente_descarga",
      DESTINO_PEDIDOS: "3d.takara@example.test"
    },
    PropertiesService: { getScriptProperties() { return store; } },
    LockService: { getScriptLock() { return lock; } },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      getUuid() { runtime.uuid += 1; return "lease-" + runtime.uuid; },
      computeDigest(algorithm, value) {
        const digest = crypto.createHash("sha256").update(String(value), "utf8").digest();
        return Array.from(digest).map((byte) => byte > 127 ? byte - 256 : byte);
      }
    },
    parseOrderBrowserResponseRequest_() { return null; },
    assertOrderBrowserPayloadMatches_() {},
    orderBrowserResponseOrJson_(request, payload) { return payload; },
    parsePayload_() { return runtime.payload; },
    texto_(value) { return String(value || "").trim(); },
    procesarContactoWeb_() { return { ok: true, tipo_solicitud: "CONTACTO_WEB" }; },
    resolverIdPedidoWeb_(payload) {
      return String(payload.pedido_web_id || "TK-WEB-GENERATED-0001").trim().toUpperCase();
    },
    normalizarPedido_(payload) {
      return {
        contrato_entrada: "v2",
        payload_version: payload.payload_version,
        pedido_web_id: payload.pedido_web_id,
        modo_prueba: payload.modo_prueba === true,
        cliente: JSON.parse(JSON.stringify(payload.cliente || {})),
        producto: JSON.parse(JSON.stringify(payload.producto || {})),
        archivos: JSON.parse(JSON.stringify(payload.archivos || {})),
        control: JSON.parse(JSON.stringify(payload.control || {})),
        meta: JSON.parse(JSON.stringify(payload.meta || {}))
      };
    },
    buildAuthoritativeOrderAttribution_() {
      return Object.freeze({ version: "TAKARA_STORE_ATTRIBUTION_V1", source_type: "DIRECT" });
    },
    validarPedido_() {},
    prepararFotoOriginal_(id) {
      return { blob: { id: "blob-" + id }, nombre_archivo: id + "_original.jpg", content_type: "image/jpeg", size_bytes: 4 };
    },
    prepararFichaVisualSegura_() {
      return { ficha_visual_recibida: true, estado: "validada", nombre_archivo: "preview.jpg", blob: { id: "preview" } };
    },
    asegurarCarpetaPedido_() {
      runtime.effects.folder += 1;
      if (runtime.failAfter === "folder") throw new Error("folder side effect uncertain");
      return { id: "folder" };
    },
    guardarFoto_(prepared) {
      runtime.effects.photo += 1;
      if (runtime.failAfter === "photo") throw new Error("photo side effect uncertain");
      return {
        foto_recibida: true,
        enlace_drive: "https://drive.example/order-photo",
        id_archivo_drive: "drive-photo",
        nombre_archivo_foto: prepared.nombre_archivo,
        tipo_archivo_foto: prepared.content_type,
        tamano_archivo_foto_bytes: prepared.size_bytes,
        estado_archivo: "pendiente_descarga",
        nota_archivo: "test"
      };
    },
    construirAsunto_() { return "Pedido"; },
    construirCuerpoInterno_() { return "BODY"; },
    enviarEmailInterno_() {
      runtime.effects.internalEmail += 1;
      if (runtime.failAfter === "internalEmail") throw new Error("internal email side effect uncertain");
    },
    enviarConfirmacionCliente_() {
      runtime.effects.clientEmail += 1;
      if (runtime.failAfter === "clientEmail") throw new Error("client email side effect uncertain");
    },
    versionPlantillaPedido_() { return "TAKARA_PEDIDO_WEB_V2"; }
  };

  vm.createContext(context);
  vm.runInContext(idempotency, context, { filename: "OrderIdempotency.gs" });
  vm.runInContext(extractFunction(code, "doPost"), context, { filename: "doPost.js" });

  return {
    context, runtime, store,
    call() { return context.doPost({}); }
  };
}

function sameEffects(actual, expected, label) {
  for (const key of Object.keys(expected)) {
    ok(actual[key] === expected[key], label + " " + key);
  }
}

const success = createHarness(makePayload("TK-WEB-20260923-ABC234"));
const first = success.call();
ok(first.ok === true, "first real order succeeds");
ok(first.estado === "recibido", "first order returns received ACK");
ok(first.script === "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_15_0_ORDER_IDEMPOTENCY_V1", "ACK identifies local idempotent candidate");
sameEffects(success.runtime.effects, { folder: 1, photo: 1, internalEmail: 1, clientEmail: 1 }, "first execution effect count");

const duplicate = success.call();
ok(duplicate.ok === true, "completed retry succeeds");
ok(duplicate.id_pedido_web === first.id_pedido_web, "completed retry returns same order id");
sameEffects(success.runtime.effects, { folder: 1, photo: 1, internalEmail: 1, clientEmail: 1 }, "completed retry does not repeat effects");

success.runtime.payload = makePayload("TK-WEB-20260923-ABC234");
success.runtime.payload.cliente.email = "changed@example.test";
const conflict = success.call();
ok(conflict.ok === false, "same id with changed payload fails");
ok(conflict.error_code === "ORDER_IDEMPOTENCY_CONFLICT", "changed payload exposes conflict code");
sameEffects(success.runtime.effects, { folder: 1, photo: 1, internalEmail: 1, clientEmail: 1 }, "conflict has no extra effects");

const missingId = createHarness(makePayload(""));
const missing = missingId.call();
ok(missing.ok === false, "real order without stable id fails");
ok(missing.error_code === "ORDER_IDEMPOTENCY_ID_REQUIRED", "missing id exposes idempotency code");
sameEffects(missingId.runtime.effects, { folder: 0, photo: 0, internalEmail: 0, clientEmail: 0 }, "missing id has zero effects");

function assertAmbiguousFailure(failurePoint, expectedEffects, id) {
  const harness = createHarness(makePayload(id));
  harness.runtime.failAfter = failurePoint;
  const failed = harness.call();
  ok(failed.ok === false, failurePoint + " first request fails");
  harness.runtime.failAfter = "";
  const retry = harness.call();
  ok(retry.ok === false, failurePoint + " retry stays fail-closed");
  ok(retry.error_code === "ORDER_IDEMPOTENCY_REVIEW_REQUIRED", failurePoint + " retry requires manual review");
  sameEffects(harness.runtime.effects, expectedEffects, failurePoint + " retry does not duplicate effects");
}
assertAmbiguousFailure(
  "folder",
  { folder: 1, photo: 0, internalEmail: 0, clientEmail: 0 },
  "TK-WEB-20260923-ABC235"
);
assertAmbiguousFailure(
  "photo",
  { folder: 1, photo: 1, internalEmail: 0, clientEmail: 0 },
  "TK-WEB-20260923-ABC236"
);
assertAmbiguousFailure(
  "internalEmail",
  { folder: 1, photo: 1, internalEmail: 1, clientEmail: 0 },
  "TK-WEB-20260923-ABC237"
);
assertAmbiguousFailure(
  "clientEmail",
  { folder: 1, photo: 1, internalEmail: 1, clientEmail: 1 },
  "TK-WEB-20260923-ABC238"
);

const dry = createHarness(makePayload("", { modo_prueba: true }));
const dryResult = dry.call();
ok(dryResult.ok === true && dryResult.dry_run === true, "dry-run preserved");
sameEffects(dry.runtime.effects, { folder: 0, photo: 0, internalEmail: 0, clientEmail: 0 }, "dry-run has no effects");
ok(Object.keys(dry.store.snapshot()).length === 0, "dry-run creates no idempotency ledger");

const contact = createHarness({ tipo_solicitud: "CONTACTO_WEB", nombre: "Contacto" });
const contactResult = contact.call();
ok(contactResult.tipo_solicitud === "CONTACTO_WEB", "contact route preserved");
ok(Object.keys(contact.store.snapshot()).length === 0, "contact route creates no order ledger");

console.log("[TAKARA_ORDER_IDEMPOTENCY_FLOW_OK] " + JSON.stringify({ checks }));
