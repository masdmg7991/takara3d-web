const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function expectCode(fn, code, label) {
  let caught = null;

  try {
    fn();
  } catch (error) {
    caught = error;
  }

  ok(Boolean(caught), label + " throws");
  ok(caught && caught.code === code, label + " code");
}

const window = {
  location: {
    href: "https://takara3d.es/pedido.html",
    hostname: "takara3d.es",
    search: "",
  },
  sessionStorage: {
    setItem() {},
  },
  console,
};

const document = {
  addEventListener() {},
  querySelectorAll() { return []; },
  querySelector() { return null; },
  createElement() {
    return {
      click() {},
      remove() {},
    };
  },
  body: {
    appendChild() {},
  },
};

const context = {
  window,
  document,
  console,
  Object,
  String,
  Number,
  Boolean,
  Error,
  Promise,
  Uint8Array,
  Array,
  Date,
  Set,
  Map,
  JSON,
  Math,
  RegExp,
  Blob: function Blob() {},
  URL: {
    createObjectURL() { return "blob:test"; },
    revokeObjectURL() {},
  },
  FileReader: function FileReader() {},
  setTimeout,
  clearTimeout,
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(
    path.join(root, "assets/js/takara-pedido-web.js"),
    "utf8"
  ),
  context,
  { filename: "takara-pedido-web.js" }
);

const api = window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1;
const ref = "st_123456789012345678901234";

ok(Boolean(api), "bridge exported");
ok(
  api.version === "TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1",
  "bridge version"
);
ok(
  api.context_version === "TAKARA_STORE_CONTEXT_V1",
  "context version"
);
ok(api.getTransport() === null, "DIRECT starts without StoreContext");
ok(
  Object.keys(api.getMeta()).length === 0,
  "DIRECT meta has no store_context"
);

const transport = api.setVerifiedContext({
  version: "TAKARA_STORE_CONTEXT_V1",
  store_ref: ref,
  display_name: "Foto García",
  status: "ACTIVE",
});

ok(Object.isFrozen(transport), "transport frozen");
ok(transport.version === "TAKARA_STORE_CONTEXT_V1", "transport version");
ok(transport.store_ref === ref, "transport store_ref");
ok(
  Object.keys(transport).sort().join(",") === "store_ref,version",
  "transport exact two fields"
);
ok(
  !Object.prototype.hasOwnProperty.call(transport, "display_name"),
  "display name not transported"
);
ok(
  !Object.prototype.hasOwnProperty.call(transport, "status"),
  "status not transported"
);
ok(
  !Object.prototype.hasOwnProperty.call(transport, "store_id"),
  "store_id not transported"
);

const meta = api.getMeta();
ok(Boolean(meta.store_context), "STORE meta contains store_context");
ok(meta.store_context === transport, "meta uses sanitized transport");
ok(
  !Object.prototype.hasOwnProperty.call(meta, "source_type"),
  "frontend does not derive source_type"
);

api.clear();
ok(api.getTransport() === null, "clear returns DIRECT state");
ok(
  Object.keys(api.getMeta()).length === 0,
  "clear removes store_context from meta"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
      display_name: "Foto García",
      status: "INACTIVE",
    }),
  "ORDER_STORE_NOT_ACTIVE",
  "inactive Store"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "WRONG",
      store_ref: ref,
      display_name: "Foto García",
      status: "ACTIVE",
    }),
  "ORDER_STORE_CONTEXT_VERSION_INVALID",
  "wrong context version"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: "STO_000001",
      display_name: "Foto García",
      status: "ACTIVE",
    }),
  "ORDER_STORE_REF_INVALID",
  "internal id as public ref"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
      display_name: "Foto García",
      status: "ACTIVE",
      store_id: "STO_000001",
    }),
  "ORDER_STORE_CONTEXT_INVALID",
  "store_id injection"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
      display_name: "Foto García",
      status: "ACTIVE",
      source_type: "STORE",
    }),
  "ORDER_STORE_CONTEXT_INVALID",
  "source_type injection"
);

expectCode(
  () =>
    api.setVerifiedContext({
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
      display_name: "",
      status: "ACTIVE",
    }),
  "ORDER_STORE_CONTEXT_INVALID",
  "blank display name"
);

console.log(
  "[TAKARA_ORDER_STORE_CONTEXT_F3A_OK] " +
    JSON.stringify({ checks })
);