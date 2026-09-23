const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "apps-script", "takara-pedidos-web");
const code = fs.readFileSync(path.join(APP, "Code.gs"), "utf8");
const contactService = fs.readFileSync(path.join(APP, "ContactService.gs"), "utf8");
const moduleSource = fs.readFileSync(
  path.join(APP, "ContactIdempotency.gs"),
  "utf8"
);

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, codeValue, message) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === codeValue, message + " code");
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
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch.charCodeAt(0) === 96) {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new Error("Unbalanced function " + name);
}

function createStore() {
  const values = Object.create(null);
  return {
    getProperty(key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
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
    raw(key) {
      return values[key] || "";
    }
  };
}

function basePayload(overrides) {
  return Object.assign(
    {
      tipo_solicitud: "CONTACTO_WEB",
      contact_request_id:
        "TK-CONTACT-REQ-ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
      nombre: "Cliente",
      email: "cliente@example.test",
      telefono: "",
      whatsapp: "",
      asunto: "Consulta",
      mensaje: "Necesito informacion sobre una litofania.",
      origen: "contacto.html",
      fecha_cliente: "2026-09-23T00:00:00.000Z",
      website: ""
    },
    overrides || {}
  );
}

function createHarness(payload) {
  const store = createStore();
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
  const runtime = {
    payload,
    uuid: 0,
    abuse: 0,
    internal: 0,
    client: 0,
    failInternal: false,
    failClient: false,
    generatedIds: 0
  };

  const context = {
    console,
    Date,
    Error,
    String,
    Object,
    Array,
    JSON,
    RegExp,
    Number,
    Math,
    CFG: {
      CONTACT_NAME_MAX_CHARS: 100,
      CONTACT_SUBJECT_MAX_CHARS: 160,
      CONTACT_MESSAGE_MAX_CHARS: 5000,
      CONTACT_OPTIONAL_PHONE_MAX_CHARS: 32,
      CONTACT_METADATA_MAX_CHARS: 64,
      DESTINO_PEDIDOS: "takara@example.test",
      VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V2",
      VERSION_SCRIPT:
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1"
    },
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
        runtime.uuid += 1;
        return "ABCDEF12-0000-0000-0000-" + String(runtime.uuid).padStart(12, "0");
      },
      computeDigest(algorithm, value) {
        const digest = crypto
          .createHash("sha256")
          .update(String(value), "utf8")
          .digest();
        return Array.from(digest).map((byte) =>
          byte > 127 ? byte - 256 : byte
        );
      }
    },
    texto_(value) {
      return String(value === undefined || value === null ? "" : value).trim();
    },
    emailPedidoValido_(value) {
      const email = String(value || "").trim();
      return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    publicAbuseError_(codeValue, message) {
      const error = new Error(message);
      error.code = codeValue;
      return error;
    },
    reservePublicSideEffectBudget_() {
      runtime.abuse += 1;
      return { ok: true };
    },
    generarIdContactoWeb_() {
      runtime.generatedIds += 1;
      return "TK-CONTACTO-20260923-031500-ABCDEF12";
    },
    construirAsuntoContactoWeb_() {
      return "subject";
    },
    construirCuerpoContactoWeb_() {
      return "body";
    },
    enviarEmailContactoInterno_() {
      runtime.internal += 1;
      if (runtime.failInternal) {
        throw new Error("internal send uncertain");
      }
    },
    enviarConfirmacionContactoCliente_() {
      runtime.client += 1;
      if (runtime.failClient) {
        throw new Error("client send uncertain");
      }
    },
    contactBrowserResponseOrJson_(request, value) {
      return value;
    }
  };

  vm.createContext(context);
  vm.runInContext(moduleSource, context, {
    filename: "ContactIdempotency.gs"
  });

  for (const name of [
    "normalizarContactoWeb_",
    "validarContactoWeb_",
    "procesarContactoWeb_"
  ]) {
    vm.runInContext(extractFunction(contactService, name), context, {
      filename: name + ".js"
    });
  }

  const browserRequest = {
    request_id: payload.contact_request_id
  };

  return {
    context,
    runtime,
    store,
    browserRequest,
    call() {
      return context.procesarContactoWeb_(
        runtime.payload,
        browserRequest
      );
    }
  };
}

const fingerprintContext = createHarness(basePayload());
const normalized = fingerprintContext.context.normalizarContactoWeb_(
  basePayload()
);
const fp1 =
  fingerprintContext.context.buildContactIdempotencyFingerprint_(
    normalized
  );
const fp2 =
  fingerprintContext.context.buildContactIdempotencyFingerprint_(
    Object.assign({}, normalized, {
      fecha_cliente: "2026-09-24T00:00:00.000Z"
    })
  );
ok(fp1 === fp2, "fingerprint ignores client timestamp");
ok(/^[A-F0-9]{64}$/.test(fp1), "fingerprint is SHA-256 hex");

const changed = Object.assign({}, normalized, {
  mensaje: "Contenido material distinto"
});
ok(
  fingerprintContext.context.buildContactIdempotencyFingerprint_(
    changed
  ) !== fp1,
  "material contact change alters fingerprint"
);

ok(
  fingerprintContext.context.assertContactIdempotencyRequestId_(
    "TK-CONTACT-REQ-ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  ) === "TK-CONTACT-REQ-ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  "stable request id accepted"
);

expectCode(
  () =>
    fingerprintContext.context.assertContactIdempotencyRequestId_(
      "bad"
    ),
  "CONTACT_IDEMPOTENCY_ID_REQUIRED",
  "invalid request id"
);

const success = createHarness(basePayload());
const first = success.call();
ok(first.ok === true, "first causal contact succeeds");
ok(first.estado === "recibido", "first contact returns received");
ok(
  first.id_contacto_web === "TK-CONTACTO-20260923-031500-ABCDEF12",
  "server contact id returned"
);
ok(
  first.contact_request_id ===
    "TK-CONTACT-REQ-ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  "ACK stores stable request id"
);
ok(success.runtime.abuse === 1, "first contact consumes W8 once");
ok(success.runtime.internal === 1, "first contact sends internal once");
ok(success.runtime.client === 1, "first contact sends client once");
ok(success.runtime.generatedIds === 1, "first contact id generated once");

const duplicate = success.call();
ok(duplicate.ok === true, "completed retry succeeds");
ok(
  duplicate.id_contacto_web === first.id_contacto_web,
  "completed retry returns same contact id"
);
ok(success.runtime.abuse === 1, "completed retry does not consume W8 again");
ok(success.runtime.internal === 1, "completed retry does not resend internal");
ok(success.runtime.client === 1, "completed retry does not resend client");
ok(success.runtime.generatedIds === 1, "completed retry generates no new id");

success.runtime.payload = basePayload({
  mensaje: "Contenido modificado"
});
expectCode(
  () => success.call(),
  "CONTACT_IDEMPOTENCY_CONFLICT",
  "same request id with changed contact"
);
ok(success.runtime.internal === 1, "conflict causes no internal resend");
ok(success.runtime.client === 1, "conflict causes no client resend");

const internalFailure = createHarness(
  basePayload({
    contact_request_id:
      "TK-CONTACT-REQ-BCDEFGHJKLMNPQRSTUVWXYZ23456789A"
  })
);
internalFailure.browserRequest.request_id =
  internalFailure.runtime.payload.contact_request_id;
internalFailure.runtime.failInternal = true;
let failed = false;
try {
  internalFailure.call();
} catch (error) {
  failed = true;
}
ok(failed, "internal email failure propagates");
ok(internalFailure.runtime.internal === 1, "internal email attempted once");
ok(internalFailure.runtime.client === 0, "client email not attempted after internal failure");

internalFailure.runtime.failInternal = false;
expectCode(
  () => internalFailure.call(),
  "CONTACT_IDEMPOTENCY_REVIEW_REQUIRED",
  "retry after ambiguous internal send"
);
ok(
  internalFailure.runtime.internal === 1,
  "ambiguous internal retry does not resend"
);

const clientFailure = createHarness(
  basePayload({
    contact_request_id:
      "TK-CONTACT-REQ-CDEFGHJKLMNPQRSTUVWXYZ23456789AB"
  })
);
clientFailure.browserRequest.request_id =
  clientFailure.runtime.payload.contact_request_id;
clientFailure.runtime.failClient = true;
failed = false;
try {
  clientFailure.call();
} catch (error) {
  failed = true;
}
ok(failed, "client email failure propagates");
ok(clientFailure.runtime.internal === 1, "internal email sent once before client failure");
ok(clientFailure.runtime.client === 1, "client email attempted once");

clientFailure.runtime.failClient = false;
expectCode(
  () => clientFailure.call(),
  "CONTACT_IDEMPOTENCY_REVIEW_REQUIRED",
  "retry after ambiguous client send"
);
ok(clientFailure.runtime.internal === 1, "ambiguous client retry does not resend internal");
ok(clientFailure.runtime.client === 1, "ambiguous client retry does not resend client");

const concurrent = createHarness(
  basePayload({
    contact_request_id:
      "TK-CONTACT-REQ-DEFGHJKLMNPQRSTUVWXYZ23456789ABC"
  })
);
const requestId = concurrent.runtime.payload.contact_request_id;
const contact = concurrent.context.normalizarContactoWeb_(
  concurrent.runtime.payload
);
const fingerprint =
  concurrent.context.buildContactIdempotencyFingerprint_(
    contact
  );
const now = new Date("2026-09-23T03:20:00.000Z");
const active = concurrent.context.beginContactIdempotency_(
  requestId,
  fingerprint,
  now
);
ok(active.mode === "ACTIVE", "first concurrent reservation active");
expectCode(
  () =>
    concurrent.context.beginContactIdempotency_(
      requestId,
      fingerprint,
      new Date(now.getTime() + 1000)
    ),
  "CONTACT_IDEMPOTENCY_BUSY",
  "concurrent duplicate blocked"
);

const corrupt = createHarness(
  basePayload({
    contact_request_id:
      "TK-CONTACT-REQ-EFGHJKLMNPQRSTUVWXYZ23456789ABCD"
  })
);
corrupt.store.setProperty(
  "TAKARA_CONTACT_IDEMPOTENCY_V1:" +
    corrupt.runtime.payload.contact_request_id,
  "{broken"
);
expectCode(
  () =>
    corrupt.context.readContactIdempotencyRecord_(
      corrupt.store,
      corrupt.runtime.payload.contact_request_id
    ),
  "CONTACT_IDEMPOTENCY_CORRUPT",
  "corrupt contact ledger fails closed"
);

console.log(
  "[TAKARA_CONTACT_IDEMPOTENCY_TEST_OK] " +
    JSON.stringify({
      checks,
      version: "TAKARA_CONTACT_IDEMPOTENCY_V1"
    })
);
