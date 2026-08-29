/**
 * TAKARA STORE DOMAIN V1
 *
 * Pure domain rules for partner stores.
 * Infrastructure APIs and transport concerns do not belong here.
 */

const TAKARA_STORE_SYSTEM_CONTRACT_VERSION = "TAKARA_STORE_SYSTEM_CONTRACT_V1";
const TAKARA_STORE_REGISTRY_VERSION = "TAKARA_STORE_REGISTRY_V1";
const TAKARA_STORE_CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1";

const TAKARA_STORE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

const TAKARA_STORE_ID_PATTERN = /^STO_\d{6}$/;
const TAKARA_STORE_PUBLIC_CODE_PATTERN = /^st_[A-Za-z0-9_-]{24,64}$/;

const TAKARA_STORE_MUTABLE_FIELDS = Object.freeze([
  "display_name",
  "contact_name",
  "email",
  "phone",
  "address_line",
  "postal_code",
  "city",
  "province",
  "notes",
]);

function storeDomainError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeStoreOptionalText_(value, maxLength) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).trim();
  if (normalized.length > maxLength) {
    throw storeDomainError_("STORE_FIELD_TOO_LONG", "Store field exceeds maximum length.");
  }

  return normalized;
}

function normalizeStoreDisplayName_(value) {
  const normalized = normalizeStoreOptionalText_(value, 120);
  if (!normalized) {
    throw storeDomainError_("STORE_DISPLAY_NAME_REQUIRED", "Store display_name is required.");
  }
  return normalized;
}

function assertStoreId_(storeId) {
  const normalized = String(storeId || "").trim();
  if (!TAKARA_STORE_ID_PATTERN.test(normalized)) {
    throw storeDomainError_("STORE_ID_INVALID", "Invalid store_id.");
  }
  return normalized;
}

function buildStoreId_(sequence) {
  const numeric = Number(sequence);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 999999) {
    throw storeDomainError_("STORE_SEQUENCE_INVALID", "Invalid store sequence.");
  }
  return "STO_" + String(numeric).padStart(6, "0");
}

function assertStorePublicCode_(storePublicCode) {
  const normalized = String(storePublicCode || "").trim();
  if (!TAKARA_STORE_PUBLIC_CODE_PATTERN.test(normalized)) {
    throw storeDomainError_("STORE_PUBLIC_CODE_INVALID", "Invalid store_public_code.");
  }
  return normalized;
}

function assertStoreStatus_(status) {
  const normalized = String(status || "").trim();
  if (
    normalized !== TAKARA_STORE_STATUS.ACTIVE &&
    normalized !== TAKARA_STORE_STATUS.INACTIVE
  ) {
    throw storeDomainError_("STORE_STATUS_INVALID", "Invalid Store status.");
  }
  return normalized;
}

function normalizeStoreData_(input) {
  const source = input || {};
  return {
    display_name: normalizeStoreDisplayName_(source.display_name),
    contact_name: normalizeStoreOptionalText_(source.contact_name, 120),
    email: normalizeStoreOptionalText_(source.email, 254),
    phone: normalizeStoreOptionalText_(source.phone, 40),
    address_line: normalizeStoreOptionalText_(source.address_line, 240),
    postal_code: normalizeStoreOptionalText_(source.postal_code, 20),
    city: normalizeStoreOptionalText_(source.city, 120),
    province: normalizeStoreOptionalText_(source.province, 120),
    notes: normalizeStoreOptionalText_(source.notes, 1000),
  };
}

function createStoreRecord_(params) {
  const source = params || {};
  const timestamp = String(source.timestamp || "").trim();

  if (!timestamp) {
    throw storeDomainError_("STORE_TIMESTAMP_REQUIRED", "Store timestamp is required.");
  }

  const data = normalizeStoreData_(source.data);

  return {
    store_id: assertStoreId_(source.store_id),
    store_public_code: assertStorePublicCode_(source.store_public_code),
    status: TAKARA_STORE_STATUS.ACTIVE,
    created_at: timestamp,
    updated_at: timestamp,
    deactivated_at: "",
    version: 1,
    display_name: data.display_name,
    contact_name: data.contact_name,
    email: data.email,
    phone: data.phone,
    address_line: data.address_line,
    postal_code: data.postal_code,
    city: data.city,
    province: data.province,
    notes: data.notes,
  };
}

function updateStoreData_(currentStore, patch, timestamp) {
  if (!currentStore) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  const nextInput = {};
  TAKARA_STORE_MUTABLE_FIELDS.forEach(function (field) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, field)) {
      nextInput[field] = patch[field];
    } else {
      nextInput[field] = currentStore[field];
    }
  });

  const normalized = normalizeStoreData_(nextInput);

  return Object.assign({}, currentStore, normalized, {
    updated_at: String(timestamp || "").trim(),
    version: Number(currentStore.version || 0) + 1,
  });
}

function setStoreStatus_(currentStore, nextStatus, timestamp) {
  if (!currentStore) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  const status = assertStoreStatus_(nextStatus);
  const now = String(timestamp || "").trim();
  if (!now) {
    throw storeDomainError_("STORE_TIMESTAMP_REQUIRED", "Store timestamp is required.");
  }

  if (currentStore.status === status) {
    return Object.assign({}, currentStore);
  }

  return Object.assign({}, currentStore, {
    status: status,
    updated_at: now,
    deactivated_at: status === TAKARA_STORE_STATUS.INACTIVE ? now : "",
    version: Number(currentStore.version || 0) + 1,
  });
}

function toStoreContext_(store) {
  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  if (store.status !== TAKARA_STORE_STATUS.ACTIVE) {
    throw storeDomainError_("STORE_INACTIVE", "Store is inactive.");
  }

  return {
    version: TAKARA_STORE_CONTEXT_VERSION,
    store_ref: assertStorePublicCode_(store.store_public_code),
    display_name: normalizeStoreDisplayName_(store.display_name),
    status: TAKARA_STORE_STATUS.ACTIVE,
  };
}