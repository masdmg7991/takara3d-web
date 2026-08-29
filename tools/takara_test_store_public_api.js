const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let behavior = "active";

const context = {
  console,
  Object,
  String,
  Error,
  storeDomainError_(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  },
  resolveStoreContextRuntime_(storeRef) {
    if (behavior === "active") {
      return {
        version: "TAKARA_STORE_CONTEXT_V1",
        store_ref: storeRef,
        display_name: "Foto García",
        status: "ACTIVE",
      };
    }
    if (behavior === "invalid") {
      const error = new Error("invalid");
      error.code = "STORE_PUBLIC_CODE_INVALID";
      throw error;
    }
    if (behavior === "missing") {
      const error = new Error("missing");
      error.code = "STORE_NOT_FOUND";
      throw error;
    }
    if (behavior === "inactive") {
      const error = new Error("inactive");
      error.code = "STORE_INACTIVE";
      throw error;
    }
    if (behavior === "schema") {
      const error = new Error("schema");
      error.code = "STORE_REGISTRY_SCHEMA_INVALID";
      throw error;
    }
    throw new Error("secret backend detail");
  },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(
    path.join(
      root,
      "apps-script",
      "takara-pedidos-web",
      "StorePublicApi.gs"
    ),
    "utf8"
  ),
  context,
  { filename: "StorePublicApi.gs" }
);

let checks = 0;
function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function request(storeRef, extra = {}) {
  return {
    parameter: Object.assign(
      {
        action: "store.resolve",
        store_ref: storeRef,
      },
      extra
    ),
  };
}

ok(
  context.isStorePublicResolveRequest_(request("st_123456789012345678901234")),
  "exact resolve action recognized"
);
ok(
  !context.isStorePublicResolveRequest_({
    parameter: { action: "store.create" },
  }),
  "write action not recognized"
);

behavior = "active";
const success = context.resolveStorePublicApi_(
  request("st_123456789012345678901234", {
    store_id: "STO_INJECTED",
    display_name: "Injected",
    status: "INACTIVE",
  })
);

ok(success.ok === true, "active Store resolves");
ok(
  success.api_version === "TAKARA_STORE_PUBLIC_API_V1",
  "public api version"
);
ok(
  success.store_context.version === "TAKARA_STORE_CONTEXT_V1",
  "context contract version"
);
ok(
  success.store_context.store_ref === "st_123456789012345678901234",
  "store_ref comes from resolver"
);
ok(success.store_context.display_name === "Foto García", "display name authoritative");
ok(success.store_context.status === "ACTIVE", "status authoritative");
ok(
  !Object.prototype.hasOwnProperty.call(success.store_context, "store_id"),
  "public response excludes store_id"
);
ok(
  JSON.stringify(success).indexOf("STO_INJECTED") === -1,
  "client cannot inject store_id"
);
ok(
  JSON.stringify(success).indexOf("Injected") === -1,
  "client cannot inject display name"
);

const missingRef = context.resolveStorePublicApi_({
  parameter: { action: "store.resolve" },
});
ok(missingRef.ok === false, "missing store_ref fails");
ok(
  missingRef.error.code === "STORE_PUBLIC_REF_REQUIRED",
  "missing store_ref error code"
);

const badAction = context.resolveStorePublicApi_({
  parameter: { action: "store.create", store_ref: "st_x" },
});
ok(badAction.ok === false, "unsupported action fails");
ok(
  badAction.error.code === "STORE_PUBLIC_ACTION_INVALID",
  "unsupported action fail-closed"
);

for (const [mode, expected] of [
  ["invalid", "STORE_PUBLIC_CODE_INVALID"],
  ["missing", "STORE_NOT_FOUND"],
  ["inactive", "STORE_INACTIVE"],
  ["schema", "STORE_REGISTRY_SCHEMA_INVALID"],
]) {
  behavior = mode;
  const response = context.resolveStorePublicApi_(
    request("st_123456789012345678901234")
  );
  ok(response.ok === false, mode + " response fails");
  ok(response.error.code === expected, mode + " preserves safe code");
}

behavior = "unexpected";
const unexpected = context.resolveStorePublicApi_(
  request("st_123456789012345678901234")
);
ok(unexpected.ok === false, "unexpected backend error fails");
ok(
  unexpected.error.code === "STORE_RESOLUTION_FAILED",
  "unexpected backend error normalized"
);
ok(
  JSON.stringify(unexpected).indexOf("secret backend detail") === -1,
  "unexpected backend detail not leaked"
);

ok(typeof context.createStorePublicApi_ === "undefined", "no public create");
ok(typeof context.updateStorePublicApi_ === "undefined", "no public update");
ok(typeof context.deleteStorePublicApi_ === "undefined", "no public delete");
ok(typeof context.doGet === "undefined", "module does not own doGet");
ok(typeof context.doPost === "undefined", "module does not own doPost");

console.log(
  "[TAKARA_STORE_PUBLIC_API_TEST_OK] " +
    JSON.stringify({ checks })
);