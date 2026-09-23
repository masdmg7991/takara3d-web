/**
 * TAKARA STORE REGISTRY PROTECTION V1
 *
 * Creates point-in-time copies of the canonical Store Registry.
 * Snapshots are recovery evidence only: runtime, Store Admin reads and
 * public Store resolution never read from them.
 */

const TAKARA_STORE_REGISTRY_PROTECTION_VERSION =
  "TAKARA_STORE_REGISTRY_PROTECTION_V1";
const TAKARA_STORE_REGISTRY_SNAPSHOT_PREFIX =
  "Takara Store Registry Snapshot";
const TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID_PROPERTY =
  "TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID";
const TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_AT_PROPERTY =
  "TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_AT";

function storeRegistrySnapshotName_(createdAt) {
  return TAKARA_STORE_REGISTRY_SNAPSHOT_PREFIX + " " +
    String(createdAt || "").replace(/[:.]/g, "-");
}

function copyStoreRegistrySheetToSnapshot_(
  sourceSheet,
  snapshotSheet,
  headers,
  schemaValidator
) {
  schemaValidator(sourceSheet);

  const lastRow = sourceSheet.getLastRow();
  const rowCount = Math.max(lastRow, 1);
  const values = sourceSheet
    .getRange(1, 1, rowCount, headers.length)
    .getValues();

  snapshotSheet
    .getRange(1, 1, values.length, headers.length)
    .setValues(values);
  snapshotSheet.setFrozenRows(1);

  return Math.max(0, values.length - 1);
}

function createStoreRegistrySnapshot_() {
  requireStoreAdminAccess_();

  return withStoreRegistrySetupLock_(function () {
    const sourceId = getStoreRegistrySpreadsheetId_();
    const source = SpreadsheetApp.openById(sourceId);
    const sourceStores = source.getSheetByName(
      TAKARA_STORE_REGISTRY_SHEET_NAME
    );

    if (!sourceStores) {
      throw storeDomainError_(
        "STORE_REGISTRY_SCHEMA_MISSING",
        "Store Registry sheet does not exist."
      );
    }

    const createdAt = new Date().toISOString();
    const snapshot = SpreadsheetApp.create(
      storeRegistrySnapshotName_(createdAt)
    );
    const snapshotSheets = snapshot.getSheets();

    if (snapshotSheets.length !== 1) {
      throw storeDomainError_(
        "STORE_REGISTRY_SNAPSHOT_INVALID",
        "Snapshot spreadsheet shape is invalid."
      );
    }

    const snapshotStores = snapshotSheets[0];
    snapshotStores.setName(TAKARA_STORE_REGISTRY_SHEET_NAME);
    const storeRowCount = copyStoreRegistrySheetToSnapshot_(
      sourceStores,
      snapshotStores,
      TAKARA_STORE_REGISTRY_HEADERS,
      assertStoreRegistrySchema_
    );

    let brandingRowCount = 0;
    const sourceBranding = source.getSheetByName(
      TAKARA_STORE_BRANDING_SHEET_NAME
    );
    if (sourceBranding) {
      const snapshotBranding = snapshot.insertSheet(
        TAKARA_STORE_BRANDING_SHEET_NAME
      );
      brandingRowCount = copyStoreRegistrySheetToSnapshot_(
        sourceBranding,
        snapshotBranding,
        TAKARA_STORE_BRANDING_HEADERS,
        assertStoreBrandingSchema_
      );
    }

    const snapshotId = String(snapshot.getId() || "").trim();
    if (!snapshotId) {
      throw storeDomainError_(
        "STORE_REGISTRY_SNAPSHOT_INVALID",
        "Snapshot spreadsheet has no id."
      );
    }

    moveStoreRegistrySnapshotToRetentionFolder_(snapshotId);

    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(
      TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID_PROPERTY,
      snapshotId
    );
    properties.setProperty(
      TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_AT_PROPERTY,
      createdAt
    );

    return Object.freeze({
      version: TAKARA_STORE_REGISTRY_PROTECTION_VERSION,
      created: true,
      created_at: createdAt,
      row_count: storeRowCount,
      branding_row_count: brandingRowCount,
      sheet_count: sourceBranding ? 2 : 1,
    });
  });
}
