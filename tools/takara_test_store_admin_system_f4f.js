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
let htmlCalls = 0;
let titleCalls = 0;
let listCalls = 0;
let getCalls = 0;
let createCalls = 0;
let updateCalls = 0;
let activateCalls = 0;
let deactivateCalls = 0;

const stores = [
  {
    store_id: "STO_000001",
    store_public_code: "st_SYSTEM_000001",
    status: "ACTIVE",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-30T10:00:00.000Z",
    deactivated_at: "",
    version: 4,
    display_name: "Foto García",
    contact_name: "Ana",
    email: "ana@example.test",
    phone: "",
    address_line: "Calle Mayor 1",
    postal_code: "28001",
    city: "Madrid",
    province: "Madrid",
    notes: "",
  },
];

function readModel(store) {
  return Object.freeze(
    Object.assign(
      { contract_version: "TAKARA_STORE_ADMIN_READ_V1" },
      store
    )
  );
}

const htmlOutput = {
  title: "",
  setTitle(value) {
    titleCalls += 1;
    this.title = value;
    return this;
  },
};

const context = {
  console,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  JSON,
  HtmlService: {
    createHtmlOutputFromFile(file) {
      htmlCalls += 1;
      ok(file === "StoreAdminUi", "deployment serves canonical Admin UI file");
      return htmlOutput;
    },
  },
  storeDomainError_: domainError,
  requireStoreAdminAccess_() {
    accessCalls += 1;
    if (!authorized) throw new Error("STORE_ADMIN_FORBIDDEN");
    return Object.freeze({
      version: "TAKARA_STORE_ADMIN_ACCESS_V1",
      role: "OWNER",
      authorized: true,
    });
  },
  assertStoreId_(value) {
    if (!/^STO_\d{6}$/.test(String(value || ""))) {
      throw domainError("STORE_ID_INVALID", "Store id invalid.");
    }
    return String(value);
  },
  toStoreAdminReadModel_: readModel,
  listStoresAdmin_() {
    accessCalls += 1;
    if (!authorized) throw new Error("STORE_ADMIN_FORBIDDEN");
    listCalls += 1;
    return Object.freeze(stores.map(readModel));
  },
  getStoreAdmin_(storeId) {
    accessCalls += 1;
    if (!authorized) throw new Error("STORE_ADMIN_FORBIDDEN");
    getCalls += 1;
    const found = stores.find((item) => item.store_id === storeId);
    if (!found) throw new Error("STORE_NOT_FOUND");
    return readModel(found);
  },
  createStoreRuntime_(input) {
    createCalls += 1;
    return Object.assign({}, stores[0], input, {
      store_id: "STO_000002",
      store_public_code: "st_SYSTEM_000002",
      version: 1,
      status: "ACTIVE",
    });
  },
  updateStoreRuntime_(storeId, patch) {
    updateCalls += 1;
    return Object.assign({}, stores[0], patch, {
      store_id: storeId,
      version: 5,
    });
  },
  activateStoreRuntime_(storeId) {
    activateCalls += 1;
    return Object.assign({}, stores[0], {
      store_id: storeId,
      status: "ACTIVE",
      deactivated_at: "",
      version: 6,
    });
  },
  deactivateStoreRuntime_(storeId) {
    deactivateCalls += 1;
    return Object.assign({}, stores[0], {
      store_id: storeId,
      status: "INACTIVE",
      deactivated_at: "2026-08-30T12:00:00.000Z",
      version: 7,
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

const bridge = fs.readFileSync(
  path.join(APP, "StoreAdminUiBridge.gs"),
  "utf8"
);

ok(
  bridge.includes('"TAKARA_STORE_ADMIN_DEPLOYMENT_V1"'),
  "deployment boundary version exact"
);

const beforeDeniedHtml = htmlCalls;
authorized = false;
let deniedDeployment = "";
try {
  context.getStoreAdminUiDeploymentOutput_();
} catch (error) {
  deniedDeployment = String(error && error.message || error);
}
ok(
  deniedDeployment === "STORE_ADMIN_FORBIDDEN",
  "deployment boundary denies non-owner"
);
ok(
  htmlCalls === beforeDeniedHtml,
  "denied deployment reaches zero HtmlService calls"
);

authorized = true;
const output = context.getStoreAdminUiDeploymentOutput_();
ok(output === htmlOutput, "deployment returns HtmlService output");
ok(htmlCalls === 1, "authorized deployment renders once");
ok(titleCalls === 1, "deployment title set once");
ok(output.title === "Takara · Store Admin", "deployment title exact");

const bootstrap = context.getStoreAdminUiBootstrap();
ok(bootstrap.mode === "MANAGE", "SystemScenario bootstrap MANAGE");
ok(bootstrap.stores.length === 1, "SystemScenario lists Store");
ok(listCalls === 1, "bootstrap uses Admin read authority");

const detail = context.getStoreAdminUiStore("STO_000001");
ok(detail.store_id === "STO_000001", "SystemScenario reads detail");
ok(getCalls === 1, "detail uses Admin read authority");

const created = context.createStoreAdminUiStore({
  display_name: "Nueva tienda",
  city: "Madrid",
});
ok(created.store_id === "STO_000002", "SystemScenario creates Store");
ok(created.display_name === "Nueva tienda", "create preserves editable data");
ok(createCalls === 1, "create reaches Runtime once");

const updated = context.updateStoreAdminUiStore("STO_000001", {
  display_name: "Foto García Centro",
});
ok(
  updated.display_name === "Foto García Centro",
  "SystemScenario edits Store"
);
ok(updateCalls === 1, "update reaches Runtime once");

const beforeForbiddenPatch = updateCalls;
let forbiddenPatch = "";
try {
  context.updateStoreAdminUiStore("STO_000001", {
    status: "INACTIVE",
  });
} catch (error) {
  forbiddenPatch = String(
    error && error.code || error && error.message || error
  );
}
ok(
  forbiddenPatch === "STORE_ADMIN_INPUT_FORBIDDEN_FIELD",
  "SystemScenario rejects browser status patch"
);
ok(
  updateCalls === beforeForbiddenPatch,
  "forbidden status patch reaches zero Runtime writes"
);

const inactive = context.deactivateStoreAdminUiStore("STO_000001");
ok(inactive.status === "INACTIVE", "SystemScenario deactivates Store");
ok(deactivateCalls === 1, "deactivate reaches Runtime once");

const active = context.activateStoreAdminUiStore("STO_000001");
ok(active.status === "ACTIVE", "SystemScenario reactivates Store");
ok(activateCalls === 1, "activate reaches Runtime once");

authorized = false;
const writesBeforeDenied = {
  createCalls,
  updateCalls,
  activateCalls,
  deactivateCalls,
};

for (const operation of [
  () => context.createStoreAdminUiStore({ display_name: "Denied" }),
  () => context.updateStoreAdminUiStore("STO_000001", { city: "Denied" }),
  () => context.activateStoreAdminUiStore("STO_000001"),
  () => context.deactivateStoreAdminUiStore("STO_000001"),
]) {
  let denied = "";
  try {
    operation();
  } catch (error) {
    denied = String(error && error.message || error);
  }
  ok(denied === "STORE_ADMIN_FORBIDDEN", "SystemScenario mutation denied");
}

ok(createCalls === writesBeforeDenied.createCalls, "denied create writes zero");
ok(updateCalls === writesBeforeDenied.updateCalls, "denied update writes zero");
ok(activateCalls === writesBeforeDenied.activateCalls, "denied activate writes zero");
ok(
  deactivateCalls === writesBeforeDenied.deactivateCalls,
  "denied deactivate writes zero"
);

for (const forbidden of [
  "SpreadsheetApp",
  "PropertiesService",
  "createStoreSheetsRepository_",
  "function doGet(",
  "function doPost(",
]) {
  ok(!bridge.includes(forbidden), "deployment bridge excludes " + forbidden);
}

ok(
  bridge.includes('createHtmlOutputFromFile("StoreAdminUi")'),
  "deployment boundary serves canonical file"
);
ok(
  bridge.includes("requireStoreAdminAccess_();"),
  "deployment boundary authorizes with F4A"
);
ok(
  bridge.includes("getStoreAdminUiDeploymentOutput_"),
  "deployment boundary remains internal"
);

console.log(
  "[TAKARA_STORE_ADMIN_SYSTEM_F4F_OK] " +
    JSON.stringify({
      checks,
      accessCalls,
      htmlCalls,
      listCalls,
      getCalls,
      createCalls,
      updateCalls,
      activateCalls,
      deactivateCalls,
    })
);