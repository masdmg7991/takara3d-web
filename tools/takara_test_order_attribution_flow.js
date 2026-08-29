const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const codePath = path.join(
  root,
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
}

function extractFunction(source, name) {
  const signature = "function " + name + "(";
  const start = source.indexOf(signature);

  if (start < 0) {
    throw new Error("Missing function " + name);
  }

  const open = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error("Unbalanced function " + name);
}

function createHarness(payload) {
  const trace = [];
  let sideEffects = 0;

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
      DESTINO_PEDIDOS: "x@example.test",
    },
    parsePayload_() {
      trace.push("parse");
      return payload;
    },
    texto_(value) {
      return String(value || "").trim();
    },
    procesarContactoWeb_() {
      trace.push("contact");
      return { contact: true };
    },
    resolverIdPedidoWeb_() {
      trace.push("id");
      return "TK-WEB-TEST";
    },
    normalizarPedido_() {
      trace.push("normalize");
      return {
        contrato_entrada: "v2",
        payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
        modo_prueba: true,
        archivos: {
          nombre_archivo: "dry.jpg",
          content_type: "image/jpeg",
          size_bytes: 1,
        },
      };
    },
    buildAuthoritativeOrderAttribution_(value) {
      trace.push("attribution");

      const meta = value.meta || {};
      const storeContext = meta.store_context;

      if (!storeContext) {
        return Object.freeze({
          version: "TAKARA_STORE_ATTRIBUTION_V1",
          source_type: "DIRECT",
        });
      }

      if (storeContext.store_ref === "st_invalid") {
        const error = new Error("STORE_NOT_FOUND");
        error.code = "STORE_NOT_FOUND";
        throw error;
      }

      return Object.freeze({
        version: "TAKARA_STORE_ATTRIBUTION_V1",
        source_type: "STORE",
        store_id: "STO_000001",
        store_name_snapshot: "Foto García",
      });
    },
    validarPedido_(pedido) {
      trace.push("validate");
      ok(Boolean(pedido.attribution), "validation sees attribution");
    },
    construirCuerpoInterno_(id, now, pedido) {
      trace.push("body");
      return [
        "[ATRIBUCION]",
        "Origen pedido: " + pedido.attribution.source_type,
        "Store ID: " + (pedido.attribution.store_id || ""),
        "Store nombre snapshot: " +
          (pedido.attribution.store_name_snapshot || ""),
      ].join("\n");
    },
    versionPlantillaPedido_() {
      return "TAKARA_PEDIDO_WEB_V2";
    },
    json_(value) {
      trace.push("json");
      return value;
    },
    prepararFotoOriginal_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    prepararFichaVisualSegura_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    asegurarCarpetaPedido_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    guardarFoto_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    construirAsunto_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    enviarEmailInterno_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
    enviarConfirmacionCliente_() {
      sideEffects += 1;
      throw new Error("unexpected side effect");
    },
  };

  vm.createContext(context);

  const source = fs.readFileSync(codePath, "utf8");
  vm.runInContext(extractFunction(source, "doPost"), context);

  return {
    context,
    trace,
    getSideEffects: () => sideEffects,
  };
}

const directHarness = createHarness({ meta: {} });
const direct = directHarness.context.doPost({});

ok(direct.ok === true, "DIRECT dry-run succeeds");
ok(direct.dry_run === true, "DIRECT stays dry-run");
ok(
  direct.technical_email_body.includes("Origen pedido: DIRECT"),
  "DIRECT technical body persists attribution"
);
ok(
  direct.technical_email_body.includes("Store ID: \n"),
  "DIRECT technical body has no Store id"
);
ok(
  directHarness.trace.indexOf("normalize") <
    directHarness.trace.indexOf("attribution"),
  "normalization precedes attribution"
);
ok(
  directHarness.trace.indexOf("attribution") <
    directHarness.trace.indexOf("validate"),
  "attribution precedes validation"
);
ok(directHarness.getSideEffects() === 0, "DIRECT dry-run has no effects");

const storeHarness = createHarness({
  meta: {
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: "st_123456789012345678901234",
    },
  },
});
const store = storeHarness.context.doPost({});

ok(store.ok === true, "STORE dry-run succeeds");
ok(
  store.technical_email_body.includes("Origen pedido: STORE"),
  "STORE technical body persists source"
);
ok(
  store.technical_email_body.includes("Store ID: STO_000001"),
  "STORE technical body persists authoritative id"
);
ok(
  store.technical_email_body.includes(
    "Store nombre snapshot: Foto García"
  ),
  "STORE technical body persists name snapshot"
);
ok(storeHarness.getSideEffects() === 0, "STORE dry-run has no effects");

const invalidHarness = createHarness({
  meta: {
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: "st_invalid",
    },
  },
});
const invalid = invalidHarness.context.doPost({});

ok(invalid.ok === false, "invalid STORE fails closed");
ok(
  String(invalid.error).includes("STORE_NOT_FOUND"),
  "invalid STORE keeps backend error"
);
ok(
  invalidHarness.trace.includes("attribution"),
  "invalid STORE reaches attribution boundary"
);
ok(
  !invalidHarness.trace.includes("validate"),
  "invalid STORE stops before normal validation"
);
ok(
  !invalidHarness.trace.includes("body"),
  "invalid STORE stops before persistence"
);
ok(invalidHarness.getSideEffects() === 0, "invalid STORE has no effects");

const contactHarness = createHarness({
  tipo_solicitud: "CONTACTO_WEB",
});
const contact = contactHarness.context.doPost({});

ok(contact.contact === true, "contact path preserved");
ok(
  !contactHarness.trace.includes("attribution"),
  "contact path bypasses order attribution"
);
ok(contactHarness.getSideEffects() === 0, "contact harness no order effects");

console.log(
  "[TAKARA_ORDER_ATTRIBUTION_FLOW_F3D_OK] " +
    JSON.stringify({ checks })
);