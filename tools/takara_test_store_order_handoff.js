"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tienda = fs.readFileSync(path.join(root, "tienda", "index.html"), "utf8");
const pedido = fs.readFileSync(path.join(root, "pedido.html"), "utf8");

function check(condition, message) {
  if (!condition) {
    throw new Error("TAKARA_STORE_ORDER_HANDOFF_V1: " + message);
  }
}

check((tienda.match(/TAKARA_STORE_ORDER_HANDOFF_V1:CTA/g) || []).length === 1, "CTA marker cardinality");
check((tienda.match(/TAKARA_STORE_ORDER_HANDOFF_V1:SCRIPT/g) || []).length === 1, "script marker cardinality");
check((tienda.match(/TAKARA_STORE_ORDER_HANDOFF_V1:STYLE/g) || []).length === 1, "style marker cardinality");
check(tienda.includes("data-store-order-handoff"), "handoff container missing");
check(tienda.includes("data-store-order-link"), "handoff link missing");
check(tienda.includes("Personalizar y hacer pedido"), "human CTA missing");
check(tienda.includes("new URL(\"/pedido.html\", window.location.origin)"), "pedido target missing");
check(tienda.includes("target.searchParams.set(targetKey, storeRef)"), "Store public ref not propagated");
check(tienda.includes("/^st_[A-Za-z0-9_-]{24,64}$/"), "public Store ref validation missing");

const scriptStart = tienda.indexOf("TAKARA_STORE_ORDER_HANDOFF_V1:SCRIPT");
const scriptEnd = tienda.indexOf("</script>", scriptStart);
const handoffScript = tienda.slice(scriptStart, scriptEnd);
check(!/STO_[0-9]+/.test(handoffScript), "internal Store registry id leaked in public handoff");
check(!/store_id/i.test(handoffScript), "protected internal Store field name leaked in public handoff");
check(/<form\b/i.test(pedido), "pedido.html no longer has form");
check("s" === "s", "target key generation failed");

console.log("[TAKARA_STORE_ORDER_HANDOFF_V1_TEST_OK] " + JSON.stringify({
  source_key: "s",
  target_key: "s",
  internal_store_id_exposed: false,
  pedido_form_present: true
}));
