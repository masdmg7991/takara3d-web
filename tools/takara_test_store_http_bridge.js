const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function textOutput(content) {
  return {
    content,
    mimeType: "",
    setMimeType(value) {
      this.mimeType = value;
      return this;
    },
  };
}

const context = {
  console,
  Object,
  String,
  JSON,
  Error,
  TAKARA_STORE_PUBLIC_API_VERSION: "TAKARA_STORE_PUBLIC_API_V1",
  ContentService: {
    MimeType: {
      JSON: "application/json",
      JAVASCRIPT: "application/javascript",
    },
    createTextOutput: textOutput,
  },
  storeDomainError_(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  },
  getStorePublicAction_(event) {
    return String(
      event && event.parameter ? event.parameter.action || "" : ""
    ).trim();
  },
  resolveStorePublicApi_(event) {
    const action = String(event.parameter.action || "").trim();
    if (action !== "store.resolve") {
      return {
        ok: false,
        api_version: "TAKARA_STORE_PUBLIC_API_V1",
        error: { code: "STORE_PUBLIC_ACTION_INVALID" },
      };
    }

    return {
      ok: true,
      api_version: "TAKARA_STORE_PUBLIC_API_V1",
      store_context: {
        version: "TAKARA_STORE_CONTEXT_V1",
        store_ref: String(event.parameter.store_ref || ""),
        display_name: "Foto García",
        status: "ACTIVE",
      },
    };
  },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(
    path.join(
      root,
      "apps-script",
      "takara-pedidos-web",
      "StoreHttpBridge.gs"
    ),
    "utf8"
  ),
  context,
  { filename: "StoreHttpBridge.gs" }
);

let checks = 0;
function ok(condition, message) {
  if (!condition) {
    throw new Error("[FAIL] " + message);
  }
  checks += 1;
}

function event(action, storeRef, prefix) {
  const parameter = {};
  if (action !== undefined) parameter.action = action;
  if (storeRef !== undefined) parameter.store_ref = storeRef;
  if (prefix !== undefined) parameter.prefix = prefix;
  return { parameter };
}

ok(
  context.routeStorePublicGet_(event()) === null,
  "health GET is not intercepted"
);
ok(
  context.routeStorePublicGet_(event("other.read")) === null,
  "non-Store action is not intercepted"
);
ok(
  context.isStoreHttpRequest_(event("store.resolve")),
  "store.resolve is routed"
);
ok(
  context.isStoreHttpRequest_(event("store.create")),
  "unsupported Store action still reaches fail-closed Store API"
);

const json = context.routeStorePublicGet_(
  event("store.resolve", "st_123456789012345678901234")
);
ok(json.mimeType === "application/json", "plain Store GET returns JSON");
const parsed = JSON.parse(json.content);
ok(parsed.ok === true, "JSON Store resolve succeeds");
ok(
  parsed.store_context.store_ref === "st_123456789012345678901234",
  "JSON contains authoritative store_ref"
);
ok(
  !Object.prototype.hasOwnProperty.call(parsed.store_context, "store_id"),
  "JSON excludes store_id"
);

const callback = "takaraStoreCb_ABC12345";
const jsonp = context.routeStorePublicGet_(
  event(
    "store.resolve",
    "st_123456789012345678901234",
    callback
  )
);
ok(
  jsonp.mimeType === "application/javascript",
  "browser Store GET returns JavaScript"
);
ok(
  jsonp.content.startsWith(callback + "("),
  "JSONP invokes exact validated callback"
);
ok(jsonp.content.endsWith(");"), "JSONP closes callback safely");
ok(
  jsonp.content.includes('"TAKARA_STORE_CONTEXT_V1"'),
  "JSONP contains StoreContext contract"
);
ok(
  jsonp.content.indexOf("store_id") === -1,
  "JSONP excludes store_id"
);

const unsupported = context.routeStorePublicGet_(
  event(
    "store.create",
    "st_123456789012345678901234",
    "takaraStoreCb_ZYX98765"
  )
);
ok(
  unsupported.content.includes("STORE_PUBLIC_ACTION_INVALID"),
  "unsupported Store action fails closed instead of health fallback"
);

for (const prefix of [
  "alert",
  "takaraStoreCb_short",
  "takaraStoreCb_bad-name",
  "takaraStoreCb_x);alert(1);//",
  "window.takaraStoreCb_ABC12345",
  " takaraStoreCb_ABC12345 extra",
]) {
  const response = context.routeStorePublicGet_(
    event("store.resolve", "st_123456789012345678901234", prefix)
  );
  ok(
    response.mimeType === "application/json",
    "invalid callback returns non-executable JSON: " + prefix
  );
  const body = JSON.parse(response.content);
  ok(body.ok === false, "invalid callback fails: " + prefix);
  ok(
    body.error.code === "STORE_PUBLIC_CALLBACK_INVALID",
    "invalid callback error code: " + prefix
  );
  ok(
    response.content.indexOf(prefix + "(") === -1,
    "invalid callback never reflected as executable code: " + prefix
  );
}

ok(
  typeof context.createStoreHttp_ === "undefined",
  "bridge exposes no public create"
);
ok(
  typeof context.updateStoreHttp_ === "undefined",
  "bridge exposes no public update"
);
ok(
  typeof context.deleteStoreHttp_ === "undefined",
  "bridge exposes no public delete"
);

console.log(
  "[TAKARA_STORE_HTTP_BRIDGE_TEST_OK] " +
    JSON.stringify({ checks })
);