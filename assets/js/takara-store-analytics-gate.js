(function () {
  "use strict";
  // Sin SDK, cookies, red ni captura antes del consentimiento explícito.
  const opt = window.TAKARA_STORE_ANALYTICS_PILOT_CONFIG;
  const factory = window.TAKARA_STORE_ANALYTICS_CANDIDATE_V1;
  if (!opt || opt.enabled !== true || !factory ||
      typeof factory.eligibleContext !== "function" ||
      typeof factory.createStoreAnalyticsAdapter !== "function") return;

  // Nunca confiar en una variable consent_granted autoafirmada en configuración.
  // Solo un control de elección explícito debe activar el envío.
  let consentGranted = false;
  // Sin una clave PÚBLICA válida no se ofrece consentimiento ni medición.
  const customReady = typeof opt.createClient === "function";
  const directReady = typeof opt.projectToken === "string" &&
    /^phc_[A-Za-z0-9]{20,128}$/.test(opt.projectToken) &&
    typeof window.fetch === "function" && window.crypto &&
    typeof window.crypto.randomUUID === "function";
  const clientConfigured = !!(customReady || directReady);
  let hasValidatedPage = false;
  let verified = null;
  let slug = "";
  let adapter = null;
  let client = null;
  let captureRequested = false;

  function dispatch() {
    if (!consentGranted || !verified || captureRequested) return false;
    if (!adapter) {
      // Cliente sin SDK: POST público a PostHog EU, solo DESPUÉS de consentir.
      if (!clientConfigured) return false;
      try {
        client = customReady ? opt.createClient(factory.postHogPrivacyOptions()) :
          factory.createPostHogHttpClient(opt.projectToken, {
            fetch: window.fetch.bind(window),
            crypto: window.crypto,
            AbortController: window.AbortController,
            sessionStorage: window.sessionStorage,
          });
      } catch (_error) { return false; }
      if (!client || typeof client.capture !== "function") {
        client = null;
        return false;
      }
      adapter = factory.createStoreAnalyticsAdapter(client);
    }
    try {
      const accepted = adapter.captureVerifiedPageview(verified, slug);
      if (accepted) {
        captureRequested = true;
        verified = null;
      }
      return accepted;
    } catch (_ignored) { return false; }
  }

  window.TAKARA_STORE_ANALYTICS_PILOT_V1 = Object.freeze({
    captureVerifiedPageview(context, storeSlug) {
      if (hasValidatedPage || !factory.eligibleContext(context, storeSlug)) return false;
      hasValidatedPage = true;
      // Solo identidad pública mínima, nunca guardar el objeto Store completo.
      verified = Object.freeze({
        version: context.version, status: context.status,
        store_ref: context.store_ref,
      });
      slug = storeSlug;
      return dispatch();
    },
    setConsent(granted) {
      if (typeof granted !== "boolean") return false;
      consentGranted = granted;
      if (!granted) {
        if (client && typeof client.opt_out_capturing === "function") {
          try { client.opt_out_capturing(); } catch (_ignored) {}
        }
        return false;
      }
      if (client && typeof client.opt_in_capturing === "function") {
        try { client.opt_in_capturing({ captureEventName: false }); }
        catch (_ignored) { return false; }
      }
      return dispatch();
    },
    hasConsent() { return consentGranted; },
    hasClientConfigured() { return clientConfigured; },
  });
})();
