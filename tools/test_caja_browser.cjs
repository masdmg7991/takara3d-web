/** Local-only multi-product acceptance. Synthetic photos; all external requests blocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(process.env.TAKARA_PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const output = process.env.TAKARA_CAJA_REPORT_DIR;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
const faces = ["frontal", "derecha", "trasera", "izquierda"];
const ready = page => page.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW?.getSnapshot().ready, null, { timeout: 55000 });
async function main() {
  if (output) fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.TAKARA_CHROME_PATH ? { executablePath: process.env.TAKARA_CHROME_PATH } : {}) });
    for (const mobile of [false, true]) {
      const label = mobile ? "mobile" : "desktop";
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      const external = [], errors = [];
      await context.route("**/*", route => {
        const url = route.request().url();
        if (url.startsWith(origin) || /^(data|blob):/.test(url)) return route.continue();
        if (url.startsWith("https://fonts.googleapis.com/")) return route.fulfill({ contentType: "text/css", body: "" });
        if (url.includes("cloudflareinsights.com")) return route.fulfill({ contentType: "text/javascript", body: "" });
        external.push(url.split("?")[0]); return route.abort();
      });
      const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
      await page.goto(origin + "/pedido.html"); await ready(page);
      const buffers = await page.evaluate(() => Array.from({ length: 4 }, (_, i) => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 400;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#e8e8e8"; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#151515"; ctx.fillRect(15 + i * 40, 25, 85, 130);
        ctx.font = "bold 90px sans-serif"; ctx.fillText(String(i + 1), 170, 220);
        ctx.font = "bold 36px sans-serif"; ctx.fillText("TAKARA", 70, 340);
        return canvas.toDataURL("image/png").split(",")[1];
      }));
      await page.locator("[data-takara-photo-input]").setInputFiles({ name: "marco.png", mimeType: "image/png", buffer: Buffer.from(buffers[0], "base64") });
      await ready(page);
      await page.locator('label:has([data-takara-color-proxy="rosewood"])').click(); await ready(page);
      await page.locator(".takara-frame-text-switch").click();
      await page.locator('[data-takara-frame-side-toggle="top"]').click();
      // Leave an incomplete frame text: it cannot block the unrelated box.
      await page.locator('label:has([data-takara-product-option][value="caja"])').click(); await ready(page);
      assert.equal(await page.locator("model-viewer").count(), 1);
      assert.equal(await page.locator("[data-takara-frame-text-config]").isVisible(), false);
      assert.equal(await page.locator(".takara-preview-config-section--format").isVisible(), false);
      assert.equal(await page.locator('[name="personalizacion_marco"]').inputValue(), "");
      assert.equal(await page.locator("[data-takara-summary-text-row]").isVisible(), false);
      assert.equal(await page.locator("[data-takara-summary-product-name]").textContent(), "Caja de luz · 4 fotos");
      assert.equal(await page.locator('[data-takara-color-proxy="negro"]').isChecked(), true);
      assert.equal(await page.locator('[data-takara-base-color="negro"]').isChecked(), true);
      await page.locator('label:has([data-takara-base-color="actual"])').click(); await ready(page);
      const materialColors = await page.locator("model-viewer").evaluate(viewer => ({
        body: Array.from(viewer.model.materials.find(m => m.name === "BOX_BODY").pbrMetallicRoughness.baseColorFactor),
        base: Array.from(viewer.model.materials.find(m => m.name === "BOX_BASE").pbrMetallicRoughness.baseColorFactor)
      }));
      assert.notDeepEqual(materialColors.body, materialColors.base, "Base finish changes independently of the body");
      const initialTarget = await page.locator("model-viewer").evaluate(viewer => {
        if (!viewer.hasAttribute("disable-pan") || !viewer.hasAttribute("disable-tap")) throw new Error("Camera pivot is not locked");
        return { ...viewer.getCameraTarget() };
      });
      const modelCenter = await page.locator("model-viewer").evaluate(viewer => ({ ...viewer.getBoundingBoxCenter() }));
      for (const axis of ["x", "y", "z"]) assert.ok(Math.abs(initialTarget[axis] - modelCenter[axis]) < 1e-6);
      await page.locator("model-viewer").click({position:{x:180,y:130}});
      await page.waitForTimeout(350);
      const afterTap = await page.locator("model-viewer").evaluate(viewer => ({ ...viewer.getCameraTarget() }));
      assert.deepEqual(afterTap, initialTarget, "Tapping a point cannot move the rotation pivot");
      const stageBounds = await page.locator("model-viewer").boundingBox();
      await page.mouse.move(stageBounds.x + stageBounds.width * .5, stageBounds.y + stageBounds.height * .4);
      await page.mouse.down();
      await page.mouse.move(stageBounds.x + stageBounds.width * .65, stageBounds.y + stageBounds.height * .4, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      const afterDrag = await page.locator("model-viewer").evaluate(viewer => ({ ...viewer.getCameraTarget() }));
      assert.deepEqual(afterDrag, initialTarget, "Rotating the product keeps its centre fixed");
      await page.waitForFunction(() => document.querySelector("[data-takara-delivery-product]").textContent.includes("75"));
      const missing = await page.evaluate(() => {
        const p = window.TAKARA_PRODUCT_PREVIEW;
        try { p.assertOrderReady(p.getSelection().files); return ""; } catch (e) { return e.message; }
      });
      assert.match(missing, /cuatro caras/);
      for (const [i, face] of faces.entries()) {
        await page.locator(`[data-takara-caja-photo="${face}"]`).setInputFiles({ name: `cara-${i + 1}.png`, mimeType: "image/png", buffer: Buffer.from(buffers[i], "base64") });
        await ready(page);
      }
      const state = await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot());
      assert.equal(state.product, "CAJA_LITOFANIA_4_FOTOS_100X100");
      assert.ok(Object.values(state.details.photos).every(photo => photo.hasPhoto && photo.size.width === 400));
      assert.equal(await page.locator("[data-takara-caja-photos] img:visible").count(), 4);
      assert.equal(await page.locator(".takara-product-gesture__touch").isVisible(), mobile);
      assert.equal(await page.locator(".takara-product-gesture__desktop").isVisible(), !mobile);
      for (const face of faces) {
        await page.getByRole("button", { name: `Ver cara ${face}`, exact: true }).click();
        await page.waitForTimeout(600);
        if (output && !mobile) await page.locator("[data-takara-product-stage]").screenshot({ path: path.join(output, `cara-${face}.png`) });
      }
      await page.locator("[data-takara-product-reset]").click();
      await page.waitForTimeout(600);
      if (output) {
        await page.locator(".takara-product-customizer").screenshot({ path: path.join(output, `${label}-caja-configurador.png`) });
        await page.locator("[data-takara-product-stage]").screenshot({ path: path.join(output, `${label}-caja-3d.png`) });
      }
      const capture = async () => page.evaluate(async () => {
        const p = window.TAKARA_PRODUCT_PREVIEW, result = await p.capture(p.getSelection().files);
        const bytes = new Uint8Array(await result.blob.arrayBuffer());
        let data = ""; for (const byte of bytes) data += String.fromCharCode(byte);
        return { width: result.width, height: result.height, bytes: bytes.length, data: btoa(data) };
      });
      const on = await capture();
      assert.deepEqual([on.width, on.height], [960, 760]); assert.ok(on.bytes < 900 * 1024);
      await page.locator('[data-takara-litho-mode="off"]').click(); await ready(page);
      const off = await capture(); assert.notEqual(on.data, off.data);
      await page.locator('[data-takara-litho-mode="on"]').click(); await ready(page);
      await page.locator('label:has([data-takara-color-proxy="blanco-mate"])').click(); await ready(page);
      const white = await capture(); assert.notEqual(on.data, white.data);
      await page.locator('label:has([data-takara-color-proxy="negro"])').click(); await ready(page);
      await page.locator('[data-takara-caja-photo="frontal"]').setInputFiles({ name: "rota.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
      await page.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().errorCode === "INVALID_PHOTO");
      await page.locator('[data-takara-caja-photo="frontal"]').setInputFiles({ name: "cara-1.png", mimeType: "image/png", buffer: Buffer.from(buffers[0], "base64") }); await ready(page);
      await page.locator('label:has([data-takara-product-option][value="marco"])').click(); await ready(page);
      assert.equal(await page.locator('[data-takara-color-proxy="rosewood"]').isChecked(), true);
      assert.equal(await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().details.hasPhoto), true);
      assert.equal(await page.locator("[data-takara-frame-text-config]").isVisible(), true);
      await page.locator('label:has([data-takara-product-option][value="caja"])').click(); await ready(page);
      assert.equal(await page.locator('[data-takara-color-proxy="negro"]').isChecked(), true);
      assert.equal(await page.locator('[data-takara-base-color="actual"]').isChecked(), true);
      assert.ok(await page.evaluate(() => Object.values(window.TAKARA_PRODUCT_PREVIEW.getSnapshot().details.photos).every(p => p.hasPhoto)));
      assert.equal(await page.locator("model-viewer").count(), 1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); assert.equal(overflow, false);
      for (const [field, value] of Object.entries({ nombre: "Prueba caja", telefono: "600000000", email: "test@example.invalid" })) {
        await page.locator(`[data-takara-contact-proxy="${field}"]`).fill(value);
      }
      await page.locator("[data-takara-delivery-postal]").fill("28911"); await page.locator("[data-takara-delivery-postal]").blur();
      await page.waitForFunction(() => document.querySelector('[name="modalidad_entrega"]').value !== "");
      for (const key of ["acepta_contacto", "acepta_revision"]) await page.locator(`[data-takara-accept-proxy="${key}"]`).check();
      await page.locator("[data-takara-submit-proxy]").click();
      await page.waitForFunction(() => sessionStorage.getItem("TAKARA_PEDIDO_DRY_RUN_PAYLOAD"), null, { timeout: 30000 });
      const payload = await page.evaluate(() => JSON.parse(sessionStorage.getItem("TAKARA_PEDIDO_DRY_RUN_PAYLOAD")));
      assert.equal(payload.producto.codigo_producto, state.product);
      assert.equal(payload.producto.precio_base_eur, "75.00");
      assert.equal(payload.producto.precio_extras_eur, "0.00");
      assert.equal(payload.producto.personalizacion_marco, null);
      assert.equal(payload.producto.color_cuerpo, "Negro");
      assert.equal(payload.producto.color_peana, "Madera clara");
      assert.equal(payload.producto.atributos.color_peana_codigo, "actual");
      assert.equal(payload.archivos.fotos.length, 4);
      assert.deepEqual(payload.archivos.fotos.map(p => p.cara), faces);
      assert.ok(payload.archivos.fotos.every(p => p.foto_base64_presente && !p.foto_base64));
      assert.equal(payload.archivos.ficha_visual_estado, "generada");
      const direct = await context.newPage(), requestedModels = [];
      direct.on("request", request => { if (request.url().includes(".glb")) requestedModels.push(request.url()); });
      await direct.goto(origin + "/pedido.html?producto=caja"); await ready(direct);
      assert.equal(await direct.locator('[data-takara-product-option][value="caja"]').isChecked(), true);
      assert.ok(requestedModels.some(url => url.includes("/caja/")));
      assert.ok(requestedModels.every(url => !url.includes("/marco/")), "Direct box entry must not download a frame model");
      await direct.close();
      const catalogFailure = await context.newPage(); let failCatalog = true;
      await catalogFailure.route("**/assets/data/catalogo.json", route => failCatalog ? route.abort() : route.continue());
      await catalogFailure.goto(origin + "/pedido.html?producto=caja");
      await catalogFailure.locator("[data-takara-product-retry]").waitFor({ state: "visible" });
      assert.equal(await catalogFailure.locator("[data-takara-delivery-product]").textContent(), "Pendiente");
      failCatalog = false;
      await catalogFailure.locator("[data-takara-product-retry]").click(); await ready(catalogFailure);
      await catalogFailure.waitForFunction(() => document.querySelector("[data-takara-delivery-product]").textContent.includes("75"));
      await catalogFailure.close();
      assert.deepEqual(external, []); assert.deepEqual(errors, []);
      if (output) {
        fs.writeFileSync(path.join(output, `${label}-pedido-caja.json`), JSON.stringify(payload, null, 2));
        fs.writeFileSync(path.join(output, `${label}-captura.jpg`), Buffer.from(on.data, "base64"));
      }
      console.log(`[PASS] ${label}: four faces, colors, light, capture, invalid photo recovery, retained product drafts, 75 EUR, four-photo local order, no external requests`);
      await context.close();
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
