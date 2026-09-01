const ORDER_BROWSER_POSTMESSAGE_VERSION = "TAKARA_ORDER_BROWSER_POSTMESSAGE_V1";
const ORDER_BROWSER_RESPONSE_MODE = "postmessage_v1";
const ORDER_BROWSER_ALLOWED_ORIGINS = Object.freeze([
  "https://takara3d.es",
  "https://www.takara3d.es"
]);
const ORDER_BROWSER_NONCE_PATTERN = /^[A-HJ-NP-Z2-9]{24,64}$/;
const ORDER_BROWSER_ORDER_ID_PATTERN = /^TK-WEB-\d{8}-[A-HJ-NP-Z2-9]{6}$/;

function parseOrderBrowserResponseRequest_(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = texto_(params.takara_response_mode);

  if (!mode) {
    return null;
  }

  if (mode !== ORDER_BROWSER_RESPONSE_MODE) {
    throw new Error("Modo de respuesta del navegador no compatible.");
  }

  const origin = texto_(params.takara_response_origin);
  const nonce = texto_(params.takara_response_nonce).toUpperCase();
  const orderId = texto_(params.takara_order_id).toUpperCase();

  if (ORDER_BROWSER_ALLOWED_ORIGINS.indexOf(origin) === -1) {
    throw new Error("Origen de respuesta del navegador no permitido.");
  }

  if (!ORDER_BROWSER_NONCE_PATTERN.test(nonce)) {
    throw new Error("Nonce de respuesta del navegador no válido.");
  }

  if (!ORDER_BROWSER_ORDER_ID_PATTERN.test(orderId)) {
    throw new Error("ID de pedido para respuesta del navegador no válido.");
  }

  return Object.freeze({
    version: ORDER_BROWSER_POSTMESSAGE_VERSION,
    mode: mode,
    origin: origin,
    nonce: nonce,
    order_id: orderId
  });
}

function assertOrderBrowserPayloadMatches_(request, payload) {
  if (!request) {
    return;
  }

  const payloadOrderId = texto_(payload && payload.pedido_web_id).toUpperCase();

  if (payloadOrderId !== request.order_id) {
    throw new Error("El ID de pedido no coincide con la solicitud de confirmación.");
  }
}

function orderBrowserSafeResponse_(request, payload) {
  const accepted =
    !!request &&
    payload &&
    payload.ok === true &&
    texto_(payload.id_pedido_web).toUpperCase() === request.order_id &&
    texto_(payload.estado).toLowerCase() === "recibido";

  return {
    version: ORDER_BROWSER_POSTMESSAGE_VERSION,
    nonce: request ? request.nonce : "",
    order_id: request ? request.order_id : "",
    ok: accepted,
    id_pedido_web: accepted ? request.order_id : "",
    estado: accepted ? "recibido" : "",
    error: accepted ? "" : "ORDER_NOT_ACCEPTED",
    message: accepted
      ? "Pedido recibido."
      : "No se pudo confirmar la recepción del pedido."
  };
}

function orderBrowserResponseOrJson_(request, payload) {
  if (!request) {
    return json_(payload);
  }

  const safePayload = orderBrowserSafeResponse_(request, payload);
  const serialized = JSON.stringify(safePayload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const targetOrigin = JSON.stringify(request.origin);
  const html = [
    "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>",
    "<script>",
    "window.parent.postMessage(",
    serialized,
    ",",
    targetOrigin,
    ");",
    "</script>",
    "</body></html>"
  ].join("");

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
