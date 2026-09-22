/**
 * TAKARA STORE DOMAIN V1
 *
 * Pure domain rules for partner stores.
 * Infrastructure APIs and transport concerns do not belong here.
 */

const TAKARA_STORE_SYSTEM_CONTRACT_VERSION = "TAKARA_STORE_SYSTEM_CONTRACT_V1";
const TAKARA_STORE_REGISTRY_VERSION = "TAKARA_STORE_REGISTRY_V1";
const TAKARA_STORE_CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1";
const TAKARA_STORE_ORDER_IDENTITY_VERSION = "TAKARA_STORE_ORDER_IDENTITY_V1";

const TAKARA_STORE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

const TAKARA_STORE_ID_PATTERN = /^STO_\d{6}$/;
const TAKARA_STORE_PUBLIC_CODE_PATTERN = /^st_[A-Za-z0-9_-]{24,64}$/;

const TAKARA_STORE_BRANDING_PUBLIC_VERSION =
  "TAKARA_STORE_BRANDING_PUBLIC_V1";
const TAKARA_STORE_BRANDING_ADMIN_VERSION =
  "TAKARA_STORE_BRANDING_ADMIN_V1";
const TAKARA_STORE_BRANDING_MODE = Object.freeze({
  NAME: "NAME",
  LOGO: "LOGO",
  NAME_AND_LOGO: "NAME_AND_LOGO",
});
const TAKARA_STORE_LOGO_ALLOWED_MIME_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const TAKARA_STORE_LOGO_MAX_BYTES = 512 * 1024;
const TAKARA_STORE_LOGO_MAX_BASE64_CHARS = 699052;

function normalizeStoreBrandingMode_(value) {
  const normalized = String(value || "").trim();
  if (
    normalized !== TAKARA_STORE_BRANDING_MODE.NAME &&
    normalized !== TAKARA_STORE_BRANDING_MODE.LOGO &&
    normalized !== TAKARA_STORE_BRANDING_MODE.NAME_AND_LOGO
  ) {
    throw storeDomainError_(
      "STORE_BRANDING_MODE_INVALID",
      "Store branding mode is invalid."
    );
  }
  return normalized;
}

function storeBrandingModeUsesLogo_(mode) {
  const normalized = normalizeStoreBrandingMode_(mode);
  return (
    normalized === TAKARA_STORE_BRANDING_MODE.LOGO ||
    normalized === TAKARA_STORE_BRANDING_MODE.NAME_AND_LOGO
  );
}

function defaultStoreBrandingRecord_(storePublicCode) {
  return {
    store_public_code: assertStorePublicCode_(storePublicCode),
    mode: TAKARA_STORE_BRANDING_MODE.NAME,
    logo_file_id: "",
    logo_mime_type: "",
    logo_file_name: "",
    updated_at: "",
    version: 0,
  };
}

function normalizeStoreBrandingRecord_(record, expectedStorePublicCode) {
  const expected = assertStorePublicCode_(expectedStorePublicCode);
  if (!record) return defaultStoreBrandingRecord_(expected);

  const publicCode = assertStorePublicCode_(record.store_public_code);
  if (publicCode !== expected) {
    throw storeDomainError_(
      "STORE_BRANDING_REFERENCE_MISMATCH",
      "Store branding reference does not match Store."
    );
  }

  const mode = normalizeStoreBrandingMode_(record.mode);
  const logoFileId = normalizeStoreOptionalText_(record.logo_file_id, 256);
  const logoMimeType = normalizeStoreOptionalText_(record.logo_mime_type, 80);
  const logoFileName = normalizeStoreOptionalText_(record.logo_file_name, 180);
  if (logoFileId) {
    if (TAKARA_STORE_LOGO_ALLOWED_MIME_TYPES.indexOf(logoMimeType) < 0) {
      throw storeDomainError_(
        "STORE_BRANDING_LOGO_MIME_INVALID",
        "Persisted Store logo MIME type is invalid."
      );
    }
  } else if (logoMimeType || logoFileName) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_STATE_INVALID",
      "Persisted Store logo metadata is inconsistent."
    );
  }

  const version = Number(record.version || 0);
  if (!Number.isInteger(version) || version < 0) {
    throw storeDomainError_(
      "STORE_BRANDING_VERSION_INVALID",
      "Store branding version is invalid."
    );
  }

  return {
    store_public_code: publicCode,
    mode: mode,
    logo_file_id: logoFileId,
    logo_mime_type: logoMimeType,
    logo_file_name: logoFileName,
    updated_at: String(record.updated_at || ""),
    version: version,
  };
}

function storeLogoByte_(bytes, index) {
  return (Number(bytes[index]) + 256) % 256;
}

function storeLogoBytesMatchMime_(bytes, mimeType) {
  const mime = String(mimeType || "").trim().toLowerCase();
  if (!bytes || typeof bytes.length !== "number") return false;

  if (mime === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < signature.length) return false;
    return signature.every(function (expected, index) {
      return storeLogoByte_(bytes, index) === expected;
    });
  }

  if (mime === "image/jpeg") {
    return bytes.length >= 5 &&
      storeLogoByte_(bytes, 0) === 255 &&
      storeLogoByte_(bytes, 1) === 216 &&
      storeLogoByte_(bytes, 2) === 255 &&
      storeLogoByte_(bytes, bytes.length - 2) === 255 &&
      storeLogoByte_(bytes, bytes.length - 1) === 217;
  }

  if (mime === "image/webp") {
    return bytes.length >= 12 &&
      storeLogoByte_(bytes, 0) === 82 &&
      storeLogoByte_(bytes, 1) === 73 &&
      storeLogoByte_(bytes, 2) === 70 &&
      storeLogoByte_(bytes, 3) === 70 &&
      storeLogoByte_(bytes, 8) === 87 &&
      storeLogoByte_(bytes, 9) === 69 &&
      storeLogoByte_(bytes, 10) === 66 &&
      storeLogoByte_(bytes, 11) === 80;
  }

  return false;
}

function assertStoreLogoBytes_(bytes, mimeType) {
  if (!storeLogoBytesMatchMime_(bytes, mimeType)) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_SIGNATURE_INVALID",
      "Store logo binary signature does not match its MIME type."
    );
  }
  return bytes;
}

function normalizeStoreLogoUpload_(input) {
  if (input === null || input === undefined || input === "") return null;
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_INPUT_INVALID",
      "Store logo input must be an object."
    );
  }

  const allowedKeys = ["mime_type", "file_name", "base64"];
  const unexpected = Object.keys(input).filter(function (key) {
    return allowedKeys.indexOf(key) < 0;
  });
  if (unexpected.length) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_INPUT_INVALID",
      "Store logo input contains unsupported fields."
    );
  }

  const mimeType = String(input.mime_type || "").trim().toLowerCase();
  if (TAKARA_STORE_LOGO_ALLOWED_MIME_TYPES.indexOf(mimeType) < 0) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_MIME_INVALID",
      "Store logo must be PNG, JPEG or WEBP."
    );
  }
  const fileName = normalizeStoreOptionalText_(
    input.file_name || "store-logo",
    180
  );
  const base64Value = String(input.base64 || "").trim();
  if (
    !base64Value ||
    base64Value.length > TAKARA_STORE_LOGO_MAX_BASE64_CHARS ||
    base64Value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Value)
  ) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_DATA_INVALID",
      "Store logo base64 data is invalid."
    );
  }
  const padding = base64Value.slice(-2) === "=="
    ? 2
    : (base64Value.slice(-1) === "=" ? 1 : 0);
  const estimatedBytes = Math.floor(base64Value.length * 3 / 4) - padding;
  if (estimatedBytes < 1 || estimatedBytes > TAKARA_STORE_LOGO_MAX_BYTES) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_TOO_LARGE",
      "Store logo exceeds maximum size."
    );
  }
  return Object.freeze({
    mime_type: mimeType,
    file_name: fileName,
    base64: base64Value,
    estimated_bytes: estimatedBytes,
  });
}

function normalizeStoreBrandingUpdateInput_(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") {
    throw storeDomainError_(
      "STORE_BRANDING_INPUT_INVALID",
      "Store branding input must be an object."
    );
  }
  const allowedKeys = ["mode", "logo", "remove_logo"];
  const unexpected = Object.keys(input).filter(function (key) {
    return allowedKeys.indexOf(key) < 0;
  });
  if (unexpected.length) {
    throw storeDomainError_(
      "STORE_BRANDING_INPUT_FORBIDDEN_FIELD",
      "Store branding input contains unsupported fields."
    );
  }

  const mode = normalizeStoreBrandingMode_(input.mode);
  const logo = normalizeStoreLogoUpload_(input.logo);
  const removeLogo = input.remove_logo === true;
  if (logo && removeLogo) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_ACTION_CONFLICT",
      "Store logo cannot be uploaded and removed together."
    );
  }
  if (removeLogo && storeBrandingModeUsesLogo_(mode)) {
    throw storeDomainError_(
      "STORE_BRANDING_LOGO_REQUIRED",
      "Logo mode requires a Store logo."
    );
  }
  return Object.freeze({ mode: mode, logo: logo, remove_logo: removeLogo });
}

function buildDefaultStoreBrandingPublic_() {
  return Object.freeze({
    version: TAKARA_STORE_BRANDING_PUBLIC_VERSION,
    mode: TAKARA_STORE_BRANDING_MODE.NAME,
  });
}

function toStoreBrandingPublic_(record, logoDataUrl) {
  const normalized = normalizeStoreBrandingRecord_(
    record,
    record.store_public_code
  );
  const dataUrl = String(logoDataUrl || "");
  if (
    storeBrandingModeUsesLogo_(normalized.mode) &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) &&
    dataUrl.length <= TAKARA_STORE_LOGO_MAX_BASE64_CHARS + 40
  ) {
    return Object.freeze({
      version: TAKARA_STORE_BRANDING_PUBLIC_VERSION,
      mode: normalized.mode,
      logo_data_url: dataUrl,
    });
  }
  return buildDefaultStoreBrandingPublic_();
}

function toStoreBrandingAdmin_(record, logoDataUrl) {
  const normalized = normalizeStoreBrandingRecord_(
    record,
    record.store_public_code
  );
  const dataUrl = String(logoDataUrl || "");
  const hasLogo = Boolean(normalized.logo_file_id && dataUrl);
  const effectiveMode =
    storeBrandingModeUsesLogo_(normalized.mode) && !hasLogo
      ? TAKARA_STORE_BRANDING_MODE.NAME
      : normalized.mode;
  const result = {
    version: TAKARA_STORE_BRANDING_ADMIN_VERSION,
    mode: effectiveMode,
    has_logo: hasLogo,
    updated_at: normalized.updated_at,
    record_version: normalized.version,
  };
  if (result.has_logo) result.logo_data_url = dataUrl;
  return Object.freeze(result);
}

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

function toStoreOrderIdentity_(store) {
  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  if (store.status !== TAKARA_STORE_STATUS.ACTIVE) {
    throw storeDomainError_("STORE_INACTIVE", "Store is inactive.");
  }

  return Object.freeze({
    version: TAKARA_STORE_ORDER_IDENTITY_VERSION,
    store_ref: assertStorePublicCode_(store.store_public_code),
    store_id: assertStoreId_(store.store_id),
    display_name: normalizeStoreDisplayName_(store.display_name),
    status: TAKARA_STORE_STATUS.ACTIVE,
  });
}
