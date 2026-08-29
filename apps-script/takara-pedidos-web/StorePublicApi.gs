/**
 * TAKARA STORE PUBLIC API V1
 *
 * Public read-only boundary for resolving a Store by opaque store_ref.
 * Returns transport-neutral objects. HTTP routing/serialization belongs to
 * the existing Apps Script entrypoint and is intentionally not owned here.
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

function getStorePublicRef_(event) {
  const parameter = event && event.parameter ? event.parameter : {};
  const storeRef = String(parameter.store_ref || "").trim();

  if (!storeRef) {
    throw storeDomainError_(
      "STORE_PUBLIC_REF_REQUIRED",
      "Store public reference is required."
    );
  }

  return storeRef;
}

function storePublicErrorCode_(error) {
  const code = String(error && error.code ? error.code : "").trim();

  if (
    code === "STORE_PUBLIC_REF_REQUIRED" ||
    code === "STORE_PUBLIC_CODE_INVALID" ||
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

    const context = resolveStoreContextRuntime_(getStorePublicRef_(event));

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