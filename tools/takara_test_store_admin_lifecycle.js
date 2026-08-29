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

let authorized = true;
let accessCalls = 0;
let activateCalls = 0;
let deactivateCalls = 0;
let lastActivate = "";
let lastDeactivate = "";

function readModel(store) {
  return Object.freeze(
    Object.assign(
      { contract_version: "TAKARA_STORE_ADMIN_READ_V1" },
      store
    )
  );
}

const context = {
  console,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  JSON,
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
  activateStoreRuntime_(storeId) {
    activateCalls += 1;
    lastActivate = storeId;
    return {
      store_id: storeId,
      store_public_code: "st_EXISTING_000001",
      status: "ACTIVE",
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-30T12:00:00.000Z",
      deactivated_at: "",
      version: 5,
      display_name: "Foto García",
    };
  },
  deactivateStoreRuntime_(storeId) {
    deactivateCalls += 1;
    lastDeactivate = storeId;
    return {
      store_id: storeId,
      store_public_code: "st_EXISTING_000001",
      status: "INACTIVE",
      created_at: "2026-08-01T10:00:00.000Z",
      updated_at: "2026-08-30T12:30:00.000Z",
      deactivated_at: "2026-08-30T12:30:00.000Z",
      version: 6,
      display_name: "Foto García",
    };
  },
  createStoreRuntime_() {
    throw new Error("UNUSED_CREATE");
  },
  updateStoreRuntime_() {
    throw new Error("UNUSED_UPDATE");
  },
  listStoresAdmin_() {
    return Object.freeze([]);
  },
  getStoreAdmin_(storeId) {
    return readModel({
      store_id: storeId,
      status: "ACTIVE",
      display_name: "Foto García",
    });
  },
  createStoreAdmin_() {
    throw new Error("UNUSED_ADMIN_CREATE");
  },
  updateStoreAdmin_() {
    throw new Error("UNUSED_ADMIN_UPDATE");
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

const active = context.activateStoreAdmin_("STO_000001");
ok(accessCalls === 1, "activate authorizes once");
ok(activateCalls === 1, "activate delegates once");
ok(lastActivate === "STO_000001", "activate uses immutable store_id");
ok(active.status === "ACTIVE", "activate returns ACTIVE read model");
ok(active.deactivated_at === "", "activate clears deactivated_at via Runtime");
ok(active.version === 5, "activate returns Runtime version");

const inactive = context.deactivateStoreAdmin_("STO_000001");
ok(accessCalls === 2, "deactivate authorizes once");
ok(deactivateCalls === 1, "deactivate delegates once");
ok(lastDeactivate === "STO_000001", "deactivate uses immutable store_id");
ok(inactive.status === "INACTIVE", "deactivate returns INACTIVE read model");
ok(Boolean(inactive.deactivated_at), "deactivate returns timestamp");
ok(inactive.version === 6, "deactivate returns Runtime version");

const bridgeActive = context.activateStoreAdminUiStore("STO_000001");
ok(bridgeActive.status === "ACTIVE", "UI bridge delegates activate");

const bridgeInactive = context.deactivateStoreAdminUiStore("STO_000001");
ok(bridgeInactive.status === "INACTIVE", "UI bridge delegates deactivate");

const beforeInvalidActivate = activateCalls;
let invalidActivate = "";
try {
  context.activateStoreAdmin_("bad");
} catch (error) {
  invalidActivate = String(error && error.code || error && error.message || error);
}
ok(invalidActivate === "STORE_ID_INVALID", "activate validates store_id");
ok(
  activateCalls === beforeInvalidActivate,
  "invalid activate reaches zero Runtime writes"
);

const beforeInvalidDeactivate = deactivateCalls;
let invalidDeactivate = "";
try {
  context.deactivateStoreAdmin_("bad");
} catch (error) {
  invalidDeactivate = String(error && error.code || error && error.message || error);
}
ok(invalidDeactivate === "STORE_ID_INVALID", "deactivate validates store_id");
ok(
  deactivateCalls === beforeInvalidDeactivate,
  "invalid deactivate reaches zero Runtime writes"
);

authorized = false;

const beforeDeniedActivate = activateCalls;
let deniedActivate = "";
try {
  context.activateStoreAdmin_("STO_000001");
} catch (error) {
  deniedActivate = String(error && error.message || error);
}
ok(deniedActivate === "STORE_ADMIN_FORBIDDEN", "activate denies non-owner");
ok(
  activateCalls === beforeDeniedActivate,
  "denied activate reaches zero Runtime writes"
);

const beforeDeniedDeactivate = deactivateCalls;
let deniedDeactivate = "";
try {
  context.deactivateStoreAdmin_("STO_000001");
} catch (error) {
  deniedDeactivate = String(error && error.message || error);
}
ok(deniedDeactivate === "STORE_ADMIN_FORBIDDEN", "deactivate denies non-owner");
ok(
  deactivateCalls === beforeDeniedDeactivate,
  "denied deactivate reaches zero Runtime writes"
);

authorized = true;

const source = fs.readFileSync(
  path.join(APP, "StoreAdminWrite.gs"),
  "utf8"
);

for (const dependency of [
  "SpreadsheetApp",
  "PropertiesService",
  "LockService",
  "createStoreSheetsRepository_",
  "function doGet(",
  "function doPost(",
]) {
  ok(!source.includes(dependency), "AdminWrite excludes " + dependency);
}

ok(
  source.includes("activateStoreRuntime_(normalizedStoreId)"),
  "activate uses canonical Runtime"
);
ok(
  source.includes("deactivateStoreRuntime_(normalizedStoreId)"),
  "deactivate uses canonical Runtime"
);
ok(
  source.includes("toStoreAdminReadModel_("),
  "lifecycle returns Admin read model"
);

const html = fs.readFileSync(
  path.join(APP, "StoreAdminUi.html"),
  "utf8"
);

for (const marker of [
  "Desactivar",
  "Activar",
  "activateStoreAdminUiStore",
  "deactivateStoreAdminUiStore",
  "changeStoreLifecycle",
  "window.confirm",
  "ACTIVE/INACTIVE se gestiona mediante una operación",
]) {
  ok(html.includes(marker), "UI F4E contains " + marker);
}

for (const forbidden of [
  'name = "status"',
  'name="status"',
  "Eliminar tienda",
  "SpreadsheetApp",
  "TAKARA_STORE_ADMIN_OWNER_EMAIL",
]) {
  ok(!html.includes(forbidden), "UI F4E excludes " + forbidden);
}

ok(!html.includes("innerHTML"), "UI F4E avoids innerHTML");

console.log(
  "[TAKARA_STORE_ADMIN_LIFECYCLE_F4E_OK] " +
    JSON.stringify({
      checks,
      accessCalls,
      activateCalls,
      deactivateCalls,
    })
);