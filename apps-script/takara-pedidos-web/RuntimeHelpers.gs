/*
 * TAKARA RUNTIME HELPERS V1
 *
 * Shared scalar normalization, validation, formatting, escaping and JSON helpers.
 * No HTTP routing or business orchestration belongs here.
 */

function numeroEnteroEstricto_(value) {
  const number = Number(value);
  return isFinite(number) && Math.floor(number) === number ? number : NaN;
}

function normalizarImporteEstricto_(value) {
  const cents = importeEnCentimos_(value);
  return isFinite(cents) ? (cents / 100).toFixed(2) : "";
}

function importeEnCentimos_(value) {
  const raw = texto_(value).replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    return NaN;
  }

  const amount = Number(raw);
  return isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
}

function normalizarFormatoHumano_(formato, orientacion) {
  const f = texto_(formato).toLowerCase();

  if (f.indexOf("horizontal") >= 0 || orientacion === "horizontal") {
    return "Marco horizontal";
  }

  return "Marco vertical";
}

function normalizarOrientacion_(orientacion, formato) {
  const o = texto_(orientacion).toLowerCase();

  if (o === "horizontal" || o === "vertical") {
    return o;
  }

  const f = texto_(formato).toLowerCase();

  if (f.indexOf("horizontal") >= 0) {
    return "horizontal";
  }

  return "vertical";
}

function normalizarEntorno_(entorno, paginaOrigen) {
  const e = texto_(entorno).toLowerCase();
  const p = texto_(paginaOrigen).toLowerCase();

  if (e === "local" || p.indexOf("localhost") >= 0 || p.indexOf("127.0.0.1") >= 0) {
    return "local";
  }

  return "produccion";
}

function telefonoPedidoValido_(value) {
  return /^[0-9]{9,15}$/.test(texto_(value));
}

function emailPedidoValido_(value) {
  const email = texto_(value);

  if (!email || email.length > 254) {
    return false;
  }

  const partes = email.split("@");

  if (partes.length !== 2) {
    return false;
  }

  const local = partes[0];
  const dominio = partes[1];

  if (!local || local.length > 64) {
    return false;
  }

  if (
    local.charAt(0) === "." ||
    local.charAt(local.length - 1) === "." ||
    local.indexOf("..") !== -1
  ) {
    return false;
  }

  if (!/^[a-z0-9!#$%&*+/=?^_{}|~.-]+$/i.test(local)) {
    return false;
  }

  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(dominio);
}

function normalizarCantidad_(value) {
  const n = parseInt(value, 10);

  if (!isFinite(n) || n < 1) {
    return 1;
  }

  return Math.min(n, 20);
}

function normalizarTamanoArchivo_(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const n = parseInt(value, 10);

  if (!isFinite(n) || n < 1) {
    return "";
  }

  return n;
}

function normalizarPrecio_(value) {
  const text = texto_(value).replace(",", ".");
  const n = parseFloat(text);

  if (!isFinite(n) || n < 0) {
    return CFG.PRECIO_UNITARIO_MOSTRADO_EUR;
  }

  return n.toFixed(2);
}

function calcularTotalMostrado_(unitario, cantidad) {
  const precio = parseFloat(texto_(unitario).replace(",", "."));
  const unidades = parseInt(cantidad, 10);

  if (!isFinite(precio) || !isFinite(unidades) || unidades < 1) {
    return "";
  }

  return (precio * unidades).toFixed(2);
}

function formatearEuros_(value) {
  const precio = parseFloat(texto_(value).replace(",", "."));

  if (!isFinite(precio)) {
    return "";
  }

  return precio.toFixed(2).replace(".", ",") + " \u20AC";
}

function formatearCantidad_(value) {
  const cantidad = normalizarCantidad_(value);
  return cantidad + (cantidad === 1 ? " unidad" : " unidades");
}

function capitalizar_(value) {
  const text = texto_(value);

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizarPrivacidad_(value) {
  const text = texto_(value).toLowerCase();

  if (
    text === "si" ||
    text === "s\u00ED" ||
    text === "true" ||
    text === "1"
  ) {
    return "s\u00ED";
  }

  return "no";
}

function extensionDesdeContentType_(contentType, filename) {
  const ct = texto_(contentType).toLowerCase();
  const name = texto_(filename).toLowerCase();

  if (ct.indexOf("png") >= 0 || name.endsWith(".png")) {
    return "png";
  }

  if (ct.indexOf("webp") >= 0 || name.endsWith(".webp")) {
    return "webp";
  }

  return "jpg";
}

function booleano_(value) {
  return value === true ||
    value === "true" ||
    value === "s\u00ED" ||
    value === "si" ||
    value === "1";
}

function siNo_(value) {
  return value ? "s\u00ED" : "no";
}

function texto_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
