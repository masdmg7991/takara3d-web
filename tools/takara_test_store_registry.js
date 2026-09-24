const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const files = [
  path.join(root, "apps-script", "takara-pedidos-web", "StoreDomain.gs"),
  path.join(root, "apps-script", "takara-pedidos-web", "StoreRegistry.gs"),
];

const context = {
  console,
  Object,
  String,
  Number,
  Error,
  Date,
};
vm.createContext(context);

for (const file of files) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

let checks = 0;
function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function throwsCode(fn, code, message) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code=" + code);
}

function makeRepository() {
  const rows = [];
  return {
    rows,
    withWriteLock(work) {
      return work();
    },
    nextStoreSequence() {
      let max = 0;
      for (const row of rows) {
        const n = Number(String(row.store_id).slice(4));
        max = Math.max(max, n);
      }
      return max + 1;
    },
    findById(storeId) {
      return rows.find((row) => row.store_id === storeId) || null;
    },
    findByPublicCode(code) {
      return rows.find((row) => row.store_public_code === code) || null;
    },
    findBySlug(slug) {
      return rows.find((row) => row.store_slug === slug) || null;
    },
    insert(record) {
      rows.push(JSON.parse(JSON.stringify(record)));
    },
    update(record) {
      const index = rows.findIndex((row) => row.store_id === record.store_id);
      if (index < 0) {
        throw new Error("missing row");
      }
      rows[index] = JSON.parse(JSON.stringify(record));
    },
  };
}

const repo = makeRepository();
const times = [
  "2026-08-29T18:30:00.000Z",
  "2026-08-29T18:31:00.000Z",
  "2026-08-29T18:32:00.000Z",
  "2026-08-29T18:33:00.000Z",
];
const deps = {
  nowIso: () => times.shift(),
  createPublicCode: () => "st_Q7m2F5pV8Kx4NabcDEF123456",
};

const created = context.createStoreService_(
  repo,
  {
    display_name: "  Foto García  ",
    contact_name: "Miguel",
    email: "tienda@example.test",
  },
  deps
);

ok(created.store_id === "STO_000001", "store_id sequence");
ok(created.store_public_code === "st_Q7m2F5pV8Kx4NabcDEF123456", "public code");
ok(created.store_slug === "foto-garcia", "slug derived from display name");
ok(created.status === "ACTIVE", "created ACTIVE");
ok(created.display_name === "Foto García", "display name normalized");
ok(created.version === 1, "created version=1");
ok(repo.rows.length === 1, "repository insert");

const contextValue = context.resolveStoreContextService_(
  repo,
  created.store_public_code
);
ok(contextValue.version === "TAKARA_STORE_CONTEXT_V1", "context version");
ok(contextValue.store_ref === created.store_public_code, "context store_ref");
ok(contextValue.display_name === "Foto García", "context display name");
ok(contextValue.status === "ACTIVE", "context ACTIVE");
ok(!Object.prototype.hasOwnProperty.call(contextValue, "store_id"), "browser context excludes store_id");
const slugContext = context.resolveStoreContextBySlugService_(
  repo,
  created.store_slug
);
ok(slugContext.store_ref === created.store_public_code, "slug resolves same opaque Store identity");
ok(slugContext.display_name === "Foto García", "slug resolution remains authoritative");


const renamed = context.updateStoreService_(
  repo,
  created.store_id,
  { display_name: "Foto García Centro" },
  deps
);
ok(renamed.display_name === "Foto García Centro", "rename");
ok(renamed.store_id === created.store_id, "rename keeps store_id");
ok(renamed.store_public_code === created.store_public_code, "rename keeps public code");
ok(renamed.store_slug === created.store_slug, "rename keeps immutable slug");
ok(renamed.version === 2, "rename increments version");

const inactive = context.setStoreStatusService_(
  repo,
  created.store_id,
  "INACTIVE",
  deps
);
ok(inactive.status === "INACTIVE", "deactivate status");
ok(Boolean(inactive.deactivated_at), "deactivate timestamp");
ok(inactive.store_public_code === created.store_public_code, "deactivate keeps public code");
ok(inactive.store_slug === created.store_slug, "deactivate keeps slug");
ok(inactive.version === 3, "deactivate increments version");

throwsCode(
  () => context.resolveStoreContextService_(repo, created.store_public_code),
  "STORE_INACTIVE",
  "inactive resolution fail closed"
);

const active = context.setStoreStatusService_(
  repo,
  created.store_id,
  "ACTIVE",
  deps
);
ok(active.status === "ACTIVE", "reactivate status");
ok(active.deactivated_at === "", "reactivate clears deactivated_at");
ok(active.store_public_code === created.store_public_code, "reactivate keeps public code");
ok(active.store_slug === created.store_slug, "reactivate keeps slug");
ok(active.version === 4, "reactivate increments version");

const duplicateName = context.createStoreService_(
  repo,
  { display_name: "Foto García" },
  {
    nowIso: () => "2026-08-29T18:40:00.000Z",
    createPublicCode: () => "st_abcdefghijklmnopqrstuvwx",
  }
);
ok(duplicateName.store_slug === "foto-garcia-2", "slug collision gets deterministic -2");
ok(
  context.resolveStoreContextBySlugService_(repo, "foto-garcia-2").store_ref ===
    duplicateName.store_public_code,
  "colliding slug resolves second Store"
);

ok(
  context.slugifyStoreDisplayName_("Árbol Ñandú") === "arbol-nandu",
  "slug strips accents deterministically"
);
ok(
  context.slugifyStoreDisplayName_("東京") === "tienda",
  "non-ASCII-only display name gets stable fallback"
);
const maxSlugName = "A".repeat(120);
const maxSlug = context.buildStoreSlugCandidate_(maxSlugName, 1);
const maxSlugCollision = context.buildStoreSlugCandidate_(maxSlugName, 2);
ok(maxSlug.length === 64, "max slug uses full 64-character budget");
ok(
  maxSlugCollision.length === 64 && maxSlugCollision.endsWith("-2"),
  "collision suffix stays inside 64-character budget"
);
ok(
  context.buildStoreSlugCandidate_("東京", 2) === "tienda-2",
  "fallback slug collision gets deterministic suffix"
);
ok(
  context.buildStoreSlugCandidate_("Tienda", 9999) === "tienda-9999",
  "maximum supported slug ordinal is valid"
);
throwsCode(
  () => context.buildStoreSlugCandidate_("Tienda", 10000),
  "STORE_SLUG_SEQUENCE_INVALID",
  "slug ordinal overflow fails closed"
);

const exhaustedSlugRecords = Array.from({ length: 9999 }, (_, index) => ({
  store_id: "STO_" + String(index + 1).padStart(6, "0"),
  display_name: "Tienda",
  store_slug: context.buildStoreSlugCandidate_("Tienda", index + 1),
}));
exhaustedSlugRecords.push({
  store_id: "STO_010000",
  display_name: "Tienda",
  store_slug: "",
});
throwsCode(
  () => context.hydrateStoreSlugs_(exhaustedSlugRecords),
  "STORE_SLUG_EXHAUSTED",
  "legacy hydration exhaustion uses canonical exhausted error"
);

throwsCode(
  () => context.resolveStoreContextService_(repo, "st_invalid"),
  "STORE_PUBLIC_CODE_INVALID",
  "malformed public code"
);
throwsCode(
  () => context.resolveStoreContextService_(repo, "st_123456789012345678901234"),
  "STORE_NOT_FOUND",
  "unknown public code"
);
throwsCode(
  () => context.createStoreService_(repo, { display_name: "" }, {
    nowIso: () => "2026-08-29T19:00:00.000Z",
    createPublicCode: () => "st_abcdefghijklmnopqrstuvwx",
  }),
  "STORE_DISPLAY_NAME_REQUIRED",
  "empty display name"
);

const collisionDeps = {
  nowIso: () => "2026-08-29T19:00:00.000Z",
  createPublicCode: () => created.store_public_code,
};
throwsCode(
  () => context.createStoreService_(repo, { display_name: "Otra" }, collisionDeps),
  "STORE_PUBLIC_CODE_COLLISION",
  "public code collision"
);

ok(typeof context.deleteStoreService_ === "undefined", "no delete use case");
ok(context.buildStoreId_(999999) === "STO_999999", "max id");
throwsCode(() => context.buildStoreId_(1000000), "STORE_SEQUENCE_INVALID", "sequence overflow");

console.log(
  "[TAKARA_STORE_REGISTRY_CORE_TEST_OK] " +
    JSON.stringify({ checks, stores: repo.rows.length })
);