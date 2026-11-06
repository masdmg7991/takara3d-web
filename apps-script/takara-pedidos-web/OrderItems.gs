/* Multi-item order V3. Product validation is explicit; legacy V1/V2 stay intact. */
const ORDER_ITEMS_VERSION = "TAKARA_WEB_ORDER_PAYLOAD_V3";
const ORDER_ITEMS_SNAPSHOT = "TAKARA_ORDER_SNAPSHOT_V3";
const ORDER_ITEMS_MAX_BYTES = 20 * 1024 * 1024;
const ORDER_ITEMS_BOX = "CAJA_LITOFANIA_4_FOTOS_100X100";
const ORDER_ITEMS_FACES = Object.freeze(["frontal", "derecha", "trasera", "izquierda"]);

function cantidadArticulo_(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error("Cada cantidad debe ser un entero de 1 a 20.");
  return n;
}

function importeArticulo_(value) {
  const text = String(value === undefined ? "" : value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Importe de artículo no válido.");
  return Number(text).toFixed(2);
}

function normalizarArticulo_(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Artículo no válido.");
  const id = texto_(raw.id);
  if (!/^A\d{2}$/.test(id)) throw new Error("Identificador de artículo no válido.");
  const source = raw.producto || {}, files = raw.archivos || {};
  const box = source.codigo_producto === ORDER_ITEMS_BOX;
  if (!box && source.codigo_producto !== CFG.CODIGO_PRODUCTO) throw new Error("Producto de artículo no reconocido.");
  const variant = texto_(source.variante_codigo);
  if (box ? variant !== "cuatro_fotos" : ["vertical", "horizontal"].indexOf(variant) < 0) throw new Error("Formato de artículo no válido.");
  const colors = CFG.FRAME_TEXT_COLOR_LABELS;
  const attrs = source.atributos || {};
  const bodyKey = texto_(attrs.color_cuerpo_codigo), baseKey = texto_(attrs.color_peana_codigo);
  if (box && (!Object.prototype.hasOwnProperty.call(colors, bodyKey) || !Object.prototype.hasOwnProperty.call(colors, baseKey))) {
    throw new Error("Colores de cuerpo o peana no válidos.");
  }
  if (!box && Object.keys(colors).every(function (key) { return colors[key] !== source.color_marco; })) throw new Error("Color del marco no válido.");
  if (box && (source.personalizacion_marco || (source.extras || []).length)) throw new Error("La caja no admite textos ni suplementos.");
  if (box && (source.color_cuerpo !== colors[bodyKey] || source.color_peana !== colors[baseKey])) throw new Error("Los nombres y códigos de color no coinciden.");
  const text = normalizarPersonalizacionMarco_(box ? null : source.personalizacion_marco, variant);
  const quantity = cantidadArticulo_(source.cantidad);
  const product = {
    codigo_producto: source.codigo_producto, producto: box ? "Caja de luz · 4 fotos" : CFG.PRODUCTO,
    variante_codigo: variant, formato: box ? "Caja de luz · 4 fotos" : "Marco " + variant,
    orientacion: variant, medida: box ? "100 x 100 mm" : variant === "vertical" ? "108 x 144 mm" : "144 x 108 mm",
    color_marco: box ? colors[bodyKey] : texto_(source.color_marco),
    color_cuerpo: box ? colors[bodyKey] : "", color_peana: box ? colors[baseKey] : "",
    atributos: box ? { color_cuerpo_codigo: bodyKey, color_peana_codigo: baseKey } : {},
    color_litofania: CFG.COLOR_LITOFANIA, cantidad: quantity,
    precio_base_eur: importeArticulo_(source.precio_base_eur),
    precio_variante_eur: importeArticulo_(source.precio_variante_eur),
    precio_extras_eur: importeArticulo_(source.precio_extras_eur),
    precio_unitario_mostrado_eur: importeArticulo_(source.precio_unitario_final_eur),
    precio_total_eur: importeArticulo_(source.precio_total_eur),
    catalog_version: texto_(source.catalog_version), pricing_version: texto_(source.pricing_version),
    personalizacion_marco: text
  };
  if (box) {
    if (product.precio_base_eur !== "75.00" || product.precio_variante_eur !== "0.00" ||
        product.precio_extras_eur !== "0.00" || product.precio_unitario_mostrado_eur !== "75.00" ||
        product.precio_total_eur !== (7500 * quantity / 100).toFixed(2) ||
        product.catalog_version !== "TAKARA_CATALOGO_V1" || product.pricing_version !== "TAKARA_PRICING_V1") {
      throw new Error("El precio de la caja no coincide con el catálogo del servidor.");
    }
  } else {
    validarProductoCatalogoV2_({ producto: product });
    validarPersonalizacionMarco_(text, variant, product.precio_unitario_mostrado_eur);
  }
  const expectedFaces = box ? ORDER_ITEMS_FACES : ["frontal"];
  if (!Array.isArray(files.fotos) || files.fotos.length !== expectedFaces.length) throw new Error("Número de fotos incorrecto en " + id + ".");
  const photos = expectedFaces.map(function (face, i) {
    const photo = files.fotos[i];
    if (!photo || photo.cara !== face || !texto_(photo.foto_base64)) throw new Error("Falta una foto identificada por su cara en " + id + ".");
    const size = Number(photo.size_bytes);
    if (!Number.isInteger(size) || size < 1 || size > CFG.MAX_FOTO_BYTES) throw new Error("Tamaño de foto no válido en " + id + ".");
    return { cara: face, foto_base64: texto_(photo.foto_base64), nombre_archivo: texto_(photo.nombre_archivo).slice(0, 150),
      content_type: texto_(photo.content_type), size_bytes: size };
  });
  if (box && files.ficha_visual_base64) throw new Error("La caja se identifica por sus cuatro fotos, sin captura adicional.");
  const media = { articulo_id: id, fotos: photos };
  if (!box) ["ficha_visual_base64", "ficha_visual_nombre_archivo", "ficha_visual_content_type", "ficha_visual_version",
    "ficha_visual_estado", "ficha_visual_modo"].forEach(function (key) { media[key] = texto_(files[key]); });
  if (!box) media.ficha_visual_size_bytes = normalizarTamanoArchivo_(files.ficha_visual_size_bytes);
  return { item: { id: id, numero: index + 1, producto: product }, media: media };
}

function normalizarPedidoV3_(payload) {
  if (payload.payload_version !== ORDER_ITEMS_VERSION) throw new Error("Versión de pedido múltiple incompatible.");
  if (!Array.isArray(payload.articulos) || payload.articulos.length < 1 || payload.articulos.length > 20) throw new Error("El pedido debe contener entre 1 y 20 artículos.");
  const ids = {}, items = [], media = [];
  let subtotal = 0, units = 0, declaredBytes = 0;
  payload.articulos.forEach(function (raw, index) {
    const entry = normalizarArticulo_(raw, index);
    if (ids[entry.item.id]) throw new Error("Identificador de artículo repetido.");
    ids[entry.item.id] = true; items.push(entry.item); media.push(entry.media);
    units += entry.item.producto.cantidad; subtotal += importeEnCentimos_(entry.item.producto.precio_total_eur);
    entry.media.fotos.forEach(function (photo) { declaredBytes += photo.size_bytes; });
    declaredBytes += Number(entry.media.ficha_visual_size_bytes || 0) * 2;
  });
  if (units > 20 || declaredBytes > ORDER_ITEMS_MAX_BYTES) throw new Error("El pedido supera 20 unidades o 20 MB de imágenes.");
  // Delivery uses all units; the subtotal is supplied as one aggregate monetary amount.
  const bundle = normalizarEntregaPedido_(payload.entrega, payload.totales, units, "0.00");
  const total = (subtotal / 100).toFixed(2);
  bundle.totales.producto_eur = total;
  bundle.totales.total_estimado_eur = bundle.entrega.estado_precio === "confirmado"
    ? ((subtotal + importeEnCentimos_(bundle.entrega.precio_eur)) / 100).toFixed(2) : "";
  bundle.totales.estado_total = bundle.totales.total_estimado_eur ? "confirmado" : "pendiente_confirmacion";
  const client = payload.cliente || {}, control = payload.control || {}, meta = payload.meta || {};
  return { contrato_entrada: "v3", payload_version: ORDER_ITEMS_VERSION, snapshot_version: ORDER_ITEMS_SNAPSHOT,
    pedido_web_id: texto_(payload.pedido_web_id), creado_en_iso: texto_(payload.creado_en_iso), modo_prueba: false,
    cliente: { nombre: texto_(client.nombre).slice(0, 100), email: texto_(client.email), telefono: texto_(client.telefono) },
    meta: { pagina_origen: texto_(meta.pagina_origen), entorno: normalizarEntorno_(meta.entorno, meta.pagina_origen) },
    articulos: items, cantidad_total: units, archivos: { articulos: media }, entrega: bundle.entrega, totales: bundle.totales,
    mensaje_cliente: texto_(payload.mensaje_cliente).slice(0, 5000),
    control: { consiente_gestion_datos: control.consiente_gestion_datos === true,
      declara_derechos_y_autoriza_revision_imagen: control.declara_derechos_y_autoriza_revision_imagen === true,
      autoriza_publicacion_resultado: control.autoriza_publicacion_resultado === true } };
}

function validarPedidoV3_(pedido) {
  if (!pedido.cliente.nombre || !telefonoPedidoValido_(pedido.cliente.telefono) || !emailPedidoValido_(pedido.cliente.email)) throw new Error("Revisa los datos de contacto del pedido.");
  if (!pedido.control.consiente_gestion_datos || !pedido.control.declara_derechos_y_autoriza_revision_imagen) throw new Error("Faltan los consentimientos del pedido.");
  validarEntregaPedido_(pedido.entrega, pedido.totales, pedido.attribution);
}

function fingerprintPedidoV3_(pedido) {
  function safe(value) {
    if (Array.isArray(value)) return value.map(safe);
    if (!value || typeof value !== "object") return value;
    const out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (key === "recibido_apps_script_iso") return;
      out[key] = /^(foto|ficha_visual)_base64$/.test(key) ? orderIdempotencySha256Hex_(value[key]) : safe(value[key]);
    });
    return out;
  }
  return orderIdempotencySha256Hex_(JSON.stringify(safe(pedido)));
}
