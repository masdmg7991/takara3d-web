import assert from "node:assert/strict";
import { ProductViewer } from "../assets/js/3d/product-viewer.js";

const originalDocument = globalThis.document;
const originalAnimation = globalThis.requestAnimationFrame;
class Element {
  constructor() { this.style = {}; this.attributes = {}; this.listeners = {}; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  appendChild() {}
  fire(key) { this.listeners[key]?.(); }
  remove() { this.removed = true; }
}
globalThis.document = { baseURI: "http://localhost/pedido.html", createElement: () => new Element() };
globalThis.requestAnimationFrame = fn => queueMicrotask(fn);
let release;
let disposed = 0;
let applied = [];
const profile = {
  id: "independent-test-product", defaults: { variant: "a", value: 0 },
  variants: { a: { src: "a.glb" }, b: { src: "b.glb" } },
  createController() {
    return {
      async apply(state, current) {
        if (state.value === 1) await new Promise(resolve => { release = resolve; });
        if (current()) applied.push(state.value);
      },
      dispose() { disposed++; }
    };
  }
};
let app;
try {
  app = new ProductViewer(new Element(), profile);
  app.viewer.fire("load"); await app.pending;
  assert.equal(app.ready, true);
  app.update({ value: 1 });
  await Promise.resolve();
  assert.equal(app.ready, false);
  app.update({ value: 2 }); release(); await app.pending;
  assert.equal(app.ready, true);
  assert.deepEqual(applied, [0, 2], "Obsolete async work never becomes current");
  const oldViewer = app.viewer;
  app.update({ variant: "b" });
  assert.equal(oldViewer.removed, true);
  oldViewer.fire("load");
  assert.equal(app.controller, null, "Detached model load cannot attach a stale controller");
  app.viewer.fire("error");
  assert.equal(app.ready, false);
  assert.equal(app.getSnapshot().errorCode, "VIEWER_UNAVAILABLE");
  app.update({ value: 3 });
  assert.equal(app.getSnapshot().errorCode, "VIEWER_UNAVAILABLE", "Editing cannot hide a model load failure");
  app.retry(); app.viewer.fire("load"); await app.pending;
  assert.equal(app.ready, true, "Retry rebuilds the model");
  const revision = app.revision;
  assert.throws(() => app.update({ variant: "missing" }), RangeError);
  assert.throws(() => app.update({ variant: "toString" }), RangeError);
  assert.throws(() => app.update({ variant: "__proto__" }), RangeError);
  assert.equal(app.revision, revision, "Invalid configuration cannot corrupt current state");
  app.dispose(); app.dispose();
  assert.equal(disposed, 2, "Each initialized product controller is disposed once");
  assert.throws(() => app.update({}), /cerrado/);
  console.log("TAKARA_3D_LIFECYCLE_OK: latest revision, stale load, failure, retry, cleanup");
} finally {
  app?.dispose();
  globalThis.document = originalDocument;
  globalThis.requestAnimationFrame = originalAnimation;
}
