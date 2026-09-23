/*
 * TAKARA ORDER NORMALIZATION V1
 *
 * Contract detection, V1/V2 order normalization and safe snapshots.
 * Generic scalar helpers remain in Code.gs.
 */

function detectarContratoPedido_(payload) {
  const version = texto_(payload && payload.payload_version);

  if (version === CFG.PAYLOAD_VERSION) {
    return "v2";
  }

  if (version === CFG.PAYLOAD_VERSION_V1_COMPAT) {
    return "v1";
  }

  if (/^TAKARA_WEB_ORDER_PAYLOAD_V2/.test(version)) {
    throw new Error("Payload V2 declarado pero no compatible o incompleto.");
  }

  throw new Error("Versión de payload de pedido no compatible.");
}

function normalizarPedido_(payload) {
  const contrato = detectarContratoPedido_(payload);
  return contrato === "v2"
    ? normalizarPedidoV2_(payload)
    : normalizarPedidoV1Compat_(payload);
}

function normalizarPedidoV1Compat_(payload) {
  const cliente = payload.cliente || {};
  const producto = payload.producto || {};
  const archivos = payload.archivos || {};
  const control = payload.control || {};
  const meta = payload.meta || {};

  const orientacion = normalizarOrientacion_(
    producto.orientacion,
    producto.formato
  );
  const formatoHumano = normalizarFormatoHumano_(
    producto.formato,
    orientacion
  );
  const medida = texto_(producto.medida) ||
    (orientacion === "horizontal" ? "144 x 108 mm" : "108 x 144 mm");
  const precioUnitario = normalizarPrecio_(
    producto.precio_unitario_mostrado_eur ||
    producto.precio_mostrado_eur ||
    CFG.PRECIO_UNITARIO_MOSTRADO_EUR
  );
  const personalizacionMarco = normalizarPersonalizacionMarco_(
    producto.personalizacion_marco,
    orientacion
  );
  const cantidad = normalizarCantidad_(producto.cantidad);
  const legacyDelivery = normalizarEntregaPedido_(
    {},
    {},
    cantidad,
    precioUnitario
  );

  return {
    contrato_entrada: "v1_compat",
    payload_version: CFG.PAYLOAD_VERSION_V1_COMPAT,
    snapshot_version: "",
    pedido_web_id: texto_(payload.pedido_web_id),
    creado_en_iso: texto_(payload.creado_en_iso),
    modo_prueba: false,
    modo_transporte: texto_(payload.modo_transporte),
    prueba_tecnica: texto_(payload.prueba_tecnica),
    meta: {
      pagina_origen: texto_(meta.pagina_origen),
      entorno: normalizarEntorno_(meta.entorno, meta.pagina_origen)
    },
    cliente: {
      nombre: texto_(cliente.nombre),
      email: texto_(cliente.email),
      telefono: texto_(cliente.telefono)
    },
    producto: {
      producto: texto_(producto.producto) || CFG.PRODUCTO,
      codigo_producto: texto_(producto.codigo_producto) || CFG.CODIGO_PRODUCTO,
      variante_codigo: texto_(producto.variante_codigo),
      formato: formatoHumano,
      orientacion: orientacion,
      medida: medida,
      color_marco: texto_(producto.color_marco),
      color_litofania: texto_(producto.color_litofania) || CFG.COLOR_LITOFANIA,
      atributos: {},
      extras: [],
      cantidad: cantidad,
      precio_base_eur: CFG.PRECIO_UNITARIO_MOSTRADO_EUR,
      precio_variante_eur: "0.00",
      precio_extras_eur: personalizacionMarco.activa
        ? personalizacionMarco.suplemento_unitario_eur
        : "0.00",
      precio_unitario_mostrado_eur: precioUnitario,
      precio_total_eur: calcularTotalMostrado_(precioUnitario, cantidad),
      origen_precio: "legacy_web_v1",
      catalog_version: "legacy_v1",
      pricing_version: "legacy_v1",
      personalizacion_marco: personalizacionMarco
    },
    entrega: legacyDelivery.entrega,
    totales: legacyDelivery.totales,
    archivos: {
      foto_base64: texto_(archivos.foto_base64),
      nombre_archivo: texto_(archivos.nombre_archivo),
      content_type: texto_(archivos.content_type),
      size_bytes: normalizarTamanoArchivo_(archivos.size_bytes),
      foto_base64_presente: !!texto_(archivos.foto_base64),
      foto_base64_length: texto_(archivos.foto_base64).length,
      foto_base64_prefix: texto_(archivos.foto_base64).slice(0, 48),
      ficha_visual_base64: texto_(archivos.ficha_visual_base64),
      ficha_visual_nombre_archivo: texto_(archivos.ficha_visual_nombre_archivo),
      ficha_visual_content_type: texto_(archivos.ficha_visual_content_type),
      ficha_visual_size_bytes: normalizarTamanoArchivo_(
        archivos.ficha_visual_size_bytes
      ),
      ficha_visual_version: texto_(archivos.ficha_visual_version),
      ficha_visual_estado: texto_(archivos.ficha_visual_estado),
      ficha_visual_modo: normalizarModoVisual_(archivos.ficha_visual_modo),
      ficha_visual_base64_presente: booleano_(
        archivos.ficha_visual_base64_presente
      ),
      ficha_visual_base64_length: normalizarTamanoArchivo_(
        archivos.ficha_visual_base64_length
      ),
      ficha_visual_base64_prefix: texto_(
        archivos.ficha_visual_base64_prefix
      )
    },
    mensaje_cliente: texto_(payload.mensaje_cliente),
    control: {
      acepta_contacto: booleano_(control.acepta_contacto),
      acepta_revision: booleano_(control.acepta_revision),
      acepta_politica_privacidad: normalizarPrivacidad_(
        control.acepta_politica_privacidad
      ),
      consiente_gestion_datos: booleano_(control.acepta_contacto),
      declara_derechos_y_autoriza_revision_imagen: booleano_(
        control.acepta_revision
      ),
      autoriza_publicacion_resultado: booleano_(
        control.autoriza_publicacion_resultado
      )
    },
    snapshot_pedido: {}
  };
}

function normalizarPedidoV2_(payload) {
  const cliente = payload.cliente || {};
  const producto = payload.producto || {};
  const archivos = payload.archivos || {};
  const control = payload.control || {};
  const meta = payload.meta || {};
  const entrega = payload.entrega || {};
  const totales = payload.totales || {};
  const snapshot = payload.snapshot_pedido || {};

  const payloadVersion = texto_(payload.payload_version);
  if (payloadVersion !== CFG.PAYLOAD_VERSION) {
    if (/^TAKARA_WEB_ORDER_PAYLOAD_V2/.test(payloadVersion)) {
      throw new Error("Payload V2 declarado pero no compatible o incompleto.");
    }
    throw new Error(
      "Este candidato local acepta únicamente TAKARA_WEB_ORDER_PAYLOAD_V2."
    );
  }

  const orientacion = normalizarOrientacion_(
    producto.orientacion,
    producto.formato
  );
  const formatoHumano = normalizarFormatoHumano_(
    producto.formato,
    orientacion
  );
  const medida = texto_(producto.medida) ||
    (orientacion === "horizontal" ? "144 x 108 mm" : "108 x 144 mm");

  const precioUnitario = normalizarPrecio_(
    producto.precio_unitario_final_eur ||
    producto.precio_unitario_mostrado_eur ||
    producto.precio_mostrado_eur ||
    CFG.PRECIO_UNITARIO_MOSTRADO_EUR
  );
  const personalizacionMarco = normalizarPersonalizacionMarco_(
    producto.personalizacion_marco,
    orientacion
  );
  const cantidad = normalizarCantidad_(producto.cantidad);
  const deliveryBundle = normalizarEntregaPedido_(
    entrega,
    totales,
    cantidad,
    precioUnitario
  );

  const pedido = {
    contrato_entrada: "v2",
    payload_version: payloadVersion,
    snapshot_version: texto_(snapshot.snapshot_version),
    pedido_web_id: texto_(payload.pedido_web_id),
    creado_en_iso: texto_(payload.creado_en_iso),
    modo_prueba: payload.modo_prueba === true,
    meta: {
      pagina_origen: texto_(meta.pagina_origen),
      entorno: normalizarEntorno_(meta.entorno, meta.pagina_origen)
    },
    cliente: {
      nombre: texto_(cliente.nombre),
      email: texto_(cliente.email),
      telefono: texto_(cliente.telefono)
    },
    producto: {
      producto: texto_(producto.producto) || CFG.PRODUCTO,
      codigo_producto: texto_(producto.codigo_producto) || CFG.CODIGO_PRODUCTO,
      variante_codigo: texto_(producto.variante_codigo),
      formato: formatoHumano,
      orientacion: orientacion,
      medida: medida,
      color_marco: texto_(producto.color_marco),
      color_litofania: texto_(producto.color_litofania) || CFG.COLOR_LITOFANIA,
      atributos: objetoPlanoSeguro_(producto.atributos),
      extras: listaObjetosSegura_(producto.extras),
      cantidad: cantidad,
      precio_base_eur: normalizarPrecio_(producto.precio_base_eur),
      precio_variante_eur: normalizarPrecio_(producto.precio_variante_eur || "0.00"),
      precio_extras_eur: normalizarPrecio_(producto.precio_extras_eur || "0.00"),
      precio_unitario_mostrado_eur: precioUnitario,
      precio_total_eur: normalizarPrecio_(
        producto.precio_total_eur ||
        calcularTotalMostrado_(precioUnitario, cantidad)
      ),
      origen_precio: texto_(producto.origen_precio),
      catalog_version: texto_(producto.catalog_version),
      pricing_version: texto_(producto.pricing_version),
      personalizacion_marco: personalizacionMarco
    },
    entrega: deliveryBundle.entrega,
    totales: deliveryBundle.totales,
    archivos: {
      foto_base64: texto_(archivos.foto_base64),
      nombre_archivo: texto_(archivos.nombre_archivo),
      content_type: texto_(archivos.content_type),
      size_bytes: normalizarTamanoArchivo_(archivos.size_bytes),
      foto_base64_presente: !!texto_(archivos.foto_base64),
      foto_base64_length: texto_(archivos.foto_base64).length,
      foto_base64_prefix: texto_(archivos.foto_base64).slice(0, 48),
      ficha_visual_base64: texto_(archivos.ficha_visual_base64),
      ficha_visual_nombre_archivo: texto_(archivos.ficha_visual_nombre_archivo),
      ficha_visual_content_type: texto_(archivos.ficha_visual_content_type),
      ficha_visual_size_bytes: normalizarTamanoArchivo_(
        archivos.ficha_visual_size_bytes
      ),
      ficha_visual_version: texto_(archivos.ficha_visual_version),
      ficha_visual_estado: texto_(archivos.ficha_visual_estado),
      ficha_visual_modo: normalizarModoVisual_(archivos.ficha_visual_modo),
      ficha_visual_base64_presente: booleano_(
        archivos.ficha_visual_base64_presente
      ),
      ficha_visual_base64_length: normalizarTamanoArchivo_(
        archivos.ficha_visual_base64_length
      ),
      ficha_visual_base64_prefix: texto_(
        archivos.ficha_visual_base64_prefix
      )
    },
    mensaje_cliente: texto_(payload.mensaje_cliente),
    control: {
      consiente_gestion_datos: booleano_(control.consiente_gestion_datos),
      declara_derechos_y_autoriza_revision_imagen: booleano_(
        control.declara_derechos_y_autoriza_revision_imagen
      ),
      autoriza_publicacion_resultado: booleano_(
        control.autoriza_publicacion_resultado
      )
    },
    snapshot_pedido: snapshot
  };

  validarSnapshotV2_(pedido);
  return pedido;
}

function objetoPlanoSeguro_(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value));
}

function listaObjetosSegura_(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const copia = JSON.parse(JSON.stringify(value));
  if (copia.some(function (item) {
    return !item || typeof item !== "object" || Array.isArray(item);
  })) {
    throw new Error("Los extras V2 deben ser una lista de objetos.");
  }
  return copia;
}

function normalizarModoVisual_(value) {
  return texto_(value).toLowerCase() === "apagada" ? "apagada" : "encendida";
}

function normalizarPersonalizacionMarco_(value, orientacionPedido) {
  if (value === null || value === undefined || value === "") {
    return {
      activa: false,
      version: "",
      geometry_contract: "",
      orientacion: orientacionPedido,
      numero_lados: 0,
      suplemento_unitario_eur: "0.00",
      color_texto: "",
      color_texto_nombre: "",
      lados: {},
      claves_lados_recibidas: []
    };
  }

  let source = value;

  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch (error) {
      throw new Error("La personalizaci\u00F3n del marco no contiene JSON v\u00E1lido.");
    }
  }

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("La personalizaci\u00F3n del marco no tiene un formato v\u00E1lido.");
  }

  const sidesSource = source.lados;
  const receivedKeys = sidesSource && typeof sidesSource === "object" && !Array.isArray(sidesSource)
    ? Object.keys(sidesSource)
    : [];
  const sides = {};

  Object.keys(CFG.FRAME_TEXT_SIDE_LABELS).forEach(function (side) {
    if (sidesSource && Object.prototype.hasOwnProperty.call(sidesSource, side)) {
      if (typeof sidesSource[side] !== "string") {
        throw new Error("El texto de uno de los lados no tiene un formato v\u00E1lido.");
      }
      sides[side] = texto_(sidesSource[side]);
    }
  });

  return {
    activa: true,
    version: texto_(source.version),
    geometry_contract: texto_(source.geometry_contract),
    orientacion: texto_(source.orientacion).toLowerCase(),
    numero_lados: numeroEnteroEstricto_(source.numero_lados),
    suplemento_unitario_eur: normalizarImporteEstricto_(source.suplemento_unitario_eur),
    color_texto: texto_(source.color_texto),
    color_texto_nombre: texto_(source.color_texto_nombre),
    lados: sides,
    claves_lados_recibidas: receivedKeys
  };
}
