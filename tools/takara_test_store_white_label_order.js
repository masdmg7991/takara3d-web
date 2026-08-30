"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tienda = fs.readFileSync(path.join(root, "tienda", "index.html"), "utf8");
const direct = fs.readFileSync(path.join(root, "pedido.html"), "utf8");
const storeOrder = fs.readFileSync(path.join(root, "tienda", "pedido.html"), "utf8");
const orderJs = fs.readFileSync(
  path.join(root, "assets", "js", "takara-pedido-web.js"),
  "utf8"
);
const entryJs = fs.readFileSync(
  path.join(root, "assets", "js", "takara-store-order-entry.js"),
  "utf8"
);
const resolution = fs.readFileSync(
  path.join(root, "apps-script", "takara-pedidos-web", "StoreOrderResolution.gs"),
  "utf8"
);
const attribution = fs.readFileSync(
  path.join(root, "apps-script", "takara-pedidos-web", "OrderAttribution.gs"),
  "utf8"
);

let checks = 0;
function ok(value, message) {
  if (!value) throw new Error("[FAIL] " + message);
  checks += 1;
}

ok(/new URL\("\/tienda\/pedido\.html"/.test(tienda), "Store CTA stays under /tienda/");
ok(!/new URL\("\/pedido\.html"/.test(tienda), "Store CTA no longer targets DIRECT page");
ok(/<form\b/i.test(direct), "DIRECT pedido form preserved");
ok(/Takara\s*3D|Takara3D/i.test(direct), "DIRECT page remains Takara channel");

ok(/TAKARA_STORE_WHITE_LABEL_ORDER_V1/.test(storeOrder), "Store white-label marker");
ok(/<form\b/i.test(storeOrder), "Store page contains real order form");
ok(/Enviar solicitud de pedido/i.test(storeOrder), "Store page contains submit");
ok(!/Takara\s*3D|Takara3D/i.test(storeOrder), "Store page has no visible Takara brand text");
ok(!/STO_[0-9]+/i.test(storeOrder), "Store page exposes no internal Store id");
ok(/takara-store-order-entry\.js/.test(storeOrder), "Store entry bridge loaded");

ok(/params\.get\("s"\)/.test(entryJs), "Store entry reads public ?s");
ok(/STORE_REF_PATTERN/.test(entryJs), "Store entry validates public ref");
ok(/bridge\.setTransport\(/.test(entryJs), "Store entry sets transport-only context");
ok(!/source_type/.test(entryJs), "browser cannot author source_type");
ok(!/store_id/.test(entryJs), "browser cannot author store_id");
ok(!/store_name_snapshot/.test(entryJs), "browser cannot author store_name_snapshot");

ok(/function setOrderStoreContextTransport\(value\)/.test(orderJs), "transport setter exists");
ok(/keys\.join\(","\) !== "store_ref,version"/.test(orderJs), "transport exact keys");
ok(/setTransport: setOrderStoreContextTransport/.test(orderJs), "transport setter exported");

ok(/meta\.store_context|hasOwnProperty\.call\(meta, "store_context"\)/.test(resolution), "backend consumes store_context");
ok(/keys\.join\(","\) !== "store_ref,version"/.test(resolution), "backend requires exact store transport");
ok(/DIRECT:\s*"DIRECT"/.test(attribution), "DIRECT source retained");
ok(/STORE:\s*"STORE"/.test(attribution), "STORE source retained");
ok(/assertNoBrowserDerivedAttribution_/.test(attribution), "backend rejects browser-derived attribution");

console.log(
  "[TAKARA_STORE_WHITE_LABEL_ORDER_V1_TEST_OK] " +
    JSON.stringify({
      checks,
      direct_route: "/pedido.html",
      store_route: "/tienda/pedido.html?s=<store_public_code>",
      browser_transport: ["version", "store_ref"],
      backend_owned_attribution: true
    })
);
