const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let checks = 0;

function ok(value, label) {
  if (!value) throw new Error("[FAIL] " + label);
  checks += 1;
}

function backend() {
  const context = {
    console,
    Object,
    String,
    Number,
    Boolean,
    Error,
    Date,
    JSON,
    Array,
    Math,
    RegExp,
    isFinite,
    parseInt,
    parseFloat,
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput(content) {
        return {
          content,
          mimeType: "",
          setMimeType(value) {
            this.mimeType = value;
            return this;
          },
        };
      },
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: "ALLOWALL" },
      createHtmlOutput(content) {
        return {
          content,
          xFrameMode: "",
          setXFrameOptionsMode(value) {
            this.xFrameMode = value;
            return this;
          },
        };
      },
    },
  };

  vm.createContext(context);
  for (const file of ["OrderBrowserTransport.gs", "Code.gs"]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(root, "apps-script", "takara-pedidos-web", file),
        "utf8"
      ),
      context,
      { filename: file }
    );
  }
  return context;
}

(function main() {
  const ctx = backend();
  const orderId = "TK-WEB-20260901-ABC234";
  const nonce = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const event = {
    parameter: {
      takara_response_mode: "postmessage_v1",
      takara_response_origin: "https://takara3d.es",
      takara_response_nonce: nonce,
      takara_order_id: orderId,
    },
  };

  const request = ctx.parseOrderBrowserResponseRequest_(event);
  ok(request.version === "TAKARA_ORDER_BROWSER_POSTMESSAGE_V1", "protocol version");
  ok(request.origin === "https://takara3d.es", "allowed origin");
  ok(request.nonce === nonce, "nonce preserved");
  ok(request.order_id === orderId, "order id preserved");
  ok(ctx.parseOrderBrowserResponseRequest_({ parameter: {} }) === null, "legacy mode stays JSON");

  let rejected = false;
  try {
    ctx.parseOrderBrowserResponseRequest_({
      parameter: Object.assign({}, event.parameter, {
        takara_response_origin: "https://evil.example",
      }),
    });
  } catch (error) {
    rejected = true;
  }
  ok(rejected, "untrusted origin rejected");

  rejected = false;
  try {
    ctx.assertOrderBrowserPayloadMatches_(request, {
      pedido_web_id: "TK-WEB-20260901-ZYX987",
    });
  } catch (error) {
    rejected = true;
  }
  ok(rejected, "mismatched order id rejected");

  const safe = ctx.orderBrowserSafeResponse_(request, {
    ok: true,
    id_pedido_web: orderId,
    estado: "recibido",
    email_destino: "private@example.test",
    enlace_drive: "private",
    store_id: "STO_000001",
  });
  ok(safe.ok === true && safe.estado === "recibido", "accepted ACK state");
  ok(safe.id_pedido_web === orderId, "ACK correlates order id");
  ok(!("email_destino" in safe), "ACK omits email");
  ok(!("enlace_drive" in safe), "ACK omits Drive");
  ok(!("store_id" in safe), "ACK omits Store identity");

  const html = ctx.orderBrowserResponseOrJson_(request, {
    ok: true,
    id_pedido_web: orderId,
    estado: "recibido",
    email_destino: "private@example.test",
  });
  ok(html.xFrameMode === "ALLOWALL", "ACK iframe output enabled");
  ok(html.content.includes("window.parent.postMessage("), "ACK posts to parent");
  ok(html.content.includes("TAKARA_ORDER_BROWSER_POSTMESSAGE_V1"), "ACK marker emitted");
  ok(!html.content.includes("private@example.test"), "ACK HTML contains no PII");

  const legacy = ctx.orderBrowserResponseOrJson_(null, {
    ok: true,
    preserved: true,
  });
  ok(legacy.mimeType === "application/json", "legacy response remains JSON");
  ok(JSON.parse(legacy.content).preserved === true, "legacy JSON payload preserved");

  const wrapped = {
    parameter: Object.assign({}, event.parameter, {
      takara_payload_json: JSON.stringify({
        payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
        pedido_web_id: orderId,
      }),
    }),
    postData: {
      contents: "takara_payload_json=encoded-form-body",
    },
  };
  const payload = ctx.parsePayload_(wrapped);
  ok(payload.pedido_web_id === orderId, "form unwraps JSON payload");
  ok(payload.takara_response_nonce === undefined, "transport envelope excluded from payload");

  const raw = ctx.parsePayload_({
    postData: {
      contents: JSON.stringify({
        payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
        pedido_web_id: orderId,
      }),
    },
    parameter: {},
  });
  ok(raw.pedido_web_id === orderId, "raw JSON POST remains compatible");

  const web = fs.readFileSync(
    path.join(root, "assets", "js", "takara-pedido-web.js"),
    "utf8"
  );
  const pedido = fs.readFileSync(path.join(root, "pedido.html"), "utf8");
  const code = fs.readFileSync(
    path.join(root, "apps-script", "takara-pedidos-web", "Code.gs"),
    "utf8"
  );

  ok(!web.includes('mode: "no-cors"'), "no-cors success path removed");
  ok(web.includes("submitOrderWithBrowserAck(endpoint, payload)"), "submit waits for ACK");
  ok(web.includes("event.source !== frame.contentWindow"), "ACK bound to exact iframe");
  ok(web.includes("data.nonce !== nonce"), "ACK nonce checked");
  ok(web.includes("data.order_id !== orderId"), "ACK order id checked");
  ok(web.includes("ORDER_BROWSER_ACK_TIMEOUT_MS = 120000"), "ACK timeout explicit");
  ok(web.includes("function isStoreEmbeddedStatus(node)"), "Store feedback channel detection present");
  ok(
    web.includes('form.getAttribute("data-takara-order-channel") === "STORE"'),
    "Store feedback detects embedded order channel"
  );
  ok(
    web.includes("const storeEmbedded = isStoreEmbeddedStatus(node);"),
    "terminal feedback resolves Store embedding"
  );
  ok(
    web.includes("node.hidden = false;") && !web.includes("node.hidden = true;"),
    "terminal feedback remains inline visible"
  );
  ok(
    web.includes("if (terminalState && !storeEmbedded)"),
    "fixed modal is direct-only for terminal feedback"
  );
  ok(
    pedido.includes("takara-pedido-web.js?v=pedido-entrega-v2-3&amp;b=pedido-feedback-store-v1"),
    "Store feedback cache build active"
  );
  ok(
    code.includes("TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"),
    "backend ACK candidate version"
  );
  ok(code.includes("parseOrderBrowserResponseRequest_(e)"), "doPost reads ACK envelope");
  ok(code.includes("e.parameter.takara_payload_json"), "doPost unwraps form payload");
  ok(
    code.indexOf("e.parameter && e.parameter.takara_payload_json") <
      code.indexOf("e.postData && e.postData.contents"),
    "form payload is unwrapped before raw postData parsing"
  );

  console.log(
    "[TAKARA_ORDER_BROWSER_TRANSPORT_TEST_OK] " +
      JSON.stringify({
        checks,
        protocol: "TAKARA_ORDER_BROWSER_POSTMESSAGE_V1",
      })
  );
})();
