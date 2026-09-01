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

function createBackend() {
  let propertyValue = "";
  let spreadsheet = null;
  let uuidCount = 0;

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Date,
    JSON,
    SpreadsheetApp: {
      create() {
        spreadsheet = new FakeSpreadsheet(
          "created-id",
          new FakeSheet("Sheet1", [])
        );
        return spreadsheet;
      },
      openById(id) {
        if (!spreadsheet || spreadsheet.getId() !== id) {
          throw new Error("unexpected spreadsheet id");
        }
        return spreadsheet;
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty() {
            return propertyValue;
          },
          setProperty(name, value) {
            propertyValue = value;
          },
        };
      },
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock() {
            return true;
          },
          releaseLock() {},
        };
      },
    },
    Utilities: {
      getUuid() {
        uuidCount += 1;
        return (
          "12345678-1234-1234-1234-" +
          String(uuidCount).padStart(12, "0")
        );
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
    getSheet() {
      return spreadsheet && spreadsheet.getSheetByName("stores");
    },
  };
}

function element() {
  return {
    hidden: false,
    textContent: "",
  };
}

function createOrderFrame() {
  const form = { attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
  const surface = {
    textContent: "",
    querySelectorAll() { return []; },
    querySelector(selector) {
      return selector === "[data-takara-pedido-form]" ? form : null;
    },
  };
  const frameDocument = {
    body: { scrollHeight: 1200 },
    documentElement: { scrollHeight: 1200 },
    head: { appendChild() {} },
    querySelector(selector) { return selector === "#pedido" ? surface : null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, textContent: "" }; },
  };
  const frameWindow = {
    storeContext: null,
    TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1: {
      setVerifiedContext(context) { frameWindow.storeContext = context; },
      clear() { frameWindow.storeContext = null; },
    },
    addEventListener() {},
    removeEventListener() {},
  };
  const frame = {
    hidden: true,
    style: { height: "0px" },
    contentDocument: frameDocument,
    contentWindow: frameWindow,
    onload: null,
    onerror: null,
    _src: "about:blank",
    set src(value) {
      this._src = value;
      if (value !== "about:blank") {
        process.nextTick(() => {
          if (typeof this.onload === "function") this.onload();
        });
      }
    },
    get src() { return this._src; },
  };
  return { frame, form, frameWindow };
}

function createBrowser(backend, search) {
  const listeners = {};
  const loading = element();
  const active = element();
  const error = element();
  const name = element();
  const errorMessage = element();
  const order = createOrderFrame();

  const rootNode = {
    attributes: {
      "data-state": "loading",
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    getAttribute(name) {
      return this.attributes[name] || "";
    },
    querySelector(selector) {
      const map = {
        "[data-store-loading]": loading,
        "[data-store-active]": active,
        "[data-store-error]": error,
        "[data-store-name]": name,
        "[data-store-error-message]": errorMessage,
        "[data-store-order-frame]": order.frame,
      };
      return map[selector] || null;
    },
  };

  let appendCount = 0;
  let removeCount = 0;
  let lastScriptUrl = "";
  let observerObserveCount = 0;

  function MutationObserver(callback) {
    this.callback = callback;
  }

  MutationObserver.prototype.observe = function observe(target, options) {
    if (!target || !options || options.childList !== true) {
      throw new Error("invalid MutationObserver registration");
    }
    observerObserveCount += 1;
  };

  MutationObserver.prototype.disconnect = function disconnect() {};

  const document = {
    readyState: "loading",
    body: {
      querySelectorAll() {
        return [];
      },
    },
    addEventListener(name, handler) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(handler);
    },
    querySelector(selector) {
      if (selector === "[data-takara-store-app]") {
        return rootNode;
      }
      return null;
    },
    createElement(name) {
      if (name !== "script") {
        throw new Error("unexpected element " + name);
      }
      return {
        async: false,
        referrerPolicy: "",
        src: "",
        onerror: null,
        parentNode: {
          removeChild() {
            removeCount += 1;
          },
        },
      };
    },
    head: {
      appendChild(script) {
        appendCount += 1;
        lastScriptUrl = script.src;

        const parsed = new URL(script.src);
        const event = {
          parameter: Object.fromEntries(parsed.searchParams.entries()),
        };
        const response = backend.context.routeStorePublicGet_(event);

        process.nextTick(() => {
          if (response.mimeType === "application/javascript") {
            const callbackName = parsed.searchParams.get("prefix");
            const open = response.content.indexOf("(");
            const close = response.content.lastIndexOf(");");
            const payload = JSON.parse(
              response.content.slice(open + 1, close)
            );
            window[callbackName](payload);
            return;
          }

          if (script.onerror) {
            script.onerror();
          }
        });
      },
    },
  };

  const secureValues = [
    1234567890,
    2234567890,
    3234567890,
    4234567890,
  ];

  const window = {
    location: { search },
    crypto: {
      getRandomValues(values) {
        for (let i = 0; i < values.length; i += 1) {
          values[i] = secureValues[i % secureValues.length];
        }
        return values;
      },
    },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
  };

  window.window = window;
  window.document = document;

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Promise,
    Uint32Array,
    URL,
    URLSearchParams,
    Array,
    encodeURIComponent,
    MutationObserver,
    document,
    window,
  };

  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(
      path.join(root, "assets", "js", "takara-config.js"),
      "utf8"
    ),
    context,
    { filename: "takara-config.js" }
  );

  vm.runInContext(
    fs.readFileSync(
      path.join(
        root,
        "assets",
        "js",
        "takara-store-public.js"
      ),
      "utf8"
    ),
    context,
    { filename: "takara-store-public.js" }
  );

  async function boot() {
    const handlers = listeners.DOMContentLoaded || [];
    if (handlers.length === 0) {
      throw new Error("Store client did not register DOMContentLoaded");
    }

    handlers.forEach((handler) => handler());

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return {
    context,
    window,
    rootNode,
    loading,
    active,
    error,
    name,
    errorMessage,
    boot,
    getAppendCount: () => appendCount,
    getRemoveCount: () => removeCount,
    getLastScriptUrl: () => lastScriptUrl,
    getObserverObserveCount: () => observerObserveCount,
  };
}

let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

(async function main() {
  const backend = createBackend();

  const provisioned = backend.context.provisionStoreRegistry_();
  ok(provisioned.created === true, "registry provisioned");

  const store = backend.context.createStoreRuntime_({
    display_name: "Foto García",
    contact_name: "Ana",
    email: "partner@example.test",
    city: "Leganés",
  });

  ok(store.status === "ACTIVE", "Store starts ACTIVE");
  ok(store.store_id === "STO_000001", "Store has internal id");
  ok(store.store_public_code.startsWith("st_"), "Store has public code");

  const helperBrowser = createBrowser(backend, "");
  await helperBrowser.boot();
  ok(
    helperBrowser.getObserverObserveCount() === 1,
    "central config registers one MutationObserver"
  );
  const publicApi =
    helperBrowser.window.TAKARA_STORE_PUBLIC_CLIENT_V1;

  const canonicalUrl = publicApi.buildStorePublicUrl(
    store.store_public_code
  );

  ok(
    canonicalUrl ===
      "https://takara3d.es/tienda/?s=" +
        store.store_public_code,
    "Store QR builds canonical URL"
  );

  const activeBrowser = createBrowser(
    backend,
    new URL(canonicalUrl).search
  );
  await activeBrowser.boot();

  ok(
    activeBrowser.rootNode.attributes["data-state"] === "active",
    "ACTIVE Store renders active state"
  );
  ok(
    activeBrowser.name.textContent === "Foto García",
    "ACTIVE Store renders authoritative name"
  );
  ok(activeBrowser.active.hidden === false, "active panel visible");
  ok(activeBrowser.error.hidden === true, "error panel hidden");
  ok(activeBrowser.getAppendCount() === 1, "one JSONP request");
  ok(activeBrowser.getRemoveCount() === 1, "JSONP script cleaned");
  ok(
    activeBrowser.getLastScriptUrl().includes(
      "action=store.resolve"
    ),
    "browser calls read-only resolve action"
  );
  ok(
    activeBrowser.getLastScriptUrl().includes(
      "store_ref=" + store.store_public_code
    ),
    "browser sends public Store ref"
  );
  ok(
    activeBrowser.getLastScriptUrl().indexOf("store_id") === -1,
    "browser never sends store_id"
  );
  ok(
    activeBrowser.getLastScriptUrl().startsWith(
      activeBrowser.window.TAKARA_GET_APPS_SCRIPT_ENDPOINT()
    ),
    "browser uses central Apps Script endpoint"
  );

  backend.context.updateStoreRuntime_(store.store_id, {
    display_name: "Foto García Centro",
  });

  const renamedBrowser = createBrowser(
    backend,
    new URL(canonicalUrl).search
  );
  await renamedBrowser.boot();

  ok(
    renamedBrowser.name.textContent === "Foto García Centro",
    "same physical QR reflects authoritative rename"
  );

  backend.context.deactivateStoreRuntime_(store.store_id);

  const inactiveBrowser = createBrowser(
    backend,
    new URL(canonicalUrl).search
  );
  await inactiveBrowser.boot();

  ok(
    inactiveBrowser.rootNode.attributes["data-state"] === "error",
    "INACTIVE Store renders error state"
  );
  ok(inactiveBrowser.active.hidden === true, "inactive panel hidden");
  ok(inactiveBrowser.error.hidden === false, "error panel visible");
  ok(
    inactiveBrowser.name.textContent === "",
    "inactive Store name is not rendered"
  );
  ok(
    inactiveBrowser.errorMessage.textContent.includes(
      "no está disponible"
    ),
    "inactive Store gets safe public error"
  );

  backend.context.activateStoreRuntime_(store.store_id);

  const reactivatedBrowser = createBrowser(
    backend,
    new URL(canonicalUrl).search
  );
  await reactivatedBrowser.boot();

  ok(
    reactivatedBrowser.rootNode.attributes["data-state"] === "active",
    "reactivated Store renders again"
  );
  ok(
    reactivatedBrowser.name.textContent === "Foto García Centro",
    "reactivated Store preserves latest name"
  );

  const invalidBrowser = createBrowser(
    backend,
    "?s=STO_000001"
  );
  await invalidBrowser.boot();

  ok(
    invalidBrowser.rootNode.attributes["data-state"] === "error",
    "internal id URL fails closed"
  );
  ok(
    invalidBrowser.getAppendCount() === 0,
    "invalid identity makes no network request"
  );

  const missingBrowser = createBrowser(backend, "");
  await missingBrowser.boot();

  ok(
    missingBrowser.rootNode.attributes["data-state"] === "error",
    "missing Store ref fails closed"
  );
  ok(
    missingBrowser.getAppendCount() === 0,
    "missing Store ref makes no network request"
  );

  const storeHtml = fs.readFileSync(
    path.join(root, "tienda", "index.html"),
    "utf8"
  );

  ok(
    storeHtml.indexOf("data-store-name") >= 0,
    "Store page has authoritative name target"
  );
  ok(
    storeHtml.indexOf("data-takara-pedido-form") === -1,
    "F2 Store page does not duplicate order form"
  );
  ok(
    storeHtml.indexOf("/qr") === -1,
    "Store page does not link Product QR"
  );
  ok(
    storeHtml.indexOf("store_id") === -1,
    "Store page never embeds internal Store id"
  );

  const sheet = backend.getSheet();
  ok(Boolean(sheet), "physical Registry sheet remains authority");
  ok(sheet.getLastRow() === 2, "exactly one Store persisted");

  console.log(
    "[TAKARA_STORE_PUBLIC_SYSTEM_F2D_OK] " +
      JSON.stringify({
        checks,
        public_store_id_exposed: false,
        jsonp_requests_active_session:
          activeBrowser.getAppendCount(),
      })
  );
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});