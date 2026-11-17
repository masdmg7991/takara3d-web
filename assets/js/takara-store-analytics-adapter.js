(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.TAKARA_STORE_ANALYTICS_CANDIDATE_V1 = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  // LAB: nunca inicia el SDK, contacta la red ni almacena identificadores.
  const EVENT_NAME = "takara_store_pageview_v1";
  const SITE_EVENT_NAME = "takara_site_pageview_v1";
  const CTA_EVENT_NAME = "takara_site_cta_v1";
  const PAGE_TYPES = Object.freeze(["home","products","order","contact","qr"]);
  const CTA_IDS = Object.freeze(["start_order","view_products","open_contact"]);
  const ANALYTICS_SESSION_ID_KEY = "takara_analytics_session_id_v1";
  const ANON_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
  const REF_RE = /^st_[A-Za-z0-9_-]{24,64}$/;

  function eligibleContext(context, slug) {
    return !!context &&
      context.version === "TAKARA_STORE_CONTEXT_V1" &&
      context.status === "ACTIVE" &&
      typeof context.store_ref === "string" &&
      REF_RE.test(context.store_ref) &&
      typeof slug === "string" &&
      (!slug || SLUG_RE.test(slug));
  }

  function createStoreAnalyticsAdapter(posthog) {
    let alreadySent = false;
    return Object.freeze({
      eventName: EVENT_NAME,
      captureVerifiedPageview(context, storeSlug) {
        if (alreadySent || !eligibleContext(context, storeSlug)) return false;
        if (!posthog || typeof posthog.capture !== "function") return false;
        const properties = {
          store_ref: context.store_ref,
          entry_channel: "store_public",
        };
        if (storeSlug) properties.store_slug = storeSlug;
        try {
          // Solo un pageview validado; nunca es un escaneo de QR ni un pedido.
          const accepted = posthog.capture(EVENT_NAME, properties);
          // PostHog puede devolver false al descartar por rate limit.
          if (accepted === false) return false;
          alreadySent = true;
          return true;
        } catch (_error) {
          // La analítica nunca interrumpe una tienda ni sus pedidos.
          return false;
        }
      },
    });
  }

  // Candidato explícito para una futura inicialización post-consentimiento.
  // No se utiliza hasta que exista una interfaz de consentimiento aprobada.
  function postHogPrivacyOptions() {
    return {
      api_host: "https://eu.i.posthog.com",
      defaults: "2026-08-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_persistence: true,
      disable_surveys: true,
      disable_conversations: true,
      disable_external_dependency_loading: true,
      save_campaign_params: false,
      save_referrer: false,
      person_profiles: "never",
      before_send(event) {
        // La propiedad before_send es la última barrera previa a la cola.
        // El SDK aún requiere auditoría de tráfico real antes de publicarse.
        if (!event || event.event !== EVENT_NAME || !event.properties) return null;
        const p = event.properties;
        if (!REF_RE.test(p.store_ref) || p.entry_channel !== "store_public") return null;
        if (p.store_slug != null && !SLUG_RE.test(p.store_slug)) return null;
        const clean = {
          store_ref: p.store_ref,
          entry_channel: "store_public",
          "$process_person_profile": false,
          "$geoip_disable": true,
        };
        if (p.store_slug) clean.store_slug = p.store_slug;
        return Object.assign({}, event, { properties: clean });
      },
    };
  }

  // Alternativa recomendada para una única métrica: POST directo a la API oficial.
  // No descarga posthog-js, no usa cookies ni conserva un identificador entre visitas.
  // Se crea EXCLUSIVAMENTE después del consentimiento y de validar una Store ACTIVE.
  const CAPTURE_URL = "https://eu.i.posthog.com/i/v0/e/";

  function createPostHogHttpClient(projectToken, platform) {
    if (typeof projectToken !== "string" ||
        !/^phc_[A-Za-z0-9]{20,128}$/.test(projectToken) ||
        !platform || typeof platform.fetch !== "function" ||
        !platform.crypto || typeof platform.crypto.randomUUID !== "function") return null;
    let disabled = false;
    const outstanding = new Set();
    return Object.freeze({
      capture(event, input) {
        if (disabled || !input || typeof input !== "object") return false;
        const properties = {
          "$process_person_profile": false,
          "$geoip_disable": true,
        };
        if (event === EVENT_NAME) {
          if (!REF_RE.test(input.store_ref) ||
              input.entry_channel !== "store_public" ||
              (input.store_slug != null && !SLUG_RE.test(input.store_slug))) return false;
          properties.store_ref = input.store_ref;
          properties.entry_channel = "store_public";
          if (input.store_slug) properties.store_slug = input.store_slug;
        } else if (event === SITE_EVENT_NAME || event === CTA_EVENT_NAME) {
          if (input.entry_channel !== "site_public" ||
              !PAGE_TYPES.includes(input.page_type)) return false;
          properties.entry_channel = "site_public";
          properties.page_type = input.page_type;
          if (event === CTA_EVENT_NAME) {
            if (!CTA_IDS.includes(input.cta_id)) return false;
            properties.cta_id = input.cta_id;
          }
        } else {
          return false;
        }
        let aborter = null;
        try {
          // ID aleatorio exclusivo de este único evento; no es un ID de persona.
          let eventId = platform.crypto.randomUUID();
          // Sesión efímera solo tras consentimiento. Sin cookies ni perfil personal.
          // Misma identidad en página pública y Store durante esta pestaña.
          try {
            const storage = platform.sessionStorage;
            if (storage && typeof storage.getItem === "function" &&
                typeof storage.setItem === "function" &&
                ANON_ID_RE.test(eventId)) {
              const previous = storage.getItem(ANALYTICS_SESSION_ID_KEY);
              if (previous && ANON_ID_RE.test(previous)) eventId = previous;
              else storage.setItem(ANALYTICS_SESSION_ID_KEY, eventId);
            }
          } catch (_storageError) {} // Si falla almacenamiento, ID por evento.
          aborter = typeof platform.AbortController === "function" ?
            new platform.AbortController() : null;
          const payload = JSON.stringify({
            api_key: projectToken,
            event: event,
            distinct_id: eventId,
            properties,
          });
          const request = {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            redirect: "error",
            cache: "no-store",
            // Mitiga pérdidas al navegar inmediatamente tras pulsar un enlace.
            keepalive: event === CTA_EVENT_NAME,
            headers: { "Content-Type": "application/json" },
            body: payload,
          };
          if (aborter) request.signal = aborter.signal;
          const result = platform.fetch(CAPTURE_URL, request);
          if (!result || typeof result.then !== "function") return false;
          if (aborter) outstanding.add(aborter);
          // true significa "solicitud iniciada", NO evento recibido por PostHog.
          Promise.resolve(result).catch(function () {
            // No convertir un error de métricas en fallo del pedido.
          }).then(function () {
            if (aborter) outstanding.delete(aborter);
          });
          return true;
        } catch (_error) {
          if (aborter) outstanding.delete(aborter);
          return false;
        }
      },
      opt_out_capturing() {
        disabled = true;
        outstanding.forEach(function (controller) {
          try { controller.abort(); } catch (_ignored) {}
        });
        outstanding.clear();
        try {
          if (platform.sessionStorage &&
              typeof platform.sessionStorage.removeItem === "function") {
            platform.sessionStorage.removeItem(ANALYTICS_SESSION_ID_KEY);
          }
        } catch (_ignored) {}
      },
      opt_in_capturing() { disabled = false; },
    });
  }

  return Object.freeze({
    EVENT_NAME, SITE_EVENT_NAME, CTA_EVENT_NAME, PAGE_TYPES, CTA_IDS,
    eligibleContext, createStoreAnalyticsAdapter,
    postHogPrivacyOptions, createPostHogHttpClient,
  });
});
