const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(
    ROOT,
    "apps-script",
    "takara-pedidos-web",
    "DataRetention.gs"
  ),
  "utf8"
);

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, message) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code");
}

function iterator(items) {
  let index = 0;
  return {
    hasNext() {
      return index < items.length;
    },
    next() {
      return items[index++];
    }
  };
}

function makeFile(id, name, createdAt) {
  return {
    id,
    name,
    createdAt: new Date(createdAt),
    trashed: false,
    movedTo: null,
    getId() {
      return this.id;
    },
    getName() {
      return this.name;
    },
    getDateCreated() {
      return this.createdAt;
    },
    setTrashed(value) {
      this.trashed = !!value;
    },
    moveTo(folder) {
      this.movedTo = folder;
      if (folder.files.indexOf(this) < 0) {
        folder.files.push(this);
      }
      return this;
    }
  };
}

function createHarness(files, options) {
  const opts = options || {};
  const properties = Object.assign(
    {},
    opts.properties || {}
  );

  const managedFolder = {
    name: "Store Registry Snapshots",
    files: files.slice(),
    getFiles() {
      return iterator(
        this.files.filter((file) => !file.trashed)
      );
    }
  };

  const rootFolder = {
    folders: opts.existingFolder === false
      ? []
      : [managedFolder],
    getFoldersByName(name) {
      return iterator(
        this.folders.filter(
          (folder) => folder.name === name
        )
      );
    },
    createFolder(name) {
      const folder = {
        name,
        files: [],
        getFiles() {
          return iterator(
            this.files.filter(
              (file) => !file.trashed
            )
          );
        }
      };
      this.folders.push(folder);
      return folder;
    }
  };

  const allFiles = Object.create(null);
  files.forEach((file) => {
    allFiles[file.id] = file;
  });

  const runtime = {
    adminChecks: 0
  };

  const context = {
    console,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Error,
    JSON,
    Math,
    RegExp,

    TAKARA_STORE_REGISTRY_SNAPSHOT_PREFIX:
      "Takara Store Registry Snapshot",
    TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID_PROPERTY:
      "TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID",

    storeDomainError_(code, message) {
      const error = new Error(message);
      error.code = code;
      return error;
    },

    requireStoreAdminAccess_() {
      runtime.adminChecks += 1;
      if (opts.adminDenied) {
        const error = new Error("forbidden");
        error.code = "STORE_ADMIN_FORBIDDEN";
        throw error;
      }
    },

    getOrCreateRootFolder_() {
      return rootFolder;
    },

    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return Object.prototype.hasOwnProperty.call(
              properties,
              key
            )
              ? properties[key]
              : null;
          },
          setProperty(key, value) {
            properties[key] = String(value);
          }
        };
      }
    },

    DriveApp: {
      getFileById(id) {
        if (!allFiles[id]) {
          allFiles[id] = makeFile(
            id,
            "external-" + id,
            "2026-01-01T00:00:00.000Z"
          );
        }
        return allFiles[id];
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "DataRetention.gs"
  });

  return {
    context,
    runtime,
    rootFolder,
    managedFolder,
    properties,
    allFiles
  };
}

const now = new Date(
  "2026-09-23T04:15:00.000Z"
);

const files = [];
for (let i = 0; i < 20; i += 1) {
  files.push(
    makeFile(
      "recent-" + String(i).padStart(2, "0"),
      "Takara Store Registry Snapshot recent-" + i,
      new Date(
        now.getTime() -
          i * 24 * 60 * 60 * 1000
      ).toISOString()
    )
  );
}
for (let i = 0; i < 5; i += 1) {
  files.push(
    makeFile(
      "old-" + String(i).padStart(2, "0"),
      "Takara Store Registry Snapshot old-" + i,
      new Date(
        now.getTime() -
          (200 + i) * 24 * 60 * 60 * 1000
      ).toISOString()
    )
  );
}
files.push(
  makeFile(
    "noise",
    "Unrelated spreadsheet",
    "2025-01-01T00:00:00.000Z"
  )
);

const harness = createHarness(files, {
  properties: {
    TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID:
      "recent-00"
  }
});

const plan =
  harness.context.buildStoreRegistrySnapshotRetentionPlan_(
    now
  );

ok(
  plan.version === "TAKARA_DATA_RETENTION_V1",
  "plan version exact"
);
ok(plan.total_managed === 25, "unrelated file excluded");
ok(plan.keep.length === 20, "latest 20 retained");
ok(plan.purge.length === 5, "five old snapshots become candidates");
ok(
  plan.purge.every(
    (item) => item.age_days >= 180
  ),
  "all purge candidates satisfy minimum age"
);
ok(
  plan.keep.some(
    (item) =>
      item.id === "recent-00" &&
      item.protected_latest === true
  ),
  "latest property remains protected"
);

const preview =
  harness.context.purgeStoreRegistrySnapshots_({
    apply: false,
    now: now.toISOString()
  });

ok(preview.applied === false, "purge defaults to preview");
ok(
  files.every((file) => file.trashed === false),
  "preview trashes nothing"
);
ok(
  harness.runtime.adminChecks === 1,
  "preview requires admin access"
);

expectCode(
  () =>
    harness.context.purgeStoreRegistrySnapshots_({
      apply: true,
      confirmation: "WRONG",
      now: now.toISOString()
    }),
  "RETENTION_CONFIRMATION_REQUIRED",
  "destructive purge requires explicit token"
);
ok(
  files.every((file) => file.trashed === false),
  "wrong confirmation trashes nothing"
);

const applied =
  harness.context.purgeStoreRegistrySnapshots_({
    apply: true,
    confirmation:
      "PURGE_STORE_REGISTRY_SNAPSHOTS",
    now: now.toISOString()
  });

ok(applied.applied === true, "confirmed purge applies");
ok(applied.purged === 5, "confirmed purge trashes five");
ok(
  files.filter((file) => file.trashed).length === 5,
  "only planned snapshots trashed"
);
ok(
  files
    .filter((file) => file.trashed)
    .every((file) => file.id.startsWith("old-")),
  "only old managed snapshots trashed"
);
ok(!harness.allFiles["recent-00"].trashed, "latest snapshot never trashed");
ok(!harness.allFiles.noise.trashed, "unrelated file never trashed");

const report =
  harness.context.buildTakaraDataRetentionReport_(
    now.toISOString()
  );

ok(
  report.technical_ledgers.order_idempotency.retention_days === 30,
  "order ledger policy reports 30 days"
);
ok(
  report.technical_ledgers.contact_idempotency.retention_days === 30,
  "contact ledger policy reports 30 days"
);
ok(
  report.technical_ledgers.order_idempotency.ambiguous_records ===
    "KEEP_FOR_REVIEW",
  "ambiguous order ledger retained"
);
ok(
  report.store_branding_history.mode === "REPORT_ONLY",
  "branding history is report-only"
);
ok(
  report.store_branding_history.automatic_delete === false,
  "branding history never auto-deleted"
);
ok(
  report.order_media.mode === "REPORT_ONLY",
  "order media is report-only"
);
ok(
  report.order_media.automatic_delete === false,
  "order media never auto-deleted"
);

const folderHarness = createHarness([], {
  existingFolder: false
});
const createdFolder =
  folderHarness.context.getOrCreateStoreRegistrySnapshotFolder_();

ok(
  createdFolder.name === "Store Registry Snapshots",
  "managed snapshot folder created when missing"
);
ok(
  folderHarness.rootFolder.folders.length === 1,
  "only one managed folder created"
);

const snapshotFile = makeFile(
  "snapshot-move",
  "Takara Store Registry Snapshot move",
  now.toISOString()
);
folderHarness.allFiles["snapshot-move"] = snapshotFile;

const moved =
  folderHarness.context.moveStoreRegistrySnapshotToRetentionFolder_(
    "snapshot-move"
  );

ok(moved.managed === true, "snapshot move reports managed");
ok(
  snapshotFile.movedTo === createdFolder,
  "snapshot file moved to managed folder"
);

expectCode(
  () =>
    folderHarness.context.moveStoreRegistrySnapshotToRetentionFolder_(
      ""
    ),
  "STORE_REGISTRY_SNAPSHOT_ID_INVALID",
  "empty snapshot id rejected"
);

const latestOddFiles = [];
for (let i = 0; i < 21; i += 1) {
  latestOddFiles.push(
    makeFile(
      "odd-" + i,
      "Takara Store Registry Snapshot odd-" + i,
      new Date(
        now.getTime() -
          (200 + i) * 24 * 60 * 60 * 1000
      ).toISOString()
    )
  );
}
const latestOdd = createHarness(
  latestOddFiles,
  {
    properties: {
      TAKARA_STORE_REGISTRY_LATEST_SNAPSHOT_ID:
        "odd-20"
    }
  }
);

const oddPlan =
  latestOdd.context.buildStoreRegistrySnapshotRetentionPlan_(
    now
  );

ok(
  oddPlan.purge.length === 0,
  "latest old snapshot beyond count remains protected"
);
ok(
  oddPlan.keep.some(
    (item) =>
      item.id === "odd-20" &&
      item.protected_latest
  ),
  "explicit latest protection wins over age/count"
);

console.log(
  "[TAKARA_DATA_RETENTION_TEST_OK] " +
    JSON.stringify({
      checks,
      version: "TAKARA_DATA_RETENTION_V1",
      purge_candidates: plan.purge.length
    })
);
