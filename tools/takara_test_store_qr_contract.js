const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, label) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
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
  location: { search: "", pathname: "/tienda/" },
  history: { replaceState() {} },
};

const context = {
  window, document, Object, String, Number, Error, Promise,
  Uint32Array, URL, URLSearchParams, Array, encodeURIComponent,
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, "assets", "js", "takara-store-public.js"), "utf8"),
  context,
  { filename: "takara-store-public.js" }
);

const api = window.TAKARA_STORE_PUBLIC_CLIENT_V1;
const ref = "st_123456789012345678901234";
const slug = "takara-qa-f5f-witness";
const legacyUrl = "https://takara3d.es/tienda/?s=" + ref;
const prettyUrl = "https://takara3d.es/tienda/" + slug;

ok(Boolean(api), "Store public API exported");
ok(api.buildStorePublicUrl(ref) === legacyUrl, "legacy URL remains stable");
ok(api.buildStorePrettyUrl(slug) === prettyUrl, "build exact pretty URL");
ok(api.isStorePublicUrl(legacyUrl), "legacy V1 URL accepted");
ok(api.isStorePublicUrl(prettyUrl), "pretty V2 URL accepted");

const legacy = api.parseStorePublicUrl(legacyUrl);
ok(legacy.version === "TAKARA_STORE_QR_URL_V1", "legacy QR contract version");
ok(legacy.store_ref === ref, "legacy parsed public ref");
ok(legacy.url === legacyUrl, "legacy canonical URL");

const pretty = api.parseStorePublicUrl(prettyUrl);
ok(pretty.version === "TAKARA_STORE_QR_URL_V2", "pretty QR contract version");
ok(pretty.store_slug === slug, "pretty parsed slug");
ok(pretty.url === prettyUrl, "pretty canonical URL");
ok(!Object.prototype.hasOwnProperty.call(pretty, "store_id"), "pretty result excludes store_id");
ok(!Object.prototype.hasOwnProperty.call(pretty, "store_ref"), "pretty URL does not expose opaque ref");
ok(Object.isFrozen(pretty), "pretty contract frozen");

ok(api.readStoreRef("?s=" + ref) === ref, "legacy query parser preserved");
ok(api.readStoreSlug("", "/tienda/" + slug) === slug, "pretty path parser resolves slug");
ok(api.readStoreSlug("?slug=" + slug, "/tienda/") === slug, "bridge query resolves slug");
ok(api.isValidStoreRef(ref), "legacy public ref validation preserved");
ok(api.isValidStoreSlug(slug), "slug validation exported");

const resolver = api.buildResolveSlugUrl(
  "https://script.google.com/macros/s/example/exec",
  slug,
  "takaraStoreCb_abc12345"
);
ok(resolver.includes("action=store.resolve"), "slug resolver keeps action");
ok(resolver.includes("store_slug=" + slug), "slug resolver transports slug");
ok(!resolver.includes("store_id"), "slug resolver never transports store_id");

expectCode(
  () => api.buildStorePrettyUrl("Takara QA"),
  "STORE_SLUG_INVALID",
  "noncanonical slug build"
);
expectCode(
  () => api.buildStorePublicUrl("STO_000001"),
  "STORE_PUBLIC_CODE_INVALID",
  "internal id legacy build"
);

for (const [url, label] of [
  ["http://takara3d.es/tienda/" + slug, "pretty http"],
  ["https://www.takara3d.es/tienda/" + slug, "pretty www host"],
  ["https://evil.example/tienda/" + slug, "pretty foreign host"],
  ["https://takara3d.es/tienda/" + slug + "/", "pretty trailing slash"],
  ["https://takara3d.es/tienda/" + slug + "?utm_source=x", "pretty extra query"],
  ["https://takara3d.es/tienda/" + slug + "#x", "pretty hash"],
  ["https://takara3d.es/tienda/Takara-QA", "pretty uppercase"],
  ["http://takara3d.es/tienda/?s=" + ref, "legacy http"],
  ["https://www.takara3d.es/tienda/?s=" + ref, "legacy www host"],
  ["https://evil.example/tienda/?s=" + ref, "legacy foreign host"],
  ["https://takara3d.es/qr?s=" + ref, "Product QR route"],
  ["https://takara3d.es/tienda?s=" + ref, "missing canonical slash"],
  ["https://takara3d.es/tienda/?store_id=STO_000001", "store_id"],
  ["https://takara3d.es/tienda/?s=" + ref + "&utm_source=x", "legacy extra query"],
  ["https://takara3d.es/tienda/?s=" + ref + "&s=" + ref, "duplicate s"],
  ["https://takara3d.es/tienda/?s=" + ref + "#x", "legacy hash"],
  ["https://user:pass@takara3d.es/tienda/?s=" + ref, "credentials"],
  ["https://takara3d.es:443/tienda/?s=" + ref, "explicit default port"],
]) {
  expectCode(() => api.parseStorePublicUrl(url), "STORE_QR_URL_INVALID", label);
  ok(!api.isStorePublicUrl(url), label + " boolean reject");
}

const bridge = fs.readFileSync(path.join(root, "404.html"), "utf8");
ok(
  bridge.includes('"/tienda/?slug=" + encodeURIComponent(match[1])'),
  "404 bridge routes only to Store slug bootstrap"
);
ok(
  bridge.includes("window.location.search || window.location.hash"),
  "404 bridge rejects noncanonical query/hash"
);
ok(
  bridge.includes("var match = /^") &&
    bridge.includes("window.location.pathname"),
  "404 bridge is scoped to Store pathname"
);
ok(
  bridge.includes("?)$/.exec("),
  "404 bridge accepts only exact pretty path without trailing slash"
);
ok(
  !bridge.includes("cloudflareinsights") &&
    !bridge.includes("data-cf-beacon"),
  "404 Store fallback has no third-party analytics"
);

console.log(
  "[TAKARA_STORE_QR_CONTRACT_TEST_OK] " +
    JSON.stringify({ checks, pretty_version: "TAKARA_STORE_QR_URL_V2", legacy: true })
);
