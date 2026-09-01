const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "apps-script", "takara-pedidos-web");
const CODE = path.join(APP, "Code.gs");
const ORDER_JS = path.join(ROOT, "assets", "js", "takara-pedido-web.js");
const STORE_REF = "st_123456789012345678901234";
const MISSING_REF = "st_999999999999999999999999";
let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, label) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  ok(Boolean(caught), label + " throws");
  ok(caught && caught.code === code, label + " code");
}

function extractFunction(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("Missing function " + name);
  const brace = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || "";
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced function " + name);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRepository() {
  let rows = [{
    store_id: "STO_000001",
    store_public_code: STORE_REF,
    status: "ACTIVE",
    created_at: "2026-08-29T20:00:00.000Z",
    updated_at: "2026-08-29T20:00:00.000Z",
    deactivated_at: "",
    version: 1,
    display_name: "Foto García",
    contact_name: "",
    email: "",
    phone: "",
    address_line: "",
    postal_code: "",
    city: "",
    province: "",
    notes: "",
  }];
  const metrics = { findByPublicCode: 0, findById: 0, updates: 0 };
  return {
    metrics,
    withWriteLock(fn) { return fn(); },
    nextStoreSequence() { return 2; },
    findById(storeId) {
      metrics.findById += 1;
      return rows.find((row) => row.store_id === storeId) || null;
    },
    findByPublicCode(publicCode) {
      metrics.findByPublicCode += 1;
      return rows.find((row) => row.store_public_code === publicCode) || null;
    },
    insert(record) { rows.push(clone(record)); },
    update(record) {
      metrics.updates += 1;
      rows = rows.map((row) => row.store_id === record.store_id ? clone(record) : row);
    },
    snapshot() { return clone(rows); },
  };
}

function createBackend(repo) {
  let clock = 0;
  const context = {
    console,
    Object,
    String,
    Number,
    Boolean,
    Array,
    Error,
    RegExp,
    JSON,
    Math,
    createStoreSheetsRepository_() { return repo; },
    createStoreRuntimeDependencies_() {
      clock += 1;
      return {
        nowIso() { return `2026-08-29T20:0${clock}:00.000Z`; },
        createPublicCode() { return "st_222222222222222222222222"; },
      };
    },
  };
  vm.createContext(context);
  for (const file of [
    "StoreDomain.gs",
    "StoreRegistry.gs",
    "StoreRuntime.gs",
    "StoreOrderResolution.gs",
    "OrderAttribution.gs",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(APP, file), "utf8"), context, { filename: file });
  }
  return context;
}

function createBrowser() {
  const bootstrapEvents = [];
  const document = {
    addEventListener(type, handler, options) {
      bootstrapEvents.push({ type, handler, options });
    },
  };
  const window = { document };
  window.window = window;

  const context = {
    window,
    document,
    console,
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(ORDER_JS, "utf8"),
    context,
    { filename: "takara-pedido-web.js" }
  );

  ok(
    bootstrapEvents.some((entry) => entry.type === "DOMContentLoaded"),
    "real order script registers DOMContentLoaded bootstrap"
  );
  ok(
    typeof window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1 === "object",
    "real order script exposes F3A bridge after bootstrap load"
  );

  return window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1;
}

const codeSource = fs.readFileSync(CODE, "utf8");
const doPostSource = extractFunction(codeSource, "doPost");
const handoffSource = extractFunction(codeSource, "enviarEmailInterno_");

function createOrderHarness(backend, payload) {
  const trace = [];
  let sideEffects = 0;
  let validatedPedido = null;
  const context = {
    console,
    Object,
    String,
    Date,
    Error,
    JSON,
    CFG: {
      VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V2",
      VERSION_SCRIPT: "SCRIPT",
      ESTADO_ARCHIVO_INICIAL: "pendiente_descarga",
      DESTINO_PEDIDOS: "3d.takara@example.test",
    },
    parsePayload_() { trace.push("parse"); return payload; },
    texto_(value) { return String(value || "").trim(); },
    procesarContactoWeb_() { trace.push("contact"); return { contact: true }; },
    resolverIdPedidoWeb_() { trace.push("id"); return "TK-WEB-F3F"; },
    normalizarPedido_() {
      trace.push("normalize");
      return {
        contrato_entrada: "v2",
        payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
        modo_prueba: true,
        cliente: { nombre: "Cliente", email: "cliente@example.test", telefono: "600000000" },
        archivos: { nombre_archivo: "dry.jpg", content_type: "image/jpeg", size_bytes: 1 },
      };
    },
    buildAuthoritativeOrderAttribution_(value) {
      trace.push("attribution");
      return backend.buildAuthoritativeOrderAttribution_(value);
    },
    validarPedido_(pedido) {
      trace.push("validate");
      validatedPedido = pedido;
      ok(Boolean(pedido.attribution), "validation sees attribution");
    },
    construirCuerpoInterno_(id, now, pedido) {
      trace.push("body");
      return [
        "[ATRIBUCION]",
        "Versión atribución: " + pedido.attribution.version,
        "Origen pedido: " + pedido.attribution.source_type,
        "Store ID: " + (pedido.attribution.store_id || ""),
        "Store nombre snapshot: " + (pedido.attribution.store_name_snapshot || ""),
      ].join("\n");
    },
    versionPlantillaPedido_() { return "TAKARA_PEDIDO_WEB_V2"; },
    json_(value) { trace.push("json"); return value; },
    prepararFotoOriginal_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    prepararFichaVisualSegura_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    asegurarCarpetaPedido_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    guardarFoto_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    construirAsunto_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    enviarEmailInterno_() { sideEffects += 1; throw new Error("unexpected side effect"); },
    enviarConfirmacionCliente_() { sideEffects += 1; throw new Error("unexpected side effect"); },
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(APP, "OrderBrowserTransport.gs"), "utf8"),
    context,
    { filename: "OrderBrowserTransport.gs" }
  );
  vm.runInContext(doPostSource, context, { filename: "doPost.js" });
  return {
    result: context.doPost({}),
    trace,
    getSideEffects: () => sideEffects,
    getPedido: () => validatedPedido,
  };
}

function handoff(body, pedido) {
  const sent = [];
  const context = {
    CFG: { DESTINO_PEDIDOS: "3d.takara@example.test" },
    MailApp: { sendEmail(options) { sent.push(options); } },
    construirHtmlInterno_() { return "<p>internal</p>"; },
  };
  vm.createContext(context);
  vm.runInContext(handoffSource, context, { filename: "enviarEmailInterno_.js" });
  context.enviarEmailInterno_(
    "Pedido F3F",
    body,
    "TK-WEB-F3F",
    pedido,
    { foto_recibida: true },
    { ficha_visual_recibida: false, blob: null }
  );
  ok(sent.length === 1, "handoff sends exactly one internal email");
  ok(sent[0].body === body, "handoff preserves technical body byte-for-byte");
  return sent[0];
}

const repo = createRepository();
const backend = createBackend(repo);
const bridge = createBrowser();

// STORE válido: public authoritative context -> F3A transport -> F3B/F3C -> F3D -> F3E.
const initialContext = clone(backend.resolveStoreContextRuntime_(STORE_REF));
ok(initialContext.store_ref === STORE_REF, "STORE public context keeps public ref");
ok(initialContext.display_name === "Foto García", "STORE public context has authoritative name");
const initialTransport = bridge.setVerifiedContext(initialContext);
ok(Object.keys(initialTransport).sort().join(",") === "store_ref,version", "F3A transports only public ref and version");
const storePayload = { meta: clone(bridge.getMeta()) };
const storeOrder = createOrderHarness(backend, storePayload);
ok(storeOrder.result.ok === true && storeOrder.result.dry_run === true, "STORE order succeeds through real doPost");
ok(storeOrder.result.technical_email_body.includes("Origen pedido: STORE"), "STORE source persists in technical body");
ok(storeOrder.result.technical_email_body.includes("Store ID: STO_000001"), "STORE authoritative id persists");
ok(storeOrder.result.technical_email_body.includes("Store nombre snapshot: Foto García"), "STORE initial name snapshot persists");
ok(storeOrder.trace.indexOf("attribution") < storeOrder.trace.indexOf("validate"), "STORE attribution precedes validation");
ok(storeOrder.getSideEffects() === 0, "STORE dry-run has no external effects");
const initialPedido = storeOrder.getPedido();
ok(Object.isFrozen(initialPedido.attribution), "STORE attribution is frozen");
const firstSnapshot = clone(initialPedido.attribution);
const storeMail = handoff(storeOrder.result.technical_email_body, initialPedido);
ok(storeMail.body.includes("Store ID: STO_000001"), "STORE identity reaches internal mail handoff");

// DIRECT: clear bridge, no Store lookup, no Store identity.
bridge.clear();
const directBefore = repo.metrics.findByPublicCode;
const directOrder = createOrderHarness(backend, { meta: clone(bridge.getMeta()) });
ok(directOrder.result.ok === true, "DIRECT order succeeds");
ok(directOrder.result.technical_email_body.includes("Origen pedido: DIRECT"), "DIRECT source persists");
ok(directOrder.result.technical_email_body.includes("Store ID: \n"), "DIRECT technical body has no store_id");
const directStoreLookups = repo.metrics.findByPublicCode - directBefore;
ok(directStoreLookups === 0, "DIRECT performs zero Store lookups");
ok(!Object.prototype.hasOwnProperty.call(directOrder.getPedido().attribution, "store_id"), "DIRECT attribution has no store_id");
handoff(directOrder.result.technical_email_body, directOrder.getPedido());

// Manipulación: backend refuses extra derived fields before Store lookup/validation/body.
const manipulatedBefore = repo.metrics.findByPublicCode;
const manipulated = createOrderHarness(backend, {
  meta: {
    store_context: { version: "TAKARA_STORE_CONTEXT_V1", store_ref: STORE_REF, store_id: "STO_999999" },
  },
});
ok(manipulated.result.ok === false, "manipulated STORE fails closed");
ok(String(manipulated.result.error).includes("Unexpected StoreContext fields"), "manipulated STORE keeps contract error");
ok(repo.metrics.findByPublicCode === manipulatedBefore, "manipulated STORE fails before Registry lookup");
ok(!manipulated.trace.includes("validate"), "manipulated STORE stops before validation");
ok(!manipulated.trace.includes("body"), "manipulated STORE stops before technical persistence");
ok(manipulated.getSideEffects() === 0, "manipulated STORE has zero external effects");

// Missing Store: valid-shaped ref, no fallback to DIRECT.
const missing = createOrderHarness(backend, {
  meta: { store_context: { version: "TAKARA_STORE_CONTEXT_V1", store_ref: MISSING_REF } },
});
ok(missing.result.ok === false, "missing STORE fails closed");
ok(String(missing.result.error).includes("Store not found"), "missing STORE preserves Store error");
ok(!missing.trace.includes("validate"), "missing STORE stops before validation");
ok(!missing.result.technical_email_body, "missing STORE never creates technical body");

// Rename: same immutable ref/id, only new orders get latest authoritative name.
const renamed = backend.updateStoreRuntime_("STO_000001", { display_name: "Foto García Centro" });
ok(renamed.store_public_code === STORE_REF, "rename preserves public Store ref");
ok(renamed.store_id === "STO_000001", "rename preserves internal Store id");
const renamedContext = clone(backend.resolveStoreContextRuntime_(STORE_REF));
ok(renamedContext.display_name === "Foto García Centro", "renamed public context exposes latest name");
const renamedTransport = bridge.setVerifiedContext(renamedContext);
ok(renamedTransport.store_ref === initialTransport.store_ref, "rename keeps same F3A transport ref");
const renamedOrder = createOrderHarness(backend, { meta: clone(bridge.getMeta()) });
ok(renamedOrder.result.ok === true, "renamed STORE new order succeeds");
ok(renamedOrder.result.technical_email_body.includes("Store nombre snapshot: Foto García Centro"), "renamed STORE new order freezes latest name");
ok(firstSnapshot.store_name_snapshot === "Foto García", "previous STORE attribution snapshot remains immutable historically");
ok(renamedOrder.getPedido().attribution.store_id === firstSnapshot.store_id, "rename keeps same authoritative store_id");
handoff(renamedOrder.result.technical_email_body, renamedOrder.getPedido());

// INACTIVE: public context and stale order transport both fail closed; no fallback/effects.
const inactive = backend.deactivateStoreRuntime_("STO_000001");
ok(inactive.status === "INACTIVE", "Store becomes INACTIVE");
expectCode(
  () => backend.resolveStoreContextRuntime_(STORE_REF),
  "STORE_INACTIVE",
  "INACTIVE public resolution"
);
const staleMeta = { meta: clone(bridge.getMeta()) };
const inactiveBefore = repo.metrics.findByPublicCode;
const inactiveOrder = createOrderHarness(backend, staleMeta);
ok(inactiveOrder.result.ok === false, "INACTIVE stale STORE order fails closed");
ok(String(inactiveOrder.result.error).includes("Store is inactive"), "INACTIVE order preserves backend error");
ok(repo.metrics.findByPublicCode === inactiveBefore + 1, "INACTIVE stale order re-resolves authoritative Store state");
ok(!inactiveOrder.trace.includes("validate"), "INACTIVE stops before validation");
ok(!inactiveOrder.trace.includes("body"), "INACTIVE stops before technical persistence");
ok(inactiveOrder.getSideEffects() === 0, "INACTIVE has zero external effects");

console.log(
  "[TAKARA_ORDER_SYSTEM_F3F_OK] " + JSON.stringify({
    checks,
    registry_store_lookups: repo.metrics.findByPublicCode,
    updates: repo.metrics.updates,
    direct_store_lookups: directStoreLookups,
    scenarios: ["STORE", "DIRECT", "MANIPULATED", "MISSING", "RENAME", "INACTIVE"],
  })
);