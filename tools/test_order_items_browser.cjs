/** Complete mixed-order acceptance in Chromium. Synthetic photos; Google services mocked. */
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), http = require("node:http");
const { chromium } = require(process.env.TAKARA_PLAYWRIGHT_MODULE || "playwright");
const { createHarness, previewEmail } = require("./takara_test_order_items.js");
const root = path.resolve(__dirname, ".."), output = process.env.TAKARA_ITEMS_REPORT_DIR;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream"); fs.createReadStream(file).pipe(res);
});
const ready = page => page.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW?.getSnapshot().ready, null, { timeout: 55000 });
const choose = (page, key) => page.locator(`label:has([data-takara-product-option][value="${key}"])`).click();
async function save(page, count) {
  await page.locator("[data-takara-cart-save]").click();
  await page.waitForFunction(count => document.querySelectorAll("[data-takara-cart-item]").length === count && !window.TAKARA_ORDER_CART.editing(), count, { timeout: 40000 });
}
async function main() {
  if (output) fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.TAKARA_CHROME_PATH ? { executablePath: process.env.TAKARA_CHROME_PATH } : {}) });
    for (const mobile of [false, true]) {
      const label = mobile ? "mobile" : "desktop", errors = [], external = [];
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      await context.route("**/*", route => {
        const url = route.request().url();
        if (url.startsWith(origin) || /^(data|blob):/.test(url)) return route.continue();
        if (url.includes("fonts.googleapis.com")) return route.fulfill({ contentType: "text/css", body: "" });
        if (url.includes("cloudflareinsights.com")) return route.fulfill({ contentType: "text/javascript", body: "" });
        external.push(url.split("?")[0]); return route.abort();
      });
      const page = await context.newPage(); let rawPayload = null;
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", async msg => {
        if (msg.type() === "log" && msg.text().startsWith("[Takara pedido dry-run payload completo]")) rawPayload = await msg.args()[1].jsonValue();
      });
      await page.goto(origin + "/pedido.html"); await ready(page);
      const images = await page.evaluate(() => Array.from({ length: 6 }, (_, i) => {
        const c = document.createElement("canvas"); c.width = i === 5 ? 640 : 400; c.height = i === 4 ? 600 : 400;
        const x = c.getContext("2d"); x.fillStyle = "#eee"; x.fillRect(0, 0, c.width, c.height);
        x.fillStyle = "#111"; x.fillRect(20 + i * 20, 20, 80, 110); x.font = "bold 60px sans-serif";
        x.fillText(i < 4 ? "CARA " + (i + 1) : i === 4 ? "VERTICAL" : "HORIZONTAL", 25, c.height / 2);
        return c.toDataURL("image/png").split(",")[1];
      }));
      const photo = (i, name) => ({ name, mimeType: "image/png", buffer: Buffer.from(images[i], "base64") });
      await page.locator("[data-takara-photo-input]").setInputFiles(photo(4, "marco-vertical.png")); await ready(page);
      await page.locator(".takara-frame-text-switch").click(); await page.locator('[data-takara-frame-side-toggle="top"]').click();
      await page.locator('[data-takara-frame-text-input="top"]').fill("MI TAKARA"); await ready(page); await save(page, 1);
      assert.equal(await page.getByRole("button", { name: "Editar A01", exact: true }).isEnabled(), true);
      await choose(page, "caja"); await ready(page);
      for (const [i, face] of ["frontal", "derecha", "trasera", "izquierda"].entries()) {
        await page.locator(`[data-takara-caja-photo="${face}"]`).setInputFiles(photo(i, `caja-uno-${face}.png`)); await ready(page);
      }
      await page.locator('label:has([data-takara-base-color="actual"])').click(); await ready(page); await save(page, 2);
      await page.locator('label:has([data-takara-color-proxy="rosewood"])').click();
      await page.locator('label:has([data-takara-base-color="blanco-mate"])').click(); await ready(page);
      for (const [i, face] of ["frontal", "derecha", "trasera", "izquierda"].entries()) {
        await page.locator(`[data-takara-caja-photo="${face}"]`).setInputFiles(photo(3 - i, `caja-dos-${face}.png`)); await ready(page);
      }
      await save(page, 3);
      await choose(page, "marco"); await ready(page);
      await page.locator(".takara-frame-text-switch").click();
      await page.locator("[data-takara-photo-input]").setInputFiles(photo(5, "marco-horizontal.png")); await ready(page); await save(page, 4);
      assert.equal(await page.evaluate(() => window.TAKARA_ORDER_CART.getQuote().productSubtotal), 224);
      await page.getByRole("button", { name: "Editar A02", exact: true }).click(); await ready(page);
      assert.equal(await page.locator('[data-takara-base-color="actual"]').isChecked(), true);
      assert.ok((await page.locator('[data-takara-caja-photo="frontal"]').evaluate(input => input.files[0].name)).startsWith("caja-uno"));
      await page.locator('label:has([data-takara-base-color="ebano"])').click(); await ready(page); await save(page, 4);
      const saved = await page.evaluate(() => window.TAKARA_ORDER_CART.getItems());
      assert.equal(saved[1].producto.color_peana, "Ébano"); assert.equal(saved[2].producto.color_peana, "Blanco mate");
      await page.getByLabel("Cantidad de A03", { exact: true }).fill("2"); await page.getByLabel("Cantidad de A03", { exact: true }).blur();
      assert.equal(await page.evaluate(() => window.TAKARA_ORDER_CART.getQuote().productSubtotal), 299);
      await page.getByLabel("Cantidad de A03", { exact: true }).fill("1"); await page.getByLabel("Cantidad de A03", { exact: true }).blur();
      await page.getByRole("button", { name: "Quitar A04", exact: true }).click();
      assert.equal(await page.locator("[data-takara-cart-item]").count(), 3);
      await choose(page, "marco"); await ready(page); await save(page, 4);
      await page.getByRole("button", { name: "Editar A01", exact: true }).click(); await ready(page);
      assert.equal(await page.locator('[data-takara-frame-text-input="top"]').inputValue(), "MI TAKARA");
      assert.equal(await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().state.variant), "vertical");
      await page.locator("[data-takara-cart-cancel]").click(); await ready(page);
      // An unfinished draft must not contaminate the four saved articles at checkout.
      await page.locator(".takara-frame-text-switch").click(); await page.locator('[data-takara-frame-side-toggle="top"]').click();
      for (const [key, value] of Object.entries({ nombre: "Prueba de pedido mixto", telefono: "600000000", email: "test@example.invalid" })) {
        await page.locator(`[data-takara-contact-proxy="${key}"]`).fill(value);
      }
      await page.locator("[data-takara-delivery-postal]").fill("28911"); await page.locator("[data-takara-delivery-postal]").blur();
      await page.waitForFunction(() => document.querySelector('[name="modalidad_entrega"]').value !== "");
      for (const key of ["acepta_contacto", "acepta_revision"]) await page.locator(`[data-takara-accept-proxy="${key}"]`).check();
      await page.locator("[data-takara-submit-proxy]").click();
      await page.waitForFunction(() => sessionStorage.getItem("TAKARA_PEDIDO_DRY_RUN_PAYLOAD"), null, { timeout: 30000 });
      for (let n = 0; !rawPayload && n < 20; n++) await page.waitForTimeout(100);
      assert.ok(rawPayload); assert.equal(rawPayload.payload_version, "TAKARA_WEB_ORDER_PAYLOAD_V3"); assert.equal(rawPayload.articulos.length, 4);
      assert.equal(rawPayload.articulos[0].producto.personalizacion_marco.lados.top, "MI TAKARA");
      assert.equal(rawPayload.articulos[3].producto.personalizacion_marco, null);
      assert.equal(rawPayload.articulos[3].producto.variante_codigo, "horizontal");
      assert.equal(rawPayload.totales.subtotal_productos_eur, "224.00");
      for (const item of rawPayload.articulos.filter(item => item.producto.codigo_producto.includes("CAJA_"))) assert.equal(item.archivos.ficha_visual_base64, undefined);
      const retry = await page.evaluate(() => window.TAKARA_ORDER_ITEMS_V3.build(window.TAKARA_ORDER_CART));
      assert.equal(retry.pedido_web_id, rawPayload.pedido_web_id, "Unchanged retry preserves its order ID");
      const backend = createHarness(), result = backend.submit(rawPayload); assert.equal(result.ok, true, result.error);
      assert.equal(backend.emails.length, 2); assert.equal(backend.emails[0].attachments.length, 12);
      assert.equal(Object.keys(backend.emails[1].inlineImages).length, 10);
      for (const item of rawPayload.articulos) for (const [n, photo] of item.archivos.fotos.entries()) {
        const attachment = backend.emails[0].attachments.find(blob => blob.name.includes("_" + item.id + "_" + photo.cara + "_original."));
        assert.ok(attachment, "Original attached to its article and face");
        const source = Buffer.from(photo.foto_base64.split(",")[1], "base64");
        assert.deepEqual(attachment.bytes, source, "Attached original is byte-identical to its selected photo");
        if (item.producto.codigo_producto.includes("CAJA_")) assert.deepEqual(backend.emails[1].inlineImages[item.id + "_foto_" + n].bytes, source);
      }
      assert.equal(backend.submit(rawPayload).ok, true); assert.equal(backend.emails.length, 2);
      if (output) {
        const dismiss = page.getByRole("button", { name: "Entendido", exact: true });
        if (await dismiss.isVisible()) await dismiss.click();
        await page.locator(".takara-order-cart").screenshot({ path: path.join(output, label + "-pedido-mixto.png") });
        for (const [i, mail] of backend.emails.entries()) {
          const html = previewEmail(mail); fs.writeFileSync(path.join(output, label + (i ? "-correo-cliente.html" : "-correo-takara.html")), html);
          const emailPage = await context.newPage(); await emailPage.setContent(html);
          assert.equal(await emailPage.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Email fits its viewport");
          await emailPage.screenshot({ path: path.join(output, label + (i ? "-correo-cliente.png" : "-correo-takara.png")), fullPage: true });
          await emailPage.close();
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.evaluate(() => window.TAKARA_ORDER_CART.complete());
      assert.equal(await page.locator("[data-takara-cart-item]").count(), 0);
      assert.equal(await page.locator("[data-takara-summary-product-name]").textContent(), "Marco con litofanía");
      assert.deepEqual(errors, []); assert.deepEqual(external, []);
      console.log("[PASS] " + label + ": two independent boxes, vertical text frame, horizontal frame, edit/cancel/remove/quantity, shared delivery, real backend, two matching emails, retry without duplicates");
      await context.close();
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
