const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "apps-script", "takara-pedidos-web");

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

const stores = [
  Object.freeze({
    contract_version: "TAKARA_STORE_ADMIN_READ_V1",
    store_id: "STO_000001",
    store_public_code: "st_AAAAAAAAAAAAAAAAAAAAAAAA",
    status: "ACTIVE",
    display_name: "Foto García",
    contact_name: "Ana",
    email: "ana@example.test",
    phone: "600000001",
    address_line: "Calle Uno",
    postal_code: "28001",
    city: "Madrid",
    province: "Madrid",
    created_at: "2026-08-01",
    updated_at: "2026-08-29",
    deactivated_at: "",
    version: 2,
    notes: "",
  }),
  Object.freeze({
    contract_version: "TAKARA_STORE_ADMIN_READ_V1",
    store_id: "STO_000002",
    store_public_code: "st_BBBBBBBBBBBBBBBBBBBBBBBB",
    status: "INACTIVE",
    display_name: "Estudio Norte",
    contact_name: "Luis",
    email: "luis@example.test",
    phone: "600000002",
    address_line: "Calle Dos",
    postal_code: "39001",
    city: "Santander",
    province: "Cantabria",
    created_at: "2026-08-02",
    updated_at: "2026-08-28",
    deactivated_at: "2026-08-28",
    version: 3,
    notes: "Inactiva",
  }),
];

let listCalls = 0;
let getCalls = 0;

const context = {
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  listStoresAdmin_() {
    listCalls += 1;
    return Object.freeze(stores.slice());
  },
  getStoreAdmin_(storeId) {
    getCalls += 1;
    const found = stores.find((store) => store.store_id === storeId);
    if (!found) throw new Error("STORE_NOT_FOUND");
    return found;
  },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(APP, "StoreAdminUiBridge.gs"), "utf8"),
  context,
  { filename: "StoreAdminUiBridge.gs" }
);

const bootstrap = context.getStoreAdminUiBootstrap();
ok(bootstrap.version === "TAKARA_STORE_ADMIN_UI_V1", "bootstrap version");
ok(bootstrap.mode === "READ_ONLY", "bootstrap read-only mode");
ok(Array.isArray(bootstrap.stores), "bootstrap stores array");
ok(bootstrap.stores.length === 2, "bootstrap returns F4B stores");
ok(listCalls === 1, "bootstrap calls F4B list once");
ok(getCalls === 0, "bootstrap does not get detail");

const one = context.getStoreAdminUiStore("STO_000002");
ok(one.store_id === "STO_000002", "detail returns F4B Store");
ok(one.status === "INACTIVE", "detail includes INACTIVE");
ok(getCalls === 1, "detail calls F4B get once");

let missing = "";
try {
  context.getStoreAdminUiStore("STO_999999");
} catch (error) {
  missing = String(error && error.message || error);
}
ok(missing === "STORE_NOT_FOUND", "detail propagates fail closed");

const bridge = fs.readFileSync(
  path.join(APP, "StoreAdminUiBridge.gs"),
  "utf8"
);
for (const forbidden of [
  "SpreadsheetApp",
  "PropertiesService",
  "createStoreSheetsRepository_",
  "createStoreAdmin_",
  "updateStoreAdmin_",
  "activateStoreAdmin_",
  "deactivateStoreAdmin_",
]) {
  ok(!bridge.includes(forbidden), "bridge excludes " + forbidden);
}

const html = fs.readFileSync(
  path.join(APP, "StoreAdminUi.html"),
  "utf8"
);

for (const marker of [
  "Store Admin",
  "SOLO LECTURA",
  "Buscar por tienda",
  "ACTIVE",
  "INACTIVE",
  "getStoreAdminUiBootstrap",
  "getStoreAdminUiStore",
  "TAKARA_STORE_ADMIN_PREVIEW_DATA",
  "STORE_ADMIN_UI_BACKEND_UNAVAILABLE",
]) {
  ok(html.includes(marker), "UI contains " + marker);
}

for (const forbidden of [
  "Crear tienda",
  "Editar tienda",
  "Eliminar tienda",
  "Desactivar tienda",
  "Activar tienda",
  "SpreadsheetApp",
  "TAKARA_STORE_ADMIN_OWNER_EMAIL",
]) {
  ok(!html.includes(forbidden), "UI hides mutation " + forbidden);
}

ok(!html.includes("innerHTML"), "UI avoids innerHTML");
ok(html.includes("textContent"), "UI uses textContent");

console.log(
  "[TAKARA_STORE_ADMIN_UI_F4C_OK] " +
    JSON.stringify({ checks, listCalls, getCalls })
);