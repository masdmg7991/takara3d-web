"use strict";

(() => {
  const VERSION = "TAKARA_STORE_ORDER_ENTRY_V1";
  const STORE_CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1";
  const STORE_REF_PATTERN = /^st_[A-Za-z0-9_-]{24,64}$/;

  function failClosed(code) {
    document.documentElement.setAttribute("data-store-order-invalid", "true");
    document.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(
      (node) => {
        node.disabled = true;
      }
    );
    console.error("[" + VERSION + "] " + code);
  }

  function setDisplayName() {
    const target = document.querySelector("[data-store-order-display]");
    if (!target) return;

    let displayName = "";
    try {
      displayName = String(
        sessionStorage.getItem("TAKARA_STORE_DISPLAY_NAME_HINT_V1") || ""
      ).trim();
    } catch (error) {
      displayName = "";
    }

    if (displayName && displayName.length <= 120) {
      target.textContent = displayName;
      document.title = "Pedido | " + displayName;
    }
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    const storeRef = String(params.get("s") || "").trim();

    if (!STORE_REF_PATTERN.test(storeRef)) {
      failClosed("STORE_PUBLIC_CODE_INVALID");
      return;
    }

    const bridge = window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1;
    if (!bridge || typeof bridge.setTransport !== "function") {
      failClosed("ORDER_STORE_CONTEXT_BRIDGE_UNAVAILABLE");
      return;
    }

    try {
      bridge.setTransport({
        version: STORE_CONTEXT_VERSION,
        store_ref: storeRef,
      });
    } catch (error) {
      failClosed(
        error && error.code
          ? error.code
          : "ORDER_STORE_CONTEXT_TRANSPORT_REJECTED"
      );
      return;
    }

    setDisplayName();
    document.documentElement.setAttribute("data-store-order-channel", "STORE");
  }

  boot();
})();
