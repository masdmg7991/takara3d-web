const CONTACT_BROWSER_POSTMESSAGE_VERSION =
  "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1";
const CONTACT_BROWSER_RESPONSE_MODE = "contact_postmessage_v1";
const CONTACT_BROWSER_ALLOWED_ORIGINS = Object.freeze([
  "https://takara3d.es",
  "https://www.takara3d.es"
]);
const CONTACT_BROWSER_NONCE_PATTERN = /^[A-HJ-NP-Z2-9]{24,64}$/;
const CONTACT_BROWSER_ID_PATTERN =
  /^TK-CONTACTO-\d{8}-\d{6}-[A-F0-9]{8}$/;
const CONTACT_BROWSER_REQUEST_ID_PATTERN =
  /^TK-CONTACT-REQ-[A-HJ-NP-Z2-9]{32}$/;

function parseContactBrowserResponseRequest_(e) {
  const params = e && e.parameter ? e.parameter : {};
  const mode = texto_(params.takara_contact_response_mode);

  if (!mode) {
    return null;
  }

  if (mode !== CONTACT_BROWSER_RESPONSE_MODE) {
    throw new Error("Modo de respuesta de contacto no compatible.");
  }

  const origin = texto_(params.takara_contact_response_origin);
  const nonce = texto_(params.takara_contact_response_nonce).toUpperCase();
  const requestId = texto_(params.contact_request_id).toUpperCase();

  if (CONTACT_BROWSER_ALLOWED_ORIGINS.indexOf(origin) === -1) {
    throw new Error("Origen de respuesta de contacto no permitido.");
  }

  if (!CONTACT_BROWSER_NONCE_PATTERN.test(nonce)) {
    throw new Error("Nonce de respuesta de contacto no valido.");
  }

  if (!CONTACT_BROWSER_REQUEST_ID_PATTERN.test(requestId)) {
    throw new Error("ID de solicitud de contacto no valido.");
  }

  return Object.freeze({
    version: CONTACT_BROWSER_POSTMESSAGE_VERSION,
    mode: mode,
    origin: origin,
    nonce: nonce,
    request_id: requestId
  });
}

function contactBrowserSafeResponse_(request, payload) {
  const contactId = texto_(
    payload && payload.id_contacto_web
  ).toUpperCase();
  const payloadRequestId = texto_(
    payload && payload.contact_request_id
  ).toUpperCase();
  const accepted =
    !!request &&
    payload &&
    payload.ok === true &&
    payloadRequestId === request.request_id &&
    texto_(payload.tipo_solicitud).toUpperCase() === "CONTACTO_WEB" &&
    CONTACT_BROWSER_ID_PATTERN.test(contactId) &&
    texto_(payload.estado).toLowerCase() === "recibido";

  return {
    version: CONTACT_BROWSER_POSTMESSAGE_VERSION,
    nonce: request ? request.nonce : "",
    request_id: request ? request.request_id : "",
    ok: accepted,
    id_contacto_web: accepted ? contactId : "",
    estado: accepted ? "recibido" : "",
    error: accepted ? "" : "CONTACT_NOT_ACCEPTED",
    message: accepted
      ? "Consulta recibida."
      : "No se pudo confirmar la recepcion de la consulta."
  };
}

function contactBrowserResponseOrJson_(request, payload) {
  if (!request) {
    return json_(payload);
  }

  const safePayload = contactBrowserSafeResponse_(request, payload);
  const serialized = JSON.stringify(safePayload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const targetOrigin = JSON.stringify(request.origin);
  const html = [
    "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>",
    "<script>",
    "window.top.postMessage(",
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
