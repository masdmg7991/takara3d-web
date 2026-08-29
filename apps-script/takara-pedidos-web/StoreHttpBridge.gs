/**
 * TAKARA STORE HTTP BRIDGE V1
 *
 * Transport adapter for the public read-only Store resolver.
 *
 * - No Store persistence or business rules live here.
 * - JSON remains available for non-browser clients.
 * - JSONP is allowed only for the read-only public Store response and only
 *   with a strict Takara-owned callback name.
 */

const TAKARA_STORE_HTTP_BRIDGE_VERSION = "TAKARA_STORE_HTTP_BRIDGE_V1";
const TAKARA_STORE_JSONP_CALLBACK_PATTERN =
  /^takaraStoreCb_[A-Za-z0-9_]{8,64}$/;

function isStoreHttpRequest_(event) {
  const action = getStorePublicAction_(event);
  return action.indexOf("store.") === 0;
}

function getStoreJsonpCallback_(event) {
  const parameter = event && event.parameter ? event.parameter : {};
  return String(parameter.prefix || "").trim();
}

function buildStoreJsonpOutput_(callbackName, payload) {
  if (!TAKARA_STORE_JSONP_CALLBACK_PATTERN.test(callbackName)) {
    throw storeDomainError_(
      "STORE_PUBLIC_CALLBACK_INVALID",
      "Invalid Store public callback."
    );
  }

  return ContentService.createTextOutput(
    callbackName + "(" + JSON.stringify(payload) + ");"
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function buildStoreJsonOutput_(payload) {
  return ContentService.createTextOutput(
    JSON.stringify(payload)
  ).setMimeType(ContentService.MimeType.JSON);
}

function routeStorePublicGet_(event) {
  if (!isStoreHttpRequest_(event)) {
    return null;
  }

  const payload = resolveStorePublicApi_(event);
  const callbackName = getStoreJsonpCallback_(event);

  if (callbackName) {
    try {
      return buildStoreJsonpOutput_(callbackName, payload);
    } catch (error) {
      return buildStoreJsonOutput_({
        ok: false,
        api_version: TAKARA_STORE_PUBLIC_API_VERSION,
        error: {
          code: "STORE_PUBLIC_CALLBACK_INVALID",
        },
      });
    }
  }

  return buildStoreJsonOutput_(payload);
}