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
function expectCode(fn, code, message) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code");
}

function expectMessage(fn, expected, message) {
  let actual = "";
  try { fn(); } catch (error) {
    actual = String(error && error.message || error);
  }
  ok(actual === expected, message + " message");
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const headers = [
  "store_id",
  "store_public_code",
  "status",
  "created_at",
  "updated_at",
  "deactivated_at",
  "version",
  "display_name",
  "contact_name",
  "email",
  "phone",
  "address_line",
  "postal_code",
  "city",
  "province",
  "notes",
];

const rows = [
  headers.slice(),
  [
    "STO_000002",
    "st_222222222222222222222222",
    "INACTIVE",
    "2026-08-29T20:00:00.000Z",
    "2026-08-29T21:00:00.000Z",
    "2026-08-29T21:00:00.000Z",
    3,
    "Tienda Dos",
    "Contacto Dos",
    "dos@example.test",
    "600000002",
    "Calle Dos",
    "28002",
    "Madrid",
    "Madrid",
    "Inactiva",
  ],
  [
    "STO_000001",
    "st_111111111111111111111111",
    "ACTIVE",
    "2026-08-29T19:00:00.000Z",
    "2026-08-29T19:00:00.000Z",
    "",
    1,
    "Tienda Uno",
    "Contacto Uno",
    "uno@example.test",
    "600000001",
    "Calle Uno",
    "28001",
    "Madrid",
    "Madrid",
    "Activa",
  ],
];

let openCount = 0;
let rangeReadCount = 0;
let ownerEmail = "owner@example.com";
let activeEmail = "owner@example.com";

class FakeRange {
  constructor(row, column, numRows, numColumns) {
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    rangeReadCount += 1;
    const values = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const source = rows[this.row - 1 + r] || [];
      const current = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        current.push(source[this.column - 1 + c] ?? "");
      }
      values.push(current);
    }
    return values;
  }

  setValues() {
    throw new Error("F4B_READ_MUST_NOT_WRITE");
  }
}

const sheet = {
  getLastColumn() { return headers.length; },
  getLastRow() { return rows.length; },
  getRange(row, column, numRows, numColumns) {
    return new FakeRange(row, column, numRows, numColumns);
  },
  appendRow() {
    throw new Error("F4B_READ_MUST_NOT_WRITE");
  },
};

const context = {
  console,
  Object,
  String,
  Number,
  Boolean,
  Array,
  Error,
  RegExp,
  Date,
  JSON,
  Math,
  SpreadsheetApp: {
    openById(id) {
      openCount += 1;
      ok(id === "registry-sheet-id", "registry id canonical");
      return {
        getSheetByName(name) {
          ok(name === "stores", "registry sheet canonical");
          return sheet;
        },
      };
    },
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(name) {
          if (name === "TAKARA_STORE_REGISTRY_SPREADSHEET_ID") {
            return "registry-sheet-id";
          }
          if (name === "TAKARA_STORE_ADMIN_OWNER_EMAIL") {
            return ownerEmail;
          }
          throw new Error("unexpected property " + name);
        },
      };
    },
  },
  Session: {
    getActiveUser() {
      return {
        getEmail() {
          return activeEmail;
        },
      };
    },
  },
  LockService: {
    getScriptLock() {
      throw new Error("F4B_READ_MUST_NOT_LOCK");
    },
  },
  Utilities: {
    getUuid() {
      throw new Error("F4B_READ_MUST_NOT_CREATE");
    },
  },
};

vm.createContext(context);
for (const file of [
  "StoreDomain.gs",
  "StoreRegistry.gs",
  "StoreSheetsRepository.gs",
  "StoreRuntime.gs",
  "StoreAdminAccess.gs",
  "StoreAdminRead.gs",
]) {
  vm.runInContext(
    fs.readFileSync(path.join(APP, file), "utf8"),
    context,
    { filename: file }
  );
}

const listed = context.listStoresAdmin_();
ok(Array.isArray(listed), "admin list is array");
ok(Object.isFrozen(listed), "admin list is frozen");
ok(listed.length === 2, "admin list includes ACTIVE and INACTIVE");
ok(listed[0].store_id === "STO_000001", "admin list deterministic by store_id");
ok(listed[1].store_id === "STO_000002", "admin list second id");
ok(listed[0].status === "ACTIVE", "admin list ACTIVE status");
ok(listed[1].status === "INACTIVE", "admin list INACTIVE status");
ok(Object.isFrozen(listed[0]), "admin list item frozen");
ok(Object.isFrozen(listed[1]), "admin list inactive item frozen");
ok(
  listed[0].contract_version === "TAKARA_STORE_ADMIN_READ_V1",
  "admin read contract version"
);
ok(listed[0].store_public_code === "st_111111111111111111111111", "admin sees public code");
ok(listed[0].email === "uno@example.test", "admin sees internal contact data");
ok(listed[1].deactivated_at !== "", "admin sees deactivation history");

const one = context.getStoreAdmin_("STO_000002");
ok(one.store_id === "STO_000002", "admin gets store by immutable id");
ok(one.status === "INACTIVE", "admin can inspect inactive store");
ok(one.display_name === "Tienda Dos", "admin gets authoritative display name");
ok(Object.isFrozen(one), "admin get result frozen");

expectCode(
  () => context.getStoreAdmin_("STO_999999"),
  "STORE_NOT_FOUND",
  "unknown store id fails closed"
);
expectCode(
  () => context.getStoreAdmin_("bad"),
  "STORE_ID_INVALID",
  "malformed store id fails closed"
);

const openBeforeForbidden = openCount;
activeEmail = "other@example.com";
expectMessage(
  () => context.listStoresAdmin_(),
  "STORE_ADMIN_FORBIDDEN",
  "non-owner list denied"
);
ok(openCount === openBeforeForbidden, "non-owner list denied before Registry");

const openBeforeGetForbidden = openCount;
expectMessage(
  () => context.getStoreAdmin_("STO_000001"),
  "STORE_ADMIN_FORBIDDEN",
  "non-owner get denied"
);
ok(openCount === openBeforeGetForbidden, "non-owner get denied before Registry");

activeEmail = "owner@example.com";
ownerEmail = "";
const openBeforeConfig = openCount;
expectMessage(
  () => context.listStoresAdmin_(),
  "STORE_ADMIN_CONFIGURATION_INVALID",
  "missing owner config denied"
);
ok(openCount === openBeforeConfig, "config failure before Registry");

ownerEmail = "owner@example.com";
activeEmail = "";
const openBeforeIdentity = openCount;
expectMessage(
  () => context.listStoresAdmin_(),
  "STORE_ADMIN_UNAUTHENTICATED",
  "missing active identity denied"
);
ok(openCount === openBeforeIdentity, "identity failure before Registry");

ok(rangeReadCount > 0, "authorized reads reach Registry");
ok(typeof context.createStoreAdmin_ === "undefined", "F4B exposes no create");
ok(typeof context.updateStoreAdmin_ === "undefined", "F4B exposes no update");
ok(typeof context.activateStoreAdmin_ === "undefined", "F4B exposes no activate");
ok(typeof context.deactivateStoreAdmin_ === "undefined", "F4B exposes no deactivate");
ok(typeof context.deleteStoreAdmin_ === "undefined", "F4B exposes no delete");

const adminReadSource = fs.readFileSync(
  path.join(APP, "StoreAdminRead.gs"),
  "utf8"
);
for (const forbidden of [
  "SpreadsheetApp",
  "PropertiesService",
  "LockService",
  "createStoreSheetsRepository_",
  "openById",
]) {
  ok(
    !adminReadSource.includes(forbidden),
    "AdminRead does not own infrastructure " + forbidden
  );
}

console.log(
  "[TAKARA_STORE_ADMIN_READ_F4B_OK] " +
    JSON.stringify({
      checks,
      listed: listed.length,
      registry_opens: openCount,
      range_reads: rangeReadCount,
    })
);