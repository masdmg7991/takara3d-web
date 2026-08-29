const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const expectedEndpoint = "https://script.google.com/macros/s/AKfycbzdrgKXZ0NbRWgx4huEi80K5MIEu3ytX217yEf6H5mQXK03-KN5W1NlMPD7W614tZ03-Q/exec";
let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

const configWindow = {};
const configContext = {
  window: configWindow,
  document: {
    readyState: "complete",
    body: {
      querySelectorAll() { return []; },
    },
  },
  MutationObserver: function () {
    this.observe = function () {};
  },
};
vm.createContext(configContext);
vm.runInContext(
  fs.readFileSync(path.join(root, "assets/js/takara-config.js"), "utf8"),
  configContext
);

ok(
  configWindow.TAKARA_GET_APPS_SCRIPT_ENDPOINT() === expectedEndpoint,
  "central config returns exact endpoint"
);
ok(
  configWindow.TAKARA_CONFIG.servicios.apps_script.version ===
    "TAKARA_APPS_SCRIPT_ENDPOINT_V1",
  "endpoint contract version"
);
ok(
  Object.isFrozen(configWindow.TAKARA_CONFIG.servicios.apps_script),
  "endpoint config frozen"
);

const storeDocument = {
  addEventListener() {},
  querySelector() { return null; },
  head: { appendChild() {} },
  createElement() { return {}; },
};
const storeWindow = {
  TAKARA_GET_APPS_SCRIPT_ENDPOINT:
    configWindow.TAKARA_GET_APPS_SCRIPT_ENDPOINT,
  location: { search: "" },
};
const storeContext = {
  window: storeWindow,
  document: storeDocument,
  Object,
  String,
  Number,
  Error,
  Promise,
  Uint32Array,
  URLSearchParams,
  encodeURIComponent,
};
vm.createContext(storeContext);
vm.runInContext(
  fs.readFileSync(path.join(root, "assets/js/takara-store-public.js"), "utf8"),
  storeContext
);

const storeApi = storeWindow.TAKARA_STORE_PUBLIC_CLIENT_V1;
ok(
  storeApi.getCentralAppsScriptEndpoint(storeWindow) === expectedEndpoint,
  "Store client consumes central endpoint"
);

let missingStoreEndpoint = null;
try {
  storeApi.getCentralAppsScriptEndpoint({});
} catch (error) {
  missingStoreEndpoint = error;
}
ok(Boolean(missingStoreEndpoint), "Store missing config fails");
ok(
  missingStoreEndpoint.code === "STORE_ENDPOINT_NOT_CONFIGURED",
  "Store missing config fail-closed code"
);

const orderListeners = {};
const orderWindow = {
  TAKARA_GET_APPS_SCRIPT_ENDPOINT:
    configWindow.TAKARA_GET_APPS_SCRIPT_ENDPOINT,
};
const orderContext = {
  window: orderWindow,
  document: {
    addEventListener(name, handler) {
      orderListeners[name] = handler;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
  },
  Object,
  String,
  Number,
  Error,
  Promise,
  Uint8Array,
  Array,
  Date,
};
vm.createContext(orderContext);
vm.runInContext(
  fs.readFileSync(path.join(root, "assets/js/takara-pedido-web.js"), "utf8"),
  orderContext
);

const orderApi = orderWindow.TAKARA_PEDIDO_ENDPOINT_V1;
ok(Boolean(orderApi), "order endpoint API exported");
ok(
  orderApi.version === "TAKARA_APPS_SCRIPT_ENDPOINT_V1",
  "order endpoint contract version"
);
ok(orderApi.get() === expectedEndpoint, "order consumes central endpoint");

const attributes = {};
const form = {
  setAttribute(name, value) {
    attributes[name] = value;
  },
};
ok(
  orderApi.applyToForm(form) === expectedEndpoint,
  "order applies central endpoint"
);
ok(
  attributes["data-takara-endpoint"] === expectedEndpoint,
  "order form receives central endpoint at runtime"
);

delete orderWindow.TAKARA_GET_APPS_SCRIPT_ENDPOINT;
ok(orderApi.get() === "", "order missing config returns empty endpoint");
orderApi.applyToForm(form);
ok(
  attributes["data-takara-endpoint"] === "",
  "order missing config clears runtime endpoint"
);

const pedidoText = fs.readFileSync(path.join(root, "pedido.html"), "utf8");
const tiendaText = fs.readFileSync(
  path.join(root, "tienda/index.html"),
  "utf8"
);

ok(
  pedidoText.indexOf(expectedEndpoint) === -1,
  "pedido HTML has no literal endpoint"
);
ok(
  tiendaText.indexOf(expectedEndpoint) === -1,
  "Store HTML has no literal endpoint"
);
ok(
  pedidoText.indexOf("takara-config.js") <
    pedidoText.indexOf("takara-pedido-web.js"),
  "pedido loads config before order engine"
);
ok(
  tiendaText.indexOf("takara-config.js") <
    tiendaText.indexOf("takara-store-public.js"),
  "Store loads config before Store client"
);

console.log(
  "[TAKARA_SHARED_APPS_SCRIPT_ENDPOINT_TEST_OK] " +
    JSON.stringify({ checks })
);