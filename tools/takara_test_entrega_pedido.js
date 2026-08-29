"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DELIVERY_JS = path.join(ROOT, "assets", "js", "core", "takara-delivery.js");
const POSTAL_CORE_JS = path.join(ROOT, "assets", "js", "core", "takara-postal-national.js");
const POSTAL_MAP_JSON = path.join(ROOT, "assets", "data", "takara-postal-national-v1.json");
const ORDER_JS = path.join(ROOT, "assets", "js", "takara-pedido-web.js");
const DELIVERY_UI_JS = path.join(ROOT, "assets", "js", "takara-pedido-delivery.js");
const ORDER_HTML = path.join(ROOT, "pedido.html");
const DELIVERY_CSS = path.join(ROOT, "assets", "css", "takara-pedido-delivery.css");
const CATALOG_JSON = path.join(ROOT, "assets", "data", "catalogo.json");
const CODE_GS = path.join(ROOT, "apps-script", "takara-pedidos-web", "Code.gs");
const STORE_DOMAIN = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "StoreDomain.gs"
);
const STORE_ORDER_RESOLUTION = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "StoreOrderResolution.gs"
);
const ORDER_ATTRIBUTION = path.join(
  ROOT,
  "apps-script",
  "takara-pedidos-web",
  "OrderAttribution.gs"
);
const ORDER_CONTRACT = path.join(ROOT, "docs", "ORDER_ENGINE_CONTRACT.md");

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
  process.stdout.write("[OK] " + message + "\n");
}

function expectThrow(action, pattern, message) {
  let caught = null;
  try { action(); } catch (error) { caught = error; }
  ok(caught && pattern.test(String(caught.message || caught)), message);
}

function loadServerContext() {
  const sentEmails = [];
  const context = {
    console: console,
    MailApp: { sendEmail: function (options) { sentEmails.push(options); } },
    Utilities: { formatDate: function () { return "2026-08-03 12:00:00"; } },
    DriveApp: {},
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: function (text) {
        return { text: text, setMimeType: function () { return this; } };
      }
    },
    Object: Object,
    Array: Array,
    Number: Number,
    String: String,
    JSON: JSON,
    Date: Date,
    Math: Math,
    RegExp: RegExp,
    Error: Error,
    Boolean: Boolean,
    isFinite: isFinite,
    parseInt: parseInt,
    parseFloat: parseFloat,
    NaN: NaN
  };

  vm.createContext(context);
  [STORE_DOMAIN, STORE_ORDER_RESOLUTION, ORDER_ATTRIBUTION].forEach(
    function (file) {
      vm.runInContext(
        fs.readFileSync(file, "utf8"),
        context,
        { filename: file }
      );
    }
  );

  vm.runInContext(fs.readFileSync(CODE_GS, "utf8"), context, { filename: CODE_GS });

  const originalNormalizePedido = context.normalizarPedido_;
  context.normalizarPedido_ = function (payload) {
    const order = originalNormalizePedido(payload);
    order.attribution =
      context.buildAuthoritativeOrderAttribution_(payload);
    return order;
  };
  context.sentEmails = sentEmails;
  return context;
}

function deliveryPayloadFromQuote(quote, municipality) {
  const source = municipality || {};
  return {
    version: quote.version,
    modalidad_solicitada: quote.requested_mode,
    modalidad: quote.mode,
    codigo_postal: quote.postal_code,
    zona_codigo: quote.zone_code,
    zona_nombre: quote.zone_name,
    area_codigo: quote.area_code || "",
    fuente_decision: quote.decision_source,
    ubicacion_requerida: quote.location_required,
    ubicacion_codigo: quote.location_code || "",
    ubicacion_nombre: quote.location_name || "",
    localidad_informativa: quote.location_required ? "" : String(source.name || ""),
    municipio_codigo: quote.location_required ? "" : String(source.code || ""),
    municipio_nombre: quote.location_required ? "" : String(source.name || ""),
    provincia_nombre: quote.location_required ? "" : String(source.province || ""),
    municipio_fuente: quote.location_required ? "" : String(source.source || ""),
    precio_eur: quote.price_eur,
    moneda: quote.currency,
    estado_precio: quote.price_status,
    direccion_completa_solicitada: false,
    texto_cliente: quote.customer_text
  };
}

function makePayload(deliveryApi, options) {
  const source = Object.assign({
    postalCode: "15001",
    locationCode: "",
    informativeLocality: "",
    municipality: null,
    quantity: 1,
    unitPrice: "35.00"
  }, options || {});
  const quote = deliveryApi.quote({
    postalCode: source.postalCode,
    locationCode: source.locationCode,
    quantity: source.quantity
  });

  if (!quote.valid) throw new Error("Fixture delivery quote is invalid: " + quote.code);

  const productSubtotal = (Number(source.unitPrice) * source.quantity).toFixed(2);
  const totalsRaw = deliveryApi.calculateTotals(productSubtotal, quote);
  const deliveryPayload = deliveryPayloadFromQuote(quote, source.municipality);
  deliveryPayload.modalidad_resuelta = deliveryPayload.modalidad;
  delete deliveryPayload.modalidad;
  if (!deliveryPayload.localidad_informativa) {
    deliveryPayload.localidad_informativa = quote.location_required
      ? ""
      : String(source.informativeLocality || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  const totals = {
    version: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
    subtotal_productos_eur: productSubtotal,
    precio_entrega_eur: totalsRaw.delivery_eur,
    total_estimado_eur: totalsRaw.estimated_total_eur,
    moneda: totalsRaw.currency,
    estado_total: totalsRaw.total_status
  };

  const payload = {
    payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V2",
    pedido_web_id: "TK-WEB-DELIVERY-TEST",
    creado_en_iso: "2026-08-10T20:30:00.000Z",
    modo_prueba: true,
    cliente: {
      nombre: "Cliente entrega",
      email: "cliente@example.com",
      telefono: "600123123"
    },
    meta: {
      pagina_origen: "https://takara3d.es/pedido.html",
      entorno: "produccion"
    },
    producto: {
      producto: "Marco litofanía personalizado",
      codigo_producto: "MARCO_LITOFANIA_144X108",
      variante_codigo: "vertical",
      formato: "Marco vertical",
      orientacion: "vertical",
      medida: "108 x 144 mm",
      color_marco: "Madera clara",
      color_litofania: "Blanco natural",
      atributos: { familia: "litofania" },
      extras: [],
      cantidad: source.quantity,
      precio_base_eur: "35.00",
      precio_variante_eur: "0.00",
      precio_extras_eur: "0.00",
      precio_unitario_final_eur: source.unitPrice,
      precio_total_eur: productSubtotal,
      origen_precio: "web_catalogo",
      catalog_version: "TAKARA_CATALOGO_V1",
      pricing_version: "TAKARA_PRICING_V1",
      personalizacion_marco: null
    },
    entrega: deliveryPayload,
    totales: totals,
    archivos: {
      foto_base64: "data:image/jpeg;base64,/9j/2Q==",
      nombre_archivo: "foto-prueba.jpg",
      content_type: "image/jpeg",
      size_bytes: 4
    },
    mensaje_cliente: "Prueba contractual de entrega",
    control: {
      consiente_gestion_datos: true,
      declara_derechos_y_autoriza_revision_imagen: true,
      autoriza_publicacion_resultado: false
    }
  };
  payload.snapshot_pedido = JSON.parse(JSON.stringify({
    snapshot_version: "TAKARA_ORDER_SNAPSHOT_V2",
    payload_version: payload.payload_version,
    pedido_web_id: payload.pedido_web_id,
    creado_en_iso: payload.creado_en_iso,
    modo_prueba: payload.modo_prueba,
    cliente: payload.cliente,
    producto: payload.producto,
    entrega: payload.entrega,
    totales: payload.totales,
    archivos: payload.archivos,
    mensaje_cliente: payload.mensaje_cliente,
    control: payload.control,
    meta: payload.meta
  }));
  return payload;
}

function testNationalPostalMap() {
  const postalApi = require(POSTAL_CORE_JS);
  const map = JSON.parse(fs.readFileSync(POSTAL_MAP_JSON, "utf8"));
  postalApi.assertMap(map);

  ok(postalApi.version === "TAKARA_POSTAL_NATIONAL_V1_2026_08_03", "Core nacional expone versión V1");
  ok(map.stats.postal_codes === 10851, "Mapa nacional conserva 10.851 códigos postales");
  ok(map.stats.automatic === 7282, "Mapa nacional conserva 7.282 resoluciones automáticas");
  ok(map.stats.selection === 3422, "Mapa nacional conserva 3.422 selectores");
  ok(map.stats.review === 147, "Mapa nacional conserva 147 casos manuales");

  const leganes = postalApi.resolve(map, "28915");
  ok(leganes.status === "automatic", "28915 resuelve municipio automáticamente");
  ok(leganes.selected.municipality === "Leganés", "28915 identifica Leganés");
  ok(leganes.selected.province === "Madrid", "28915 identifica provincia Madrid");

  const coruna = postalApi.resolve(map, "15001");
  ok(coruna.status === "automatic" && coruna.selected.municipality === "A Coruña", "15001 identifica A Coruña");

  const shared = postalApi.resolve(map, "28917");
  ok(shared.status === "selection", "28917 conserva selector nacional");
  ok(shared.options.some(function (item) { return item.municipality === "Leganés"; }), "28917 ofrece Leganés");
  ok(shared.options.some(function (item) { return item.municipality === "Alcorcón"; }), "28917 ofrece Alcorcón");

  const review = postalApi.resolve(map, "01118");
  ok(review.status === "manual" && review.reason === "revision_interprovincial", "01118 queda en revisión manual");
  const unknown = postalApi.resolve(map, "50000");
  ok(unknown.status === "manual" && unknown.reason === "sin_cobertura", "50000 no inventa municipio");

  return postalApi;
}

function testCoreAndCatalog() {
  const deliveryApi = require(DELIVERY_JS);
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  const delivery = catalog.entrega;

  ok(
    deliveryApi.version === "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
    "Core expone el contrato postal automático V2"
  );
  ok(delivery.version === deliveryApi.version, "Catálogo y core comparten versión");
  ok(delivery.decision === "codigo_postal_automatico", "Catálogo fija decisión automática");
  ok(delivery.precios_eur.leganes === 0, "Leganés conserva 0,00 EUR");
  ok(delivery.precios_eur.madrid_sur_cercano === 3, "Madrid Sur conserva 3,00 EUR");
  ok(delivery.precios_eur.peninsula_seguimiento === 6.5, "Península conserva 6,50 EUR");
  ok(delivery.direccion_completa_en_solicitud === false, "No se pide dirección completa");
  ok(delivery.automatico.leganes_gratis.length === 7, "Snapshot conserva 7 CP exclusivos de Leganés");
  ok(
    Object.values(delivery.automatico.madrid_sur_3_eur_por_area)
      .reduce(function (total, values) { return total + values.length; }, 0) === 29,
    "Snapshot conserva 29 CP automáticos de zona cercana"
  );
  ok(Object.keys(delivery.codigos_ambiguos).length === 13, "Snapshot conserva 13 CP compartidos");
  ok(delivery.fuente_snapshot.candidato_sha256.length === 64, "Snapshot conserva trazabilidad SHA-256");

  Object.keys(delivery.codigos_ambiguos).forEach(function (postalCode) {
    const expectedOptions = delivery.codigos_ambiguos[postalCode];
    const unresolvedQuote = deliveryApi.quote({ postalCode: postalCode, locationCode: "", quantity: 1 });
    ok(
      !unresolvedQuote.valid && unresolvedQuote.code === "ubicacion_requerida",
      postalCode + " exige ubicación oficial"
    );
    ok(
      unresolvedQuote.location_options.length === expectedOptions.length,
      postalCode + " conserva todas sus opciones oficiales"
    );

    expectedOptions.forEach(function (expected) {
      const quote = deliveryApi.quote({
        postalCode: postalCode,
        locationCode: expected.code,
        quantity: 1
      });
      ok(quote.valid, postalCode + " acepta " + expected.label);
      ok(quote.location_code === expected.code, postalCode + " conserva código " + expected.code);
      ok(quote.zone_code === expected.zone_code, postalCode + " deriva zona de " + expected.label);
      ok(quote.mode === expected.mode, postalCode + " deriva modalidad de " + expected.label);
      ok(quote.price_eur === Number(expected.price_eur).toFixed(2), postalCode + " deriva tarifa de " + expected.label);
    });
  });

  const automaticCases = [
    ["28911", "", 1, "leganes", "0.00", "entrega_local", "confirmado"],
    ["28922", "", 1, "madrid_sur_cercano", "3.00", "entrega_local", "confirmado"],
    ["28021", "", 1, "madrid_sur_cercano", "3.00", "entrega_local", "confirmado"],
    ["15001", "", 1, "peninsula", "6.50", "envio_seguimiento", "confirmado"],
    ["07001", "", 1, "destino_especial", null, "envio_seguimiento", "pendiente_confirmacion"],
    ["35001", "", 1, "destino_especial", null, "envio_seguimiento", "pendiente_confirmacion"],
    ["38001", "", 1, "destino_especial", null, "envio_seguimiento", "pendiente_confirmacion"],
    ["51001", "", 1, "destino_especial", null, "envio_seguimiento", "pendiente_confirmacion"],
    ["52001", "", 1, "destino_especial", null, "envio_seguimiento", "pendiente_confirmacion"],
    ["15001", "", 2, "peninsula", null, "envio_seguimiento", "pendiente_confirmacion"]
  ];

  automaticCases.forEach(function (entry) {
    const quote = deliveryApi.quote({
      postalCode: entry[0],
      locationCode: entry[1],
      quantity: entry[2],
      mode: "entrega_local"
    });
    ok(quote.valid, "Cotización automática válida para " + entry[0]);
    ok(quote.zone_code === entry[3], "Zona automática correcta para " + entry[0]);
    ok(quote.price_eur === entry[4], "Precio automático correcto para " + entry[0]);
    ok(quote.mode === entry[5], "Modalidad derivada correcta para " + entry[0]);
    ok(quote.price_status === entry[6], "Estado correcto para " + entry[0]);
  });

  const unresolved = deliveryApi.quote({ postalCode: "28917", locationCode: "", quantity: 1 });
  ok(!unresolved.valid && unresolved.code === "ubicacion_requerida", "CP compartido exige ubicación oficial");
  ok(unresolved.location_options.length === 2, "CP 28917 ofrece dos ubicaciones oficiales");

  const leganesShared = deliveryApi.quote({
    postalCode: "28917",
    locationCode: "leganes",
    quantity: 1
  });
  ok(leganesShared.valid && leganesShared.price_eur === "0.00", "28917 Leganés queda gratis");
  ok(leganesShared.mode === "entrega_local", "28917 Leganés deriva entrega local");

  const alcorconShared = deliveryApi.quote({
    postalCode: "28917",
    locationCode: "alcorcon",
    quantity: 1
  });
  ok(alcorconShared.valid && alcorconShared.price_eur === "3.00", "28917 Alcorcón queda en 3,00 EUR");

  const carabanchelShared = deliveryApi.quote({
    postalCode: "28044",
    locationCode: "madrid_carabanchel",
    quantity: 1
  });
  ok(carabanchelShared.price_eur === "3.00", "28044 Carabanchel queda en 3,00 EUR");

  const latinaShared = deliveryApi.quote({
    postalCode: "28044",
    locationCode: "madrid_latina",
    quantity: 1
  });
  ok(latinaShared.price_eur === "6.50", "28044 Latina queda en 6,50 EUR");

  ok(
    !deliveryApi.quote({ postalCode: "28917", locationCode: "mostoles", quantity: 1 }).valid,
    "Core rechaza ubicación ajena al CP compartido"
  );
  ok(
    !deliveryApi.quote({ postalCode: "15001", locationCode: "leganes", quantity: 1 }).valid,
    "Core rechaza ubicación añadida a un CP automático"
  );
  ok(
    !deliveryApi.quote({ postalCode: "99999", locationCode: "", quantity: 1 }).valid,
    "Core rechaza código postal español inválido"
  );

  const full = deliveryApi.calculateTotals("43.00", deliveryApi.quote({
    postalCode: "15001",
    locationCode: "",
    quantity: 1
  }));
  ok(full.estimated_total_eur === "49.50", "Configuración completa queda en 49,50 EUR");

  const pending = deliveryApi.calculateTotals("70.00", deliveryApi.quote({
    postalCode: "15001",
    locationCode: "",
    quantity: 2
  }));
  ok(pending.estimated_total_eur === null, "Envío múltiple no inventa total");

  return deliveryApi;
}

function testServerAndEmails(deliveryApi) {
  const server = loadServerContext();
  const catalog = JSON.parse(fs.readFileSync(CATALOG_JSON, "utf8"));
  const policy = catalog.entrega;
  const parityCases = [];

  policy.automatico.leganes_gratis.forEach(function (postalCode) {
    parityCases.push([postalCode, "", 1]);
  });
  Object.values(policy.automatico.madrid_sur_3_eur_por_area).forEach(function (postalCodes) {
    postalCodes.forEach(function (postalCode) {
      parityCases.push([postalCode, "", 1]);
    });
  });
  Object.keys(policy.codigos_ambiguos).forEach(function (postalCode) {
    policy.codigos_ambiguos[postalCode].forEach(function (option) {
      parityCases.push([postalCode, option.code, 1]);
    });
  });
  parityCases.push(["15001", "", 1], ["15001", "", 2], ["07001", "", 1]);

  parityCases.forEach(function (entry) {
    const clientQuote = deliveryApi.quote({
      postalCode: entry[0],
      locationCode: entry[1],
      quantity: entry[2]
    });
    const serverQuote = server.calcularCotizacionEntrega_(entry[0], entry[1], entry[2]);
    ok(serverQuote.valida === clientQuote.valid, "Cliente y servidor coinciden en validez " + entry.join("/"));
    ok(serverQuote.modalidad === clientQuote.mode, "Cliente y servidor coinciden en modalidad " + entry.join("/"));
    ok(serverQuote.zona_codigo === clientQuote.zone_code, "Cliente y servidor coinciden en zona " + entry.join("/"));
    ok(serverQuote.precio_eur === (clientQuote.price_eur || ""), "Cliente y servidor coinciden en tarifa " + entry.join("/"));
    ok(serverQuote.estado_precio === clientQuote.price_status, "Cliente y servidor coinciden en estado " + entry.join("/"));
    ok(serverQuote.ubicacion_codigo === clientQuote.location_code, "Cliente y servidor coinciden en ubicación " + entry.join("/"));
  });

  const payload = makePayload(deliveryApi);
  const order = server.normalizarPedido_(payload);

  server.validarPedido_(order);
  ok(order.entrega.precio_eur === "6.50", "Servidor recalcula 6,50 EUR");
  ok(order.entrega.modalidad === "envio_seguimiento", "Servidor deriva envío con seguimiento");
  ok(order.entrega.fuente_decision === "codigo_postal_automatico", "Servidor registra decisión automática");
  ok(order.totales.total_estimado_eur === "41.50", "Servidor recalcula total 41,50 EUR");
  ok(order.entrega.direccion_completa_solicitada === false, "Dirección completa permanece fuera");

  const informativePayload = makePayload(deliveryApi, {
    postalCode: "50000",
    informativeLocality: "  Zaragoza   centro  "
  });
  const informativeOrder = server.normalizarPedido_(informativePayload);
  server.validarPedido_(informativeOrder);
  ok(informativeOrder.entrega.localidad_informativa === "Zaragoza centro", "Servidor conserva localidad opcional normalizada");
  ok(informativeOrder.entrega.precio_eur === "6.50", "Localidad opcional no altera la tarifa postal");

  const municipalityPayload = makePayload(deliveryApi, {
    postalCode: "15001",
    municipality: {
      code: "15030",
      name: "A Coruña",
      province: "A Coruña",
      source: "cartociudad_automatico"
    }
  });
  const municipalityOrder = server.normalizarPedido_(municipalityPayload);
  server.validarPedido_(municipalityOrder);
  ok(municipalityOrder.entrega.municipio_codigo === "15030", "Servidor conserva código INE informativo");
  ok(municipalityOrder.entrega.municipio_nombre === "A Coruña", "Servidor conserva municipio nacional");
  ok(municipalityOrder.entrega.provincia_nombre === "A Coruña", "Servidor conserva provincia nacional");
  ok(municipalityOrder.entrega.municipio_fuente === "cartociudad_automatico", "Servidor conserva fuente CartoCiudad");
  ok(municipalityOrder.entrega.precio_eur === "6.50", "Municipio nacional no altera la tarifa");

  const sharedPayload = makePayload(deliveryApi, {
    postalCode: "28917",
    locationCode: "leganes"
  });
  const sharedOrder = server.normalizarPedido_(sharedPayload);
  server.validarPedido_(sharedOrder);
  ok(sharedOrder.entrega.precio_eur === "0.00", "Servidor resuelve CP compartido de Leganés");
  ok(sharedOrder.entrega.ubicacion_nombre === "Leganés", "Servidor conserva ubicación oficial");
  ok(
    sharedOrder.entrega.fuente_decision === "seleccion_ubicacion_oficial",
    "Servidor registra selección oficial"
  );

  const photo = {
    foto_recibida: true,
    enlace_drive: "https://drive.example/file",
    id_archivo_drive: "drive-test",
    nombre_archivo_foto: "test.jpg",
    tipo_archivo_foto: "image/jpeg",
    tamano_archivo_foto_bytes: 1234,
    estado_archivo: "pendiente_descarga",
    nota_archivo: ""
  };

  const internalText = server.construirCuerpoInterno_(
    "TK-WEB-DELIVERY-TEST",
    new Date("2026-08-03T10:00:00Z"),
    sharedOrder,
    photo
  );
  const internalHtml = server.construirHtmlInterno_(
    "TK-WEB-DELIVERY-TEST",
    sharedOrder,
    photo
  );
  const customerHtml = server.construirHtmlConfirmacionPedidoCliente_(
    "TK-WEB-DELIVERY-TEST",
    sharedOrder,
    photo
  );

  server.sentEmails.length = 0;
  server.enviarConfirmacionCliente_("TK-WEB-DELIVERY-TEST", sharedOrder, photo);
  const customerText = server.sentEmails[0].body;

  ok(internalText.includes("[ATRIBUCION]"), "Correo interno contiene ATRIBUCION");
  ok(
    internalText.includes("Versión atribución: TAKARA_STORE_ATTRIBUTION_V1"),
    "Correo interno conserva contrato de atribución"
  );
  ok(
    internalText.includes("Origen pedido: DIRECT"),
    "Pedido de entrega legacy sigue siendo DIRECT"
  );
  ok(internalText.includes("[ENTREGA]"), "Correo interno contiene ENTREGA");
  ok(internalText.includes("Ubicación código: leganes"), "Correo interno conserva código de ubicación");
  ok(internalText.includes("Ubicación nombre: Leganés"), "Correo interno conserva nombre de ubicación");
  ok(internalHtml.includes("Localidad o distrito"), "Correo interno HTML muestra ubicación");
  ok(customerText.includes("Localidad o distrito: Leganés"), "Correo cliente texto muestra ubicación");
  ok(customerHtml.includes("Localidad o distrito"), "Correo cliente HTML muestra ubicación");
  ok(customerHtml.includes("35,00 €"), "Correo cliente muestra total con entrega gratuita");


  server.sentEmails.length = 0;
  server.enviarConfirmacionCliente_("TK-WEB-DELIVERY-INFO", informativeOrder, photo);
  const informativeCustomer = server.sentEmails[0];
  ok(informativeCustomer.body.includes("Localidad indicada: Zaragoza centro"), "Correo cliente texto conserva localidad opcional");
  ok(informativeCustomer.htmlBody.includes("Localidad indicada"), "Correo cliente HTML conserva localidad opcional");

  server.sentEmails.length = 0;
  server.enviarConfirmacionCliente_("TK-WEB-DELIVERY-MUNICIPALITY", municipalityOrder, photo);
  const municipalityCustomer = server.sentEmails[0];
  ok(municipalityCustomer.body.includes("Municipio: A Coruña (A Coruña)"), "Correo cliente texto conserva municipio nacional");
  ok(municipalityCustomer.htmlBody.includes("Municipio"), "Correo cliente HTML conserva municipio nacional");

  const specialPayload = makePayload(deliveryApi, { postalCode: "07001" });
  const specialOrder = server.normalizarPedido_(specialPayload);
  server.validarPedido_(specialOrder);
  ok(specialOrder.entrega.estado_precio === "pendiente_confirmacion", "Baleares queda pendiente");
  ok(specialOrder.totales.total_estimado_eur === "", "Destino especial no inventa total");

  const multiPayload = makePayload(deliveryApi, { quantity: 2 });
  const multiOrder = server.normalizarPedido_(multiPayload);
  server.validarPedido_(multiOrder);
  ok(multiOrder.entrega.estado_precio === "pendiente_confirmacion", "Dos unidades quedan pendientes");

  const tamperedMode = makePayload(deliveryApi);
  tamperedMode.entrega.modalidad_resuelta = "entrega_local";
  tamperedMode.entrega.modalidad_solicitada = "entrega_local";
  tamperedMode.snapshot_pedido.entrega.modalidad_resuelta = "entrega_local";
  tamperedMode.snapshot_pedido.entrega.modalidad_solicitada = "entrega_local";
  expectThrow(function () {
    const candidate = server.normalizarPedido_(tamperedMode);
    server.validarPedido_(candidate);
  }, /modalidad/i, "Servidor rechaza modalidad manipulada");

  const tamperedLocation = makePayload(deliveryApi, {
    postalCode: "28917",
    locationCode: "leganes"
  });
  tamperedLocation.entrega.ubicacion_codigo = "alcorcon";
  tamperedLocation.snapshot_pedido.entrega.ubicacion_codigo = "alcorcon";
  expectThrow(function () {
    const candidate = server.normalizarPedido_(tamperedLocation);
    server.validarPedido_(candidate);
  }, /(snapshot|entrega|modalidad|ubicaci|zona|precio)/i, "Servidor rechaza ubicación manipulada");

  const tamperedPrice = makePayload(deliveryApi);
  tamperedPrice.entrega.precio_eur = "0.00";
  tamperedPrice.snapshot_pedido.entrega.precio_eur = "0.00";
  expectThrow(function () {
    const candidate = server.normalizarPedido_(tamperedPrice);
    server.validarPedido_(candidate);
  }, /precio de entrega/i, "Servidor rechaza precio manipulado");

  const tamperedTotal = makePayload(deliveryApi);
  tamperedTotal.totales = Object.assign({}, tamperedTotal.totales, { total_estimado_eur: "35.00" });
  tamperedTotal.snapshot_pedido.totales.total_estimado_eur = "35.00";
  expectThrow(function () {
    const candidate = server.normalizarPedido_(tamperedTotal);
    server.validarPedido_(candidate);
  }, /(snapshot|total)/i, "Servidor rechaza total manipulado");

  const fullAddressFlag = makePayload(deliveryApi);
  fullAddressFlag.entrega.direccion_completa_solicitada = true;
  fullAddressFlag.snapshot_pedido.entrega.direccion_completa_solicitada = true;
  expectThrow(function () {
    const candidate = server.normalizarPedido_(fullAddressFlag);
    server.validarPedido_(candidate);
  }, /dirección completa/i, "Servidor rechaza dirección completa inicial");

  const incompleteV2 = makePayload(deliveryApi);
  delete incompleteV2.entrega;
  delete incompleteV2.totales;
  expectThrow(function () {
    const candidate = server.normalizarPedido_(incompleteV2);
    server.validarPedido_(candidate);
  }, /snapshot|entrega|total/i, "Payload V2 incompleto se rechaza sin degradación legacy");
}

function testStaticContract() {
  const page = fs.readFileSync(ORDER_HTML, "utf8");
  const orderSource = fs.readFileSync(ORDER_JS, "utf8");
  const uiSource = fs.readFileSync(DELIVERY_UI_JS, "utf8");
  const cssSource = fs.readFileSync(DELIVERY_CSS, "utf8");
  const contract = fs.readFileSync(ORDER_CONTRACT, "utf8");

  ok(page.includes('type="hidden" name="modalidad_entrega"'), "Formulario conserva modalidad derivada oculta");
  ok(page.includes('name="codigo_postal_entrega"'), "Formulario conserva código postal");
  ok(page.includes('name="ubicacion_entrega_codigo"'), "Formulario conserva ubicación oficial");
  ok(page.includes('name="localidad_entrega_informativa"'), "Formulario conserva localidad informativa");
  ok(page.includes('name="municipio_entrega_codigo"'), "Formulario conserva código INE de municipio");
  ok(page.includes('name="municipio_entrega_nombre"'), "Formulario conserva municipio nacional");
  ok(page.includes('name="provincia_entrega_nombre"'), "Formulario conserva provincia nacional");
  ok(page.includes('name="municipio_entrega_fuente"'), "Formulario conserva fuente del municipio");
  ok(page.includes("data-takara-delivery-postal"), "Interfaz muestra código postal");
  ok(page.includes("data-takara-delivery-locality"), "Interfaz muestra localidad manual o automática");
  ok(page.includes("data-takara-delivery-municipality"), "Interfaz incluye selector nacional de municipio");
  ok(page.includes("data-takara-delivery-location"), "Interfaz conserva selector comercial prioritario");
  ok(!page.includes("data-takara-delivery-mode"), "Interfaz elimina selector manual de modalidad");
  ok(!page.includes("data-takara-delivery-zone"), "Tarifas no repiten la zona calculada");
  ok(!page.includes("modalidad_entrega_visible"), "Cliente no elige una tarifa");
  ok(page.includes("calcularemos automáticamente la opción de entrega más económica"), "Interfaz explica cálculo automático");
  ok(page.includes("La dirección completa se solicitará únicamente después"), "Interfaz aplaza dirección completa");
  ok(!/name=["'](?:direccion|calle|numero|número|piso|puerta)["']/i.test(page), "No hay dirección completa inicial");
  ok(page.includes("takara-pedido-delivery.css?v=entrega-v2-2"), "CSS V2 versionado");
  ok(page.includes("takara-delivery.js?v=entrega-v2-2"), "Core V2 versionado");
  ok(page.includes("takara-pedido-delivery.js?v=entrega-v2-2"), "UI V2 versionada");
  ok(page.includes("takara-pedido-web.js?v=pedido-entrega-v2-2"), "Motor de pedido V2 versionado");
  ok(page.includes("takara-postal-national.js?v=postal-nacional-v1"), "Página carga core nacional pequeño");
  ok(page.includes("Municipios según CartoCiudad · IGN/CNIG"), "Página muestra atribución CartoCiudad");
  ok(orderSource.includes('TAKARA_DELIVERY_CORE_V2'), "Motor usa core postal V2");
  ok(orderSource.includes("municipio_codigo"), "Payload incorpora municipio nacional");
  ok(uiSource.includes("postalApi.loadMap"), "UI carga el mapa solo al completar el código postal");
  ok(uiSource.includes("updateCommercialLocationOptions"), "Reglas comerciales conservan prioridad");
  ok(orderSource.includes("ubicacion_codigo"), "Payload incorpora ubicación oficial");
  ok(orderSource.includes("fuente_decision"), "Payload incorpora fuente de decisión");
  ok(orderSource.includes('return getEnvironment() === "local";'), "Localhost conserva dry-run");
  ok(uiSource.includes("TAKARA_DELIVERY_UI_V2"), "UI expone API V2");
  ok(uiSource.includes("getLocationOptions"), "UI limita opciones por CP");
  ok(cssSource.includes("TAKARA PEDIDO DELIVERY UI V2"), "CSS está versionado");
  ok(cssSource.includes("body.pedido-premium"), "CSS queda aislado");
  ok(contract.includes("TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC"), "Contrato documenta V2");
}

function main() {
  testNationalPostalMap();
  const deliveryApi = testCoreAndCatalog();
  testServerAndEmails(deliveryApi);
  testStaticContract();
  process.stdout.write("[TAKARA_DELIVERY_ORDER_TEST_OK] " + checks + " comprobaciones\n");
}

try {
  main();
} catch (error) {
  process.stderr.write(String(error && error.stack ? error.stack : error) + "\n");
  process.exitCode = 1;
}
