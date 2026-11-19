(function (win, doc) {
  "use strict";
  if (!win || !doc || !doc.currentScript) return;
  try { if (win.top !== win.self) return; } catch (_ignored) { return; }

  const page = doc.currentScript.getAttribute("data-takara-page-type");
  if (!["home", "products", "contact", "order", "qr", "store"].includes(page)) return;
  if (page === "order" && new URLSearchParams(win.location.search).get("channel") === "store") return;

  const config = win.TAKARA_AUDIENCE_CONFIG;
  if (!config || config.enabled !== true ||
      !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.endpoint || "")) return;

  const STORE_REF = /^st_[A-Za-z0-9_-]{24,64}$/;
  const STORE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  let captured = false;
  function capture(data) {
    if (captured) return false;
    try {
      const body = JSON.stringify(data);
      if (body.length > 180) return false;
      let accepted = false;
      if (win.navigator && typeof win.navigator.sendBeacon === "function" &&
          typeof Blob === "function") {
        try {
          accepted = win.navigator.sendBeacon(config.endpoint,
            new Blob([body], { type: "text/plain" }));
        } catch (_ignored) {}
      }
      if (!accepted && typeof win.fetch === "function") {
        const request = win.fetch(config.endpoint, {
          method: "POST", mode: "no-cors", credentials: "omit",
          referrerPolicy: "no-referrer", cache: "no-store", keepalive: true,
          headers: { "Content-Type": "text/plain" }, body: body
        });
        if (request && typeof request.catch === "function") request.catch(function () {});
        accepted = !!request;
      }
      captured = accepted;
      return accepted;
    } catch (_ignored) { return false; }
  }

  if (page === "store") {
    win.TAKARA_STORE_ANALYTICS_PILOT_V1 = Object.freeze({
      captureVerifiedPageview: function (context, slug) {
        if (!context || context.version !== "TAKARA_STORE_CONTEXT_V1" ||
            context.status !== "ACTIVE" || typeof context.store_ref !== "string" ||
            !STORE_REF.test(context.store_ref)) return false;
        const data = { kind: "store", store_ref: context.store_ref };
        if (typeof slug === "string" && STORE_SLUG.test(slug) && slug.length <= 64)
          data.store_slug = slug;
        return capture(data);
      }
    });
    return;
  }
  function collect() { capture({ kind: "web", page: page }); }
  if (doc.prerendering === true)
    doc.addEventListener("prerenderingchange", collect, { once: true });
  else collect();
})(typeof window !== "undefined" ? window : null,
   typeof document !== "undefined" ? document : null);
