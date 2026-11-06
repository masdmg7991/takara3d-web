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
assert.equal(drafts.state.baseColor, "negro");
assert.equal(drafts.state.photo, undefined);
assert.equal(PRODUCTS.caja.hasText, false);
assert.equal(PRODUCTS.caja.hasFormat, false);
assert.throws(() => CAJA_PRODUCT.validateCapture(drafts.state), /cuatro caras/);
const photos = Object.freeze(Object.fromEntries(CAJA_FACES.map(face => [face, { type: "image/png", size: 300 }])));
drafts.update({ photos, color: "blanco-mate", baseColor: "rosewood", light: "off" });
assert.equal(drafts.state.color, "blanco-mate");
assert.equal(drafts.state.baseColor, "rosewood");
CAJA_PRODUCT.validateCapture(drafts.state);
const boxState = drafts.state;
drafts.select("marco"); assert.equal(drafts.state, frameState);
drafts.select("caja"); assert.equal(drafts.state, boxState);
assert.ok(Object.isFrozen(drafts.state));
assert.throws(() => drafts.select("unknown"), /desconocido/);
assert.throws(() => drafts.update({ color: "not-a-color" }), /Color/);
assert.throws(() => drafts.update({ baseColor: "not-a-color" }), /peana/);
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
const baseShell = gltf.meshes.find(mesh => mesh.name === "Base_Circular_V2").primitives[0];
assert.equal(gltf.materials[baseShell.material].name, "BOX_BASE");
const shellPositions = floats(baseShell.attributes.POSITION);
const indexAccessor = gltf.accessors[baseShell.indices], indexView = gltf.bufferViews[indexAccessor.bufferView];
assert.equal(indexAccessor.componentType, 5125);
const indexOffset = (indexView.byteOffset || 0) + (indexAccessor.byteOffset || 0);
const indices = Array.from({ length: indexAccessor.count }, (_, i) => binary.readUInt32LE(indexOffset + i * 4));
let topFace = false;
for (let i = 0; i < indices.length; i += 3) {
  const [a, b, c] = indices.slice(i, i + 3).map(index => shellPositions.slice(index * 3, index * 3 + 3));
  if ([a, b, c].every(v => Math.abs(v[1]) < 1e-6)) {
    const normalY = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    if (normalY > 1e-8) topFace = true;
  }
}
assert.ok(topFace, "Circular pedestal closed face points upwards after the flip");
for (const [name, angle, width, height, frontRadius] of [
  ["Interruptor", Math.PI / 8, .021, .015, .0693],
  ["USB Type-C", -Math.PI / 8, .0158, .0093, .0665303]
]) {
  const hardware = gltf.meshes.find(mesh => mesh.name === name).primitives[0];
  const coordinates = floats(hardware.attributes.POSITION);
  const tangent = [], radial = [], vertical = [];
  for (let i = 0; i < coordinates.length; i += 3) {
    tangent.push(coordinates[i] * Math.cos(angle) - coordinates[i + 2] * Math.sin(angle));
    radial.push(coordinates[i] * Math.sin(angle) + coordinates[i + 2] * Math.cos(angle));
    vertical.push(coordinates[i + 1]);
  }
  assert.ok(Math.abs((Math.min(...tangent) + Math.max(...tangent)) / 2) < 1e-6, `${name}: centred on its opening tangent`);
  assert.ok(Math.abs(Math.max(...tangent) - Math.min(...tangent) - width) < 1e-6, `${name}: CAD flange width unchanged`);
  assert.ok(Math.abs((Math.min(...vertical) + Math.max(...vertical)) / 2 + .0095) < 1e-6, `${name}: centred at opening height`);
  assert.ok(Math.abs(Math.max(...vertical) - Math.min(...vertical) - height) < 1e-6, `${name}: CAD height unchanged`);
  assert.ok(Math.abs(Math.max(...radial) - frontRadius) < 1e-6, `${name}: front face points outwards and rear stays inside`);
}
assert.ok(bytes.length < 1_000_000, "Box model remains under 1 MB without discarding triangles");
console.log("TAKARA_PRODUCTS_3D_OK: isolated drafts, capabilities, photo validation, four physical surfaces and upright UVs");
