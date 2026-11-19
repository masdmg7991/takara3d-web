"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("assets/js/takara-audience-counts.js", "utf8");
const endpoint = "https://script.google.com/macros/s/abc123/exec";

function run(page, { enabled = true, iframe = false, search = "", path = "/", config = {} } = {}) {
  const requests = [];
  const win = {
    navigator: { sendBeacon: () => false },
    fetch: (url, options) => { requests.push({ url, options }); return Promise.resolve({ ok: true }); },
    location: { search, pathname: path },
    TAKARA_AUDIENCE_CONFIG: Object.assign({
      enabled, endpoint
    }, config)
  };
  win.top = iframe ? {} : win;
  win.self = win;
  const doc = { currentScript: { getAttribute: () => page }, prerendering: false };
  vm.runInNewContext(source, { window: win, document: doc, URLSearchParams, Promise });
  return { requests, win };
}

assert.equal(run("home", { enabled: false }).requests.length, 0);
assert.equal(run("home", { config: { endpoint: "" } }).requests.length, 0);
assert.equal(run("home", { iframe: true }).requests.length, 0);
assert.equal(run("order", { search: "?channel=store" }).requests.length, 0);
assert.equal(run("not_found", { path: "/tienda/multiprint" }).requests.length, 0);
const web = run("products");
assert.equal(web.requests.length, 1);
assert.equal(web.requests[0].url, endpoint);
assert.equal(web.requests[0].options.credentials, "omit");
const webBody = JSON.parse(web.requests[0].options.body);
assert.deepEqual(webBody, { kind: "web", page: "products" });
const store = run("store");
const capture = store.win.TAKARA_STORE_ANALYTICS_PILOT_V1.captureVerifiedPageview;
assert.equal(store.requests.length, 0);
assert.equal(capture({ version: "TAKARA_STORE_CONTEXT_V1", status: "PAUSED", store_ref: "st_" + "a".repeat(32) }), false);
assert.equal(capture({ version: "TAKARA_STORE_CONTEXT_V1", status: "ACTIVE", store_ref: "st_" + "a".repeat(32) }, "multiprint"), true);
assert.equal(capture({ version: "TAKARA_STORE_CONTEXT_V1", status: "ACTIVE", store_ref: "st_" + "a".repeat(32) }), false);
assert.equal(store.requests.length, 1);
assert.deepEqual(JSON.parse(store.requests[0].options.body), {
  kind: "store", store_ref: "st_" + "a".repeat(32), store_slug: "multiprint"
});
console.log("P26_AUDIENCE_COUNTS_OK");
