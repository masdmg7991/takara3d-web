/**
 * TAKARA STORE REGISTRY SETUP V1
 *
 * Explicit, idempotent provisioning for TAKARA_STORE_REGISTRY_V1.
 * It is infrastructure setup for the existing Store Registry authority.
 * It does not expose HTTP routes and is never invoked automatically.
 */

const TAKARA_STORE_REGISTRY_SPREADSHEET_NAME = "Takara Store Registry V1";

function withStoreRegistrySetupLock_(work) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(TAKARA_STORE_WRITE_LOCK_TIMEOUT_MS)) {
    throw storeDomainError_("STORE_REGISTRY_BUSY", "Store Registry is busy.");
  }

  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function configureStoreRegistrySheet_(spreadsheet) {
  if (!spreadsheet) {
    throw storeDomainError_(
      "STORE_REGISTRY_SETUP_INVALID",
      "Store Registry spreadsheet is required."
    );
  }

  let sheet = spreadsheet.getSheetByName(TAKARA_STORE_REGISTRY_SHEET_NAME);

  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    if (sheets.length !== 1 || sheets[0].getLastRow() > 0) {
      throw storeDomainError_(
        "STORE_REGISTRY_SCHEMA_INVALID",
        "Cannot infer Store Registry sheet safely."
      );
    }

    sheet = sheets[0];
    sheet.setName(TAKARA_STORE_REGISTRY_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
    sheet
      .getRange(1, 1, 1, TAKARA_STORE_REGISTRY_HEADERS.length)
      .setValues([TAKARA_STORE_REGISTRY_HEADERS.slice()]);
    sheet.setFrozenRows(1);
  }

  assertStoreRegistrySchema_(sheet);
  return sheet;
}

function provisionStoreRegistry_() {
  return withStoreRegistrySetupLock_(function () {
    const properties = PropertiesService.getScriptProperties();
    const configuredId = String(
      properties.getProperty(TAKARA_STORE_REGISTRY_SPREADSHEET_PROPERTY) || ""
    ).trim();

    if (configuredId) {
      const existing = SpreadsheetApp.openById(configuredId);
      configureStoreRegistrySheet_(existing);

      return {
        version: TAKARA_STORE_REGISTRY_VERSION,
        configured: true,
        created: false,
      };
    }

    const spreadsheet = SpreadsheetApp.create(
      TAKARA_STORE_REGISTRY_SPREADSHEET_NAME
    );

    configureStoreRegistrySheet_(spreadsheet);

    const spreadsheetId = String(spreadsheet.getId() || "").trim();
    if (!spreadsheetId) {
      throw storeDomainError_(
        "STORE_REGISTRY_SETUP_INVALID",
        "Created Store Registry has no spreadsheet id."
      );
    }

    properties.setProperty(
      TAKARA_STORE_REGISTRY_SPREADSHEET_PROPERTY,
      spreadsheetId
    );

    return {
      version: TAKARA_STORE_REGISTRY_VERSION,
      configured: true,
      created: true,
    };
  });
}

function getStoreRegistryHealth_() {
  const spreadsheetId = getStoreRegistrySpreadsheetId_();
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = configureStoreRegistrySheet_(spreadsheet);

  return {
    version: TAKARA_STORE_REGISTRY_VERSION,
    configured: true,
    schema_valid: true,
    sheet_name: sheet.getName(),
  };
}