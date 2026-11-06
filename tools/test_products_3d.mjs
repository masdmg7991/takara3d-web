import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ProductDrafts, PRODUCTS } from "../assets/js/3d/products.js";
import { CAJA_PRODUCT, CAJA_FACES } from "../assets/js/3d/caja-product.js";

const drafts = new ProductDrafts();
const framePhoto = { type: "image/png", size: 200 };
drafts.update({ color: "rosewood", photo: framePhoto });
const frameState = drafts.state;
drafts.select("caja");
assert.equal(drafts.state.color, "negro");
assert.equal(drafts.state.photo, undefined);
assert.equal(PRODUCTS.caja.hasText, false);
assert.equal(PRODUCTS.caja.hasFormat, false);
assert.throws(() => CAJA_PRODUCT.validateCapture(drafts.state), /cuatro caras/);
const photos = Object.freeze(Object.fromEntries(CAJA_FACES.map(face => [face, { type: "image/png", size: 300 }])));
drafts.update({ photos, color: "blanco-mate", light: "off" });
CAJA_PRODUCT.validateCapture(drafts.state);
const boxState = drafts.state;
drafts.select("marco"); assert.equal(drafts.state, frameState);
drafts.select("caja"); assert.equal(drafts.state, boxState);
assert.ok(Object.isFrozen(drafts.state));
assert.throws(() => drafts.select("unknown"), /desconocido/);
assert.throws(() => drafts.update({ color: "not-a-color" }), /Color/);
assert.equal(drafts.state, boxState, "Invalid configuration cannot replace the retained draft");
assert.throws(() => drafts.update({ photos: { unknown: framePhoto } }), /Cara/);
assert.throws(() => drafts.update({ photos: { frontal: { type: "text/plain", size: 3 } } }), /JPG/);
assert.throws(() => drafts.update({ photos: Object.fromEntries(CAJA_FACES.map(face => [face, { type: "image/png", size: 6 * 1024 * 1024 }])) }), /total/);

// Physical photo orientation is an asset contract: no inverted or shared face UVs.
const bytes = readFileSync(new URL("../assets/models/caja/cuatro-fotos.glb", import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
const binary = bytes.subarray(28 + jsonLength);
function floats(index) {
  const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
  assert.equal(accessor.componentType, 5126);
  const count = accessor.count * { VEC2: 2, VEC3: 3 }[accessor.type];
  const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  return Array.from({ length: count }, (_, i) => binary.readFloatLE(offset + 4 * i));
}
const panels = gltf.meshes.filter(mesh => /^photo-/.test(mesh.name));
assert.equal(panels.length, 4);
const materials = new Set();
for (const mesh of panels) {
  const primitive = mesh.primitives[0], uv = floats(primitive.attributes.TEXCOORD_0);
  const positions = floats(primitive.attributes.POSITION);
  const ys = positions.filter((_, i) => i % 3 === 1), low = Math.min(...ys), high = Math.max(...ys);
  assert.ok(Math.abs(high - low - .1) < 1e-6, "Photo height is 100 mm");
  for (let i = 0; i < ys.length; i++) assert.equal(uv[2 * i + 1], Math.abs(ys[i] - low) < 1e-6 ? 0 : 1,
    "Canvas textures must read upright on the approved GLB UV orientation");
  const material = gltf.materials[primitive.material]; materials.add(material.name);
  assert.ok(material.normalTexture && material.emissiveTexture && material.pbrMetallicRoughness.baseColorTexture);
}
assert.equal(materials.size, 4, "Each face has an independent photo material");
assert.ok(bytes.length < 1_000_000, "Box model remains under 1 MB without discarding triangles");
console.log("TAKARA_PRODUCTS_3D_OK: isolated drafts, capabilities, photo validation, four physical surfaces and upright UVs");
