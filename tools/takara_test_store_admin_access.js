const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const ACCESS = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "StoreAdminAccess.gs"
);

let checks = 0;

function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function expectError(fn, expected, message) {
  let actual = "";

  try {
    fn();
  } catch (error) {
    actual = String(error && error.message || error);
  }

  ok(actual === expected, message + " -> " + actual);
}

function createContext(ownerProperty, activeEmail, options = {}) {
  let propertyReads = 0;
  let activeUserReads = 0;

  const context = {
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(name) {
            propertyReads += 1;
            ok(
              name === "TAKARA_STORE_ADMIN_OWNER_EMAIL",
              "owner property key is canonical"
            );
            return ownerProperty;
          },
        };
      },
    },
    Session: options.noSession
      ? undefined
      : {
          getActiveUser() {
            activeUserReads += 1;

            if (options.noUser) {
              return null;
            }

            if (options.noGetEmail) {
              return {};
            }

            return {
              getEmail() {
                return activeEmail;
              },
            };
          },
        },
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(ACCESS, "utf8"),
    context,
    { filename: "StoreAdminAccess.gs" }
  );

  return {
    context,
    counts() {
      return { propertyReads, activeUserReads };
    },
  };
}

{
  const { context, counts } = createContext(
    "owner@example.com",
    "owner@example.com"
  );
  const result = context.requireStoreAdminAccess_();

  ok(result.version === "TAKARA_STORE_ADMIN_ACCESS_V1", "version exact");
  ok(result.role === "OWNER", "role exact");
  ok(result.authorized === true, "authorized true");
  ok(Object.isFrozen(result), "descriptor frozen");
  ok(
    Object.keys(result).sort().join(",") === "authorized,role,version",
    "descriptor exact keys"
  );
  ok(!("email" in result), "descriptor hides owner email");
  ok(counts().propertyReads === 1, "property read once");
  ok(counts().activeUserReads === 1, "active user read once");
}

{
  const { context } = createContext(
    " Owner@Example.COM ",
    "owner@example.com"
  );
  ok(
    context.requireStoreAdminAccess_().authorized === true,
    "normalized owner match"
  );
}

for (const configured of ["", "   ", null, "bad", "owner@invalid"]) {
  const { context, counts } = createContext(
    configured,
    "owner@example.com"
  );
  expectError(
    () => context.requireStoreAdminAccess_(),
    "STORE_ADMIN_CONFIGURATION_INVALID",
    "invalid config fails closed"
  );
  ok(
    counts().activeUserReads === 0,
    "invalid config stops before identity"
  );
}

for (const active of ["", "   ", null, "bad", "owner@invalid"]) {
  const { context } = createContext(
    "owner@example.com",
    active
  );
  expectError(
    () => context.requireStoreAdminAccess_(),
    "STORE_ADMIN_UNAUTHENTICATED",
    "invalid identity fails closed"
  );
}

{
  const { context } = createContext(
    "owner@example.com",
    "other@example.com"
  );
  expectError(
    () => context.requireStoreAdminAccess_(),
    "STORE_ADMIN_FORBIDDEN",
    "non-owner forbidden"
  );
}

for (const options of [
  { noSession: true },
  { noUser: true },
  { noGetEmail: true },
]) {
  const { context } = createContext(
    "owner@example.com",
    "owner@example.com",
    options
  );
  expectError(
    () => context.requireStoreAdminAccess_(),
    "STORE_ADMIN_UNAUTHENTICATED",
    "missing identity primitive denied"
  );
}

const source = fs.readFileSync(ACCESS, "utf8");

for (const forbidden of [
  "SpreadsheetApp",
  "createStoreSheetsRepository_",
  "openById",
  "MailApp",
  "DriveApp",
  "function doGet(",
  "function doPost(",
  "store_id",
  "store_ref",
  "TAKARA_STORE_ATTRIBUTION_V1",
]) {
  ok(!source.includes(forbidden), "access excludes " + forbidden);
}

ok(
  source.includes("PropertiesService.getScriptProperties()"),
  "uses ScriptProperties"
);
ok(
  source.includes("Session.getActiveUser()"),
  "uses ActiveUser"
);
ok(!/@gmail\.com/i.test(source), "no hardcoded Gmail owner");

console.log(
  "[TAKARA_STORE_ADMIN_ACCESS_F4A_OK] " +
    JSON.stringify({ checks })
);