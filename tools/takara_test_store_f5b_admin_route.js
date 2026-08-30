const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const CODE = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "Code.gs"
);

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function extractFunction(source, name) {
  const pattern = new RegExp(
    "^\\s*function\\s+" + name + "\\s*\\(",
    "m"
  );
  const match = pattern.exec(source);

  ok(Boolean(match), "exists function " + name);

  const start = match.index;
  const brace = source.indexOf("{", start + match[0].length);

  ok(brace >= 0, name + " has body");

  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || "";

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") depth += 1;

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error("[FAIL] unbalanced " + name);
}

const code = fs.readFileSync(CODE, "utf8");
const doGetSource = extractFunction(code, "doGet");

ok(
  doGetSource.includes('e.parameter.route === "store-admin"'),
  "route predicate exact"
);
ok(
  doGetSource.includes("getStoreAdminUiDeploymentOutput_()"),
  "Admin boundary call present"
);
ok(
  doGetSource.includes("routeStorePublicGet_("),
  "Store Public fallback preserved"
);

let publicCalls = 0;
let adminCalls = 0;
let jsonCalls = 0;
let adminThrows = false;

const publicSentinel = { kind: "public" };
const adminSentinel = { kind: "admin" };
const errorSentinel = { kind: "json-error" };

const context = {
  console,
  String,
  JSON,
  routeStorePublicGet_() {
    publicCalls += 1;
    return publicSentinel;
  },
  getStoreAdminUiDeploymentOutput_() {
    adminCalls += 1;
    if (adminThrows) {
      throw new Error("STORE_ADMIN_FORBIDDEN");
    }
    return adminSentinel;
  },
  json_() {
    jsonCalls += 1;
    return errorSentinel;
  },
};

vm.createContext(context);
vm.runInContext(
  doGetSource,
  context,
  { filename: "Code.doGet.js" }
);

let result = context.doGet({
  parameter: { route: "store-admin" },
});
ok(result === adminSentinel, "Admin route returns Admin output");
ok(adminCalls === 1, "Admin route calls boundary once");
ok(publicCalls === 0, "Admin route does not call Store Public");

result = context.doGet({
  parameter: { s: "st_Q7example" },
});
ok(result === publicSentinel, "Store QR remains on public route");
ok(publicCalls === 1, "Store public called for Store QR");
ok(adminCalls === 1, "Store QR does not call Admin");

result = context.doGet({ parameter: {} });
ok(result === publicSentinel, "default GET remains public");
ok(publicCalls === 2, "default GET calls public once");

result = context.doGet({
  parameter: { route: "admin" },
});
ok(result === publicSentinel, "noncanonical route remains public");
ok(publicCalls === 3, "noncanonical route calls public");

adminThrows = true;
const publicBeforeDenied = publicCalls;
const jsonBeforeDenied = jsonCalls;
let deniedResult;
let deniedError = "";

try {
  deniedResult = context.doGet({
    parameter: { route: "store-admin" },
  });
} catch (error) {
  deniedError = String(error && error.message || error);
}

ok(
  publicCalls === publicBeforeDenied,
  "denied Admin route never falls back to public"
);
ok(
  deniedError === "STORE_ADMIN_FORBIDDEN" ||
    deniedResult === errorSentinel,
  "denied Admin remains fail closed"
);
ok(
  jsonCalls === jsonBeforeDenied ||
    jsonCalls === jsonBeforeDenied + 1,
  "existing doGet error policy preserved"
);

console.log(
  "[TAKARA_STORE_F5B_ADMIN_ROUTE_OK] " +
    JSON.stringify({
      checks,
      publicCalls,
      adminCalls,
      jsonCalls,
      deniedError,
    })
);