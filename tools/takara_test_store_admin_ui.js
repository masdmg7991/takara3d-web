const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

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
ok(bootstrap.mode === "MANAGE", "bootstrap mode evolved by F4D");
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
]) {
  ok(!bridge.includes(forbidden), "bridge excludes " + forbidden);
}

const html = fs.readFileSync(
  path.join(APP, "StoreAdminUi.html"),
  "utf8"
);

for (const marker of [
  "Store Admin",
  "Store Admin",
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
  "Eliminar tienda",
  "Desactivar tienda",
  "Activar tienda",
  "SpreadsheetApp",
  "TAKARA_STORE_ADMIN_OWNER_EMAIL",
]) {
  ok(!html.includes(forbidden), "UI hides mutation " + forbidden);
}

ok(!html.includes("innerHTML"), "UI avoids innerHTML");
ok(
  bridge.includes("listStoresAdmin_()") &&
    bridge.includes("getStoreAdmin_(storeId)"),
  "F4C read bridge remains while later capabilities evolve"
);
ok(html.includes("textContent"), "UI uses textContent");
ok(
  html.includes("getStoreAdminUiBootstrap") &&
    html.includes("getStoreAdminUiStore"),
  "F4C read foundation remains under F4D"
);
ok(
  html.includes('STORE_PUBLIC_URL_PREFIX = "https://takara3d.es/tienda/?s="'),
  "Admin derives canonical Store public URL"
);
ok(
  html.includes("buildStorePublicUrl(store.store_public_code)"),
  "Admin public URL derives from store_public_code"
);
ok(
  !html.includes("buildStorePublicUrl(store.store_id)"),
  "Admin never builds public URL from store_id"
);
ok(html.includes("renderStoreQrCanvas("), "Admin renders local QR from canonical URL");
ok(html.includes("Abrir tienda"), "Admin exposes open Store action");
ok(html.includes("Copiar enlace"), "Admin exposes copy Store URL action");
ok(!html.includes("quickchart.io"), "Admin QR has no QuickChart dependency");
ok(!html.includes("STORE_QR_IMAGE_PREFIX"), "Admin QR has no remote image authority");
ok(html.includes("STORE_QR_SIZE = 37"), "Admin QR uses fixed Version 5 matrix");
ok(html.includes("STORE_QR_EC_CODEWORDS = 26"), "Admin QR carries local Reed-Solomon parity");

const qrSourceStart = html.indexOf("function qrGfMultiply");
const qrSourceEnd = html.indexOf("function copyStorePublicUrl");
ok(qrSourceStart >= 0 && qrSourceEnd > qrSourceStart, "QR implementation is extractable for causal test");

const qrContext = { Array, String, Math, Error };
vm.createContext(qrContext);
vm.runInContext(
  [
    "const STORE_QR_SIZE = 37;",
    "const STORE_QR_DATA_CODEWORDS = 108;",
    "const STORE_QR_EC_CODEWORDS = 26;",
    "const STORE_QR_MASK = 0;",
    html.slice(qrSourceStart, qrSourceEnd),
    "this.buildStoreQrMatrix = buildStoreQrMatrix;",
  ].join("\n"),
  qrContext,
  { filename: "StoreAdminUi.local-qr.js" }
);

const qrReferenceUrl =
  "https://takara3d.es/tienda/?s=st_AAAAAAAAAAAAAAAAAAAAAAAA";
const qrMatrix = qrContext.buildStoreQrMatrix(qrReferenceUrl);
ok(qrMatrix.length === 37, "local QR matrix has Version 5 size");
ok(
  qrMatrix.every((row) =>
    row.length === 37 && row.every((value) => typeof value === "boolean")
  ),
  "local QR matrix is complete and boolean"
);
const qrBits = qrMatrix
  .map((row) => row.map((value) => value ? "1" : "0").join(""))
  .join("");
const qrFingerprint = crypto
  .createHash("sha256")
  .update(qrBits)
  .digest("hex");
ok(
  qrFingerprint === "272547b03fbafcd2393bbc3486cf5f61a03d73e2899c0ed42f1578fdb0a5b7d9",
  "local QR matches independent Version 5-L reference matrix"
);

console.log(
  "[TAKARA_STORE_ADMIN_UI_F4C_OK] " +
    JSON.stringify({ checks, listCalls, getCalls })
);