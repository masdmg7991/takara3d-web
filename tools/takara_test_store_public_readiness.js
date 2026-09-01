const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

const root = path.resolve(__dirname, "..");
let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function node() {
  return {
    hidden: false,
    textContent: "",
  };
}

function createOrderFrame() {
  const form = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
  };
  const surface = {
    textContent: "",
    querySelectorAll() {
      return [];
    },
    querySelector(selector) {
      return selector === "[data-takara-pedido-form]" ? form : null;
    },
  };
  const frameDocument = {
    body: { scrollHeight: 1200 },
    documentElement: { scrollHeight: 1200 },
    head: { appendChild() {} },
    querySelector(selector) {
      return selector === "#pedido" ? surface : null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return { setAttribute() {}, textContent: "" };
    },
  };
  const frameWindow = {
    storeContext: null,
    TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1: {
      setVerifiedContext(context) {
        frameWindow.storeContext = context;
      },
      clear() {
        frameWindow.storeContext = null;
      },
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
    get src() {
      return this._src;
    },
  };
  return { frame, form, frameWindow };
}

function createBrowser(search, responsePayload) {
  const listeners = {};
  const loading = node();
  const active = node();
  const error = node();
  const name = node();
  const errorMessage = node();
  const order = createOrderFrame();

  const rootNode = {
    attrs: { "data-state": "loading", "aria-busy": "true" },
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
    getAttribute(name) {
      if (name === "data-store-endpoint") return "";
      return this.attrs[name] || "";
    },
    querySelector(selector) {
      return {
        "[data-store-loading]": loading,
        "[data-store-active]": active,
        "[data-store-error]": error,
        "[data-store-name]": name,
        "[data-store-error-message]": errorMessage,
        "[data-store-order-frame]": order.frame,
      }[selector] || null;
    },
  };

  let appendCount = 0;
  let removeCount = 0;

  const document = {
    title: "Tienda",
    readyState: "loading",
    body: { querySelectorAll() { return []; } },
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
    createElement() {
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
        const parsed = new URL(script.src);
        const callback = parsed.searchParams.get("prefix");

        process.nextTick(() => {
          window[callback](responsePayload);
        });
      },
    },
  };

  function MutationObserver() {
    this.observe = function () {};
  }

  const window = {
    location: { search },
    crypto: webcrypto,
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
    document,
    window,
    MutationObserver,
  };

  vm.createContext(context);

  vm.runInContext(
    fs.readFileSync(path.join(root, "assets/js/takara-config.js"), "utf8"),
    context,
    { filename: "takara-config.js" }
  );

  vm.runInContext(
    fs.readFileSync(
      path.join(root, "assets/js/takara-store-public.js"),
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
    document,
    rootNode,
    order,
    loading,
    active,
    error,
    name,
    errorMessage,
    boot,
    getAppendCount: () => appendCount,
    getRemoveCount: () => removeCount,
  };
}

(async function main() {
  const ref = "st_123456789012345678901234";
  const good = {
    ok: true,
    api_version: "TAKARA_STORE_PUBLIC_API_V1",
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
      display_name: "Foto García",
      status: "ACTIVE",
    },
  };

  const active = createBrowser("?s=" + ref, good);
  ok(active.rootNode.attrs["aria-busy"] === "true", "initial aria-busy");
  await active.boot();

  ok(active.rootNode.attrs["data-state"] === "active", "active state");
  ok(active.rootNode.attrs["aria-busy"] === "false", "active not busy");
  ok(active.loading.hidden === true, "loading hidden");
  ok(active.active.hidden === false, "active shown");
  ok(active.error.hidden === true, "error hidden");
  ok(active.name.textContent === "Foto García", "authoritative name rendered");
  ok(
    active.document.title === "Foto García",
    "document title uses only authoritative Store name"
  );
  ok(active.order.frame.hidden === false, "canonical order frame shown after verification");
  ok(
    active.order.frameWindow.storeContext.store_ref === ref,
    "verified StoreContext injected into shared order engine"
  );
  ok(
    active.order.form.attrs["data-takara-order-channel"] === "STORE",
    "shared order form is explicitly STORE channel"
  );
  ok(active.getAppendCount() === 1, "active makes one JSONP request");
  ok(active.getRemoveCount() === 1, "active cleans JSONP script");

  const backendError = createBrowser("?s=" + ref, {
    ok: false,
    api_version: "TAKARA_STORE_PUBLIC_API_V1",
    error: { code: "STORE_NOT_FOUND" },
  });
  await backendError.boot();

  ok(
    backendError.rootNode.attrs["data-state"] === "error",
    "backend error state"
  );
  ok(
    backendError.rootNode.attrs["aria-busy"] === "false",
    "backend error not busy"
  );
  ok(backendError.error.hidden === false, "backend error shown");
  ok(backendError.active.hidden === true, "backend active hidden");
  ok(
    backendError.document.title === "Tienda no disponible",
    "error title"
  );
  ok(
    backendError.errorMessage.textContent.includes("no está disponible"),
    "safe Store unavailable message"
  );

  const invalid = createBrowser("?s=STO_000001", good);
  await invalid.boot();

  ok(invalid.rootNode.attrs["data-state"] === "error", "internal id rejected");
  ok(invalid.getAppendCount() === 0, "internal id no network");
  ok(
    invalid.rootNode.attrs["aria-busy"] === "false",
    "invalid identity not busy"
  );

  const missing = createBrowser("", good);
  await missing.boot();

  ok(missing.rootNode.attrs["data-state"] === "error", "missing ref rejected");
  ok(missing.getAppendCount() === 0, "missing ref no network");
  ok(
    missing.document.title === "Tienda no disponible",
    "missing ref error title"
  );

  const html = fs.readFileSync(path.join(root, "tienda/index.html"), "utf8");
  ok(html.includes('name="referrer" content="no-referrer"'), "referrer policy");
  ok(html.includes('aria-busy="true"'), "initial aria busy markup");
  ok(html.includes('role="status"'), "loading role status");
  ok(html.includes('aria-atomic="true"'), "loading aria atomic");
  ok(html.includes("<noscript>"), "noscript fail-closed");
  ok(
    html.includes("No continuaremos sin una atribución Store válida."),
    "noscript fail-closed copy"
  );
  ok(html.includes("data-store-order-frame"), "canonical order frame placeholder");
  ok(!html.includes("Takara 3D"), "outer Store shell has no visible Takara branding");
  ok(!html.includes("data-cf-beacon"), "no commercial Cloudflare analytics");
  ok(!html.includes("googletagmanager"), "no Google tag manager");
  ok(!html.includes("gtag("), "no gtag");
  ok(!html.includes('href="../index.html"'), "no Home navigation");
  ok(!html.includes('href="../productos.html"'), "no product catalog navigation");
  ok(!html.includes('href="../pedido.html"'), "no direct-order escape");
  ok(!html.includes("/qr"), "no Product QR link");
  ok(!html.includes("store_id"), "no internal Store id in HTML");

  console.log(
    "[TAKARA_STORE_PUBLIC_READINESS_F2E_OK] " +
      JSON.stringify({ checks })
  );
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});