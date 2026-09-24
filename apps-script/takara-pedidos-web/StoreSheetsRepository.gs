/**
 * TAKARA STORE SHEETS REPOSITORY V1
 *
 * Google Apps Script infrastructure adapter for TAKARA_STORE_REGISTRY_V1.
 * This file is the only Store Registry module allowed to depend on
 * SpreadsheetApp, PropertiesService and LockService.
 */

const TAKARA_STORE_REGISTRY_SPREADSHEET_PROPERTY =
  "TAKARA_STORE_REGISTRY_SPREADSHEET_ID";
const TAKARA_STORE_REGISTRY_SHEET_NAME = "stores";
const TAKARA_STORE_WRITE_LOCK_TIMEOUT_MS = 10000;

const TAKARA_STORE_REGISTRY_LEGACY_HEADERS = Object.freeze([
  "store_id",
  "store_public_code",
  "status",
  "created_at",
  "updated_at",
  "deactivated_at",
  "version",
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

const TAKARA_STORE_REGISTRY_HEADERS = Object.freeze(
  TAKARA_STORE_REGISTRY_LEGACY_HEADERS.concat(["store_slug"])
);

function getStoreRegistrySpreadsheetId_() {
  const value = PropertiesService.getScriptProperties().getProperty(
    TAKARA_STORE_REGISTRY_SPREADSHEET_PROPERTY
  );

  if (!value || !String(value).trim()) {
    throw storeDomainError_(
      "STORE_REGISTRY_NOT_CONFIGURED",
      "Store Registry spreadsheet is not configured."
    );
  }

  return String(value).trim();
}

function storeRegistrySchemaHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  let expected = null;
  if (lastColumn === TAKARA_STORE_REGISTRY_LEGACY_HEADERS.length) {
    expected = TAKARA_STORE_REGISTRY_LEGACY_HEADERS;
  } else if (lastColumn === TAKARA_STORE_REGISTRY_HEADERS.length) {
    expected = TAKARA_STORE_REGISTRY_HEADERS;
  } else {
    throw storeDomainError_(
      "STORE_REGISTRY_SCHEMA_INVALID",
      "Store Registry column count is invalid."
    );
  }

  const headers = sheet
    .getRange(1, 1, 1, expected.length)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  expected.forEach(function (name, index) {
    if (headers[index] !== name) {
      throw storeDomainError_(
        "STORE_REGISTRY_SCHEMA_INVALID",
        "Store Registry header mismatch at column " + (index + 1) + "."
      );
    }
  });
  return expected;
}

function assertStoreRegistrySchema_(sheet) {
  storeRegistrySchemaHeaders_(sheet);
}

function openStoreRegistrySheet_() {
  const spreadsheet = SpreadsheetApp.openById(getStoreRegistrySpreadsheetId_());
  const sheet = spreadsheet.getSheetByName(TAKARA_STORE_REGISTRY_SHEET_NAME);

  if (!sheet) {
    throw storeDomainError_(
      "STORE_REGISTRY_SCHEMA_MISSING",
      "Store Registry sheet does not exist."
    );
  }

  assertStoreRegistrySchema_(sheet);
  return sheet;
}

function storeRecordToRow_(record, headers) {
  const columns = headers || TAKARA_STORE_REGISTRY_HEADERS;
  return columns.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header)
      ? record[header]
      : "";
  });
}

function storeRowToRecord_(row, headers) {
  const columns = headers || TAKARA_STORE_REGISTRY_HEADERS;
  const record = {};
  columns.forEach(function (header, index) {
    record[header] = row[index];
  });
  record.version = Number(record.version || 0);
  if (!Object.prototype.hasOwnProperty.call(record, "store_slug")) {
    record.store_slug = "";
  }
  return record;
}

function readStoreRegistryRecords_(sheet) {
  const headers = storeRegistrySchemaHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return hydrateStoreSlugs_(
    sheet
      .getRange(2, 1, lastRow - 1, headers.length)
      .getValues()
      .map(function (row) {
        return storeRowToRecord_(row, headers);
      })
  );
}

function findStoreRowByField_(sheet, field, value) {
  if (TAKARA_STORE_REGISTRY_HEADERS.indexOf(field) < 0) {
    throw storeDomainError_(
      "STORE_REPOSITORY_FIELD_INVALID",
      "Unsupported Store field."
    );
  }

  const records = readStoreRegistryRecords_(sheet);
  for (let index = 0; index < records.length; index += 1) {
    if (String(records[index][field]) === String(value)) {
      return {
        rowNumber: index + 2,
        record: records[index],
      };
    }
  }
  return null;
}

function ensureStoreSlugSchemaForWrite_(sheet) {
  const headers = storeRegistrySchemaHeaders_(sheet);
  const records = readStoreRegistryRecords_(sheet);
  const slugColumn = TAKARA_STORE_REGISTRY_HEADERS.indexOf("store_slug") + 1;
  let migrated = false;

  if (headers.length === TAKARA_STORE_REGISTRY_LEGACY_HEADERS.length) {
    sheet
      .getRange(1, 1, 1, TAKARA_STORE_REGISTRY_HEADERS.length)
      .setValues([TAKARA_STORE_REGISTRY_HEADERS.slice()]);
    migrated = true;
  }

  if (records.length) {
    const existing = sheet
      .getRange(2, slugColumn, records.length, 1)
      .getValues()
      .map(function (row) {
        return String(row[0] || "").trim();
      });
    const needsWrite = migrated || existing.some(function (value) {
      return !value;
    });

    if (needsWrite) {
      sheet
        .getRange(2, slugColumn, records.length, 1)
        .setValues(records.map(function (record) {
          return [assertStoreSlug_(record.store_slug)];
        }));
      migrated = true;
    }
  }

  assertStoreRegistrySchema_(sheet);
  return Object.freeze({
    version: TAKARA_STORE_SLUG_VERSION,
    migrated: migrated,
    store_count: records.length,
  });
}

function createStoreSheetsRepository_() {
  return {
    withWriteLock: function (work) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(TAKARA_STORE_WRITE_LOCK_TIMEOUT_MS)) {
        throw storeDomainError_("STORE_REGISTRY_BUSY", "Store Registry is busy.");
      }

      try {
        return work();
      } finally {
        lock.releaseLock();
      }
    },

    nextStoreSequence: function () {
      const records = readStoreRegistryRecords_(openStoreRegistrySheet_());
      let maxSequence = 0;
      records.forEach(function (record) {
        const match = /^STO_(\d{6})$/.exec(String(record.store_id || ""));
        if (match) {
          maxSequence = Math.max(maxSequence, Number(match[1]));
        }
      });

      if (maxSequence >= 999999) {
        throw storeDomainError_(
          "STORE_SEQUENCE_EXHAUSTED",
          "Store sequence is exhausted."
        );
      }

      return maxSequence + 1;
    },

    listAll: function () {
      return readStoreRegistryRecords_(openStoreRegistrySheet_());
    },

    findById: function (storeId) {
      const result = findStoreRowByField_(
        openStoreRegistrySheet_(),
        "store_id",
        assertStoreId_(storeId)
      );
      return result ? result.record : null;
    },

    findByPublicCode: function (storePublicCode) {
      const result = findStoreRowByField_(
        openStoreRegistrySheet_(),
        "store_public_code",
        assertStorePublicCode_(storePublicCode)
      );
      return result ? result.record : null;
    },

    findBySlug: function (storeSlug) {
      const result = findStoreRowByField_(
        openStoreRegistrySheet_(),
        "store_slug",
        assertStoreSlug_(storeSlug)
      );
      return result ? result.record : null;
    },

    insert: function (record) {
      const sheet = openStoreRegistrySheet_();
      ensureStoreSlugSchemaForWrite_(sheet);

      if (findStoreRowByField_(sheet, "store_id", record.store_id)) {
        throw storeDomainError_("STORE_ID_COLLISION", "store_id already exists.");
      }
      if (findStoreRowByField_(sheet, "store_public_code", record.store_public_code)) {
        throw storeDomainError_(
          "STORE_PUBLIC_CODE_COLLISION",
          "store_public_code already exists."
        );
      }
      if (findStoreRowByField_(sheet, "store_slug", record.store_slug)) {
        throw storeDomainError_(
          "STORE_SLUG_COLLISION",
          "store_slug already exists."
        );
      }

      sheet.appendRow(
        storeRecordToRow_(record, TAKARA_STORE_REGISTRY_HEADERS)
      );
    },

    update: function (record) {
      const sheet = openStoreRegistrySheet_();
      ensureStoreSlugSchemaForWrite_(sheet);
      const existing = findStoreRowByField_(
        sheet,
        "store_id",
        record.store_id
      );

      if (!existing) {
        throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
      }
      if (record.store_public_code !== existing.record.store_public_code) {
        throw storeDomainError_(
          "STORE_PUBLIC_CODE_IMMUTABLE",
          "store_public_code cannot change."
        );
      }
      if (record.store_slug !== existing.record.store_slug) {
        throw storeDomainError_(
          "STORE_SLUG_IMMUTABLE",
          "store_slug cannot change."
        );
      }

      sheet
        .getRange(
          existing.rowNumber,
          1,
          1,
          TAKARA_STORE_REGISTRY_HEADERS.length
        )
        .setValues([
          storeRecordToRow_(record, TAKARA_STORE_REGISTRY_HEADERS),
        ]);
    },
  };
}

function createStorePublicCode_() {
  const token = Utilities.getUuid().replace(/-/g, "");
  return assertStorePublicCode_("st_" + token);
}

const TAKARA_STORE_BRANDING_SHEET_NAME = "store_branding";
const TAKARA_STORE_BRANDING_FOLDER_NAME = "Store Logos";
const TAKARA_STORE_BRANDING_HEADERS = Object.freeze([
  "store_public_code",
  "mode",
  "logo_file_id",
  "logo_mime_type",
  "logo_file_name",
  "updated_at",
  "version",
]);

function assertStoreBrandingSchema_(sheet) {
  if (sheet.getLastColumn() !== TAKARA_STORE_BRANDING_HEADERS.length) {
    throw storeDomainError_(
      "STORE_BRANDING_SCHEMA_INVALID",
      "Store branding column count is invalid."
    );
  }
  const headers = sheet
    .getRange(1, 1, 1, TAKARA_STORE_BRANDING_HEADERS.length)
    .getValues()[0]
    .map(function (value) { return String(value || "").trim(); });
  TAKARA_STORE_BRANDING_HEADERS.forEach(function (expected, index) {
    if (headers[index] !== expected) {
      throw storeDomainError_(
        "STORE_BRANDING_SCHEMA_INVALID",
        "Store branding header mismatch at column " + (index + 1) + "."
      );
    }
  });
}

function getStoreBrandingSheet_(createIfMissing) {
  const spreadsheet = SpreadsheetApp.openById(getStoreRegistrySpreadsheetId_());
  let sheet = spreadsheet.getSheetByName(TAKARA_STORE_BRANDING_SHEET_NAME);
  if (!sheet && !createIfMissing) return null;
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TAKARA_STORE_BRANDING_SHEET_NAME);
    sheet
      .getRange(1, 1, 1, TAKARA_STORE_BRANDING_HEADERS.length)
      .setValues([TAKARA_STORE_BRANDING_HEADERS.slice()]);
    sheet.setFrozenRows(1);
  }
  assertStoreBrandingSchema_(sheet);
  return sheet;
}

function storeBrandingRowToRecord_(row) {
  const record = {};
  TAKARA_STORE_BRANDING_HEADERS.forEach(function (header, index) {
    record[header] = row[index];
  });
  record.version = Number(record.version || 0);
  return record;
}

function storeBrandingRecordToRow_(record) {
  return TAKARA_STORE_BRANDING_HEADERS.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header)
      ? record[header]
      : "";
  });
}

function findStoreBrandingRow_(sheet, storePublicCode) {
  if (!sheet) return null;
  const publicCode = assertStorePublicCode_(storePublicCode);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const values = sheet
    .getRange(2, 1, lastRow - 1, TAKARA_STORE_BRANDING_HEADERS.length)
    .getValues();
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][0]) === publicCode) {
      return {
        rowNumber: index + 2,
        record: storeBrandingRowToRecord_(values[index]),
      };
    }
  }
  return null;
}

function getOrCreateStoreBrandingFolder_() {
  const root = getOrCreateRootFolder_();
  const folders = root.getFoldersByName(TAKARA_STORE_BRANDING_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return root.createFolder(TAKARA_STORE_BRANDING_FOLDER_NAME);
}

function createStoreBrandingRepository_() {
  return {
    withWriteLock: function (work) {
      return withStoreRegistrySetupLock_(work);
    },

    findByPublicCode: function (storePublicCode) {
      const sheet = getStoreBrandingSheet_(false);
      const found = findStoreBrandingRow_(sheet, storePublicCode);
      return found ? found.record : null;
    },

    upsert: function (record) {
      const normalized = normalizeStoreBrandingRecord_(
        record,
        record.store_public_code
      );
      const sheet = getStoreBrandingSheet_(true);
      const existing = findStoreBrandingRow_(
        sheet,
        normalized.store_public_code
      );
      const row = storeBrandingRecordToRow_(normalized);
      if (existing) {
        sheet
          .getRange(
            existing.rowNumber,
            1,
            1,
            TAKARA_STORE_BRANDING_HEADERS.length
          )
          .setValues([row]);
      } else {
        sheet.appendRow(row);
      }
    },

    storeLogo: function (storePublicCode, upload) {
      const publicCode = assertStorePublicCode_(storePublicCode);
      const normalizedUpload = normalizeStoreLogoUpload_(upload);
      if (!normalizedUpload) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_INPUT_INVALID",
          "Store logo upload is required."
        );
      }
      let bytes;
      try {
        bytes = Utilities.base64Decode(normalizedUpload.base64);
      } catch (error) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_DATA_INVALID",
          "Store logo base64 could not be decoded."
        );
      }
      if (!bytes || bytes.length < 1 || bytes.length > TAKARA_STORE_LOGO_MAX_BYTES) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_TOO_LARGE",
          "Store logo exceeds maximum size."
        );
      }
      assertStoreLogoBytes_(bytes, normalizedUpload.mime_type);
      const safeName = normalizedUpload.file_name.replace(/[^A-Za-z0-9._-]+/g, "-");
      const fileName =
        "store-logo-" + publicCode + "-" + new Date().getTime() + "-" + safeName;
      const blob = Utilities.newBlob(bytes, normalizedUpload.mime_type, fileName);
      const file = getOrCreateStoreBrandingFolder_().createFile(blob);
      const fileId = String(file.getId() || "").trim();
      if (!fileId) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_STORE_FAILED",
          "Stored Store logo has no file id."
        );
      }
      return Object.freeze({
        file_id: fileId,
        mime_type: normalizedUpload.mime_type,
        file_name: safeName,
      });
    },

    readLogoDataUrl: function (record) {
      const normalized = normalizeStoreBrandingRecord_(
        record,
        record.store_public_code
      );
      if (!normalized.logo_file_id) return "";
      const file = DriveApp.getFileById(normalized.logo_file_id);
      const blob = file.getBlob();
      const mimeType = String(blob.getContentType() || "").toLowerCase();
      if (
        mimeType !== normalized.logo_mime_type ||
        TAKARA_STORE_LOGO_ALLOWED_MIME_TYPES.indexOf(mimeType) < 0
      ) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_MIME_INVALID",
          "Stored Store logo MIME type does not match."
        );
      }
      const bytes = blob.getBytes();
      if (!bytes || bytes.length < 1 || bytes.length > TAKARA_STORE_LOGO_MAX_BYTES) {
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_TOO_LARGE",
          "Stored Store logo exceeds maximum size."
        );
      }
      assertStoreLogoBytes_(bytes, mimeType);
      return "data:" + mimeType + ";base64," + Utilities.base64Encode(bytes);
    },

    trashLogo: function (fileId) {
      const normalized = normalizeStoreOptionalText_(fileId, 256);
      if (!normalized) return;
      DriveApp.getFileById(normalized).setTrashed(true);
    },
  };
}

function createStoreRuntimeDependencies_() {
  return {
    nowIso: function () {
      return new Date().toISOString();
    },
    createPublicCode: createStorePublicCode_,
  };
}