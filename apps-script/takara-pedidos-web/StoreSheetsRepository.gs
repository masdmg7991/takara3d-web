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

const TAKARA_STORE_REGISTRY_HEADERS = Object.freeze([
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

function assertStoreRegistrySchema_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn !== TAKARA_STORE_REGISTRY_HEADERS.length) {
    throw storeDomainError_(
      "STORE_REGISTRY_SCHEMA_INVALID",
      "Store Registry column count is invalid."
    );
  }

  const headers = sheet
    .getRange(1, 1, 1, TAKARA_STORE_REGISTRY_HEADERS.length)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  TAKARA_STORE_REGISTRY_HEADERS.forEach(function (expected, index) {
    if (headers[index] !== expected) {
      throw storeDomainError_(
        "STORE_REGISTRY_SCHEMA_INVALID",
        "Store Registry header mismatch at column " + (index + 1) + "."
      );
    }
  });
}

function storeRecordToRow_(record) {
  return TAKARA_STORE_REGISTRY_HEADERS.map(function (header) {
    return Object.prototype.hasOwnProperty.call(record, header)
      ? record[header]
      : "";
  });
}

function storeRowToRecord_(row) {
  const record = {};
  TAKARA_STORE_REGISTRY_HEADERS.forEach(function (header, index) {
    record[header] = row[index];
  });
  record.version = Number(record.version || 0);
  return record;
}

function findStoreRowByField_(sheet, field, value) {
  const columnIndex = TAKARA_STORE_REGISTRY_HEADERS.indexOf(field);
  if (columnIndex < 0) {
    throw storeDomainError_("STORE_REPOSITORY_FIELD_INVALID", "Unsupported Store field.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const values = sheet
    .getRange(2, 1, lastRow - 1, TAKARA_STORE_REGISTRY_HEADERS.length)
    .getValues();

  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][columnIndex]) === String(value)) {
      return {
        rowNumber: index + 2,
        record: storeRowToRecord_(values[index]),
      };
    }
  }

  return null;
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
      const sheet = openStoreRegistrySheet_();
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return 1;
      }

      const storeIdColumn =
        TAKARA_STORE_REGISTRY_HEADERS.indexOf("store_id") + 1;
      const storeIds = sheet
        .getRange(2, storeIdColumn, lastRow - 1, 1)
        .getValues()
        .map(function (row) {
          return String(row[0] || "").trim();
        });

      let maxSequence = 0;
      storeIds.forEach(function (storeId) {
        const match = /^STO_(\d{6})$/.exec(storeId);
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
      const sheet = openStoreRegistrySheet_();
      const lastRow = sheet.getLastRow();

      if (lastRow < 2) {
        return [];
      }

      return sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          TAKARA_STORE_REGISTRY_HEADERS.length
        )
        .getValues()
        .map(storeRowToRecord_);
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

    insert: function (record) {
      const sheet = openStoreRegistrySheet_();

      if (findStoreRowByField_(sheet, "store_id", record.store_id)) {
        throw storeDomainError_("STORE_ID_COLLISION", "store_id already exists.");
      }
      if (
        findStoreRowByField_(
          sheet,
          "store_public_code",
          record.store_public_code
        )
      ) {
        throw storeDomainError_(
          "STORE_PUBLIC_CODE_COLLISION",
          "store_public_code already exists."
        );
      }

      sheet.appendRow(storeRecordToRow_(record));
    },

    update: function (record) {
      const sheet = openStoreRegistrySheet_();
      const existing = findStoreRowByField_(sheet, "store_id", record.store_id);

      if (!existing) {
        throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
      }

      if (record.store_public_code !== existing.record.store_public_code) {
        throw storeDomainError_(
          "STORE_PUBLIC_CODE_IMMUTABLE",
          "store_public_code cannot change."
        );
      }

      sheet
        .getRange(
          existing.rowNumber,
          1,
          1,
          TAKARA_STORE_REGISTRY_HEADERS.length
        )
        .setValues([storeRecordToRow_(record)]);
    },
  };
}

function createStorePublicCode_() {
  const token = Utilities.getUuid().replace(/-/g, "");
  return assertStorePublicCode_("st_" + token);
}

function createStoreRuntimeDependencies_() {
  return {
    nowIso: function () {
      return new Date().toISOString();
    },
    createPublicCode: createStorePublicCode_,
  };
}