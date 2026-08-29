const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

let checks = 0;
let findCalls = 0;
let currentStore = null;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function expectCode(fn, code, label) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), label + " throws");
  ok(caught && caught.code === code, label + " code");
}

const repository = {
  withWriteLock(fn) {
    return fn();
  },
  nextStoreSequence() {
    return 1;
  },
  findById() {
    return null;
  },
  findByPublicCode(code) {
    findCalls += 1;
    if (
      currentStore &&
      currentStore.store_public_code === code
    ) {
      return Object.assign({}, currentStore);
    }
    return null;
  },
  insert() {},
  update() {},
};

const context = {
  console,
  Object,
  String,
  Number,
  Error,
  Array,
  Date,
  JSON,
  createStoreSheetsRepository_() {
    return repository;
  },
  createStoreRuntimeDependencies_() {
    return {
      nowIso() {
        return "2026-08-29T19:00:00Z";
      },
      createPublicCode() {
        return "st_123456789012345678901234";
      },
    };
  },
};

vm.createContext(context);

for (const file of [
  "StoreDomain.gs",
  "StoreRegistry.gs",
  "StoreRuntime.gs",
  "StoreOrderResolution.gs",
  "OrderAttribution.gs",
]) {
  vm.runInContext(
    fs.readFileSync(
      path.join(
        root,
        "apps-script",
        "takara-pedidos-web",
        file
      ),
      "utf8"
    ),
    context,
    { filename: file }
  );
}

const ref = "st_123456789012345678901234";

const direct = context.buildAuthoritativeOrderAttribution_({
  meta: {},
});

ok(direct.version === "TAKARA_STORE_ATTRIBUTION_V1", "DIRECT version");
ok(direct.source_type === "DIRECT", "DIRECT source");
ok(
  !Object.prototype.hasOwnProperty.call(direct, "store_id"),
  "DIRECT has no store_id"
);
ok(
  !Object.prototype.hasOwnProperty.call(
    direct,
    "store_name_snapshot"
  ),
  "DIRECT has no store_name_snapshot"
);
ok(Object.isFrozen(direct), "DIRECT frozen");
ok(findCalls === 0, "DIRECT does not query Registry");

currentStore = {
  store_id: "STO_000001",
  store_public_code: ref,
  status: "ACTIVE",
  display_name: "Foto García",
};

const store = context.buildAuthoritativeOrderAttribution_({
  meta: {
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
    },
  },
});

ok(store.version === "TAKARA_STORE_ATTRIBUTION_V1", "STORE version");
ok(store.source_type === "STORE", "STORE source");
ok(store.store_id === "STO_000001", "STORE id authoritative");
ok(
  store.store_name_snapshot === "Foto García",
  "STORE name snapshot authoritative"
);
ok(Object.isFrozen(store), "STORE frozen");
ok(findCalls === 1, "STORE queries Registry once");
ok(
  !Object.prototype.hasOwnProperty.call(store, "store_ref"),
  "attribution does not persist public transport ref"
);
ok(
  !Object.prototype.hasOwnProperty.call(store, "status"),
  "attribution does not persist status"
);

currentStore.display_name = "Foto García Centro";

const renamed = context.buildAuthoritativeOrderAttribution_({
  meta: {
    store_context: {
      version: "TAKARA_STORE_CONTEXT_V1",
      store_ref: ref,
    },
  },
});

ok(
  renamed.store_name_snapshot === "Foto García Centro",
  "new order snapshots latest authoritative name"
);
ok(
  store.store_name_snapshot === "Foto García",
  "previous attribution snapshot stays immutable"
);

const forbiddenBrowserFields = [
  ["source_type", "STORE"],
  ["store_id", "STO_999999"],
  ["store_name_snapshot", "Fake"],
  ["store_attribution", { source_type: "STORE" }],
];

for (const [field, value] of forbiddenBrowserFields) {
  expectCode(
    () =>
      context.buildAuthoritativeOrderAttribution_({
        meta: {
          [field]: value,
        },
      }),
    "ORDER_ATTRIBUTION_INPUT_FORBIDDEN",
    "browser derived " + field
  );
}

currentStore.status = "INACTIVE";

expectCode(
  () =>
    context.buildAuthoritativeOrderAttribution_({
      meta: {
        store_context: {
          version: "TAKARA_STORE_CONTEXT_V1",
          store_ref: ref,
        },
      },
    }),
  "STORE_INACTIVE",
  "inactive Store does not fall back DIRECT"
);

currentStore = null;

expectCode(
  () =>
    context.buildAuthoritativeOrderAttribution_({
      meta: {
        store_context: {
          version: "TAKARA_STORE_CONTEXT_V1",
          store_ref: ref,
        },
      },
    }),
  "STORE_NOT_FOUND",
  "missing Store does not fall back DIRECT"
);

expectCode(
  () =>
    context.buildAuthoritativeOrderAttribution_({
      meta: {
        store_context: {
          version: "TAKARA_STORE_CONTEXT_V1",
          store_ref: ref,
          store_id: "STO_999999",
        },
      },
    }),
  "ORDER_STORE_CONTEXT_INVALID",
  "injected store_id rejected before attribution"
);

console.log(
  "[TAKARA_ORDER_ATTRIBUTION_F3C_OK] " +
    JSON.stringify({
      checks,
      find_calls: findCalls,
    })
);