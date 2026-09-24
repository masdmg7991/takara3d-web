const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

const root = path.resolve(__dirname, "..");

function createBaseContext() {
  const listeners = {};
  const document = {
    head: {
      appendChild() {},
    },
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    createElement() {
      return {
        parentNode: null,
      };
    },
    querySelector() {
      return null;
    },
  };

  const context = {
    console,
    Object,
    String,
    Number,
    Error,
    Promise,
    Uint32Array,
    URLSearchParams,
    encodeURIComponent,
    document,
    window: {
      location: { search: "" },
      crypto: webcrypto,
      setTimeout,
      clearTimeout,
    },
  };

  context.window.window = context.window;
  context.window.document = document;

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "assets", "js", "takara-store-public.js"),
      "utf8"
    ),
    context,
    { filename: "takara-store-public.js" }
  );

  return { context, document, listeners };
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
  ok(caught && caught.code === code, message + " code");
}

(async function main() {
  const { context } = createBaseContext();
  const api = context.window.TAKARA_STORE_PUBLIC_CLIENT_V1;
  const validRef = "st_123456789012345678901234";
  const storeClientSource = fs.readFileSync(
    path.join(root, "assets", "js", "takara-store-public.js"),
    "utf8"
  );

  ok(
    storeClientSource.includes('const surface = frameDocument.querySelector("#pedido");'),
    "iframe autosize measures intrinsic order surface"
  );
  ok(
    storeClientSource.includes("observer.observe(surface);"),
    "iframe autosize observes intrinsic order surface"
  );
  ok(
    !storeClientSource.includes('frame.style.height = String(height + 2) + "px";'),
    "iframe autosize has no cumulative height padding"
  );
  ok(
    !storeClientSource.includes('frameWindow.addEventListener("resize"'),
    "iframe autosize does not subscribe to self-induced frame resize"
  );
  ok(
    !storeClientSource.includes("observer.observe(frameDocument.documentElement);"),
    "iframe autosize does not observe viewport documentElement"
  );
  ok(
    storeClientSource.includes('"#pedido{min-height:0!important;padding-top:.5rem!important;}"'),
    "embedded Store neutralizes order surface viewport min-height"
  );
  ok(
    storeClientSource.includes('"body.pedido-premium main .pedido-stl-preview{min-height:0!important;}"'),
    "embedded Store neutralizes preview viewport min-height"
  );
  ok(
    storeClientSource.includes('"body.pedido-premium .pedido-stl-canvas{min-height:0!important;}"'),
    "embedded Store neutralizes canvas viewport min-height"
  );
  ok(
    storeClientSource.includes(
      'const WHITE_LABEL_IDENTITY_DISCLOSURE_SELECTOR ='
    ) &&
      storeClientSource.includes(
        '[name="autoriza_publicacion_resultado"], [data-takara-accept-proxy="autoriza_publicacion_resultado"]'
      ) &&
      storeClientSource.includes('control.closest("label")') &&
      storeClientSource.includes("STORE_WHITE_LABEL_DISCLOSURE_MISMATCH"),
    "Store scopes legal identity disclosure to optional publication consent"
  );
  ok(
    !storeClientSource.includes("control.remove()") &&
      !storeClientSource.includes("container.remove()"),
    "Store preserves optional social publication consent controls"
  );

  ok(api.version === "TAKARA_STORE_PUBLIC_CLIENT_V1", "client version");
  ok(api.isValidStoreRef(validRef), "valid Store ref");
  ok(!api.isValidStoreRef("STO_000001"), "internal Store id rejected");
  ok(!api.isValidStoreRef("st_short"), "short Store ref rejected");
  ok(!api.isValidStoreRef("st_bad value 123456789012345678"), "spaces rejected");
  ok(
    api.readStoreRef("?s=" + validRef + "&x=1") === validRef,
    "reads only s query parameter"
  );
  ok(api.readStoreRef("?store_id=STO_000001") === "", "does not read store_id");

  const endpoint =
    "https://script.google.com/macros/s/AKfycbTest_123456789/exec";

  ok(api.assertEndpoint(endpoint) === endpoint, "valid Apps Script endpoint");
  throwsCode(
    () => api.assertEndpoint(""),
    "STORE_ENDPOINT_NOT_CONFIGURED",
    "missing endpoint"
  );
  throwsCode(
    () => api.assertEndpoint("https://example.com/exec"),
    "STORE_ENDPOINT_INVALID",
    "foreign endpoint"
  );

  const callback = api.createCallbackName(webcrypto);
  ok(/^takaraStoreCb_[A-Za-z0-9_]{8,64}$/.test(callback), "callback format");

  const url = api.buildResolveUrl(endpoint, validRef, callback);
  ok(url.startsWith(endpoint + "?action=store.resolve"), "resolve action");
  ok(url.includes("store_ref=" + validRef), "resolve URL has Store ref");
  ok(url.includes("prefix=" + callback), "resolve URL has callback");
  ok(url.indexOf("store_id") === -1, "resolve URL has no store_id");

  const goodPayload = {
    ok: true,
    api_version: "TAKARA_STORE_PUBLIC_API_V1",
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: validRef,
      display_name: "Foto García",
      status: "ACTIVE",
    },
  };

  const storeContext = api.validateStoreContextResponse(
    goodPayload,
    validRef
  );
  ok(storeContext.store_ref === validRef, "validated ref");
  ok(storeContext.display_name === "Foto García", "validated name");
  ok(storeContext.status === "ACTIVE", "validated active");
  ok(
    !Object.prototype.hasOwnProperty.call(storeContext, "store_id"),
    "validated context has no store_id"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ...goodPayload,
          store_context: {
            ...goodPayload.store_context,
            status: "INACTIVE",
          },
        },
        validRef
      ),
    "STORE_CONTEXT_INVALID",
    "inactive context"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ...goodPayload,
          store_context: {
            ...goodPayload.store_context,
            store_ref: "st_999999999999999999999999",
          },
        },
        validRef
      ),
    "STORE_CONTEXT_INVALID",
    "mismatched Store ref"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ...goodPayload,
          store_context: {
            ...goodPayload.store_context,
            store_id: "STO_000001",
          },
        },
        validRef
      ),
    "STORE_CONTEXT_INTERNAL_ID_EXPOSED",
    "internal id leak"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ...goodPayload,
          api_version: "WRONG",
        },
        validRef
      ),
    "STORE_PUBLIC_API_VERSION_INVALID",
    "wrong API version"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ...goodPayload,
          store_context: {
            ...goodPayload.store_context,
            display_name: " ",
          },
        },
        validRef
      ),
    "STORE_CONTEXT_INVALID",
    "blank display name"
  );

  throwsCode(
    () =>
      api.validateStoreContextResponse(
        {
          ok: false,
          error: { code: "STORE_NOT_FOUND" },
        },
        validRef
      ),
    "STORE_NOT_FOUND",
    "backend safe error"
  );

  // JSONP transport lifecycle.
  let appended = null;
  let removed = false;
  let callbackName = null;

  const fakeWindow = {
    crypto: {
      getRandomValues(values) {
        values[0] = 101;
        values[1] = 202;
        values[2] = 303;
        values[3] = 404;
        return values;
      },
    },
    setTimeout() {
      return 7;
    },
    clearTimeout(id) {
      ok(id === 7, "clears exact timeout");
    },
  };

  const fakeDocument = {
    createElement(name) {
      ok(name === "script", "creates script element");
      return {
        async: false,
        referrerPolicy: "",
        src: "",
        onerror: null,
        parentNode: {
          removeChild() {
            removed = true;
          },
        },
      };
    },
    head: {
      appendChild(script) {
        appended = script;
        const parsed = new URL(script.src);
        callbackName = parsed.searchParams.get("prefix");
        process.nextTick(() => {
          fakeWindow[callbackName](goodPayload);
        });
      },
    },
  };

  const resolved = await api.resolveStoreContextJsonp({
    endpoint,
    storeRef: validRef,
    document: fakeDocument,
    window: fakeWindow,
    crypto: fakeWindow.crypto,
    timeoutMs: 500,
  });

  ok(Boolean(appended), "appends JSONP script");
  ok(appended.async === true, "script async");
  ok(appended.referrerPolicy === "no-referrer", "no-referrer policy");
  ok(
    appended.src.includes("action=store.resolve"),
    "JSONP URL resolve action"
  );
  ok(resolved.display_name === "Foto García", "JSONP resolves context");
  ok(removed === true, "JSONP script removed");
  ok(
    typeof fakeWindow[callbackName] === "undefined",
    "JSONP callback removed"
  );

  // V2 slug JSONP transport must resolve through store_slug without leaking store_ref.
  appended = null;
  removed = false;
  callbackName = null;
  const validSlug = "foto-garcia";
  const resolvedBySlug = await api.resolveStoreContextJsonp({
    endpoint,
    storeSlug: validSlug,
    document: fakeDocument,
    window: fakeWindow,
    crypto: fakeWindow.crypto,
    timeoutMs: 500,
  });
  ok(Boolean(appended), "slug JSONP appends script");
  ok(
    appended.src.includes("store_slug=" + validSlug),
    "slug JSONP URL has store_slug"
  );
  ok(
    !appended.src.includes("store_ref="),
    "slug JSONP URL has no store_ref"
  );
  ok(resolvedBySlug.store_ref === validRef, "slug JSONP resolves authoritative store_ref");
  ok(removed === true, "slug JSONP script removed");
  ok(
    typeof fakeWindow[callbackName] === "undefined",
    "slug JSONP callback removed"
  );

  // Network error must fail closed and clean up the JSONP callback/script.
  let networkRemoved = false;
  let networkCallbackName = null;
  const networkWindow = {
    crypto: fakeWindow.crypto,
    setTimeout() {
      return 8;
    },
    clearTimeout(id) {
      ok(id === 8, "network error clears exact timeout");
    },
  };
  const networkDocument = {
    createElement(name) {
      ok(name === "script", "network error creates script element");
      return {
        async: false,
        referrerPolicy: "",
        src: "",
        onerror: null,
        parentNode: {
          removeChild() {
            networkRemoved = true;
          },
        },
      };
    },
    head: {
      appendChild(script) {
        networkCallbackName = new URL(script.src).searchParams.get("prefix");
        process.nextTick(() => script.onerror());
      },
    },
  };
  let networkError = null;
  try {
    await api.resolveStoreContextJsonp({
      endpoint,
      storeRef: validRef,
      document: networkDocument,
      window: networkWindow,
      crypto: networkWindow.crypto,
      timeoutMs: 500,
    });
  } catch (error) {
    networkError = error;
  }
  ok(Boolean(networkError), "network error rejects");
  ok(
    networkError.code === "STORE_RESOLVER_NETWORK_ERROR",
    "network error fail-closed code"
  );
  ok(networkRemoved === true, "network error removes JSONP script");
  ok(
    typeof networkWindow[networkCallbackName] === "undefined",
    "network error removes JSONP callback"
  );

  // Timeout must fail closed and clean up without requiring a network callback.
  let timeoutRemoved = false;
  let timeoutCallback = null;
  let timeoutCallbackName = null;
  const timeoutWindow = {
    crypto: fakeWindow.crypto,
    setTimeout(callback) {
      timeoutCallback = callback;
      return 9;
    },
    clearTimeout(id) {
      ok(id === 9, "timeout clears exact timeout");
    },
  };
  const timeoutDocument = {
    createElement(name) {
      ok(name === "script", "timeout creates script element");
      return {
        async: false,
        referrerPolicy: "",
        src: "",
        onerror: null,
        parentNode: {
          removeChild() {
            timeoutRemoved = true;
          },
        },
      };
    },
    head: {
      appendChild(script) {
        timeoutCallbackName = new URL(script.src).searchParams.get("prefix");
      },
    },
  };
  const timeoutPromise = api.resolveStoreContextJsonp({
    endpoint,
    storeRef: validRef,
    document: timeoutDocument,
    window: timeoutWindow,
    crypto: timeoutWindow.crypto,
    timeoutMs: 25,
  });
  ok(typeof timeoutCallback === "function", "timeout schedules fail-closed timer");
  timeoutCallback();
  let timeoutError = null;
  try {
    await timeoutPromise;
  } catch (error) {
    timeoutError = error;
  }
  ok(Boolean(timeoutError), "timeout rejects");
  ok(
    timeoutError.code === "STORE_RESOLVER_TIMEOUT",
    "timeout fail-closed code"
  );
  ok(timeoutRemoved === true, "timeout removes JSONP script");
  ok(
    typeof timeoutWindow[timeoutCallbackName] === "undefined",
    "timeout removes JSONP callback"
  );

  let appendCount = 0;
  const noAppendDocument = {
    createElement() {
      appendCount += 100;
      return {};
    },
    head: {
      appendChild() {
        appendCount += 1;
      },
    },
  };

  let missingEndpointError = null;
  try {
    await api.resolveStoreContextJsonp({
      endpoint: "",
      storeRef: validRef,
      document: noAppendDocument,
      window: fakeWindow,
      crypto: fakeWindow.crypto,
    });
  } catch (error) {
    missingEndpointError = error;
  }

  ok(Boolean(missingEndpointError), "missing endpoint rejects");
  ok(
    missingEndpointError.code === "STORE_ENDPOINT_NOT_CONFIGURED",
    "missing endpoint fail-closed code"
  );
  ok(appendCount === 0, "missing endpoint performs no network preparation");

  console.log(
    "[TAKARA_STORE_PUBLIC_CLIENT_TEST_OK] " +
      JSON.stringify({ checks })
  );
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});