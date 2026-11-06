"use strict";
// Real normalization, delivery, media, durable ledger and templates. Only Google services are mocked.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."), app = path.join(root, "apps-script/takara-pedidos-web");
function createHarness() {
  const files = new Map(), folders = new Map(), properties = {}, emails = [], effects = { files: 0, folders: 0, budget: 0 };
  let sequence = 0, failFileAt = 0, failEmailAt = 0;
  function blob(data, mime, name) {
    const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    return { bytes, mime, name, getBytes() { return Array.from(bytes); }, getDataAsString() { return bytes.toString(); },
      setName(value) { this.name = value; return this; }, copyBlob() { return blob(bytes, mime, this.name); } };
  }
  function folder(name) {
    const id = "folder-" + (++sequence), children = new Map(); effects.folders++;
    const value = { getId: () => id, getUrl: () => "https://drive.example/" + id,
      getFoldersByName: key => ({ hasNext: () => children.has(key), next: () => children.get(key) }),
      createFolder(key) { const child = folder(key); children.set(key, child); return child; },
      createFile(content) {
        const fileId = "file-" + (++sequence); effects.files++;
        const file = { getId: () => fileId, getUrl: () => "https://drive.example/" + fileId, getBlob: () => content.copyBlob() };
        files.set(fileId, file);
        if (effects.files === failFileAt) throw new Error("Simulated uncertain Drive write");
        return file;
      } };
    return value;
  }
  const context = vm.createContext({ console, Object, Array, Number, String, Boolean, Date, Math, JSON, RegExp, Error, isFinite, parseInt, parseFloat,
    MailApp: { sendEmail(options) { emails.push(options); if (emails.length === failEmailAt) throw new Error("Simulated uncertain mail"); } },
    Utilities: { base64Decode: value => Array.from(Buffer.from(value, "base64")), newBlob: blob, getUuid: () => crypto.randomUUID(),
      formatDate: (date, zone, format) => format === "yyyy" ? "2026" : "2026-11-06 12:00:00",
      DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" },
      computeDigest: (algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest()) },
    DriveApp: { getFileById: id => { if (!files.has(id)) throw new Error("Missing Drive file"); return files.get(id); },
      getFoldersByName: key => ({ hasNext: () => folders.has(key), next: () => folders.get(key) }),
      createFolder(key) { const child = folder(key); folders.set(key, child); return child; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] || null, getProperties: () => ({ ...properties }),
      setProperty(key, value) { assert.ok(Buffer.byteLength(value) < 9000, "Ledger property must fit Google's 9 KB limit"); properties[key] = value; },
      deleteProperty(key) { delete properties[key]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "application/json" }, createTextOutput: text => ({ text, setMimeType() { return this; } }) }
  });
  for (const name of ["Code", "RuntimeHelpers", "OrderNormalization", "OrderValidation", "OrderDelivery", "OrderFulfillment", "OrderMedia", "DriveStorage",
    "OrderEmail", "OrderIdempotency", "OrderBrowserTransport", "OrderAttribution", "OrderItems", "OrderItemsMedia", "OrderItemsEmail"]) {
    vm.runInContext(fs.readFileSync(path.join(app, name + ".gs"), "utf8"), context, { filename: name + ".gs" });
  }
  context.resolveOrderStoreIdentity_ = () => null;
  context.parseContactBrowserResponseRequest_ = () => null;
  context.reservePublicSideEffectBudget_ = () => { effects.budget++; };
  return { context, files, properties, emails, effects,
    submit(payload) { return JSON.parse(context.doPost({ postData: { contents: JSON.stringify(payload) } }).text); },
    failFile(n) { failFileAt = n; }, failEmail(n) { failEmailAt = n; } };
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9l8AAAAASUVORK5CYII=", "base64");
function fixture(kinds = ["caja"]) {
  const front = vm.createContext({ window: {}, Object, Array, Number, String, Math, JSON, Error });
  for (const name of ["takara-delivery", "takara-pricing"]) vm.runInContext(fs.readFileSync(path.join(root, "assets/js/core/" + name + ".js"), "utf8"), front);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "assets/data/catalogo.json")));
  const articles = kinds.map((kind, index) => {
    const box = kind === "caja", code = box ? "CAJA_LITOFANIA_4_FOTOS_100X100" : "MARCO_LITOFANIA_144X108", variant = box ? "cuatro_fotos" : kind;
    const pricing = front.window.TAKARA_PRICING_V1.calculate({ catalog, product_code: code, variant_code: variant, quantity: 1 });
    return { id: "A" + String(index + 1).padStart(2, "0"), producto: { codigo_producto: code, variante_codigo: variant,
      cantidad: 1, color_marco: "Negro", ...(box ? { color_cuerpo: "Negro", color_peana: "Madera clara" } : {}),
      atributos: box ? { color_cuerpo_codigo: "negro", color_peana_codigo: "actual" } : {}, personalizacion_marco: null,
      precio_base_eur: pricing.precio_base_eur, precio_variante_eur: pricing.precio_variante_eur, precio_extras_eur: pricing.precio_extras_eur,
      precio_unitario_final_eur: pricing.precio_unitario_final_eur, precio_total_eur: pricing.precio_total_eur,
      catalog_version: pricing.catalog_version, pricing_version: pricing.pricing_version }, archivos: {
        fotos: (box ? ["frontal", "derecha", "trasera", "izquierda"] : ["frontal"]).map(cara => ({ cara,
          foto_base64: "data:image/png;base64," + png.toString("base64"), content_type: "image/png", size_bytes: png.length, nombre_archivo: cara + ".png" })) } };
  });
  const subtotal = articles.reduce((sum, item) => sum + Number(item.producto.precio_total_eur), 0);
  const api = front.window.TAKARA_DELIVERY_CORE_V2, q = api.quote({ postalCode: "28911", quantity: articles.length }), t = api.calculateTotals(subtotal, q);
  return { payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V3", pedido_web_id: "TK-WEB-20261106-ABC234", creado_en_iso: "2026-11-06T12:00:00.000Z",
    cliente: { nombre: "Prueba <segura>", telefono: "600000000", email: "test@example.invalid" },
    meta: { pagina_origen: "http://127.0.0.1/pedido.html", entorno: "local" }, articulos: articles,
    entrega: { version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC", fulfillment_method: "DELIVERY", modalidad_solicitada: q.requested_mode,
      modalidad_resuelta: q.mode, codigo_postal: q.postal_code, zona_codigo: q.zone_code, zona_nombre: q.zone_name,
      area_codigo: q.area_code, fuente_decision: q.decision_source, ubicacion_requerida: q.location_required,
      ubicacion_codigo: q.location_code || "", ubicacion_nombre: q.location_name || "", localidad_informativa: "", municipio_codigo: "",
      municipio_nombre: "", provincia_nombre: "", municipio_fuente: "", precio_eur: q.price_eur,
      moneda: q.currency, estado_precio: q.price_status, texto_cliente: q.customer_text, direccion_completa_solicitada: false },
    totales: { version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC", subtotal_productos_eur: subtotal.toFixed(2),
      precio_entrega_eur: t.delivery_eur, total_estimado_eur: t.estimated_total_eur, estado_total: t.total_status, moneda: t.currency },
    control: { consiente_gestion_datos: true, declara_derechos_y_autoriza_revision_imagen: true, autoriza_publicacion_resultado: false } };
}
function run() {
  for (const kinds of [["caja"], ["vertical", "caja"], ["caja", "caja", "vertical", "horizontal"], Array(20).fill("caja")]) {
    const server = createHarness(), payload = fixture(kinds), result = server.submit(payload);
    assert.equal(result.ok, true, result.error); assert.equal(server.emails.length, 2);
    assert.equal(server.emails[0].attachments.length, kinds.reduce((sum, kind) => sum + (kind === "caja" ? 4 : 1), 0));
    assert.ok(!server.emails[1].attachments);
    assert.match(server.emails[1].htmlBody, /Prueba &lt;segura&gt;/);
    for (const item of payload.articulos) for (const email of server.emails) assert.ok(email.body.includes(item.id));
    const before = JSON.stringify(server.effects); assert.equal(server.submit(payload).ok, true);
    assert.equal(JSON.stringify(server.effects), before); assert.equal(server.emails.length, 2, "Retry cannot resend either email");
    assert.ok(!JSON.stringify(server.properties).includes("foto_base64"), "Ledger stores hashes and manifest ID, never originals");
  }
  for (const mutate of [
    p => { p.articulos[0].archivos.fotos.pop(); }, p => { p.articulos[0].producto.precio_base_eur = "1.00"; },
    p => { p.articulos[0].producto.atributos.color_peana_codigo = "inventado"; },
    p => { p.articulos[0].producto.personalizacion_marco = { activa: true }; },
    p => { p.articulos[0].archivos.fotos[1].cara = "frontal"; }, p => { p.articulos[0].producto.cantidad = 1.5; },
    p => { p.articulos[0].archivos.fotos[2].foto_base64 = "data:image/png;base64," + Buffer.from("invalid").toString("base64"); p.articulos[0].archivos.fotos[2].size_bytes = 7; },
    p => { p.articulos[0].archivos.fotos[3].size_bytes++; }, p => { p.control.consiente_gestion_datos = false; }
  ]) {
    const server = createHarness(), payload = fixture(); mutate(payload);
    const result = server.submit(payload); assert.equal(result.ok, false, "Invalid article must fail closed");
    assert.equal(server.effects.files, 0); assert.equal(server.effects.folders, 0); assert.equal(server.emails.length, 0);
  }
  for (const failure of ["file", "email"]) {
    const server = createHarness(), payload = fixture(); failure === "file" ? server.failFile(2) : server.failEmail(1);
    assert.equal(server.submit(payload).ok, false); const before = JSON.stringify(server.effects), mails = server.emails.length;
    assert.equal(server.submit(payload).ok, false); assert.equal(JSON.stringify(server.effects), before); assert.equal(server.emails.length, mails);
  }
  const server = createHarness(), payload = fixture(); assert.equal(server.submit(payload).ok, true);
  payload.articulos[0].producto.color_peana = "Negro"; payload.articulos[0].producto.atributos.color_peana_codigo = "negro";
  assert.equal(server.submit(payload).ok, false, "Same order ID with a different finish cannot replay");
  console.log("TAKARA_ORDER_ITEMS_OK: real V3 pipeline, 1/2/4/20 items, files per face, two emails, compact ledger, retries and rejection without Drive/mail effects");
}
function previewEmail(email) {
  let html = email.htmlBody;
  for (const [cid, value] of Object.entries(email.inlineImages || {})) html = html.replaceAll("cid:" + cid, "data:" + value.mime + ";base64," + value.bytes.toString("base64"));
  return html.replace("https://takara3d.es/assets/brand/takara-logo-principal-header.png",
    "data:image/png;base64," + fs.readFileSync(path.join(root, "assets/brand/takara-logo-principal-header.png")).toString("base64"));
}
if (require.main === module) run();
module.exports = { createHarness, fixture, previewEmail };
