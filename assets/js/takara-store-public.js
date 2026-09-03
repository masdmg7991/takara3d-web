(function () {
  "use strict";

  const CLIENT_VERSION = "TAKARA_STORE_PUBLIC_CLIENT_V1";
  const API_VERSION = "TAKARA_STORE_PUBLIC_API_V1";
  const CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1";
  const STORE_REF_PATTERN = /^st_[A-Za-z0-9_-]{24,64}$/;
  const CALLBACK_PATTERN = /^takaraStoreCb_[A-Za-z0-9_]{8,64}$/;
  const DEFAULT_TIMEOUT_MS = 8000;
  const STORE_QR_CONTRACT_VERSION = "TAKARA_STORE_QR_URL_V1";
  const STORE_PUBLIC_CANONICAL_ORIGIN = "https://takara3d.es";
  const STORE_PUBLIC_CANONICAL_PATH = "/tienda/";
  const ORDER_FRAME_URL = "/pedido.html?channel=store";
  const ORDER_FRAME_TIMEOUT_MS = 15000;

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

  function buildStorePublicUrl(storeRef) {
    const ref = normalizeStoreRef(storeRef);
    if (!isValidStoreRef(ref)) {
      throw fail("STORE_PUBLIC_CODE_INVALID", "Store public reference is invalid.");
    }
    return STORE_PUBLIC_CANONICAL_ORIGIN + STORE_PUBLIC_CANONICAL_PATH + "?s=" + encodeURIComponent(ref);
  }

  function parseStorePublicUrl(value) {
    const rawValue = String(value || "");
    let parsed = null;
    try {
      parsed = new URL(rawValue);
    } catch (error) {
      throw fail("STORE_QR_URL_INVALID", "Store QR URL is invalid.");
    }
    if (
      rawValue !== parsed.href || parsed.protocol !== "https:" ||
      parsed.origin !== STORE_PUBLIC_CANONICAL_ORIGIN ||
      parsed.pathname !== STORE_PUBLIC_CANONICAL_PATH || parsed.username ||
      parsed.password || parsed.port || parsed.hash
    ) {
      throw fail("STORE_QR_URL_INVALID", "Store QR URL is not canonical.");
    }
    const keys = Array.from(parsed.searchParams.keys());
    const refs = parsed.searchParams.getAll("s");
    if (keys.length !== 1 || keys[0] !== "s" || refs.length !== 1) {
      throw fail("STORE_QR_URL_INVALID", "Store QR URL parameters are invalid.");
    }
    const storeRef = normalizeStoreRef(refs[0]);
    if (!isValidStoreRef(storeRef)) {
      throw fail("STORE_PUBLIC_CODE_INVALID", "Store public reference is invalid.");
    }
    const canonicalUrl = buildStorePublicUrl(storeRef);
    if (parsed.href !== canonicalUrl) {
      throw fail("STORE_QR_URL_INVALID", "Store QR URL is not canonical.");
    }
    return Object.freeze({version: STORE_QR_CONTRACT_VERSION, store_ref: storeRef, url: canonicalUrl});
  }

  function isStorePublicUrl(value) {
    try {
      parseStorePublicUrl(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function assertEndpoint(endpoint) {
    const value = String(endpoint || "").trim();
    if (!value) {
      throw fail("STORE_ENDPOINT_NOT_CONFIGURED", "Store resolver endpoint is not configured.");
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(value)) {
      throw fail("STORE_ENDPOINT_INVALID", "Store resolver endpoint is invalid.");
    }
    return value;
  }

  function getCentralAppsScriptEndpoint(windowApi) {
    const resolver = windowApi && windowApi.TAKARA_GET_APPS_SCRIPT_ENDPOINT;
    if (typeof resolver !== "function") {
      throw fail("STORE_ENDPOINT_NOT_CONFIGURED", "Store resolver endpoint is not configured.");
    }
    return assertEndpoint(resolver());
  }

  function createCallbackName(cryptoApi) {
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
      throw fail("STORE_CLIENT_RANDOM_UNAVAILABLE", "Secure browser randomness is unavailable.");
    }
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    const suffix = Array.prototype.map.call(values, function (value) {
      return value.toString(36);
    }).join("_");
    const callback = "takaraStoreCb_" + suffix;
    if (!CALLBACK_PATTERN.test(callback)) {
      throw fail("STORE_CLIENT_CALLBACK_INVALID", "Generated Store callback is invalid.");
    }
    return callback;
  }

  function buildResolveUrl(endpoint, storeRef, callbackName) {
    const base = assertEndpoint(endpoint);
    const ref = normalizeStoreRef(storeRef);
    if (!isValidStoreRef(ref)) {
      throw fail("STORE_PUBLIC_CODE_INVALID", "Store public reference is invalid.");
    }
    if (!CALLBACK_PATTERN.test(String(callbackName || ""))) {
      throw fail("STORE_CLIENT_CALLBACK_INVALID", "Store callback is invalid.");
    }
    return base + "?action=store.resolve&store_ref=" + encodeURIComponent(ref) + "&prefix=" + encodeURIComponent(callbackName);
  }

  function validateStoreContextResponse(payload, expectedRef) {
    if (!payload || payload.ok !== true) {
      const responseCode = payload && payload.error && typeof payload.error.code === "string"
        ? payload.error.code : "STORE_RESOLUTION_FAILED";
      throw fail(responseCode, "Store resolution failed.");
    }
    if (payload.api_version !== API_VERSION) {
      throw fail("STORE_PUBLIC_API_VERSION_INVALID", "Store public API version is invalid.");
    }
    const context = payload.store_context;
    if (!context || typeof context !== "object") {
      throw fail("STORE_CONTEXT_INVALID", "Store context is missing.");
    }
    if (Object.prototype.hasOwnProperty.call(context, "store_id")) {
      throw fail("STORE_CONTEXT_INTERNAL_ID_EXPOSED", "Store context exposed an internal identifier.");
    }
    if (context.version !== CONTEXT_VERSION || context.store_ref !== expectedRef || context.status !== "ACTIVE") {
      throw fail("STORE_CONTEXT_INVALID", "Store context failed validation.");
    }
    const displayName = String(context.display_name || "").trim();
    if (!displayName || displayName.length > 120) {
      throw fail("STORE_CONTEXT_INVALID", "Store display name is invalid.");
    }
    return Object.freeze({version: CONTEXT_VERSION, store_ref: expectedRef, display_name: displayName, status: "ACTIVE"});
  }

  function resolveStoreContextJsonp(options) {
    const config = options || {};
    const documentApi = config.document || document;
    const windowApi = config.window || window;
    const cryptoApi = config.crypto || windowApi.crypto;
    const endpoint = assertEndpoint(config.endpoint);
    const storeRef = normalizeStoreRef(config.storeRef);
    if (!isValidStoreRef(storeRef)) {
      return Promise.reject(fail("STORE_PUBLIC_CODE_INVALID", "Store public reference is invalid."));
    }
    const callbackName = createCallbackName(cryptoApi);
    const timeoutMs = Number(config.timeoutMs) > 0 ? Number(config.timeoutMs) : DEFAULT_TIMEOUT_MS;
    return new Promise(function (resolve, reject) {
      const script = documentApi.createElement("script");
      let settled = false;
      let timeoutId = null;
      function cleanup() {
        if (timeoutId !== null) windowApi.clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete windowApi[callbackName]; } catch (error) { windowApi[callbackName] = undefined; }
      }
      function settle(action, value) {
        if (settled) return;
        settled = true;
        cleanup();
        action(value);
      }
      windowApi[callbackName] = function (payload) {
        try { settle(resolve, validateStoreContextResponse(payload, storeRef)); }
        catch (error) { settle(reject, error); }
      };
      script.async = true;
      script.referrerPolicy = "no-referrer";
      script.src = buildResolveUrl(endpoint, storeRef, callbackName);
      script.onerror = function () {
        settle(reject, fail("STORE_RESOLVER_NETWORK_ERROR", "Store resolver could not be loaded."));
      };
      timeoutId = windowApi.setTimeout(function () {
        settle(reject, fail("STORE_RESOLVER_TIMEOUT", "Store resolver timed out."));
      }, timeoutMs);
      documentApi.head.appendChild(script);
    });
  }

  function setPanelState(root, state) {
    const loading = root.querySelector("[data-store-loading]");
    const active = root.querySelector("[data-store-active]");
    const error = root.querySelector("[data-store-error]");
    root.setAttribute("data-state", state);
    root.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    if (loading) loading.hidden = state !== "loading";
    if (active) active.hidden = state !== "active";
    if (error) error.hidden = state !== "error";
  }

  function removeDirectOnlyControls(surface) {
    surface.querySelectorAll('[data-takara-wa-link], a[href^="https://wa.me/"]').forEach(function (node) {
      node.remove();
    });
    surface.querySelectorAll('input[name="autoriza_publicacion_resultado"]').forEach(function (node) {
      const item = node.closest(".pedido-stl-legal-item");
      if (item) item.remove(); else node.remove();
    });
    surface.querySelectorAll('[data-takara-accept-proxy="autoriza_publicacion_resultado"]').forEach(function (node) {
      const item = node.closest(".takara-submit-final__check");
      if (item) item.remove(); else node.remove();
    });
    const form = surface.querySelector("[data-takara-pedido-form]");
    if (!form) {
      throw fail("STORE_ORDER_FORM_MISSING", "La superficie compartida de pedido no contiene su formulario.");
    }
    form.setAttribute("data-takara-order-channel", "STORE");
  }

  function assertWhiteLabelSurface(surface) {
    if (/takara\s*3d|takara3d/i.test(surface.textContent || "")) {
      throw fail("STORE_WHITE_LABEL_TEXT_LEAK", "La superficie compartida contiene branding no permitido.");
    }
    surface.querySelectorAll("[aria-label], [title], [alt]").forEach(function (node) {
      ["aria-label", "title", "alt"].forEach(function (name) {
        const value = node.getAttribute(name);
        if (value && /takara\s*3d|takara3d/i.test(value)) {
          throw fail("STORE_WHITE_LABEL_ATTRIBUTE_LEAK", "La superficie compartida contiene branding no permitido.");
        }
      });
    });
  }

  function getFrameDocument(frame) {
    try {
      return frame && frame.contentDocument ? frame.contentDocument : null;
    } catch (error) {
      throw fail("STORE_ORDER_FRAME_ORIGIN_INVALID", "El pedido compartido no conserva el origen esperado.");
    }
  }

  function removeDirectChrome(frameDocument) {
    frameDocument.querySelectorAll(".site-header, .site-footer, .skip-link").forEach(function (node) {
      node.remove();
    });
  }

  function installEmbeddedOrderStyle(frameDocument) {
    const style = frameDocument.createElement("style");
    style.setAttribute("data-store-embedded-style", "");
    style.textContent = [
      "html,body{margin:0!important;padding:0!important;background:#f7f3ee!important;}",
      "body{min-height:0!important;}",
      "main{padding:0!important;}",
      "#pedido{padding-top:.5rem!important;}"
    ].join("");
    frameDocument.head.appendChild(style);
  }

  function resizeOrderFrame(frame) {
    const frameDocument = getFrameDocument(frame);
    if (!frameDocument || !frameDocument.body) return;
    const surface = frameDocument.querySelector("#pedido");
    if (!surface) return;
    const rectHeight = typeof surface.getBoundingClientRect === "function"
      ? surface.getBoundingClientRect().height
      : 0;
    const height = Math.max(
      Math.ceil(rectHeight || 0),
      surface.scrollHeight || 0,
      1
    );
    const nextHeight = Math.ceil(height);
    const currentHeight = Number.parseInt(frame.style.height || "0", 10) || 0;
    if (Math.abs(currentHeight - nextHeight) > 1) {
      frame.style.height = String(nextHeight) + "px";
    }
  }

  function disconnectOrderFrameObserver(frame) {
    if (frame._takaraStoreResizeObserver) {
      frame._takaraStoreResizeObserver.disconnect();
      frame._takaraStoreResizeObserver = null;
    }
  }

  function observeOrderFrame(frame) {
    const frameDocument = getFrameDocument(frame);
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) return;
    const surface = frameDocument.querySelector("#pedido");
    if (!surface) return;

    disconnectOrderFrameObserver(frame);

    let scheduled = false;
    const update = function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        resizeOrderFrame(frame);
      });
    };

    if (typeof frameWindow.ResizeObserver === "function") {
      const observer = new frameWindow.ResizeObserver(update);
      observer.observe(surface);
      frame._takaraStoreResizeObserver = observer;
    }

    update();
    window.setTimeout(update, 80);
  }

  function waitForOrderFrame(frame) {
    return new Promise(function (resolve, reject) {
      let timeoutId = null;

      function cleanup() {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        frame.onload = null;
        frame.onerror = null;
      }

      frame.onload = function () {
        cleanup();
        resolve();
      };
      frame.onerror = function () {
        cleanup();
        reject(fail("STORE_ORDER_FRAME_FAILED", "No se pudo abrir el pedido compartido."));
      };
      timeoutId = window.setTimeout(function () {
        cleanup();
        reject(fail("STORE_ORDER_FRAME_TIMEOUT", "El pedido compartido tardó demasiado en abrirse."));
      }, ORDER_FRAME_TIMEOUT_MS);

      frame.hidden = true;
      frame.style.height = "0px";
      frame.src = ORDER_FRAME_URL;
    });
  }

  function prepareOrderFrame(frame, context) {
    const frameDocument = getFrameDocument(frame);
    const frameWindow = frame.contentWindow;
    if (!frameDocument || !frameWindow) {
      throw fail("STORE_ORDER_FRAME_INVALID", "No se pudo acceder al pedido compartido.");
    }

    const surface = frameDocument.querySelector("#pedido");
    if (!surface) {
      throw fail("STORE_ORDER_SURFACE_MISSING", "No se encontró la superficie compartida de pedido.");
    }

    removeDirectChrome(frameDocument);
    removeDirectOnlyControls(surface);
    assertWhiteLabelSurface(surface);
    installEmbeddedOrderStyle(frameDocument);

    const bridge = frameWindow.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1;
    if (!bridge || typeof bridge.setVerifiedContext !== "function") {
      throw fail("STORE_ORDER_CONTEXT_BRIDGE_MISSING", "El motor compartido no dispone del bridge Store.");
    }

    bridge.setVerifiedContext(context);
    frame.hidden = false;
    observeOrderFrame(frame);
  }

  async function mountSharedOrder(root, context) {
    const frame = root.querySelector("[data-store-order-frame]");
    if (!frame) {
      throw fail("STORE_ORDER_FRAME_MISSING", "No existe el contenedor del pedido compartido.");
    }
    await waitForOrderFrame(frame);
    prepareOrderFrame(frame, context);
    root.setAttribute("data-store-order-ready", "true");
  }

  async function renderStore(root, context) {
    const name = root.querySelector("[data-store-name]");
    if (name) name.textContent = context.display_name;
    document.title = context.display_name;
    await mountSharedOrder(root, context);
    setPanelState(root, "active");
    const frame = root.querySelector("[data-store-order-frame]");
    if (frame) window.requestAnimationFrame(function () { resizeOrderFrame(frame); });
  }

  function clearStoreOrder(root) {
    const frame = root.querySelector("[data-store-order-frame]");
    if (frame) {
      const frameWindow = frame.contentWindow;
      if (frameWindow) {
        const bridge = frameWindow.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1;
        if (bridge && typeof bridge.clear === "function") bridge.clear();
      }
      disconnectOrderFrameObserver(frame);
      frame.onload = null;
      frame.onerror = null;
      frame.hidden = true;
      frame.style.height = "0px";
      frame.src = "about:blank";
    }
    root.removeAttribute("data-store-order-ready");
  }

  function renderError(root, error) {
    clearStoreOrder(root);
    const message = root.querySelector("[data-store-error-message]");
    if (message) {
      if (error && (error.code === "STORE_INACTIVE" || error.code === "STORE_NOT_FOUND" || error.code === "STORE_PUBLIC_CODE_INVALID")) {
        message.textContent = "Este enlace de tienda no está disponible. Revisa el QR o solicita uno válido al establecimiento.";
      } else {
        message.textContent = "No podemos verificar esta tienda ahora mismo. No continuaremos sin una atribución válida.";
      }
    }
    document.title = "Tienda no disponible";
    setPanelState(root, "error");
  }

  function bootStorePublicPage() {
    const root = document.querySelector("[data-takara-store-app]");
    if (!root) return;
    setPanelState(root, "loading");
    const storeRef = readStoreRef(window.location.search);
    if (!isValidStoreRef(storeRef)) {
      renderError(root, fail("STORE_PUBLIC_CODE_INVALID", "Store public reference is invalid."));
      return;
    }
    let endpoint = "";
    try {
      endpoint = getCentralAppsScriptEndpoint(window);
    } catch (error) {
      renderError(root, error);
      return;
    }
    resolveStoreContextJsonp({endpoint: endpoint, storeRef: storeRef, document: document, window: window, crypto: window.crypto}).then(
      function (context) {
        return renderStore(root, context).catch(function (error) { renderError(root, error); });
      },
      function (error) { renderError(root, error); }
    );
  }

  window.TAKARA_STORE_PUBLIC_CLIENT_V1 = Object.freeze({
    version: CLIENT_VERSION,
    normalizeStoreRef: normalizeStoreRef,
    isValidStoreRef: isValidStoreRef,
    readStoreRef: readStoreRef,
    buildStorePublicUrl: buildStorePublicUrl,
    parseStorePublicUrl: parseStorePublicUrl,
    isStorePublicUrl: isStorePublicUrl,
    assertEndpoint: assertEndpoint,
    getCentralAppsScriptEndpoint: getCentralAppsScriptEndpoint,
    createCallbackName: createCallbackName,
    buildResolveUrl: buildResolveUrl,
    validateStoreContextResponse: validateStoreContextResponse,
    resolveStoreContextJsonp: resolveStoreContextJsonp,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootStorePublicPage, {once: true});
  } else {
    bootStorePublicPage();
  }
})();