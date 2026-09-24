/**
 * TAKARA STORE PUBLIC API V1
 *
 * Public read-only boundary for resolving a Store by opaque store_ref or by
 * its public immutable store_slug.
 */

const TAKARA_STORE_PUBLIC_API_VERSION = "TAKARA_STORE_PUBLIC_API_V1";
const TAKARA_STORE_PUBLIC_RESOLVE_ACTION = "store.resolve";

function getStorePublicAction_(event) {
  const parameter = event && event.parameter ? event.parameter : {};
  return String(parameter.action || "").trim();
}

function isStorePublicResolveRequest_(event) {
  return getStorePublicAction_(event) === TAKARA_STORE_PUBLIC_RESOLVE_ACTION;
}

function getStorePublicParameterValues_(event, name) {
  const parameters = event && event.parameters ? event.parameters : {};
  if (Object.prototype.hasOwnProperty.call(parameters, name)) {
    const rawValues = Array.isArray(parameters[name])
      ? parameters[name]
      : [parameters[name]];
    return rawValues.map(function (value) {
      return String(value || "").trim();
    });
  }

  const parameter = event && event.parameter ? event.parameter : {};
  const value = String(parameter[name] || "").trim();
  return value ? [value] : [];
}

function getStorePublicLookup_(event) {
  const storeRefs = getStorePublicParameterValues_(event, "store_ref");
  const storeSlugs = getStorePublicParameterValues_(event, "store_slug");

  if (
    storeRefs.length > 1 ||
    storeSlugs.length > 1 ||
    (storeRefs.length && storeSlugs.length)
  ) {
    throw storeDomainError_(
      "STORE_PUBLIC_LOOKUP_CONFLICT",
      "Store resolve accepts one public lookup only."
    );
  }

  const storeRef = storeRefs.length ? storeRefs[0] : "";
  const storeSlug = storeSlugs.length ? storeSlugs[0] : "";

  if (storeRef) {
    return Object.freeze({
      kind: "REF",
      value: storeRef,
    });
  }
  if (storeSlug) {
    return Object.freeze({
      kind: "SLUG",
      value: storeSlug,
    });
  }
  throw storeDomainError_(
    "STORE_PUBLIC_LOOKUP_REQUIRED",
    "Store public reference or slug is required."
  );
}

function storePublicErrorCode_(error) {
  const code = String(error && error.code ? error.code : "").trim();

  if (
    code === "STORE_PUBLIC_REF_REQUIRED" ||
    code === "STORE_PUBLIC_SLUG_REQUIRED" ||
    code === "STORE_PUBLIC_LOOKUP_REQUIRED" ||
    code === "STORE_PUBLIC_LOOKUP_CONFLICT" ||
    code === "STORE_PUBLIC_CODE_INVALID" ||
    code === "STORE_SLUG_INVALID" ||
    code === "STORE_NOT_FOUND" ||
    code === "STORE_INACTIVE" ||
    code === "STORE_REGISTRY_NOT_CONFIGURED" ||
    code === "STORE_REGISTRY_SCHEMA_INVALID" ||
    code === "STORE_REGISTRY_BUSY"
  ) {
    return code;
  }

  return "STORE_RESOLUTION_FAILED";
}

function resolveStorePublicApi_(event) {
  try {
    if (!isStorePublicResolveRequest_(event)) {
      throw storeDomainError_(
        "STORE_PUBLIC_ACTION_INVALID",
        "Unsupported Store public action."
      );
    }

    const lookup = getStorePublicLookup_(event);
    const context = lookup.kind === "SLUG"
      ? resolveStoreContextBySlugRuntime_(lookup.value)
      : resolveStoreContextRuntime_(lookup.value);

    return {
      ok: true,
      api_version: TAKARA_STORE_PUBLIC_API_VERSION,
      store_context: context,
    };
  } catch (error) {
    const code =
      error && error.code === "STORE_PUBLIC_ACTION_INVALID"
        ? "STORE_PUBLIC_ACTION_INVALID"
        : storePublicErrorCode_(error);

    return {
      ok: false,
      api_version: TAKARA_STORE_PUBLIC_API_VERSION,
      error: {
        code: code,
      },
    };
  }
}
