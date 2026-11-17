(function (win, doc) {
  "use strict";
  // Instrumentación de navegación pública, LAB. Sin SDK, autocaptura ni cookies.
  if (!win || !doc || !doc.body || !doc.head || !doc.currentScript) return;
  try { if (win.top && win.top !== win.self) return; } catch (_ignored) { return; }
  if (win.TAKARA_SITE_ANALYTICS_PILOT_V1) return;

  const source = doc.currentScript;
  const pageType = source.getAttribute("data-takara-page-type");
  // Enlaces antiguos a Pedido con canal Store no son pedidos directos.
  if (pageType === "order" && win.location &&
      typeof win.location.search === "string" &&
      new URLSearchParams(win.location.search).get("channel") === "store") return;
  const factory = win.TAKARA_STORE_ANALYTICS_CANDIDATE_V1;
  const opt = win.TAKARA_STORE_ANALYTICS_PILOT_CONFIG;
  const pageTypes = ["home","products","contact","order","qr"];
  if (!pageTypes.includes(pageType) || !factory ||
      typeof factory.createPostHogHttpClient !== "function" ||
      !opt || opt.enabled !== true ||
      typeof opt.projectToken !== "string" ||
      !/^phc_[A-Za-z0-9]{20,128}$/.test(opt.projectToken) ||
      !win.crypto || typeof win.crypto.randomUUID !== "function" ||
      typeof win.fetch !== "function") return;

  const CONSENT_KEY = "takara_analytics_consent_v1";
  let choice = null;
  let client = null;
  let pageSent = false;
  try {
    const previous = win.sessionStorage && win.sessionStorage.getItem(CONSENT_KEY);
    if (previous === "accept" || previous === "reject") choice = previous;
  } catch (_ignored) {}

  function element(tag, content, className) {
    const el = doc.createElement(tag);
    if (content) el.textContent = content;
    if (className) el.className = className;
    return el;
  }
  const style = element("style");
  style.textContent = [
    "[data-takara-site-consent][hidden],[data-takara-site-consent] [hidden]{display:none!important}",
    "[data-takara-site-consent]{position:fixed;right:14px;bottom:14px;z-index:12000;",
    "font:13px/1.55 system-ui,sans-serif;max-width:min(360px,calc(100vw - 28px));color:#262922}",
    "[data-takara-site-consent-panel]{background:#fff;border:1px solid #daddd7;border-radius:12px;",
    "box-shadow:0 12px 36px #1f242329;padding:16px}",
    "[data-takara-site-consent-panel] p{margin:7px 0 12px;color:#636960}",
    "[data-takara-site-consent-actions]{display:flex;gap:8px;flex-wrap:wrap}",
    "[data-takara-site-consent] button{min-height:38px;padding:8px 13px;border-radius:8px;",
    "border:1px solid #cbd0c9;background:#fff;color:#2d352e;font:700 12px/1.3 system-ui,sans-serif;cursor:pointer}",
    "[data-takara-site-accept],[data-takara-site-reject]{background:#2f4f3d!important;color:#fff!important;border-color:#2f4f3d!important}",
    "[data-takara-site-pref]{font-size:11px!important;background:#fff;box-shadow:0 3px 10px #0002}",
    "[data-takara-site-consent] button:focus-visible{outline:3px solid #bf9a68;outline-offset:2px}"
  ].join("");
  doc.head.appendChild(style);

  const wrapper = element("div");
  wrapper.setAttribute("data-takara-site-consent","");
  wrapper.setAttribute("role","region");
  wrapper.setAttribute("aria-label","Preferencias de estadísticas de Takara");
  const panel = element("div",null);
  panel.setAttribute("data-takara-site-consent-panel","");
  panel.appendChild(element("strong","Estadísticas opcionales"));
  panel.appendChild(element("p",
    "Takara 3D utiliza PostHog (UE) solo si aceptas para medir páginas y algunos enlaces. " +
    "Se usa un identificador aleatorio temporal. No enviamos fotos, datos de contacto ni pedidos. " +
    "Puedes rechazar o retirar tu consentimiento cuando quieras."));
  const infoLink = element("a","Información y privacidad");
  infoLink.href = "/estadisticas-privacidad.html";
  infoLink.rel = "noopener";
  infoLink.style.cssText = "display:inline-block;font:12px/1.5 system-ui,sans-serif;margin:0 0 10px;color:#244f48;text-decoration:underline";
  panel.appendChild(infoLink);

  const actions = element("div");
  actions.setAttribute("data-takara-site-consent-actions","");
  function button(label,attribute) {
    const b = element("button",label);
    b.type = "button";
    b.setAttribute(attribute,"");
    return b;
  }
  const accept = button("Aceptar","data-takara-site-accept");
  const reject = button("Rechazar","data-takara-site-reject");
  const close = button("Cerrar","data-takara-site-close");
  const pref = button("Preferencias de estadísticas","data-takara-site-pref");
  actions.appendChild(accept);
  actions.appendChild(reject);
  actions.appendChild(close);
  panel.appendChild(actions);
  wrapper.appendChild(panel);
  wrapper.appendChild(pref);
  doc.body.appendChild(wrapper);

  function show(open) {
    wrapper.hidden = false;
    panel.hidden = !open;
    pref.hidden = open;
    close.hidden = choice === null;
  }
  function obtainClient() {
    if (client) return client;
    try {
      client = factory.createPostHogHttpClient(opt.projectToken, {
        fetch: win.fetch.bind(win), crypto: win.crypto,
        AbortController: win.AbortController,
        sessionStorage: win.sessionStorage
      });
    } catch (_ignored) { client = null; }
    return client;
  }
  function recordPage() {
    if (pageSent || choice !== "accept") return false;
    const api = obtainClient();
    if (!api) return false;
    const sent = api.capture(factory.SITE_EVENT_NAME, {
      entry_channel:"site_public",page_type:pageType
    });
    if (sent) pageSent = true;
    return sent;
  }
  function decide(next) {
    if (next !== "accept" && next !== "reject") return;
    choice = next;
    try {
      if (win.sessionStorage) win.sessionStorage.setItem(CONSENT_KEY,next);
    } catch (_ignored) {}
    if (next === "reject") {
      if (client && typeof client.opt_out_capturing === "function") {
        try { client.opt_out_capturing(); } catch (_ignored) {}
      }
    } else {
      if (client && typeof client.opt_in_capturing === "function") {
        try {client.opt_in_capturing();}catch(_ignored){}
      }
      recordPage();
    }
    show(false);
  }
  function classifyNavigation(href) {
    if (typeof href !== "string" || href.length > 250) return null;
    // Solo rutas fijas relativas, nunca se registran querystrings, fotos ni URLs.
    const target = href.split(/[?#]/,1)[0].replace(/^\.\.\//,"");
    if (target === "pedido.html") return "start_order";
    if (target === "productos.html") return "view_products";
    if (target === "contacto.html") return "open_contact";
    return null;
  }
  function trackNavigation(event) {
    if (choice !== "accept" || !event || !event.target) return;
    const link = event.target.closest && event.target.closest("a[href]");
    const cta = link && classifyNavigation(link.getAttribute("href"));
    if (!cta) return;
    const api = obtainClient();
    if (api) api.capture(factory.CTA_EVENT_NAME,{
      entry_channel:"site_public",page_type:pageType,cta_id:cta
    });
  }
  accept.addEventListener("click",function(){decide("accept");});
  reject.addEventListener("click",function(){decide("reject");});
  close.addEventListener("click",function(){show(false);});
  pref.addEventListener("click",function(){show(true);});
  doc.addEventListener("click",trackNavigation);
  if (choice === "accept") {
    show(false);
    recordPage();
  } else {
    show(choice === null);
  }

  win.TAKARA_SITE_ANALYTICS_PILOT_V1 = Object.freeze({
    hasConsent:function(){return choice === "accept";},
    pageType:pageType,
    hasRequestedPage:function(){return pageSent;},
  });
})(typeof window !== "undefined" ? window : null,
   typeof document !== "undefined" ? document : null);
