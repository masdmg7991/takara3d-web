/** Real Chromium + WebGL acceptance. No outgoing requests or real orders. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require(process.env.TAKARA_PLAYWRIGHT_MODULE || "playwright");
const { loadServerContext, makePhoto } = require("./takara_test_ficha_visual_pedido.js");
const root = path.resolve(__dirname, "..");
const reportDir = process.env.TAKARA_3D_REPORT_DIR;
const report = { scenarios: [], errors: [], externalRequests: [], metrics: {} };
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});

function passed(name) { report.scenarios.push(name); console.log("[PASS] " + name); }
async function ready(page) {
  await page.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW?.getSnapshot().ready, null, { timeout: 55000 });
}
async function shot(page, name) {
  if (reportDir) {
    await page.locator("[data-takara-product-stage]").screenshot({ path: path.join(reportDir, name + ".png") });
    await page.locator(".takara-product-toolbar").screenshot({ path: path.join(reportDir, name + "-controls.png") });
    if (!name.startsWith("mobile")) await page.locator(".takara-preview-visual").screenshot({ path: path.join(reportDir, name + "-viewer.png") });
  }
}

async function syntheticPhoto(page) {
  return Buffer.from(await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 480; c.height = 640;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 480, 640); g.addColorStop(0, "#fff"); g.addColorStop(1, "#151515");
    x.fillStyle = g; x.fillRect(0, 0, 480, 640);
    x.fillStyle = "#111"; x.fillRect(60, 70, 100, 110);
    x.fillStyle = "#eee"; x.beginPath(); x.arc(290, 360, 100, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#555"; x.font = "bold 44px sans-serif"; x.fillText("TAKARA", 90, 570);
    return c.toDataURL("image/png").split(",")[1];
  }), "base64");
}

async function capture(page) {
  return page.evaluate(async () => {
    const file = document.querySelector("[data-takara-photo-input]").files[0];
    const result = await window.TAKARA_PRODUCT_PREVIEW.capture(file);
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    let text = ""; for (const byte of bytes) text += String.fromCharCode(byte);
    return { width: result.width, height: result.height, size: bytes.length, data: btoa(text) };
  });
}

async function meanPixelDifference(page, first, second) {
  return await page.evaluate(async ({ first, second }) => {
        const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 50;
        const context = canvas.getContext("2d");
        const pixels = async data => {
          const image = new Image(); image.src = "data:image/jpeg;base64," + data; await image.decode();
          context.drawImage(image, 0, 0, 64, 50); return context.getImageData(0, 0, 64, 50).data;
        };
        const a = await pixels(first), b = await pixels(second);
        let difference = 0; for (let i = 0; i < a.length; i++) difference += Math.abs(a[i] - b[i]);
        return difference / a.length;
      }, { first, second });
}

async function main() {
  if (reportDir) fs.mkdirSync(reportDir, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.TAKARA_CHROME_PATH ? { executablePath: process.env.TAKARA_CHROME_PATH } : {}) });
    for (const mobile of [false, true]) {
      const label = mobile ? "mobile-emulation" : "desktop";
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
      await context.route("**/*", route => {
        const url = route.request().url();
        if (url.startsWith(origin + "/") || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
        if (url.startsWith("https://fonts.googleapis.com/")) return route.fulfill({ contentType: "text/css", body: "" });
        if (url.startsWith("https://static.cloudflareinsights.com/beacon.min.js")) return route.fulfill({ contentType: "text/javascript", body: "" });
        report.externalRequests.push(url.split("?")[0]); return route.abort();
      });
      const page = await context.newPage();
      let payload;
      page.on("pageerror", error => report.errors.push(error.message));
      page.on("console", async msg => {
        if (msg.text().startsWith("[Takara pedido dry-run payload completo]")) payload = await msg.args()[1].jsonValue();
      });
      const started = Date.now();
      await page.goto(origin + "/pedido.html");
      await ready(page);
      const responsiveOrder = await page.evaluate(() => {
        const selectors=[".takara-preview-config-section--format", ".takara-preview-config-section--photo", ".takara-preview-visual", ".takara-preview-config-section--color", "[data-takara-frame-text-config]"];
        const nodes=selectors.map(selector=>document.querySelector(selector));
        return {
          positions:nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,bottom:r.bottom+scrollY};}),
          domOrdered:nodes.every((node,index)=>!index||!!(nodes[index-1].compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)),
          formHidden:getComputedStyle(document.querySelector("[data-takara-pedido-form]")).display==="none"
        };
      });
      assert.equal(responsiveOrder.domOrdered,true,"Keyboard/document order follows photo, preview and customization");
      assert.equal(responsiveOrder.formHidden,true,"Duplicate commercial fields cannot take keyboard focus");
      if(mobile)for(let i=1;i<responsiveOrder.positions.length;i++)assert.ok(responsiveOrder.positions[i].y>=responsiveOrder.positions[i-1].bottom-1);
      else assert.ok(responsiveOrder.positions[2].x>responsiveOrder.positions[0].x);
      report.metrics[label] = { initialReadyMs: Date.now() - started };
      const initialResources = await page.evaluate(() => performance.getEntriesByType("resource").filter(x => new URL(x.name).pathname.endsWith(".glb")).map(x => ({ name: new URL(x.name).pathname.split("/").at(-1), bytes: x.transferSize })));
      assert.equal(initialResources.length, 1, "Only the initial GLB should load");
      passed(label + ": initial GLB only, no legacy renderer");
      assert.equal(await page.locator("[data-takara-preview-canvas], [data-takara-frame-text-overlay]").count(), 0);
      const photo = await syntheticPhoto(page);
      await page.locator("[data-takara-photo-input]").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: photo });
      await ready(page);
      await page.locator(".takara-frame-text-switch").click();
      await page.locator('[data-takara-frame-side-toggle="top"]').click();
      await page.locator('[data-takara-frame-text-input="top"]').pressSequentially("MI TAKARA");
      await ready(page);
      if(mobile){
        const previewTop=await page.locator(".takara-preview-visual").evaluate(node=>node.getBoundingClientRect().top+scrollY);
        assert.ok(Math.abs(previewTop-responsiveOrder.positions[2].y)<1,"Opening the text editor cannot push the preview down");
        const colors=await page.locator(".takara-preview-color-chip").evaluateAll(nodes=>nodes.slice(0,3).map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y};}));
        assert.ok(Math.abs(colors[0].y-colors[1].y)<1&&colors[2].y>colors[0].y,"Mobile color choices use two columns");
      }
      passed(label+": responsive ordering, stable preview, keyboard and compact color controls");
      assert.equal(await page.locator('[data-takara-frame-text-input="top"]').inputValue(), "MI TAKARA");
      assert.ok((await page.locator('[data-takara-frame-side-toggle="top"]').getAttribute("class")).includes("is-editing"));
      assert.match(await page.locator('[data-takara-frame-text-status="top"]').textContent(), /^Ocupa el \d+% de la zona segura/);
      const shortFont = await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().details.lettering.top.fontMm);
      await page.locator('[data-takara-frame-text-input="top"]').fill("W".repeat(80));
      await ready(page);
      assert.ok((await page.locator('[data-takara-frame-text-input="top"]').inputValue()).length < 20);
      assert.equal(await page.locator('[data-takara-frame-text-status="top"]').getAttribute("data-state"), "limit");
      assert.equal(await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().details.lettering.top.fontMm), shortFont,
        "Longer text must not shrink the approved letter size");
      await page.locator('[data-takara-frame-text-input="top"]').fill("MI TAKARA"); await ready(page);
      assert.equal(await page.locator(".takara-product-gesture__touch").isVisible(), mobile);
      assert.equal(await page.locator(".takara-product-gesture__desktop").isVisible(), !mobile);
      assert.equal(await page.locator(".takara-product-light-switch button").count(), 2);
      const controlsFit = await page.evaluate(() => ({
        stage: document.querySelector("[data-takara-product-stage]").getBoundingClientRect().width,
        light: document.querySelector(".takara-product-light-switch").getBoundingClientRect().width
      }));
      assert.ok(controlsFit.light >= Math.min(controlsFit.stage, 400) - 1, "Light selector keeps the reference width");
      assert.ok(await page.locator("[data-takara-product-stage]").evaluate(node => getComputedStyle(node).backgroundImage.includes("115, 82, 68")));
      passed(label + ": fixed lettering, original safe limits, occupancy, side marks and chocolate controls");
      await page.locator('label:has([data-takara-color-proxy="rosewood"])').click(); await ready(page);
      await shot(page, label + "-vertical");
      const vertical = await capture(page);
      assert.deepEqual([vertical.width, vertical.height], [960, 760]);
      assert.ok(vertical.size > 100 && vertical.size < 900 * 1024);
      assert.equal(Buffer.from(vertical.data, "base64").subarray(0, 3).toString("hex"), "ffd8ff");
      passed(label + ": photo, multiword text, color and vertical JPEG");

      await page.locator('[data-takara-litho-mode="off"]').click(); await ready(page);
      const firstOff = await capture(page);
      await page.locator('[data-takara-litho-mode="on"]').click(); await ready(page);
      const cachedOn = await capture(page);
      assert.ok(await meanPixelDifference(page, vertical.data, cachedOn.data) < 5,
        "Cached ON appearance matches the original photo, color and text");
      await page.locator('[data-takara-litho-mode="off"]').click(); await ready(page);
      const cachedOff = await capture(page);
      assert.ok(await meanPixelDifference(page, firstOff.data, cachedOff.data) < 5,
        "Cached OFF appearance matches the first OFF render");
      await page.locator('[data-takara-litho-mode="on"]').click(); await ready(page);
      passed(label + ": repeated light changes preserve ON/OFF photo and capture appearance");

      await page.locator('[data-takara-format-proxy="horizontal"]').click(); await ready(page);
      const horizontalState = await page.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot());
      assert.equal(horizontalState.state.variant, "horizontal");
      assert.equal(horizontalState.details.hasPhoto, true);
      assert.equal(horizontalState.details.lettering.top.text, "MI TAKARA");
      await page.locator('[data-takara-litho-mode="off"]').click(); await ready(page);
      await shot(page, label + "-horizontal");
      const horizontal = await capture(page);
      assert.deepEqual([horizontal.width, horizontal.height], [960, 760]);
      assert.notEqual(vertical.data, horizontal.data);
      const expectedOrbit = await page.evaluate(async () => {
        const v = document.querySelector("model-viewer"); v.setAttribute("camera-orbit", "95deg 60deg 1m");
        await v.updateComplete; v.jumpCameraToGoal();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const o = v.getCameraOrbit(); return { theta: o.theta, phi: o.phi, radius: o.radius };
      });
      const rotated = await capture(page);
      if(reportDir){
        fs.writeFileSync(path.join(reportDir,label+"-capture-before-orbit.jpg"),Buffer.from(horizontal.data,"base64"));
        fs.writeFileSync(path.join(reportDir,label+"-capture-after-orbit.jpg"),Buffer.from(rotated.data,"base64"));
      }
      const captureDifference = await meanPixelDifference(page, horizontal.data, rotated.data);
      assert.ok(captureDifference < 5, `Order camera must be reproducible: mean pixel difference ${captureDifference}`);
      report.metrics[label].captureMeanPixelDifference = captureDifference;
      // Camera restoration preserves the customer's view, while the JPEG uses its own camera.
      const restoredOrbit = await page.evaluate(() => {
        const o = document.querySelector("model-viewer").getCameraOrbit(); return { theta: o.theta, phi: o.phi, radius: o.radius };
      });
      for (const key of ["theta", "phi", "radius"]) assert.ok(Math.abs(restoredOrbit[key] - expectedOrbit[key]) < .01,
        `Camera ${key}: expected ${expectedOrbit[key]}, restored ${restoredOrbit[key]}`);
      assert.deepEqual([rotated.width, rotated.height], [960, 760]);
      passed(label + ": horizontal retains personalization; fixed capture restores orbit");
      const offscreen = await page.evaluate(async () => {
        window.savedCaptureViewer=document.querySelector("model-viewer");
        scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"});
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        return {scroll:scrollY};
      });
      const offscreenImage = await capture(page);
      const restored = await page.evaluate(()=>({
        sameViewer:document.querySelector("model-viewer")===window.savedCaptureViewer,
        inStage:document.querySelector("[data-takara-product-stage]").contains(window.savedCaptureViewer),
        scroll:scrollY, count:document.querySelectorAll("model-viewer").length
      }));
      assert.equal(restored.sameViewer,true); assert.equal(restored.inStage,true); assert.equal(restored.count,1);
      assert.ok(Math.abs(restored.scroll-offscreen.scroll)<1,"Capturing cannot move the customer's page");
      assert.ok(await meanPixelDifference(page,horizontal.data,offscreenImage.data)<5,"Offscreen capture must match the same canonical scene");
      passed(label+": offscreen JPEG is current; same viewer restored without scrolling or duplication");
      if (reportDir) fs.writeFileSync(path.join(reportDir, label + "-order.jpg"), Buffer.from(horizontal.data, "base64"));

      for (const [field, value] of Object.entries({ nombre: "Prueba local", telefono: "600000000", email: "test@example.invalid" })) {
        await page.locator(`[data-takara-contact-proxy="${field}"]`).fill(value);
      }
      await page.locator("[data-takara-delivery-postal]").fill("28911");
      await page.locator("[data-takara-delivery-postal]").blur();
      await page.waitForFunction(() => document.querySelector('[name="modalidad_entrega"]').value !== "");
      await page.locator('label:has([data-takara-accept-proxy="acepta_revision"])').click();
      await page.locator('label:has([data-takara-accept-proxy="acepta_contacto"])').click();
      await page.locator("[data-takara-submit-proxy]").click();
      await page.waitForFunction(() => sessionStorage.getItem("TAKARA_PEDIDO_DRY_RUN_PAYLOAD"));
      for (let i = 0; !payload && i < 50; i++) await new Promise(r => setTimeout(r, 20));
      assert.ok(payload, "Real form must emit a local payload");
      assert.equal(payload.payload_version, "TAKARA_WEB_ORDER_PAYLOAD_V2");
      assert.equal(payload.producto.orientacion, "horizontal");
      assert.equal(payload.producto.personalizacion_marco.lados.top, "MI TAKARA");
      assert.equal(payload.archivos.foto_base64, "data:image/png;base64," + photo.toString("base64"));
      assert.equal(payload.archivos.ficha_visual_estado, "generada");
      assert.equal(payload.archivos.ficha_visual_modo, "apagada");
      const serverContext = loadServerContext();
      const order = serverContext.normalizarPedido_(payload);
      serverContext.validarFichaVisual_(payload.archivos);
      const visual = serverContext.prepararFichaVisualSegura_(payload.pedido_web_id, payload.archivos);
      assert.equal(visual.ficha_visual_recibida, true);
      serverContext.enviarEmailInterno_("Local only", "Test", payload.pedido_web_id, order, makePhoto(), visual);
      serverContext.enviarConfirmacionCliente_(payload.pedido_web_id, order, makePhoto(), visual);
      assert.equal(serverContext.sentEmails.length, 2);
      for (const mail of serverContext.sentEmails) {
        assert.equal(mail.inlineImages.takaraOrderVisualProof, visual.blob);
        assert.ok(mail.htmlBody.includes('src="cid:takaraOrderVisualProof"'));
      }
      assert.equal(serverContext.sentEmails[0].attachments.length, 1);
      passed(label + ": real V2 payload, original photo separate, two simulated emails with same 3D JPEG");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "No horizontal overflow");
      if (reportDir) await page.screenshot({ path: path.join(reportDir, label + "-page.png"), fullPage: true });
      await page.locator("[data-takara-pedido-toast] button, [data-takara-pedido-modal] button").first().click();
      // Same-name file must be decoded by identity; corrupt bytes cannot reuse a prior photo.
      await page.locator("[data-takara-photo-input]").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from("invalid image") });
      await page.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().errorCode === "INVALID_PHOTO");
      assert.ok(await page.evaluate(() => {
        try { window.TAKARA_PRODUCT_PREVIEW.assertOrderReady(document.querySelector('[data-takara-photo-input]').files[0]); return false; }
        catch { return true; }
      }));
      await page.locator("[data-takara-photo-input]").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: photo });
      await ready(page);
      for (let i = 0; i < 6; i++) {
        await page.locator(`[data-takara-format-proxy="${i % 2 ? "horizontal" : "vertical"}"]`).click();
        await ready(page);
        assert.equal(await page.locator("model-viewer").count(), 1);
      }
      passed(label + ": invalid same-name photo blocked; recovery and six GLB switches");
      report.metrics[label].resources = initialResources;
      report.metrics[label].heapBytes = await page.evaluate(() => performance.memory?.usedJSHeapSize || null);
      // Demonstrate a second product with its own tiny profile and generated GLB.
      await page.evaluate(async origin => {
        const { ProductViewer } = await import(origin + "/assets/js/3d/product-viewer.js");
        const positions = new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]);
        const model = { asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
          meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
          materials: [{ name: "SAMPLE", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [.2, .5, .8, 1], metallicFactor: 0 } }],
          buffers: [{ byteLength: positions.byteLength }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
          accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [-1, -1, 0], max: [1, 1, 0] }] };
        const json = new TextEncoder().encode(JSON.stringify(model));
        const jsonSize = Math.ceil(json.length / 4) * 4;
        const data = new ArrayBuffer(12 + 8 + jsonSize + 8 + positions.byteLength);
        const view = new DataView(data);
        [0x46546c67, 2, data.byteLength, jsonSize, 0x4e4f534a].forEach((v, i) => view.setUint32(i * 4, v, true));
        new Uint8Array(data, 20, jsonSize).fill(32); new Uint8Array(data, 20, json.length).set(json);
        view.setUint32(20 + jsonSize, positions.byteLength, true); view.setUint32(24 + jsonSize, 0x004e4942, true);
        new Uint8Array(data, 28 + jsonSize).set(new Uint8Array(positions.buffer));
        window.probeUrl = URL.createObjectURL(new Blob([data], { type: "model/gltf-binary" }));
        const stage = document.createElement("div"); stage.style.cssText = "width:320px;height:320px"; document.body.appendChild(stage);
        const profile = { id: "acceptance-second-product", defaults: { variant: "one", color: [.8, .2, .3, 1] },
          variants: { one: { src: window.probeUrl, camera: "0deg 75deg auto", alt: "Modelo de prueba" } },
          createController(viewer) { return { apply(state) { viewer.model.materials[0].pbrMetallicRoughness.setBaseColorFactor(state.color); }, dispose() {} }; } };
        window.probeEngine = new ProductViewer(stage, profile);
      }, origin);
      await page.waitForFunction(() => window.probeEngine.ready);
      const secondProduct = await page.evaluate(async () => {
        const result = await window.probeEngine.capture();
        window.probeEngine.dispose(); URL.revokeObjectURL(window.probeUrl);
        return { type: result.blob.type, width: result.width, height: result.height };
      });
      assert.equal(secondProduct.type, "image/jpeg");
      passed(label + ": second independent GLB profile loads, colors and captures without core changes");
      const failurePage = await context.newPage();
      failurePage.on("pageerror", error => report.errors.push(error.message));
      let failModel = true;
      await failurePage.route("**/assets/models/marco/vertical.glb*", route => failModel ? route.abort() : route.continue());
      await failurePage.goto(origin + "/pedido.html");
      await failurePage.waitForFunction(() => window.TAKARA_PRODUCT_PREVIEW?.getSnapshot().error, null, { timeout: 15000 });
      assert.equal(await failurePage.locator("[data-takara-product-retry]").isVisible(), true);
      await failurePage.locator("[data-takara-photo-input]").setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: photo });
      assert.ok(await failurePage.evaluate(() => window.TAKARA_PRODUCT_PREVIEW.getSnapshot().error));
      const missingProof = await failurePage.evaluate(() => window.TAKARA_ORDER_VISUAL_PROOF_V1.capture(
        "TK-WEB-FAILED", document.querySelector("[data-takara-photo-input]").files[0]));
      assert.equal(missingProof.status, "no_generada");
      assert.equal(await failurePage.locator("[data-takara-preview-canvas]").count(), 0);
      failModel = false;
      await failurePage.locator("[data-takara-product-retry]").click();
      await ready(failurePage);
      passed(label + ": explicit model error, optional missing proof, original photo retained and retry succeeds");
      const catalogPage=await context.newPage();
      catalogPage.on("pageerror",error=>report.errors.push(error.message));
      let failCatalog=true;
      await catalogPage.route("**/assets/data/catalogo.json",route=>failCatalog?route.abort():route.continue());
      await catalogPage.goto(origin+"/pedido.html");
      await catalogPage.locator("[data-takara-product-retry]").waitFor({state:"visible"});
      await catalogPage.waitForFunction(()=>document.querySelector("model-viewer")?.loaded);
      assert.equal(await catalogPage.locator("[data-takara-product-status]").isVisible(),true);
      assert.equal(await catalogPage.evaluate(()=>!!window.TAKARA_PRODUCT_PREVIEW),false);
      failCatalog=false;
      await catalogPage.locator("[data-takara-product-retry]").click();
      await ready(catalogPage);
      passed(label+": catalog failure stays visible after GLB load and recovers on retry");
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    if (reportDir) fs.writeFileSync(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2));
  }
  console.log("TAKARA_3D_BROWSER_OK " + report.scenarios.length + " scenarios");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
