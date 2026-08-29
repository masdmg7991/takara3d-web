const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CODE = path.join(
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
}

function extractFunction(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);

  if (start < 0) {
    throw new Error("[FAIL] Missing function " + name);
  }

  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) {
    throw new Error("[FAIL] Missing function body " + name);
  }

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || "";

    if (lineComment) {
      if (ch === "\n") {
        lineComment = false;
      }
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
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
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

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error("[FAIL] Unbalanced function " + name);
}

function storeBody() {
  return [
    "[TAKARA_PEDIDO_WEB_V2]",
    "",
    "[ATRIBUCION]",
    "Versión atribución: TAKARA_STORE_ATTRIBUTION_V1",
    "Origen pedido: STORE",
    "Store ID: STO_000001",
    "Store nombre snapshot: Foto García",
    "",
    "[CLIENTE]",
    "Nombre: Cliente Store",
  ].join("\n");
}

function directBody() {
  return [
    "[TAKARA_PEDIDO_WEB_V2]",
    "",
    "[ATRIBUCION]",
    "Versión atribución: TAKARA_STORE_ATTRIBUTION_V1",
    "Origen pedido: DIRECT",
    "Store ID: ",
    "Store nombre snapshot: ",
    "",
    "[CLIENTE]",
    "Nombre: Cliente Direct",
  ].join("\n");
}

function makePedido(attribution) {
  return {
    attribution,
    cliente: {
      nombre: "Cliente",
      email: "cliente@example.test",
      telefono: "600000000",
    },
    producto: {
      producto: "Marco litofanía personalizado",
      formato: "144x108",
      orientacion: "vertical",
      medida: "144x108",
      color_marco: "Madera clara",
      cantidad: 1,
    },
    control: {
      autoriza_publicacion_resultado: false,
    },
  };
}

function runHandoff(source, body, attribution) {
  const sent = [];
  const htmlCalls = [];

  const context = {
    CFG: {
      DESTINO_PEDIDOS: "3d.takara@example.test",
    },
    MailApp: {
      sendEmail(options) {
        sent.push(options);
      },
    },
    construirHtmlInterno_(idPedidoWeb, pedido, foto, fichaVisual) {
      htmlCalls.push({
        idPedidoWeb,
        pedido,
        foto,
        fichaVisual,
      });
      return "<p>internal</p>";
    },
  };

  vm.createContext(context);
  vm.runInContext(
    extractFunction(source, "enviarEmailInterno_"),
    context,
    { filename: "enviarEmailInterno_.js" }
  );

  const pedido = makePedido(attribution);
  const attributionBefore = JSON.stringify(attribution);

  context.enviarEmailInterno_(
    "Pedido Takara",
    body,
    "TK-WEB-F3E",
    pedido,
    { foto_recibida: true },
    { ficha_visual_recibida: false, blob: null }
  );

  return {
    sent,
    htmlCalls,
    pedido,
    attributionBefore,
  };
}

const source = fs.readFileSync(CODE, "utf8");

const storeAttribution = Object.freeze({
  version: "TAKARA_STORE_ATTRIBUTION_V1",
  source_type: "STORE",
  store_id: "STO_000001",
  store_name_snapshot: "Foto García",
});

const store = runHandoff(source, storeBody(), storeAttribution);

ok(store.sent.length === 1, "STORE sends one internal email");
ok(
  store.sent[0].body === storeBody(),
  "STORE technical body reaches MailApp byte-for-byte"
);
ok(
  store.sent[0].body.includes("Origen pedido: STORE"),
  "STORE source survives handoff"
);
ok(
  store.sent[0].body.includes("Store ID: STO_000001"),
  "STORE id survives handoff"
);
ok(
  store.sent[0].body.includes(
    "Store nombre snapshot: Foto García"
  ),
  "STORE name snapshot survives handoff"
);
ok(
  store.sent[0].to === "3d.takara@example.test",
  "STORE internal destination preserved"
);
ok(
  store.htmlCalls.length === 1,
  "STORE internal HTML receives same order"
);
ok(
  store.htmlCalls[0].pedido.attribution === storeAttribution,
  "STORE attribution object reaches internal renderer unchanged"
);
ok(
  JSON.stringify(store.pedido.attribution) ===
    store.attributionBefore,
  "STORE attribution not mutated by handoff"
);
ok(Object.isFrozen(storeAttribution), "STORE attribution remains frozen");

const directAttribution = Object.freeze({
  version: "TAKARA_STORE_ATTRIBUTION_V1",
  source_type: "DIRECT",
});

const direct = runHandoff(source, directBody(), directAttribution);

ok(direct.sent.length === 1, "DIRECT sends one internal email");
ok(
  direct.sent[0].body === directBody(),
  "DIRECT technical body reaches MailApp byte-for-byte"
);
ok(
  direct.sent[0].body.includes("Origen pedido: DIRECT"),
  "DIRECT source survives handoff"
);
ok(
  direct.sent[0].body.includes("Store ID: \n"),
  "DIRECT handoff keeps Store id empty"
);
ok(
  direct.sent[0].body.includes(
    "Store nombre snapshot: \n"
  ),
  "DIRECT handoff keeps Store name empty"
);
ok(
  !Object.prototype.hasOwnProperty.call(
    directAttribution,
    "store_id"
  ),
  "DIRECT attribution does not invent store_id"
);
ok(
  !Object.prototype.hasOwnProperty.call(
    directAttribution,
    "store_name_snapshot"
  ),
  "DIRECT attribution does not invent store_name_snapshot"
);
ok(
  direct.htmlCalls[0].pedido.attribution === directAttribution,
  "DIRECT attribution object reaches internal renderer unchanged"
);

const internalSource = extractFunction(source, "enviarEmailInterno_");
ok(
  internalSource.includes("body: body"),
  "internal email uses supplied technical body"
);
ok(
  internalSource.includes("MailApp.sendEmail(options)"),
  "internal email hands options to MailApp"
);

const clientSource = extractFunction(
  source,
  "enviarConfirmacionCliente_"
);
for (const forbidden of [
  "store_id",
  "store_name_snapshot",
  ".attribution",
  "TAKARA_STORE_ATTRIBUTION_V1",
]) {
  ok(
    !clientSource.includes(forbidden),
    "client confirmation hides " + forbidden
  );
}

const clientHtmlSource = extractFunction(
  source,
  "construirHtmlConfirmacionPedidoCliente_"
);
for (const forbidden of [
  "store_id",
  "store_name_snapshot",
  ".attribution",
]) {
  ok(
    !clientHtmlSource.includes(forbidden),
    "client HTML hides " + forbidden
  );
}

const doPostSource = extractFunction(source, "doPost");
ok(
  !doPostSource.includes('"store_id"'),
  "HTTP response does not expose store_id field"
);
ok(
  !doPostSource.includes('"store_name_snapshot"'),
  "HTTP response does not expose Store name snapshot field"
);

console.log(
  "[TAKARA_ORDER_DOWNSTREAM_HANDOFF_F3E_OK] " +
    JSON.stringify({ checks })
);