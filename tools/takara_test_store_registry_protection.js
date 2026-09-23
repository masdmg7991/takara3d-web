const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const headers = [
  "store_id", "store_public_code", "status", "created_at", "updated_at",
  "deactivated_at", "version", "display_name", "contact_name", "email",
  "phone", "address_line", "postal_code", "city", "province", "notes",
];
const brandingHeaders = [
  "store_public_code", "mode", "logo_file_id", "logo_mime_type",
  "logo_file_name", "updated_at", "version",
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
  constructor(name, rows = []) {
    this.name = name;
    this.rows = rows.map((row) => row.slice());
    this.frozenRows = 0;
  }
  getName() { return this.name; }
  setName(name) { this.name = name; return this; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.length ? this.rows[0].length : 0; }
  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }
  setFrozenRows(count) { this.frozenRows = count; }
}

class FakeSpreadsheet {
  constructor(id, sheets) {
    this.id = id;
    this.sheets = sheets.slice();
  }
  getId() { return this.id; }
  getSheetByName(name) {
    return this.sheets.find((sheet) => sheet.getName() === name) || null;
  }
  getSheets() { return this.sheets.slice(); }
  insertSheet(name) {
    const sheet = new FakeSheet(name, []);
    this.sheets.push(sheet);
    return sheet;
  }
}

const sourceStores = new FakeSheet("stores", [
  headers,
  [
    "STO_000001", "st_AAAAAAAAAAAAAAAAAAAAAAAA", "ACTIVE",
    "2026-09-01", "2026-09-01", "", 1, "Foto García", "Ana",
    "ana@example.test", "600000001", "Calle Uno", "28001", "Madrid",
    "Madrid", "",
  ],
]);
const sourceBranding = new FakeSheet("store_branding", [
  brandingHeaders,
  [
    "st_AAAAAAAAAAAAAAAAAAAAAAAA", "NAME_AND_LOGO", "logo-file-id",
    "image/png", "logo.png", "2026-09-09T10:00:00.000Z", 1,
  ],
]);
const source = new FakeSpreadsheet(
  "source-id",
  [sourceStores, sourceBranding]
);
let snapshot = null;
const properties = { TAKARA_STORE_REGISTRY_SPREADSHEET_ID: "source-id" };
let accessCalls = 0;
let movedSnapshotId = "";
let checks = 0;

function ok(value, message) {
  if (!value) throw new Error("[FAIL] " + message);
  checks += 1;
}

const context = {
  console, Object, String, Number, Error, Date,
  requireStoreAdminAccess_() { accessCalls += 1; },
  moveStoreRegistrySnapshotToRetentionFolder_(snapshotId) {
    movedSnapshotId = String(snapshotId || "");
    return { managed: true, file_id: movedSnapshotId };
  },
  SpreadsheetApp: {
    openById(id) {
      if (id !== "source-id") throw new Error("BAD_SOURCE_ID");
      return source;
    },
    create(name) {
      snapshot = new FakeSpreadsheet(
        "snapshot-id",
        [new FakeSheet("Sheet1", [])]
      );
      snapshot.name = name;
      return snapshot;
    },
  },
  PropertiesService: {
    getScriptProperties() {
      return {
        getProperty(name) { return properties[name] || ""; },
        setProperty(name, value) { properties[name] = value; },
      };
    },
  },
  LockService: {
    getScriptLock() {
      return {
        tryLock() { return true; },
        releaseLock() {},
      };
    },
  },
  DriveApp: {},
  Utilities: {},
};

vm.createContext(context);
for (const relative of [
  "apps-script/takara-pedidos-web/StoreDomain.gs",
  "apps-script/takara-pedidos-web/StoreSheetsRepository.gs",
  "apps-script/takara-pedidos-web/StoreRegistrySetup.gs",
  "apps-script/takara-pedidos-web/StoreRegistryProtection.gs",
]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, relative), "utf8"),
    context,
    { filename: relative }
  );
}

const result = context.createStoreRegistrySnapshot_();
ok(accessCalls === 1, "snapshot requires Store Admin access");
ok(
  result.version === "TAKARA_STORE_REGISTRY_PROTECTION_V1",
  "snapshot version"
);
ok(result.created === true, "snapshot created");
ok(result.row_count === 1, "snapshot Store row count excludes header");
ok(
  result.branding_row_count === 1,
  "snapshot branding row count excludes header"
);
ok(result.sheet_count === 2, "snapshot reports both canonical sheets");
ok(Boolean(snapshot), "snapshot spreadsheet created");
ok(movedSnapshotId === "snapshot-id", "snapshot moved into managed retention folder");

const copiedStores = snapshot.getSheetByName("stores");
ok(Boolean(copiedStores), "snapshot contains stores");
ok(
  JSON.stringify(copiedStores.rows) === JSON.stringify(sourceStores.rows),
  "snapshot copies exact Store Registry values"
);
ok(copiedStores.frozenRows === 1, "snapshot freezes Store header");

const copiedBranding = snapshot.getSheetByName("store_branding");
ok(Boolean(copiedBranding), "snapshot contains store_branding when present");
ok(
  JSON.stringify(copiedBranding.rows) === JSON.stringify(sourceBranding.rows),
  "snapshot copies exact branding Registry values"
);
ok(copiedBranding.frozenRows === 1, "snapshot freezes branding header");

ok(
  properties.TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID === "snapshot-id",
  "latest snapshot id persisted internally"
);
ok(
  Boolean(properties.TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_AT),
  "latest snapshot timestamp persisted"
);
ok(
  typeof context.restoreStoreRegistrySnapshot_ === "undefined",
  "snapshot module exposes no implicit restore"
);
ok(
  typeof context.doGet === "undefined" &&
    typeof context.doPost === "undefined",
  "snapshot module owns no HTTP route"
);

console.log(
  "[TAKARA_STORE_REGISTRY_PROTECTION_TEST_OK] " +
    JSON.stringify({ checks })
);
