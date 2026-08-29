const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

const HEADERS = [
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
        const row = this.sheet.rows[this.row - 1 + r] || [];
        return row[this.column - 1 + c] ?? "";
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

  appendRow(row) {
    this.rows.push(row.slice());
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

function output(content) {
  return {
    content,
    mimeType: "",
    setMimeType(value) {
      this.mimeType = value;
      return this;
    },
  };
}

function createSystem(options = {}) {
  let propertyValue = options.propertyValue || "";
  let spreadsheet = null;
  let createCount = 0;
  let uuidCount = 0;
  const events = [];

  function ensureConfiguredSpreadsheet() {
    if (spreadsheet) {
      return spreadsheet;
    }
    const sheet = new FakeSheet("stores", [HEADERS]);
    spreadsheet = new FakeSpreadsheet(
      propertyValue || "existing-id",
      sheet
    );
    return spreadsheet;
  }

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Date,
    JSON,
    SpreadsheetApp: {
      create(name) {
        events.push(["create", name]);
        createCount += 1;
        spreadsheet = new FakeSpreadsheet(
          "created-id",
          new FakeSheet("Sheet1", [])
        );
        return spreadsheet;
      },
      openById(id) {
        events.push(["openById", id]);
        const current = ensureConfiguredSpreadsheet();
        if (id !== current.getId()) {
          throw new Error("unexpected spreadsheet id " + id);
        }
        return current;
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
        events.push(["getScriptLock"]);
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
    Utilities: {
      getUuid() {
        uuidCount += 1;
        const suffix = String(uuidCount).padStart(12, "0");
        return "12345678-1234-1234-1234-" + suffix;
      },
    },
    ContentService: {
      MimeType: {
        JSON: "application/json",
        JAVASCRIPT: "application/javascript",
      },
      createTextOutput: output,
    },
  };

  vm.createContext(context);

  for (const relative of [
    "StoreDomain.gs",
    "StoreRegistry.gs",
    "StoreSheetsRepository.gs",
    "StoreRegistrySetup.gs",
    "StoreRuntime.gs",
    "StorePublicApi.gs",
    "StoreHttpBridge.gs",
  ]) {
    vm.runInContext(
      fs.readFileSync(
        path.join(
          root,
          "apps-script",
          "takara-pedidos-web",
          relative
        ),
        "utf8"
      ),
      context,
      { filename: relative }
    );
  }

  return {
    context,
    events,
    getSpreadsheet: () => spreadsheet,
    getProperty: () => propertyValue,
    getCreateCount: () => createCount,
  };
}

let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function jsonBody(response) {
  return JSON.parse(response.content);
}

const system = createSystem();
const { context } = system;

// 1. Provision physical authority deterministically.
const provisioned = context.provisionStoreRegistry_();
ok(provisioned.created === true, "fresh registry is created");
ok(provisioned.configured === true, "fresh registry is configured");
ok(system.getCreateCount() === 1, "exactly one spreadsheet created");
ok(system.getProperty() === "created-id", "registry id stored in ScriptProperties");

const sheet = system.getSpreadsheet().getSheetByName("stores");
ok(Boolean(sheet), "stores sheet exists");
ok(sheet.getLastRow() === 1, "registry starts with one header row");
ok(
  JSON.stringify(sheet.rows[0]) === JSON.stringify(HEADERS),
  "registry schema is exact"
);

// 2. Create real Store through Runtime/Application/Repository.
const store = context.createStoreRuntime_({
  display_name: "Foto García",
  contact_name: "Ana",
  email: "partner@example.test",
  city: "Leganés",
});

ok(store.store_id === "STO_000001", "first Store gets immutable STO_000001");
ok(store.status === "ACTIVE", "new Store is ACTIVE");
ok(store.store_public_code.startsWith("st_"), "Store gets opaque public code");
ok(sheet.getLastRow() === 2, "Store persisted as one data row");

// 3. Public JSON resolution.
const jsonResponse = context.routeStorePublicGet_({
  parameter: {
    action: "store.resolve",
    store_ref: store.store_public_code,
    store_id: "STO_ATTACK",
    display_name: "Injected",
    status: "INACTIVE",
  },
});

ok(jsonResponse.mimeType === "application/json", "public resolver emits JSON");
const publicJson = jsonBody(jsonResponse);
ok(publicJson.ok === true, "ACTIVE Store resolves publicly");
ok(
  publicJson.store_context.version === "TAKARA_STORE_CONTEXT_V1",
  "public resolver returns StoreContext V1"
);
ok(
  publicJson.store_context.store_ref === store.store_public_code,
  "public resolver preserves authoritative store_ref"
);
ok(
  publicJson.store_context.display_name === "Foto García",
  "display name comes from registry"
);
ok(publicJson.store_context.status === "ACTIVE", "public status authoritative");
ok(
  !Object.prototype.hasOwnProperty.call(publicJson.store_context, "store_id"),
  "store_id never crosses public boundary"
);
ok(
  JSON.stringify(publicJson).indexOf("STO_ATTACK") === -1,
  "browser cannot inject store_id"
);
ok(
  JSON.stringify(publicJson).indexOf("Injected") === -1,
  "browser cannot inject display_name"
);

// 4. Public JSONP resolution for GitHub Pages browser.
const callback = "takaraStoreCb_ABC12345";
const jsonpResponse = context.routeStorePublicGet_({
  parameter: {
    action: "store.resolve",
    store_ref: store.store_public_code,
    prefix: callback,
  },
});

ok(
  jsonpResponse.mimeType === "application/javascript",
  "browser resolver emits JavaScript JSONP"
);
ok(
  jsonpResponse.content.startsWith(callback + "("),
  "JSONP invokes validated Takara callback"
);
ok(
  jsonpResponse.content.indexOf("store_id") === -1,
  "JSONP never exposes store_id"
);

// 5. Rename preserves identity and physical QR.
const renamed = context.updateStoreRuntime_(store.store_id, {
  display_name: "Foto García Centro",
});
ok(renamed.store_id === store.store_id, "rename preserves store_id");
ok(
  renamed.store_public_code === store.store_public_code,
  "rename preserves physical Store QR code"
);

const renamedResponse = jsonBody(
  context.routeStorePublicGet_({
    parameter: {
      action: "store.resolve",
      store_ref: store.store_public_code,
    },
  })
);
ok(
  renamedResponse.store_context.display_name === "Foto García Centro",
  "public resolver reflects authoritative rename"
);

// 6. Deactivation blocks new Store sessions.
const inactive = context.deactivateStoreRuntime_(store.store_id);
ok(inactive.status === "INACTIVE", "Store deactivates");

const blocked = jsonBody(
  context.routeStorePublicGet_({
    parameter: {
      action: "store.resolve",
      store_ref: store.store_public_code,
    },
  })
);
ok(blocked.ok === false, "INACTIVE Store is rejected");
ok(
  blocked.error.code === "STORE_INACTIVE",
  "INACTIVE Store fails closed with safe code"
);

// 7. Reactivation restores same physical QR.
const activeAgain = context.activateStoreRuntime_(store.store_id);
ok(activeAgain.status === "ACTIVE", "Store reactivates");
ok(
  activeAgain.store_public_code === store.store_public_code,
  "reactivation preserves physical Store QR code"
);

const reactivated = jsonBody(
  context.routeStorePublicGet_({
    parameter: {
      action: "store.resolve",
      store_ref: store.store_public_code,
    },
  })
);
ok(reactivated.ok === true, "reactivated Store resolves");
ok(
  reactivated.store_context.display_name === "Foto García Centro",
  "reactivated Store keeps latest commercial name"
);

// 8. Idempotent provisioning reuses authority.
const provisionedAgain = context.provisionStoreRegistry_();
ok(provisionedAgain.created === false, "second provision reuses registry");
ok(system.getCreateCount() === 1, "second provision creates no second authority");

// 9. Non-Store GET falls through to existing health.
ok(
  context.routeStorePublicGet_({ parameter: {} }) === null,
  "normal health GET falls through untouched"
);

// 10. Unsupported Store write action fails closed, never falls through.
const unsupported = jsonBody(
  context.routeStorePublicGet_({
    parameter: {
      action: "store.create",
      store_ref: store.store_public_code,
    },
  })
);
ok(unsupported.ok === false, "public write action rejected");
ok(
  unsupported.error.code === "STORE_PUBLIC_ACTION_INVALID",
  "public write action cannot fall through to health"
);

// 11. Callback injection is non-executable.
const callbackAttack = context.routeStorePublicGet_({
  parameter: {
    action: "store.resolve",
    store_ref: store.store_public_code,
    prefix: "takaraStoreCb_x);alert(1);//",
  },
});
ok(
  callbackAttack.mimeType === "application/json",
  "invalid callback produces non-executable JSON"
);
ok(
  jsonBody(callbackAttack).error.code === "STORE_PUBLIC_CALLBACK_INVALID",
  "invalid callback rejected"
);

// 12. Invalid/missing identities fail closed.
for (const storeRef of ["", "st_bad"]) {
  const response = jsonBody(
    context.routeStorePublicGet_({
      parameter: {
        action: "store.resolve",
        store_ref: storeRef,
      },
    })
  );
  ok(response.ok === false, "invalid identity fails");
  ok(
    ["STORE_PUBLIC_REF_REQUIRED", "STORE_PUBLIC_CODE_INVALID"].includes(
      response.error.code
    ),
    "invalid identity exposes only safe error code"
  );
}

// 13. No destructive/public mutation authority is introduced.
ok(typeof context.deleteStoreRuntime_ === "undefined", "runtime has no delete");
ok(typeof context.deleteStorePublicApi_ === "undefined", "public API has no delete");
ok(typeof context.createStorePublicApi_ === "undefined", "public API has no create");
ok(typeof context.updateStorePublicApi_ === "undefined", "public API has no update");

// 14. Lock busy prevents provisioning mutation.
const busy = createSystem({ lockBusy: true });
let busyError = null;
try {
  busy.context.provisionStoreRegistry_();
} catch (error) {
  busyError = error;
}
ok(Boolean(busyError), "busy setup fails");
ok(busyError && busyError.code === "STORE_REGISTRY_BUSY", "busy setup fail-closed");
ok(busy.getCreateCount() === 0, "busy setup creates no spreadsheet");

console.log(
  "[TAKARA_STORE_BACKEND_F1_HORIZONTAL_OK] " +
    JSON.stringify({
      checks,
      persisted_stores: sheet.getLastRow() - 1,
      public_store_id_exposed: false,
    })
);