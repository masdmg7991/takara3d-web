const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "apps-script/takara-pedidos-web/OrderIdempotency.gs"),
  "utf8"
);

let checks = 0;
function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, message) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  ok(thrown && thrown.code === code, message + " -> " + code);
}

function createStore() {
  const values = Object.create(null);
  return {
    getProperty(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setProperty(key, value) {
      values[key] = String(value);
      return this;
    },
    deleteProperty(key) {
      delete values[key];
      return this;
    },
    getProperties() {
      return Object.assign({}, values);
    },
    raw: values
  };
}

const store = createStore();
let uuidCounter = 0;
const lock = {
  held: false,
  tryLock() {
    if (this.held) return false;
    this.held = true;
    return true;
  },
  releaseLock() {
    this.held = false;
  }
};

const context = {
  console,
  JSON,
  Date,
  Object,
  Array,
  Number,
  String,
  Error,
  PropertiesService: {
    getScriptProperties() {
      return store;
    }
  },
  LockService: {
    getScriptLock() {
      return lock;
    }
  },
  Utilities: {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    getUuid() {
      uuidCounter += 1;
      return "lease-" + uuidCounter;
    },
    computeDigest(algorithm, value) {
      const digest = crypto.createHash("sha256").update(String(value), "utf8").digest();
      return Array.from(digest).map((byte) => (byte > 127 ? byte - 256 : byte));
    }
  }
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "OrderIdempotency.gs" });

const baseOrder = {
  pedido_web_id: "TK-WEB-IDEMPOTENCY-001",
  cliente: { nombre: "Ana", email: "ana@example.com" },
  producto: { codigo_producto: "MARCO_LITOFANIA_144X108", cantidad: 1 },
  archivos: {
    foto_base64: "QUJDRA==",
    ficha_visual_base64: "PREVIEW-A",
    ficha_visual_modo: "encendida"
  },
  control: { autoriza_publicacion_resultado: false },
  recibido_apps_script_iso: "2026-09-23T00:00:00.000Z",
  attribution: { source_type: "DIRECT" }
};

const reordered = {
  attribution: { source_type: "DIRECT" },
  recibido_apps_script_iso: "2026-09-24T00:00:00.000Z",
  control: { autoriza_publicacion_resultado: false },
  archivos: {
    ficha_visual_modo: "encendida",
    ficha_visual_base64: "PREVIEW-A",
    foto_base64: "QUJDRA=="
  },
  producto: { cantidad: 1, codigo_producto: "MARCO_LITOFANIA_144X108" },
  cliente: { email: "ana@example.com", nombre: "Ana" },
  pedido_web_id: "TK-WEB-IDEMPOTENCY-001"
};

const fingerprint = context.buildOrderIdempotencyFingerprint_(baseOrder);
const sameFingerprint = context.buildOrderIdempotencyFingerprint_(reordered);
ok(fingerprint === sameFingerprint, "fingerprint ignora timestamp servidor y orden de claves");
ok(/^[A-F0-9]{64}$/.test(fingerprint), "fingerprint SHA-256 hexadecimal");

const changedAttribution = JSON.parse(JSON.stringify(baseOrder));
changedAttribution.attribution = {
  source_type: "STORE",
  store_id: "STO_000001",
  store_name_snapshot: "Foto Garcia"
};
ok(
  context.buildOrderIdempotencyFingerprint_(changedAttribution) !== fingerprint,
  "cambio de atribucion autoritativa altera fingerprint"
);

const changedPreview = JSON.parse(JSON.stringify(baseOrder));
changedPreview.archivos.ficha_visual_base64 = "PREVIEW-B";
ok(
  context.buildOrderIdempotencyFingerprint_(changedPreview) !== fingerprint,
  "cambio de ficha visual altera fingerprint"
);

ok(
  context.assertOrderIdempotencyOrderId_(
    { pedido_web_id: "TK-WEB-IDEMPOTENCY-001" },
    "TK-WEB-IDEMPOTENCY-001"
  ) === "TK-WEB-IDEMPOTENCY-001",
  "idempotencia exige y conserva referencia web estable"
);
expectCode(
  () => context.assertOrderIdempotencyOrderId_({}, "TK-WEB-GENERATED"),
  "ORDER_IDEMPOTENCY_ID_REQUIRED",
  "pedido real sin id estable falla cerrado"
);

const changed = JSON.parse(JSON.stringify(baseOrder));
changed.cliente.email = "otra@example.com";
ok(
  context.buildOrderIdempotencyFingerprint_(changed) !== fingerprint,
  "cambio material altera fingerprint"
);

const t0 = new Date("2026-09-23T01:00:00.000Z");
const first = context.beginOrderIdempotency_("TK-WEB-IDEMPOTENCY-001", fingerprint, t0);
ok(first.mode === "NEW" && first.created === true, "primera ejecucion reserva registro");
ok(first.record.phase === "RESERVED", "primera fase RESERVED");
ok(first.token === "lease-1", "lease token emitido");

expectCode(
  () => context.beginOrderIdempotency_("TK-WEB-IDEMPOTENCY-001", fingerprint, new Date(t0.getTime() + 1000)),
  "ORDER_IDEMPOTENCY_BUSY",
  "concurrente identico queda bloqueado"
);

expectCode(
  () => context.beginOrderIdempotency_("TK-WEB-IDEMPOTENCY-001", "B".repeat(64), new Date(t0.getTime() + 1000)),
  "ORDER_IDEMPOTENCY_CONFLICT",
  "mismo id con contenido distinto falla cerrado"
);

expectCode(
  () => context.transitionOrderIdempotency_(
    "TK-WEB-IDEMPOTENCY-001",
    "wrong-token",
    "RESERVED",
    "PHOTO_SAVED",
    {},
    new Date(t0.getTime() + 2000)
  ),
  "ORDER_IDEMPOTENCY_OWNER_MISMATCH",
  "transicion exige propietario del lease"
);

const photo = {
  foto_recibida: true,
  id_archivo_drive: "drive-1",
  enlace_drive: "https://drive.example/drive-1",
  nombre_archivo_foto: "TK-WEB-IDEMPOTENCY-001_original.jpg"
};
let record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  first.token,
  "RESERVED",
  "PHOTO_IN_FLIGHT",
  {},
  new Date(t0.getTime() + 2500)
);
ok(record.phase === "PHOTO_IN_FLIGHT", "Drive entra en fase ambigua antes del side effect");
record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  first.token,
  "PHOTO_IN_FLIGHT",
  "PHOTO_SAVED",
  { photo },
  new Date(t0.getTime() + 3000)
);
ok(record.phase === "PHOTO_SAVED", "foto persistida avanza fase");
ok(record.photo.id_archivo_drive === "drive-1", "ledger conserva metadata Drive");

ok(
  context.releaseOrderIdempotencyLease_(
    "TK-WEB-IDEMPOTENCY-001",
    first.token,
    new Date(t0.getTime() + 4000)
  ) === true,
  "lease seguro puede liberarse"
);

const resumed = context.beginOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  fingerprint,
  new Date(t0.getTime() + 5000)
);
ok(resumed.mode === "RESUME" && resumed.record.phase === "PHOTO_SAVED", "retry seguro reanuda");

record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  resumed.token,
  "PHOTO_SAVED",
  "INTERNAL_EMAIL_IN_FLIGHT",
  {},
  new Date(t0.getTime() + 6000)
);
ok(record.phase === "INTERNAL_EMAIL_IN_FLIGHT", "correo interno marca fase ambigua antes del side effect");
context.releaseOrderIdempotencyLease_(
  "TK-WEB-IDEMPOTENCY-001",
  resumed.token,
  new Date(t0.getTime() + 7000)
);

expectCode(
  () => context.beginOrderIdempotency_(
    "TK-WEB-IDEMPOTENCY-001",
    fingerprint,
    new Date(t0.getTime() + 8000)
  ),
  "ORDER_IDEMPOTENCY_REVIEW_REQUIRED",
  "retry no duplica correo en fase ambigua"
);

const recovered = context.resolveOrderIdempotencyReview_(
  "TK-WEB-IDEMPOTENCY-001",
  "INTERNAL_EMAIL_SENT",
  "Correo interno confirmado manualmente",
  new Date(t0.getTime() + 9000)
);
ok(recovered.phase === "INTERNAL_EMAIL_SENT", "recovery manual resuelve ambiguedad");

const afterRecovery = context.beginOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  fingerprint,
  new Date(t0.getTime() + 10000)
);
ok(afterRecovery.record.phase === "INTERNAL_EMAIL_SENT", "retry continua tras recovery");

record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  afterRecovery.token,
  "INTERNAL_EMAIL_SENT",
  "CLIENT_EMAIL_IN_FLIGHT",
  {},
  new Date(t0.getTime() + 11000)
);
record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  afterRecovery.token,
  "CLIENT_EMAIL_IN_FLIGHT",
  "CLIENT_EMAIL_SENT",
  {},
  new Date(t0.getTime() + 12000)
);
ok(record.phase === "CLIENT_EMAIL_SENT", "correo cliente completa fase segura");

const ack = { ok: true, id_pedido_web: "TK-WEB-IDEMPOTENCY-001", estado: "recibido" };
record = context.transitionOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  afterRecovery.token,
  "CLIENT_EMAIL_SENT",
  "COMPLETED",
  { ack },
  new Date(t0.getTime() + 13000)
);
ok(record.phase === "COMPLETED", "pedido completa ledger");
ok(record.lease_token === "", "COMPLETED libera lease");

const duplicate = context.beginOrderIdempotency_(
  "TK-WEB-IDEMPOTENCY-001",
  fingerprint,
  new Date(t0.getTime() + 14000)
);
ok(duplicate.mode === "COMPLETED", "retry completado no reejecuta side effects");
ok(duplicate.ack.id_pedido_web === ack.id_pedido_web, "retry devuelve ACK persistido");

const oldOrder = "TK-WEB-IDEMPOTENCY-OLD";
store.setProperty(
  "TAKARA_ORDER_IDEMPOTENCY_V1:" + oldOrder,
  JSON.stringify({
    version: "TAKARA_ORDER_IDEMPOTENCY_V1",
    order_id: oldOrder,
    fingerprint: "C".repeat(64),
    phase: "COMPLETED",
    updated_at_iso: "2026-07-01T00:00:00.000Z"
  })
);
store.setProperty("TAKARA_ORDER_IDEMPOTENCY_V1:__GC__", "2026-09-20T00:00:00.000Z");
const cleaned = context.maybeCleanupOrderIdempotency_(
  store,
  new Date("2026-09-23T02:00:00.000Z")
);
ok(cleaned === 1, "GC elimina completados antiguos");
ok(store.getProperty("TAKARA_ORDER_IDEMPOTENCY_V1:" + oldOrder) === null, "registro antiguo eliminado");

store.setProperty("TAKARA_ORDER_IDEMPOTENCY_V1:TK-WEB-CORRUPT", "{bad json");
expectCode(
  () => context.readOrderIdempotencyRecord_(store, "TK-WEB-CORRUPT"),
  "ORDER_IDEMPOTENCY_CORRUPT",
  "ledger corrupto falla cerrado"
);

console.log(
  "[TAKARA_ORDER_IDEMPOTENCY_TEST_OK] " +
    JSON.stringify({ checks, version: "TAKARA_ORDER_IDEMPOTENCY_V1" })
);
