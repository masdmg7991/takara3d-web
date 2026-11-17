(function (win, doc) {
  "use strict";
  // P21: consentimiento explícito, acceso discreto dentro de la página Store.
  if (!win || !doc) return;
  const config = win.TAKARA_STORE_ANALYTICS_PILOT_CONFIG;
  const gate = win.TAKARA_STORE_ANALYTICS_PILOT_V1;
  if (!config || config.enabled !== true || !gate ||
      typeof gate.setConsent !== "function" ||
      typeof gate.hasClientConfigured !== "function" ||
      gate.hasClientConfigured() !== true) return;
  const store = doc.querySelector("[data-takara-store-app]");
  if (!store || !doc.body || !doc.head) return;

  // Consentimiento único para todas las páginas Takara en esta pestaña.
  const KEY = "takara_analytics_consent_v1";
  let choice = null;
  try {
    const remembered = win.sessionStorage && win.sessionStorage.getItem(KEY);
    if (remembered === "accept" || remembered === "reject") choice = remembered;
  } catch (_ignored) {} // Modo privado puede bloquear storage.

  const css = doc.createElement("style");
  css.textContent = [
    "[data-takara-stats-ui][hidden],[data-takara-stats-ui] [hidden]{display:none!important}",
    "[data-takara-stats-ui]{position:static;margin:14px auto 8px;text-align:center;",
    "max-width:min(440px,calc(100vw - 32px));box-sizing:border-box;",
    "font:14px/1.45 system-ui,sans-serif;color:#222;}",
    "[data-takara-stats-panel]{background:#fff;border:1px solid #b7b0a8;",
    "border-radius:12px;box-shadow:0 5px 24px #0002;padding:14px;}",
    "[data-takara-stats-panel] p{margin:6px 0 12px}",
    "[data-takara-stats-actions]{display:flex;gap:8px;flex-wrap:wrap}",
    "[data-takara-stats-ui] button{padding:8px 12px;min-height:40px;",
    "font:inherit;cursor:pointer;border:1px solid #555;border-radius:8px;background:#fff;color:#222;}",
    "[data-takara-stats-accept],[data-takara-stats-reject]{background:#33271f!important;color:#fff!important}",
    "[data-takara-stats-pref]{background:transparent;border:0!important;text-decoration:underline;",
    "box-shadow:none;padding:6px 10px;min-height:32px!important;font-size:12px!important}",
  ].join("");
  doc.head.appendChild(css);

  const wrap = doc.createElement("div");
  wrap.setAttribute("data-takara-stats-ui", "");
  wrap.setAttribute("role", "region");
  wrap.setAttribute("aria-label", "Preferencias de estadísticas de la tienda");
  wrap.hidden = true;
  const panel = doc.createElement("div");
  panel.setAttribute("data-takara-stats-panel", "");
  const heading = doc.createElement("strong");
  heading.textContent = "Estadísticas opcionales";
  const description = doc.createElement("p");
  description.textContent =
    "Takara 3D utiliza PostHog (UE) solo si aceptas para contar aperturas de esta tienda. " +
    "Se utiliza un identificador temporal. No enviamos datos del formulario o pedido. " +
    "Puedes rechazar o cambiar tu elección.";
  const actions = doc.createElement("div");
  actions.setAttribute("data-takara-stats-actions", "");
  function makeButton(label, attribute) {
    const button = doc.createElement("button");
    button.type = "button";
    button.setAttribute(attribute, "");
    button.textContent = label;
    return button;
  }
  const accept = makeButton("Aceptar", "data-takara-stats-accept");
  const reject = makeButton("Rechazar", "data-takara-stats-reject");
  const dismiss = makeButton("Cerrar", "data-takara-stats-close");
  const pref = makeButton("Estadísticas opcionales", "data-takara-stats-pref");
  dismiss.hidden = true;
  pref.hidden = true;
  actions.appendChild(accept);
  actions.appendChild(reject);
  actions.appendChild(dismiss);
  panel.appendChild(heading);
  panel.appendChild(description);
  const info = doc.createElement("a");
  info.href="/estadisticas-privacidad.html";
  info.textContent="Información y privacidad";
  info.style.cssText="display:inline-block;font:12px/1.5 system-ui,sans-serif;margin:0 0 10px;color:#6a4029;text-decoration:underline";
  panel.appendChild(info);
  panel.appendChild(actions);
  wrap.appendChild(panel);
  wrap.appendChild(pref);
  store.appendChild(wrap);

  function isActive() {
    return store.getAttribute("data-state") === "active";
  }
  function render(openPanel) {
    wrap.hidden = !isActive();
    if (wrap.hidden) return;
    panel.hidden = !openPanel;
    pref.hidden = openPanel;
    dismiss.hidden = false;
  }
  function save(value) {
    choice = value;
    try { if (win.sessionStorage) win.sessionStorage.setItem(KEY, value); }
    catch (_ignored) {}
  }
  function decide(value) {
    // Solo botones reales activan el consentimiento; fallos nunca bloquean pedidos.
    if (value !== "accept" && value !== "reject") return;
    save(value);
    try { gate.setConsent(value === "accept"); } catch (_ignored) {}
    render(false);
  }
  accept.addEventListener("click", function () { decide("accept"); });
  reject.addEventListener("click", function () { decide("reject"); });
  dismiss.addEventListener("click", function () { render(false); });
  pref.addEventListener("click", function () { render(true); });

  // No abrir banner en enlace de tienda inválida/inactiva.
  function update() {
    if (!isActive()) { wrap.hidden = true; return; }
    if (choice === "accept") {
      try { gate.setConsent(true); } catch (_ignored) {}
    }
    // Sin cuadro intrusivo al abrir Store: consentimiento siempre a petición.
    render(false);
  }
  if (typeof win.MutationObserver === "function") {
    const observer = new win.MutationObserver(update);
    observer.observe(store, { attributes: true, attributeFilter: ["data-state"] });
  }
  update();
})(typeof window !== "undefined" ? window : null,
   typeof document !== "undefined" ? document : null);
