/*
 * TAKARA DATA RETENTION V1
 *
 * Conservative retention governance:
 * - technical ledgers: automatic cleanup in their own modules;
 * - Store Registry snapshots: managed retention with explicit admin apply;
 * - historical Store logos: report-only;
 * - customer order media: report-only.
 */

const TAKARA_DATA_RETENTION_VERSION =
  "TAKARA_DATA_RETENTION_V1";

const TAKARA_STORE_REGISTRY_SNAPSHOT_FOLDER_NAME =
  "Store Registry Snapshots";

const TAKARA_STORE_REGISTRY_SNAPSHOT_KEEP_LATEST = 20;
const TAKARA_STORE_REGISTRY_SNAPSHOT_RETENTION_MS =
  180 * 24 * 60 * 60 * 1000;

const TAKARA_STORE_BRANDING_HISTORY_POLICY =
  "REPORT_ONLY";
const TAKARA_ORDER_MEDIA_RETENTION_POLICY =
  "REPORT_ONLY";

const TAKARA_STORE_REGISTRY_SNAPSHOT_PURGE_CONFIRMATION =
  "PURGE_STORE_REGISTRY_SNAPSHOTS";

function retentionIso_(value) {
  const date = value instanceof Date
    ? value
    : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw storeDomainError_(
      "RETENTION_DATE_INVALID",
      "Retention date is invalid."
    );
  }

  return date.toISOString();
}

function getStoreRegistrySnapshotFolder_(
  createIfMissing
) {
  const root = getOrCreateRootFolder_();
  const folders = root.getFoldersByName(
    TAKARA_STORE_REGISTRY_SNAPSHOT_FOLDER_NAME
  );

  if (folders.hasNext()) {
    return folders.next();
  }

  if (createIfMissing === true) {
    return root.createFolder(
      TAKARA_STORE_REGISTRY_SNAPSHOT_FOLDER_NAME
    );
  }

  return null;
}

function getOrCreateStoreRegistrySnapshotFolder_() {
  return getStoreRegistrySnapshotFolder_(true);
}

function moveStoreRegistrySnapshotToRetentionFolder_(
  snapshotId
) {
  const normalized = String(snapshotId || "").trim();

  if (!normalized) {
    throw storeDomainError_(
      "STORE_REGISTRY_SNAPSHOT_ID_INVALID",
      "Snapshot id is required for retention management."
    );
  }

  const folder =
    getOrCreateStoreRegistrySnapshotFolder_();
  const file = DriveApp.getFileById(normalized);

  file.moveTo(folder);

  return Object.freeze({
    managed: true,
    file_id: normalized,
    folder_name:
      TAKARA_STORE_REGISTRY_SNAPSHOT_FOLDER_NAME
  });
}

function listManagedStoreRegistrySnapshots_() {
  const folder =
    getStoreRegistrySnapshotFolder_(false);

  if (!folder) {
    return [];
  }

  const files = folder.getFiles();
  const result = [];

  while (files.hasNext()) {
    const file = files.next();
    const name = String(file.getName() || "");

    if (
      name.indexOf(
        TAKARA_STORE_REGISTRY_SNAPSHOT_PREFIX + " "
      ) !== 0
    ) {
      continue;
    }

    result.push({
      id: String(file.getId() || "").trim(),
      name: name,
      created_at: retentionIso_(
        file.getDateCreated()
      )
    });
  }

  result.sort(function (left, right) {
    return String(right.created_at).localeCompare(
      String(left.created_at)
    );
  });

  return result;
}

function buildStoreRegistrySnapshotRetentionPlan_(
  now
) {
  const instant = now instanceof Date
    ? now
    : new Date(now);
  const nowMs = instant.getTime();

  if (!Number.isFinite(nowMs)) {
    throw storeDomainError_(
      "RETENTION_DATE_INVALID",
      "Retention reference time is invalid."
    );
  }

  const snapshots =
    listManagedStoreRegistrySnapshots_();
  const properties =
    PropertiesService.getScriptProperties();
  const latestId = String(
    properties.getProperty(
      TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID_PROPERTY
    ) || ""
  ).trim();

  const keep = [];
  const purge = [];

  snapshots.forEach(function (snapshot, index) {
    const createdMs = new Date(
      snapshot.created_at
    ).getTime();
    const ageMs = nowMs - createdMs;
    const protectedByLatest =
      !!latestId && snapshot.id === latestId;
    const protectedByCount =
      index < TAKARA_STORE_REGISTRY_SNAPSHOT_KEEP_LATEST;
    const oldEnough =
      Number.isFinite(ageMs) &&
      ageMs >=
        TAKARA_STORE_REGISTRY_SNAPSHOT_RETENTION_MS;

    const item = {
      id: snapshot.id,
      name: snapshot.name,
      created_at: snapshot.created_at,
      age_days: Math.floor(
        Math.max(0, ageMs) /
          (24 * 60 * 60 * 1000)
      ),
      protected_latest: protectedByLatest,
      protected_recent_count: protectedByCount
    };

    if (
      oldEnough &&
      !protectedByLatest &&
      !protectedByCount
    ) {
      purge.push(item);
    } else {
      keep.push(item);
    }
  });

  return Object.freeze({
    version: TAKARA_DATA_RETENTION_VERSION,
    generated_at: instant.toISOString(),
    policy: Object.freeze({
      snapshot_retention_days: 180,
      keep_latest:
        TAKARA_STORE_REGISTRY_SNAPSHOT_KEEP_LATEST,
      destructive_default: false
    }),
    total_managed: snapshots.length,
    keep: keep,
    purge: purge
  });
}

function purgeStoreRegistrySnapshots_(options) {
  requireStoreAdminAccess_();

  const opts = options || {};
  const now = opts.now
    ? new Date(opts.now)
    : new Date();
  const plan =
    buildStoreRegistrySnapshotRetentionPlan_(now);

  if (opts.apply !== true) {
    return Object.freeze({
      version: TAKARA_DATA_RETENTION_VERSION,
      applied: false,
      plan: plan
    });
  }

  if (
    String(opts.confirmation || "") !==
    TAKARA_STORE_REGISTRY_SNAPSHOT_PURGE_CONFIRMATION
  ) {
    throw storeDomainError_(
      "RETENTION_CONFIRMATION_REQUIRED",
      "Explicit retention purge confirmation is required."
    );
  }

  let purged = 0;

  plan.purge.forEach(function (candidate) {
    DriveApp
      .getFileById(candidate.id)
      .setTrashed(true);
    purged += 1;
  });

  return Object.freeze({
    version: TAKARA_DATA_RETENTION_VERSION,
    applied: true,
    purged: purged,
    kept: plan.keep.length,
    generated_at: plan.generated_at
  });
}

function buildTakaraDataRetentionReport_(now) {
  requireStoreAdminAccess_();

  const instant = now
    ? new Date(now)
    : new Date();
  const snapshotPlan =
    buildStoreRegistrySnapshotRetentionPlan_(
      instant
    );

  return Object.freeze({
    version: TAKARA_DATA_RETENTION_VERSION,
    generated_at: instant.toISOString(),

    technical_ledgers: Object.freeze({
      order_idempotency: Object.freeze({
        mode: "AUTO_COMPLETED_ONLY",
        retention_days: 30,
        ambiguous_records: "KEEP_FOR_REVIEW"
      }),
      contact_idempotency: Object.freeze({
        mode: "AUTO_COMPLETED_ONLY",
        retention_days: 30,
        ambiguous_records: "KEEP_FOR_REVIEW"
      }),
      public_abuse: Object.freeze({
        mode: "ROLLING_COMPACT_STATE",
        pii_stored: false
      })
    }),

    store_registry_snapshots: Object.freeze({
      mode: "ADMIN_EXPLICIT_PURGE",
      retention_days: 180,
      keep_latest:
        TAKARA_STORE_REGISTRY_SNAPSHOT_KEEP_LATEST,
      managed_total: snapshotPlan.total_managed,
      purge_candidates:
        snapshotPlan.purge.length,
      legacy_pre_w10:
        "MANUAL_REVIEW_NO_AUTO_DELETE"
    }),

    store_branding_history: Object.freeze({
      mode:
        TAKARA_STORE_BRANDING_HISTORY_POLICY,
      automatic_delete: false,
      reason:
        "Historical logos may be referenced by recovery snapshots."
    }),

    order_media: Object.freeze({
      mode:
        TAKARA_ORDER_MEDIA_RETENTION_POLICY,
      automatic_delete: false,
      reason:
        "Customer media requires an explicit business retention decision."
    })
  });
}
