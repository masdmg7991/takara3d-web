(function () {
  "use strict";

  const CLIENT_VERSION = "TAKARA_STORE_PUBLIC_CLIENT_V1";
  const API_VERSION = "TAKARA_STORE_PUBLIC_API_V1";
  const CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1";
  const STORE_REF_PATTERN = /^st_[A-Za-z0-9_-]{24,64}$/;
  const CALLBACK_PATTERN = /^takaraStoreCb_[A-Za-z0-9_]{8,64}$/;
  const DEFAULT_TIMEOUT_MS = 8000;

  function fail(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function normalizeStoreRef(value) {
    return String(value || "").trim();
  }

  function isValidStoreRef(value) {
    return STORE_REF_PATTERN.test(normalizeStoreRef(value));
  }

  function readStoreRef(search) {
    const params = new URLSearchParams(String(search || ""));
    return normalizeStoreRef(params.get("s"));
  }

  function assertEndpoint(endpoint) {
    const value = String(endpoint || "").trim();

    if (!value) {
      throw fail(
        "STORE_ENDPOINT_NOT_CONFIGURED",
        "Store resolver endpoint is not configured."
      );
    }

    if (
      !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
        value
      )
    ) {
      throw fail(
        "STORE_ENDPOINT_INVALID",
        "Store resolver endpoint is invalid."
      );
    }

    return value;
  }

  function getCentralAppsScriptEndpoint(windowApi) {
    const resolver =
      windowApi &&
      windowApi.TAKARA_GET_APPS_SCRIPT_ENDPOINT;

    if (typeof resolver !== "function") {
      throw fail(
        "STORE_ENDPOINT_NOT_CONFIGURED",
        "Store resolver endpoint is not configured."
      );
    }

    return assertEndpoint(resolver());
  }

  function createCallbackName(cryptoApi) {
    if (
      !cryptoApi ||
      typeof cryptoApi.getRandomValues !== "function"
    ) {
      throw fail(
        "STORE_CLIENT_RANDOM_UNAVAILABLE",
        "Secure browser randomness is unavailable."
      );
    }

    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);

    const suffix = Array.prototype.map.call(values, function (value) {
      return value.toString(36);
    }).join("_");

    const callback = "takaraStoreCb_" + suffix;

    if (!CALLBACK_PATTERN.test(callback)) {
      throw fail(
        "STORE_CLIENT_CALLBACK_INVALID",
        "Generated Store callback is invalid."
      );
    }

    return callback;
  }

  function buildResolveUrl(endpoint, storeRef, callbackName) {
    const base = assertEndpoint(endpoint);
    const ref = normalizeStoreRef(storeRef);

    if (!isValidStoreRef(ref)) {
      throw fail(
        "STORE_PUBLIC_CODE_INVALID",
        "Store public reference is invalid."
      );
    }

    if (!CALLBACK_PATTERN.test(String(callbackName || ""))) {
      throw fail(
        "STORE_CLIENT_CALLBACK_INVALID",
        "Store callback is invalid."
      );
    }

    return (
      base +
      "?action=store.resolve" +
      "&store_ref=" +
      encodeURIComponent(ref) +
      "&prefix=" +
      encodeURIComponent(callbackName)
    );
  }

  function validateStoreContextResponse(payload, expectedRef) {
    if (!payload || payload.ok !== true) {
      const responseCode =
        payload &&
        payload.error &&
        typeof payload.error.code === "string"
          ? payload.error.code
          : "STORE_RESOLUTION_FAILED";

      throw fail(responseCode, "Store resolution failed.");
    }

    if (payload.api_version !== API_VERSION) {
      throw fail(
        "STORE_PUBLIC_API_VERSION_INVALID",
        "Store public API version is invalid."
      );
    }

    const context = payload.store_context;

    if (!context || typeof context !== "object") {
      throw fail(
        "STORE_CONTEXT_INVALID",
        "Store context is missing."
      );
    }

    if (Object.prototype.hasOwnProperty.call(context, "store_id")) {
      throw fail(
        "STORE_CONTEXT_INTERNAL_ID_EXPOSED",
        "Store context exposed an internal identifier."
      );
    }

    if (
      context.version !== CONTEXT_VERSION ||
      context.store_ref !== expectedRef ||
      context.status !== "ACTIVE"
    ) {
      throw fail(
        "STORE_CONTEXT_INVALID",
        "Store context failed validation."
      );
    }

    const displayName = String(context.display_name || "").trim();

    if (!displayName || displayName.length > 120) {
      throw fail(
        "STORE_CONTEXT_INVALID",
        "Store display name is invalid."
      );
    }

    return Object.freeze({
      version: CONTEXT_VERSION,
      store_ref: expectedRef,
      display_name: displayName,
      status: "ACTIVE",
    });
  }

  function resolveStoreContextJsonp(options) {
    const config = options || {};
    const documentApi = config.document || document;
    const windowApi = config.window || window;
    const cryptoApi = config.crypto || windowApi.crypto;
    const endpoint = assertEndpoint(config.endpoint);
    const storeRef = normalizeStoreRef(config.storeRef);

    if (!isValidStoreRef(storeRef)) {
      return Promise.reject(
        fail(
          "STORE_PUBLIC_CODE_INVALID",
          "Store public reference is invalid."
        )
      );
    }

    const callbackName = createCallbackName(cryptoApi);
    const timeoutMs =
      Number(config.timeoutMs) > 0
        ? Number(config.timeoutMs)
        : DEFAULT_TIMEOUT_MS;

    return new Promise(function (resolve, reject) {
      const script = documentApi.createElement("script");
      let settled = false;
      let timeoutId = null;

      function cleanup() {
        if (timeoutId !== null) {
          windowApi.clearTimeout(timeoutId);
        }

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }

        try {
          delete windowApi[callbackName];
        } catch (error) {
          windowApi[callbackName] = undefined;
        }
      }

      function settle(action, value) {
        if (settled) return;
        settled = true;
        cleanup();
        action(value);
      }

      windowApi[callbackName] = function (payload) {
        try {
          settle(
            resolve,
            validateStoreContextResponse(payload, storeRef)
          );
        } catch (error) {
          settle(reject, error);
        }
      };

      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = buildResolveUrl(
        endpoint,
        storeRef,
        callbackName
      );
      script.onerror = function () {
        settle(
          reject,
          fail(
            "STORE_RESOLVER_NETWORK_ERROR",
            "Store resolver could not be loaded."
          )
        );
      };

      timeoutId = windowApi.setTimeout(function () {
        settle(
          reject,
          fail(
            "STORE_RESOLVER_TIMEOUT",
            "Store resolver timed out."
          )
        );
      }, timeoutMs);

      documentApi.head.appendChild(script);
    });
  }

  function setPanelState(root, state) {
    const loading = root.querySelector("[data-store-loading]");
    const active = root.querySelector("[data-store-active]");
    const error = root.querySelector("[data-store-error]");

    root.setAttribute("data-state", state);

    if (loading) loading.hidden = state !== "loading";
    if (active) active.hidden = state !== "active";
    if (error) error.hidden = state !== "error";
  }

  function renderStore(root, context) {
    const name = root.querySelector("[data-store-name]");
    if (name) {
      name.textContent = context.display_name;
    }
    setPanelState(root, "active");
  }

  function renderError(root, error) {
    const message = root.querySelector(
      "[data-store-error-message]"
    );

    if (message) {
      if (
        error &&
        (
          error.code === "STORE_INACTIVE" ||
          error.code === "STORE_NOT_FOUND" ||
          error.code === "STORE_PUBLIC_CODE_INVALID"
        )
      ) {
        message.textContent =
          "Este enlace de tienda no está disponible. Revisa el QR o solicita uno válido al establecimiento.";
      } else {
        message.textContent =
          "No podemos verificar esta tienda ahora mismo. No continuaremos sin una atribución válida.";
      }
    }

    setPanelState(root, "error");
  }

  function bootStorePublicPage() {
    const root = document.querySelector("[data-takara-store-app]");
    if (!root) return;

    setPanelState(root, "loading");

    const storeRef = readStoreRef(window.location.search);

    if (!isValidStoreRef(storeRef)) {
      renderError(
        root,
        fail(
          "STORE_PUBLIC_CODE_INVALID",
          "Store public reference is invalid."
        )
      );
      return;
    }

    let endpoint = "";

    try {
      endpoint = getCentralAppsScriptEndpoint(window);
    } catch (error) {
      renderError(root, error);
      return;
    }

    resolveStoreContextJsonp({
      endpoint: endpoint,
      storeRef: storeRef,
      document: document,
      window: window,
      crypto: window.crypto,
    }).then(
      function (context) {
        renderStore(root, context);
      },
      function (error) {
        renderError(root, error);
      }
    );
  }

  window.TAKARA_STORE_PUBLIC_CLIENT_V1 = Object.freeze({
    version: CLIENT_VERSION,
    normalizeStoreRef: normalizeStoreRef,
    isValidStoreRef: isValidStoreRef,
    readStoreRef: readStoreRef,
    assertEndpoint: assertEndpoint,
    getCentralAppsScriptEndpoint: getCentralAppsScriptEndpoint,
    createCallbackName: createCallbackName,
    buildResolveUrl: buildResolveUrl,
    validateStoreContextResponse: validateStoreContextResponse,
    resolveStoreContextJsonp: resolveStoreContextJsonp,
  });

  document.addEventListener(
    "DOMContentLoaded",
    bootStorePublicPage
  );
})();