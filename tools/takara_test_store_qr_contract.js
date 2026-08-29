const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let checks = 0;

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

const document = {
  addEventListener() {},
  querySelector() { return null; },
  head: { appendChild() {} },
  createElement() { return {}; },
};

const window = {
  location: { search: "" },
};

const context = {
  window,
  document,
  Object,
  String,
  Number,
  Error,
  Promise,
  Uint32Array,
  URL,
  URLSearchParams,
  Array,
  encodeURIComponent,
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(
    path.join(root, "assets", "js", "takara-store-public.js"),
    "utf8"
  ),
  context,
  { filename: "takara-store-public.js" }
);

const api = window.TAKARA_STORE_PUBLIC_CLIENT_V1;
const ref = "st_123456789012345678901234";
const canonical =
  "https://takara3d.es/tienda/?s=" + ref;

ok(Boolean(api), "Store public API exported");
ok(api.buildStorePublicUrl(ref) === canonical, "build exact canonical URL");
ok(api.isStorePublicUrl(canonical), "canonical URL accepted");

const parsed = api.parseStorePublicUrl(canonical);
ok(parsed.version === "TAKARA_STORE_QR_URL_V1", "QR contract version");
ok(parsed.store_ref === ref, "parsed public ref");
ok(parsed.url === canonical, "parsed canonical URL");
ok(
  !Object.prototype.hasOwnProperty.call(parsed, "store_id"),
  "parsed result excludes store_id"
);
ok(Object.isFrozen(parsed), "parsed contract frozen");

expectCode(
  () => api.buildStorePublicUrl("STO_000001"),
  "STORE_PUBLIC_CODE_INVALID",
  "internal id build"
);
expectCode(
  () => api.buildStorePublicUrl("st_short"),
  "STORE_PUBLIC_CODE_INVALID",
  "short ref build"
);

for (const [url, label] of [
  ["http://takara3d.es/tienda/?s=" + ref, "http"],
  ["https://www.takara3d.es/tienda/?s=" + ref, "www host"],
  ["https://evil.example/tienda/?s=" + ref, "foreign host"],
  ["https://takara3d.es/qr?s=" + ref, "Product QR route"],
  ["https://takara3d.es/tienda?s=" + ref, "missing canonical slash"],
  ["https://takara3d.es/tienda/?store_id=STO_000001", "store_id"],
  ["https://takara3d.es/tienda/?s=" + ref + "&utm_source=x", "extra query"],
  ["https://takara3d.es/tienda/?s=" + ref + "&s=" + ref, "duplicate s"],
  ["https://takara3d.es/tienda/?s=" + ref + "#x", "hash"],
  ["https://user:pass@takara3d.es/tienda/?s=" + ref, "credentials"],
  ["https://takara3d.es:443/tienda/?s=" + ref, "explicit default port"],
]) {
  expectCode(
    () => api.parseStorePublicUrl(url),
    "STORE_QR_URL_INVALID",
    label
  );
  ok(!api.isStorePublicUrl(url), label + " boolean reject");
}

expectCode(
  () => api.parseStorePublicUrl("https://takara3d.es/tienda/?s=st_short"),
  "STORE_PUBLIC_CODE_INVALID",
  "invalid public code parse"
);

ok(
  api.readStoreRef("?s=" + ref) === ref,
  "existing query parser preserved"
);
ok(
  api.isValidStoreRef(ref),
  "existing public ref validation preserved"
);

console.log(
  "[TAKARA_STORE_QR_CONTRACT_TEST_OK] " +
    JSON.stringify({ checks })
);