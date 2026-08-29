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

function createBrowser(search, responsePayload) {
  const listeners = {};
  const loading = node();
  const active = node();
  const error = node();
  const name = node();
  const errorMessage = node();

  const rootNode = {
    attrs: { "data-state": "loading", "aria-busy": "true" },
    setAttribute(name, value) {
      this.attrs[name] = value;
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
      }[selector] || null;
    },
  };

  let appendCount = 0;
  let removeCount = 0;

  const document = {
    title: "Tienda asociada | Takara 3D",
    readyState: "complete",
    body: { querySelectorAll() { return []; } },
    addEventListener(name, handler) {
      listeners[name] = handler;
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
    listeners.DOMContentLoaded();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  return {
    document,
    rootNode,
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
    active.document.title === "Foto García | Takara 3D",
    "document title uses authoritative Store name"
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
    backendError.document.title === "Tienda no disponible | Takara 3D",
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
    missing.document.title === "Tienda no disponible | Takara 3D",
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
  ok(
    html.includes("Operador del producto: Takara 3D."),
    "operator disclosure"
  );
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