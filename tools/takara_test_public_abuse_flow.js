const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const code = fs.readFileSync(
  path.join(ROOT, "apps-script", "takara-pedidos-web", "Code.gs"),
  "utf8"
);

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

function createHarness(payload) {
  const runtime = {
    payload,
    abuseError: null,
    calls: {
      abuse: 0,
      id: 0,
      internal: 0,
      client: 0
    }
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
    CFG: {
      CONTACT_NAME_MAX_CHARS: 100,
      CONTACT_SUBJECT_MAX_CHARS: 160,
      CONTACT_MESSAGE_MAX_CHARS: 5000,
      CONTACT_OPTIONAL_PHONE_MAX_CHARS: 32,
      CONTACT_METADATA_MAX_CHARS: 64,
      DESTINO_PEDIDOS: "takara@example.test",
      VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V2",
      VERSION_SCRIPT:
        "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_16_0_PUBLIC_ABUSE_GUARD_V1"
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
    reservePublicSideEffectBudget_(route, actor, units) {
      runtime.calls.abuse += 1;
      if (runtime.abuseError) throw runtime.abuseError;
      return { route, actor, units };
    },
    generarIdContactoWeb_() {
      runtime.calls.id += 1;
      return "TK-CONTACTO-TEST-001";
    },
    construirAsuntoContactoWeb_() {
      return "subject";
    },
    construirCuerpoContactoWeb_() {
      return "body";
    },
    enviarEmailContactoInterno_() {
      runtime.calls.internal += 1;
    },
    enviarConfirmacionContactoCliente_() {
      runtime.calls.client += 1;
    },
    json_(value) {
      return value;
    }
  };

  vm.createContext(context);

  for (const name of [
    "normalizarContactoWeb_",
    "validarContactoWeb_",
    "procesarContactoWeb_"
  ]) {
    vm.runInContext(extractFunction(code, name), context, {
      filename: name + ".js"
    });
  }

  return {
    runtime,
    context,
    call() {
      return context.procesarContactoWeb_(runtime.payload);
    }
  };
}

function basePayload(overrides) {
  return Object.assign(
    {
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

const valid = createHarness(basePayload());
const validResult = valid.call();
ok(validResult.ok === true, "contacto valido responde ok");
ok(validResult.tipo_solicitud === "CONTACTO_WEB", "contacto conserva tipo");
ok(valid.runtime.calls.abuse === 1, "contacto valido reserva budget una vez");
ok(valid.runtime.calls.id === 1, "contacto genera id despues del guard");
ok(valid.runtime.calls.internal === 1, "contacto valido envia interno");
ok(valid.runtime.calls.client === 1, "contacto valido envia confirmacion");

const honeypot = createHarness(basePayload({ website: "https://spam.invalid" }));
let honeypotError = null;
try {
  honeypot.call();
} catch (error) {
  honeypotError = error;
}
ok(Boolean(honeypotError), "honeypot bloquea");
ok(honeypotError.code === "PUBLIC_ABUSE_HONEYPOT", "honeypot expone codigo");
ok(honeypot.runtime.calls.abuse === 0, "honeypot no consume budget");
ok(honeypot.runtime.calls.internal === 0, "honeypot no envia interno");
ok(honeypot.runtime.calls.client === 0, "honeypot no envia cliente");

const invalidEmail = createHarness(basePayload({ email: "not-an-email" }));
let invalidEmailError = null;
try {
  invalidEmail.call();
} catch (error) {
  invalidEmailError = error;
}
ok(Boolean(invalidEmailError), "email invalido bloquea");
ok(invalidEmail.runtime.calls.abuse === 0, "email invalido no consume budget");
ok(invalidEmail.runtime.calls.internal === 0, "email invalido no envia");

const longMessage = createHarness(
  basePayload({ mensaje: "x".repeat(5001) })
);
let longMessageError = null;
try {
  longMessage.call();
} catch (error) {
  longMessageError = error;
}
ok(Boolean(longMessageError), "mensaje sobredimensionado bloquea");
ok(longMessage.runtime.calls.abuse === 0, "mensaje largo no consume budget");
ok(longMessage.runtime.calls.internal === 0, "mensaje largo no envia");

const badOrigin = createHarness(basePayload({ origen: "attacker.invalid" }));
let badOriginError = null;
try {
  badOrigin.call();
} catch (error) {
  badOriginError = error;
}
ok(Boolean(badOriginError), "origen invalido bloquea");
ok(badOrigin.runtime.calls.abuse === 0, "origen invalido no consume budget");
ok(badOrigin.runtime.calls.internal === 0, "origen invalido no envia");

const limited = createHarness(basePayload());
const rateError = new Error("rate limited");
rateError.code = "PUBLIC_ABUSE_ACTOR_RATE";
limited.runtime.abuseError = rateError;
let limitedError = null;
try {
  limited.call();
} catch (error) {
  limitedError = error;
}
ok(Boolean(limitedError), "rate limit bloquea");
ok(limitedError.code === "PUBLIC_ABUSE_ACTOR_RATE", "rate limit conserva codigo");
ok(limited.runtime.calls.abuse === 1, "rate limit consulta guard");
ok(limited.runtime.calls.id === 0, "rate limit bloquea antes de generar id");
ok(limited.runtime.calls.internal === 0, "rate limit bloquea correo interno");
ok(limited.runtime.calls.client === 0, "rate limit bloquea correo cliente");

console.log(
  "[TAKARA_PUBLIC_ABUSE_FLOW_OK] " +
    JSON.stringify({ checks })
);
