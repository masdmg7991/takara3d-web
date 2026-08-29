const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    const values = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const source = this.sheet.rows[this.row - 1 + r] || [];
      const current = [];
      for (let c = 0; c < this.numColumns; c += 1) {
        current.push(source[this.column - 1 + c] ?? "");
      }
      values.push(current);
    }
    return values;
  }

  setValues(values) {
    for (let r = 0; r < this.numRows; r += 1) {
      const rowIndex = this.row - 1 + r;
      while (this.sheet.rows.length <= rowIndex) {
        this.sheet.rows.push([]);
      }
      for (let c = 0; c < this.numColumns; c += 1) {
        this.sheet.rows[rowIndex][this.column - 1 + c] = values[r][c];
      }
    }
    return this;
  }
}

class FakeSheet {
  constructor(headers) {
    this.rows = [headers.slice()];
  }

  getLastColumn() {
    return this.rows[0].length;
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  appendRow(row) {
    this.rows.push(row.slice());
  }
}

class FakeSpreadsheet {
  constructor(sheet) {
    this.sheet = sheet;
  }

  getSheetByName(name) {
    return name === "stores" ? this.sheet : null;
  }
}

function createHarness(options = {}) {
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

  const sheet = new FakeSheet(
    options.headers ? options.headers.slice() : headers
  );
  const spreadsheet = new FakeSpreadsheet(sheet);
  const events = [];
  let locked = false;

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Date,
    SpreadsheetApp: {
      openById(id) {
        events.push(["openById", id]);
        if (id !== "sheet-test-id") {
          throw new Error("unexpected spreadsheet id");
        }
        return spreadsheet;
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            events.push(["getProperty", name]);
            return options.missingProperty ? "" : "sheet-test-id";
          },
        };
      },
    },
    LockService: {
      getScriptLock() {
        events.push(["getScriptLock"]);
        return {
          tryLock(timeout) {
            events.push(["tryLock", timeout]);
            if (options.lockBusy) {
              return false;
            }
            locked = true;
            return true;
          },
          releaseLock() {
            events.push(["releaseLock"]);
            locked = false;
          },
        };
      },
    },
    Utilities: {
      getUuid() {
        events.push(["getUuid"]);
        return "12345678-1234-1234-1234-123456789abc";
      },
    },
  };

  vm.createContext(context);

  for (const relative of [
    "apps-script/takara-pedidos-web/StoreDomain.gs",
    "apps-script/takara-pedidos-web/StoreRegistry.gs",
    "apps-script/takara-pedidos-web/StoreSheetsRepository.gs",
    "apps-script/takara-pedidos-web/StoreRuntime.gs",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(root, relative), "utf8"),
      context,
      { filename: relative }
    );
  }

  return {
    context,
    sheet,
    events,
    isLocked: () => locked,
  };
}

let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function throwsCode(fn, code, message) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code=" + code);
}

const harness = createHarness();
const { context, sheet, events } = harness;

const created = context.createStoreRuntime_({
  display_name: "Foto García",
  city: "Leganés",
});

ok(created.store_id === "STO_000001", "runtime allocates first immutable store_id");
ok(
  created.store_public_code === "st_12345678123412341234123456789abc",
  "runtime creates opaque public code"
);
ok(created.status === "ACTIVE", "runtime creates ACTIVE store");
ok(sheet.rows.length === 2, "Sheets adapter persists one store");
ok(!harness.isLocked(), "write lock released after create");
ok(
  events.some((event) => event[0] === "getScriptLock"),
  "runtime uses script lock"
);
ok(
  events.some((event) => event[0] === "openById" && event[1] === "sheet-test-id"),
  "runtime opens configured spreadsheet"
);
ok(
  events.some(
    (event) =>
      event[0] === "getProperty" &&
      event[1] === "TAKARA_STORE_REGISTRY_SPREADSHEET_ID"
  ),
  "runtime resolves spreadsheet id from ScriptProperties"
);

const resolved = context.resolveStoreContextRuntime_(
  created.store_public_code
);
ok(resolved.version === "TAKARA_STORE_CONTEXT_V1", "runtime context version");
ok(resolved.store_ref === created.store_public_code, "runtime context store_ref");
ok(resolved.display_name === "Foto García", "runtime context display name");
ok(resolved.status === "ACTIVE", "runtime context ACTIVE");
ok(
  !Object.prototype.hasOwnProperty.call(resolved, "store_id"),
  "runtime public context does not expose store_id"
);

const updated = context.updateStoreRuntime_(created.store_id, {
  display_name: "Foto García Centro",
  phone: "600000000",
});
ok(updated.display_name === "Foto García Centro", "runtime update display name");
ok(updated.phone === "600000000", "runtime update phone");
ok(updated.store_id === created.store_id, "update keeps store_id");
ok(
  updated.store_public_code === created.store_public_code,
  "update keeps store_public_code"
);
ok(updated.version === 2, "update increments version");

const inactive = context.deactivateStoreRuntime_(created.store_id);
ok(inactive.status === "INACTIVE", "runtime deactivates");
ok(Boolean(inactive.deactivated_at), "deactivation timestamp");
ok(inactive.version === 3, "deactivation increments version");
throwsCode(
  () => context.resolveStoreContextRuntime_(created.store_public_code),
  "STORE_INACTIVE",
  "inactive runtime resolution fail closed"
);

const active = context.activateStoreRuntime_(created.store_id);
ok(active.status === "ACTIVE", "runtime reactivates");
ok(active.deactivated_at === "", "reactivation clears timestamp");
ok(active.version === 4, "reactivation increments version");

const resolvedAgain = context.resolveStoreContextRuntime_(
  created.store_public_code
);
ok(resolvedAgain.status === "ACTIVE", "reactivated store resolves");

const missingConfig = createHarness({ missingProperty: true });
throwsCode(
  () =>
    missingConfig.context.resolveStoreContextRuntime_(
      "st_12345678123412341234123456789abc"
    ),
  "STORE_REGISTRY_NOT_CONFIGURED",
  "missing spreadsheet config fail closed"
);

const busy = createHarness({ lockBusy: true });
throwsCode(
  () => busy.context.createStoreRuntime_({ display_name: "Busy" }),
  "STORE_REGISTRY_BUSY",
  "busy registry fail closed"
);

const badHeaders = createHarness({
  headers: [
    "store_id",
    "WRONG",
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
  ],
});
throwsCode(
  () =>
    badHeaders.context.resolveStoreContextRuntime_(
      "st_12345678123412341234123456789abc"
    ),
  "STORE_REGISTRY_SCHEMA_INVALID",
  "invalid schema fail closed"
);

ok(
  typeof context.deleteStoreRuntime_ === "undefined",
  "runtime exposes no physical delete"
);
ok(
  typeof context.doGet === "undefined" && typeof context.doPost === "undefined",
  "Store runtime does not create HTTP authority"
);

console.log(
  "[TAKARA_STORE_RUNTIME_INTEGRATION_TEST_OK] " +
    JSON.stringify({ checks, persisted_rows: sheet.rows.length - 1 })
);