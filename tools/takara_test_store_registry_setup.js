const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
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

class FakeRange {
  constructor(sheet, row, column, numRows, numColumns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    return Array.from({ length: this.numRows }, (_, r) =>
      Array.from({ length: this.numColumns }, (_, c) => {
        const source = this.sheet.rows[this.row - 1 + r] || [];
        return source[this.column - 1 + c] ?? "";
      })
    );
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
  constructor(name, initialRows = []) {
    this.name = name;
    this.rows = initialRows.map((row) => row.slice());
    this.frozenRows = 0;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  getLastRow() {
    return this.rows.length;
  }

  getLastColumn() {
    return this.rows.length ? this.rows[0].length : 0;
  }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  setFrozenRows(count) {
    this.frozenRows = count;
  }
}

class FakeSpreadsheet {
  constructor(id, sheet) {
    this.id = id;
    this.sheets = [sheet];
  }

  getId() {
    return this.id;
  }

  getSheetByName(name) {
    return this.sheets.find((sheet) => sheet.getName() === name) || null;
  }

  getSheets() {
    return this.sheets.slice();
  }
}

function createHarness(options = {}) {
  let propertyValue = options.propertyValue || "";
  const events = [];
  let createCount = 0;

  const existingSheet = new FakeSheet(
    options.existingSheetName || "stores",
    options.existingRows || [headers]
  );
  const existingSpreadsheet = new FakeSpreadsheet(
    propertyValue || "existing-id",
    existingSheet
  );

  let lastCreated = null;

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Date,
    SpreadsheetApp: {
      create(name) {
        createCount += 1;
        events.push(["create", name]);
        const sheet = new FakeSheet("Sheet1", []);
        lastCreated = new FakeSpreadsheet("created-id", sheet);
        return lastCreated;
      },
      openById(id) {
        events.push(["openById", id]);
        if (id === "created-id" && lastCreated) {
          return lastCreated;
        }
        return existingSpreadsheet;
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            events.push(["getProperty", name]);
            return propertyValue;
          },
          setProperty(name, value) {
            events.push(["setProperty", name, value]);
            propertyValue = value;
          },
        };
      },
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock(timeout) {
            events.push(["tryLock", timeout]);
            return !options.lockBusy;
          },
          releaseLock() {
            events.push(["releaseLock"]);
          },
        };
      },
    },
  };

  vm.createContext(context);

  for (const relative of [
    "apps-script/takara-pedidos-web/StoreDomain.gs",
    "apps-script/takara-pedidos-web/StoreSheetsRepository.gs",
    "apps-script/takara-pedidos-web/StoreRegistrySetup.gs",
  ]) {
    vm.runInContext(
      fs.readFileSync(path.join(root, relative), "utf8"),
      context,
      { filename: relative }
    );
  }

  return {
    context,
    events,
    getProperty: () => propertyValue,
    getCreateCount: () => createCount,
    getCreatedSpreadsheet: () => lastCreated,
    existingSpreadsheet,
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

// Unconfigured -> creates exactly one registry and persists property after schema.
const fresh = createHarness({ existingRows: [] });
const first = fresh.context.provisionStoreRegistry_();

ok(first.version === "TAKARA_STORE_REGISTRY_V1", "provision version");
ok(first.configured === true, "provision configured");
ok(first.created === true, "first provision creates registry");
ok(fresh.getCreateCount() === 1, "exactly one spreadsheet created");
ok(fresh.getProperty() === "created-id", "created spreadsheet id persisted");

const createdSpreadsheet = fresh.getCreatedSpreadsheet();
const createdSheet = createdSpreadsheet.getSheetByName("stores");
ok(Boolean(createdSheet), "default sheet renamed to stores");
ok(createdSheet.getLastRow() === 1, "registry writes one header row");
ok(createdSheet.getLastColumn() === headers.length, "registry header width exact");
ok(
  JSON.stringify(createdSheet.rows[0]) === JSON.stringify(headers),
  "registry headers exact"
);
ok(createdSheet.frozenRows === 1, "registry freezes header row");

const setPropertyIndex = fresh.events.findIndex((event) => event[0] === "setProperty");
const createIndex = fresh.events.findIndex((event) => event[0] === "create");
ok(createIndex >= 0 && setPropertyIndex > createIndex, "property set after create/configure");

// Existing configured registry -> no second creation.
const existing = createHarness({
  propertyValue: "existing-id",
  existingSheetName: "stores",
  existingRows: [headers],
});
const second = existing.context.provisionStoreRegistry_();
ok(second.created === false, "existing registry reused");
ok(second.configured === true, "existing registry configured");
ok(existing.getCreateCount() === 0, "existing registry creates nothing");
ok(existing.getProperty() === "existing-id", "existing property unchanged");

// Health returns no spreadsheet id.
const health = existing.context.getStoreRegistryHealth_();
ok(health.version === "TAKARA_STORE_REGISTRY_V1", "health version");
ok(health.configured === true, "health configured");
ok(health.schema_valid === true, "health schema valid");
ok(health.sheet_name === "stores", "health sheet name");
ok(!Object.prototype.hasOwnProperty.call(health, "spreadsheet_id"), "health hides spreadsheet id");

// Invalid existing schema fails closed and never creates replacement.
const invalidHeaders = headers.slice();
invalidHeaders[1] = "WRONG";
const invalid = createHarness({
  propertyValue: "existing-id",
  existingSheetName: "stores",
  existingRows: [invalidHeaders],
});
throwsCode(
  () => invalid.context.provisionStoreRegistry_(),
  "STORE_REGISTRY_SCHEMA_INVALID",
  "existing invalid schema fail closed"
);
ok(invalid.getCreateCount() === 0, "invalid existing registry not replaced");
ok(invalid.getProperty() === "existing-id", "invalid property preserved for diagnosis");

// Lock busy fails closed before creation.
const busy = createHarness({ lockBusy: true, existingRows: [] });
throwsCode(
  () => busy.context.provisionStoreRegistry_(),
  "STORE_REGISTRY_BUSY",
  "setup lock busy fail closed"
);
ok(busy.getCreateCount() === 0, "busy setup creates nothing");

// Setup module is not an HTTP authority and has no deletion.
ok(typeof fresh.context.doGet === "undefined", "setup creates no doGet");
ok(typeof fresh.context.doPost === "undefined", "setup creates no doPost");
ok(typeof fresh.context.deleteStoreRegistry_ === "undefined", "setup exposes no delete");

console.log(
  "[TAKARA_STORE_REGISTRY_SETUP_TEST_OK] " +
    JSON.stringify({ checks })
);