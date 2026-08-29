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
function domainError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
function expectCode(fn, expected, message) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === expected, message + " code");
}

let authorized = true;
let accessCalls = 0;
let createCalls = 0;
let updateCalls = 0;
let lastCreate = null;
let lastUpdate = null;

function readModel(store) {
  return Object.freeze(Object.assign(
    { contract_version: "TAKARA_STORE_ADMIN_READ_V1" },
    store
  ));
}

const context = {
  console, Object, Array, String, Number, Boolean, Error, JSON,
  storeDomainError_: domainError,
  assertStoreId_(value) {
    if (!/^STO_\d{6}$/.test(String(value || ""))) {
      throw domainError("STORE_ID_INVALID", "Store id invalid.");
    }
    return String(value);
  },
  requireStoreAdminAccess_() {
    accessCalls += 1;
    if (!authorized) throw new Error("STORE_ADMIN_FORBIDDEN");
    return Object.freeze({
      version: "TAKARA_STORE_ADMIN_ACCESS_V1",
      role: "OWNER",
      authorized: true,
    });
  },
  toStoreAdminReadModel_: readModel,
  createStoreRuntime_(input) {
    createCalls += 1;
    lastCreate = Object.assign({}, input);
    return Object.assign({
      store_id: "STO_000010",
      store_public_code: "st_CREATED_BY_RUNTIME_000010",
      status: "ACTIVE",
      created_at: "2026-08-30T10:00:00.000Z",
      updated_at: "2026-08-30T10:00:00.000Z",
      deactivated_at: "",
      version: 1,
    }, input);
  },
  updateStoreRuntime_(storeId, patch) {
    updateCalls += 1;
    lastUpdate = { storeId, patch: Object.assign({}, patch) };
    return Object.assign({
      store_id: storeId,
      store_public_code: "st_EXISTING_000001",
      status: "ACTIVE",
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-30T11:00:00.000Z",
      deactivated_at: "",
      version: 4,
      display_name: "Foto García",
    }, patch);
  },
  listStoresAdmin_() { return Object.freeze([]); },
  getStoreAdmin_(storeId) {
    return readModel({
      store_id: storeId,
      status: "ACTIVE",
      display_name: "Foto García",
    });
  },
};

vm.createContext(context);
for (const file of ["StoreAdminWrite.gs", "StoreAdminUiBridge.gs"]) {
  vm.runInContext(
    fs.readFileSync(path.join(APP, file), "utf8"),
    context,
    { filename: file }
  );
}

const allowedCreate = {
  display_name: "Foto Nueva",
  contact_name: "Ana",
  email: "ana@example.test",
  phone: "600000000",
  address_line: "Calle Mayor 1",
  postal_code: "28001",
  city: "Madrid",
  province: "Madrid",
  notes: "Nueva",
};

const created = context.createStoreAdmin_(allowedCreate);
ok(accessCalls === 1, "create authorizes once");
ok(createCalls === 1, "create delegates once");
ok(created.store_id === "STO_000010", "runtime owns created store_id");
ok(created.status === "ACTIVE", "runtime owns initial status");
ok(
  Object.keys(lastCreate).sort().join(",") ===
    Object.keys(allowedCreate).sort().join(","),
  "create delegates exact editable keys"
);
ok(!("status" in lastCreate), "create does not invent status");
ok(!("store_id" in lastCreate), "create does not invent store_id");

const updated = context.updateStoreAdmin_(
  "STO_000001",
  { display_name: "Foto García Centro", notes: "Renombrada" }
);
ok(accessCalls === 2, "update authorizes once");
ok(updateCalls === 1, "update delegates once");
ok(lastUpdate.storeId === "STO_000001", "update uses immutable store_id");
ok(lastUpdate.patch.display_name === "Foto García Centro", "update display_name");
ok(lastUpdate.patch.notes === "Renombrada", "update notes");
ok(updated.store_id === "STO_000001", "update preserves store_id");
ok(updated.status === "ACTIVE", "update does not own status");

for (const forbidden of [
  "store_id", "store_public_code", "status", "created_at", "updated_at",
  "deactivated_at", "version", "source_type", "store_attribution",
]) {
  const beforeCreate = createCalls;
  expectCode(
    () => context.createStoreAdmin_({
      display_name: "Tienda",
      [forbidden]: "ATTACK",
    }),
    "STORE_ADMIN_INPUT_FORBIDDEN_FIELD",
    "create rejects " + forbidden
  );
  ok(createCalls === beforeCreate, "create runtime untouched for " + forbidden);

  const beforeUpdate = updateCalls;
  expectCode(
    () => context.updateStoreAdmin_("STO_000001", { [forbidden]: "ATTACK" }),
    "STORE_ADMIN_INPUT_FORBIDDEN_FIELD",
    "update rejects " + forbidden
  );
  ok(updateCalls === beforeUpdate, "update runtime untouched for " + forbidden);
}

expectCode(
  () => context.createStoreAdmin_({ notes: "No name" }),
  "STORE_ADMIN_DISPLAY_NAME_REQUIRED",
  "create requires display_name key"
);
expectCode(
  () => context.updateStoreAdmin_("STO_000001", {}),
  "STORE_ADMIN_INPUT_EMPTY",
  "update rejects empty patch"
);
for (const invalid of [null, [], "text", 42]) {
  expectCode(
    () => context.createStoreAdmin_(invalid),
    "STORE_ADMIN_INPUT_INVALID",
    "create rejects non-object input"
  );
}

authorized = false;
const createBeforeDeny = createCalls;
const updateBeforeDeny = updateCalls;
let deniedCreate = "";
try { context.createStoreAdmin_({ display_name: "Denied" }); }
catch (error) { deniedCreate = String(error && error.message || error); }
ok(deniedCreate === "STORE_ADMIN_FORBIDDEN", "create denies non-owner");
ok(createCalls === createBeforeDeny, "denied create reaches zero runtime writes");

let deniedUpdate = "";
try {
  context.updateStoreAdmin_("STO_000001", { display_name: "Denied" });
} catch (error) {
  deniedUpdate = String(error && error.message || error);
}
ok(deniedUpdate === "STORE_ADMIN_FORBIDDEN", "update denies non-owner");
ok(updateCalls === updateBeforeDeny, "denied update reaches zero runtime writes");
authorized = true;

const bridgeCreated = context.createStoreAdminUiStore({
  display_name: "Bridge Store",
});
ok(bridgeCreated.display_name === "Bridge Store", "UI bridge delegates create");
const bridgeUpdated = context.updateStoreAdminUiStore(
  "STO_000001",
  { city: "Toledo" }
);
ok(bridgeUpdated.city === "Toledo", "UI bridge delegates update");
ok(context.getStoreAdminUiBootstrap().mode === "MANAGE", "UI mode MANAGE");

const source = fs.readFileSync(path.join(APP, "StoreAdminWrite.gs"), "utf8");
for (const dependency of [
  "SpreadsheetApp", "PropertiesService", "LockService",
  "createStoreSheetsRepository_", "MailApp", "DriveApp",
  "function doGet(", "function doPost(",
]) {
  ok(!source.includes(dependency), "AdminWrite excludes " + dependency);
}
ok(source.includes("createStoreRuntime_(createInput)"), "create canonical Runtime");
ok(
  source.includes("updateStoreRuntime_(normalizedStoreId, updatePatch)"),
  "update canonical Runtime"
);
ok(source.includes("toStoreAdminReadModel_("), "returns F4B read model");

const html = fs.readFileSync(path.join(APP, "StoreAdminUi.html"), "utf8");
for (const marker of [
  "Nueva tienda", "Editar tienda", "Crear tienda", "Guardar cambios",
  "createStoreAdminUiStore", "updateStoreAdminUiStore",
  'mode !== "MANAGE"',
]) {
  ok(html.includes(marker), "UI F4D contains " + marker);
}
ok(
  html.includes("Nueva tienda") &&
    html.includes("Editar tienda") &&
    html.includes("Guardar cambios"),
  "F4D create/edit foundation remains under F4E"
);

for (const forbiddenUi of [
  'name = "status"', 'name="status"',
  "Eliminar tienda", "SpreadsheetApp", "TAKARA_STORE_ADMIN_OWNER_EMAIL",
]) {
  ok(!html.includes(forbiddenUi), "UI F4D excludes " + forbiddenUi);
}
ok(!html.includes("innerHTML"), "UI F4D avoids innerHTML");

console.log(
  "[TAKARA_STORE_ADMIN_WRITE_F4D_OK] " +
    JSON.stringify({ checks, accessCalls, createCalls, updateCalls })
);