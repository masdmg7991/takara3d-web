/**
 * TAKARA ORDER ATTRIBUTION V1
 *
 * Order-owned authority that consumes only a backend-validated Store identity.
 * It never reads Store persistence directly.
 */
const TAKARA_STORE_ATTRIBUTION_VERSION = "TAKARA_STORE_ATTRIBUTION_V1";

const TAKARA_ORDER_SOURCE_TYPE = Object.freeze({
  DIRECT: "DIRECT",
  STORE: "STORE",
});

function orderAttributionError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertNoBrowserDerivedAttribution_(payload) {
  const source = payload || {};
  const meta = source.meta || {};

  [
    "source_type",
    "store_id",
    "store_name_snapshot",
    "store_attribution",
  ].forEach(function (field) {
    if (Object.prototype.hasOwnProperty.call(meta, field)) {
      throw orderAttributionError_(
        "ORDER_ATTRIBUTION_INPUT_FORBIDDEN",
        "Derived attribution fields are backend-owned."
      );
    }
  });
}

function resolveOrderInternalEmailDestination_(attribution, defaultDestination) {
  const destination = String(defaultDestination || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)) {
    throw orderAttributionError_(
      "ORDER_INTERNAL_EMAIL_DESTINATION_INVALID",
      "Internal order email destination is invalid."
    );
  }

  if (
    !attribution ||
    attribution.version !== TAKARA_STORE_ATTRIBUTION_VERSION
  ) {
    throw orderAttributionError_(
      "ORDER_ATTRIBUTION_INVALID",
      "Order attribution is not authoritative."
    );
  }

  if (attribution.source_type === TAKARA_ORDER_SOURCE_TYPE.DIRECT) {
    return destination;
  }

  if (attribution.source_type !== TAKARA_ORDER_SOURCE_TYPE.STORE) {
    throw orderAttributionError_(
      "ORDER_ATTRIBUTION_SOURCE_INVALID",
      "Order attribution source is invalid."
    );
  }

  const gmail = /^([^@+]+)(?:\+[^@]*)?@gmail\.com$/i.exec(destination);
  return gmail ? gmail[1] + "+store@gmail.com" : destination;
}

function buildAuthoritativeOrderAttribution_(payload) {
  assertNoBrowserDerivedAttribution_(payload);

  const identity = resolveOrderStoreIdentity_(payload);

  if (identity === null) {
    return Object.freeze({
      version: TAKARA_STORE_ATTRIBUTION_VERSION,
      source_type: TAKARA_ORDER_SOURCE_TYPE.DIRECT,
    });
  }

  if (
    !identity ||
    identity.version !== TAKARA_STORE_ORDER_IDENTITY_VERSION ||
    identity.status !== TAKARA_STORE_STATUS.ACTIVE
  ) {
    throw orderAttributionError_(
      "ORDER_STORE_IDENTITY_INVALID",
      "Store identity is not authoritative."
    );
  }

  const attribution = {
    version: TAKARA_STORE_ATTRIBUTION_VERSION,
    source_type: TAKARA_ORDER_SOURCE_TYPE.STORE,
    store_id: assertStoreId_(identity.store_id),
    store_name_snapshot: normalizeStoreDisplayName_(
      identity.display_name
    ),
  };

  if (identity.pickup) {
    attribution.pickup = identity.pickup;
  }

  return Object.freeze(attribution);
}
