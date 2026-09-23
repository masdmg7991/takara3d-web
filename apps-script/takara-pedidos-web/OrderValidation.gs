/*
 * TAKARA ORDER VALIDATION V1
 *
 * V1/V2 order, catalog, visual-proof and personalization validation.
 * Generic scalar helpers remain in Code.gs.
 */

function validarSnapshotV2_(pedido) {
  const snapshot = pedido.snapshot_pedido;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Falta snapshot_pedido V2.");
  }
  if (texto_(snapshot.snapshot_version) !== CFG.SNAPSHOT_VERSION) {
    throw new Error("Snapshot V2 ausente o con versión incompatible.");
  }
  if (texto_(snapshot.payload_version) !== pedido.payload_version) {
    throw new Error("Snapshot y payload no coinciden en versión.");
  }
  if (texto_(snapshot.pedido_web_id) !== pedido.pedido_web_id) {
    throw new Error("Snapshot y payload no coinciden en ID de pedido.");
  }
  if (texto_(snapshot.creado_en_iso) !== pedido.creado_en_iso) {
    throw new Error("Snapshot y payload no coinciden en fecha de creación.");
  }

  const product = snapshot.producto || {};
  const delivery = snapshot.entrega || {};
  const totals = snapshot.totales || {};
  const control = snapshot.control || {};

  const checks = [
    [texto_(product.codigo_producto), pedido.producto.codigo_producto, "producto"],
    [texto_(product.variante_codigo), pedido.producto.variante_codigo, "variante"],
    [normalizarCantidad_(product.cantidad), pedido.producto.cantidad, "cantidad"],
    [texto_(delivery.codigo_postal), pedido.entrega.codigo_postal, "código postal"],
    [texto_(delivery.ubicacion_codigo), pedido.entrega.ubicacion_codigo, "ubicación"],
    [
      normalizarImporteOpcional_(totals.subtotal_productos_eur),
      pedido.totales.producto_eur,
      "subtotal"
    ],
    [
      normalizarImporteOpcional_(totals.precio_entrega_eur),
      pedido.totales.entrega_eur,
      "entrega"
    ],
    [
      normalizarImporteOpcional_(totals.total_estimado_eur),
      pedido.totales.total_estimado_eur,
      "total"
    ],
    [
      booleano_(control.consiente_gestion_datos),
      pedido.control.consiente_gestion_datos,
      "consentimiento de datos"
    ],
    [
      booleano_(control.declara_derechos_y_autoriza_revision_imagen),
      pedido.control.declara_derechos_y_autoriza_revision_imagen,
      "autorización de revisión"
    ],
    [
      booleano_(control.autoriza_publicacion_resultado),
      pedido.control.autoriza_publicacion_resultado,
      "autorización de publicación"
    ]
  ];

  checks.forEach(function (check) {
    if (check[0] !== check[1]) {
      throw new Error(
        "Snapshot V2 no coincide con payload en " + check[2] + "."
      );
    }
  });
}

function validarPedido_(pedido) {
  if (pedido && pedido.contrato_entrada === "v1_compat") {
    return validarPedidoV1Compat_(pedido);
  }
  return validarPedidoV2_(pedido);
}

function validarPedidoV1Compat_(pedido) {
  if (!pedido.cliente.nombre) {
    throw new Error("Falta el nombre del cliente.");
  }
  if (!pedido.cliente.telefono) {
    throw new Error("Falta el teléfono de contacto.");
  }
  if (!telefonoPedidoValido_(pedido.cliente.telefono)) {
    throw new Error(
      "El teléfono debe contener entre 9 y 15 dígitos, sin espacios ni símbolos."
    );
  }
  if (!pedido.cliente.email) {
    throw new Error("Falta el correo electrónico.");
  }
  if (!emailPedidoValido_(pedido.cliente.email)) {
    throw new Error("El correo electrónico no tiene un formato válido.");
  }
  if (!pedido.control.acepta_contacto) {
    throw new Error("Falta aceptación de contacto.");
  }
  if (!pedido.control.acepta_revision) {
    throw new Error("Falta aceptación de revisión de imagen.");
  }
  if (!pedido.archivos.foto_base64) {
    throw new Error("Falta la foto del pedido.");
  }
  if (
    pedido.archivos.size_bytes !== "" &&
    pedido.archivos.size_bytes > CFG.MAX_FOTO_BYTES
  ) {
    throw new Error("La foto supera el máximo permitido de 20 MB.");
  }
  validarPersonalizacionMarco_(
    pedido.producto.personalizacion_marco,
    pedido.producto.orientacion,
    pedido.producto.precio_unitario_mostrado_eur
  );
}

function validarPedidoV2_(pedido) {
  if (!pedido.cliente.nombre) {
    throw new Error("Falta el nombre del cliente.");
  }

  if (!pedido.cliente.telefono) {
    throw new Error("Falta el tel\u00E9fono de contacto.");
  }

  if (!telefonoPedidoValido_(pedido.cliente.telefono)) {
    throw new Error("El tel\u00E9fono debe contener entre 9 y 15 d\u00EDgitos, sin espacios ni s\u00EDmbolos.");
  }

  if (!pedido.cliente.email) {
    throw new Error("Falta el correo electr\u00F3nico.");
  }

  if (!emailPedidoValido_(pedido.cliente.email)) {
    throw new Error("El correo electr\u00F3nico no tiene un formato v\u00E1lido.");
  }

  validarProductoCatalogoV2_(pedido);

  if (!pedido.control.consiente_gestion_datos) {
    throw new Error("Falta consentimiento para gestionar los datos.");
  }

  if (!pedido.control.declara_derechos_y_autoriza_revision_imagen) {
    throw new Error(
      "Falta declaración de derechos y autorización de revisión de imagen."
    );
  }

  if (pedido.snapshot_version !== CFG.SNAPSHOT_VERSION) {
    throw new Error("El snapshot V2 no tiene la versión esperada.");
  }

  if (!pedido.archivos.foto_base64) {
    throw new Error("Falta la foto del pedido.");
  }

  if (pedido.archivos.size_bytes !== "" && pedido.archivos.size_bytes > CFG.MAX_FOTO_BYTES) {
    throw new Error("La foto supera el m\u00E1ximo permitido de 20 MB.");
  }

  validarPersonalizacionMarco_(
    pedido.producto.personalizacion_marco,
    pedido.producto.orientacion,
    pedido.producto.precio_unitario_mostrado_eur
  );

  validarEntregaPedido_(pedido.entrega, pedido.totales);
}

function validarProductoCatalogoV2_(pedido) {
  const product = pedido && pedido.producto ? pedido.producto : {};
  const rules = PRODUCT_RULES_V2[product.codigo_producto];

  if (!rules) {
    throw new Error(
      "Producto no publicado en el catálogo del emisor V2: " +
      product.codigo_producto
    );
  }

  if (!Object.prototype.hasOwnProperty.call(
    rules.variantes,
    product.variante_codigo
  )) {
    throw new Error("Variante no publicada para el producto V2.");
  }

  const expectedVariant = rules.variantes[product.variante_codigo];
  const p = product.personalizacion_marco;
  const expectedExtras = p && p.activa ? p.suplemento_unitario_eur : "0.00";
  const expectedUnitCents =
    importeEnCentimos_(rules.precio_base_eur) +
    importeEnCentimos_(expectedVariant) +
    importeEnCentimos_(expectedExtras);
  const expectedSubtotalCents = expectedUnitCents * product.cantidad;

  const checks = [
    [product.precio_base_eur, rules.precio_base_eur, "precio base"],
    [product.precio_variante_eur, expectedVariant, "precio de variante"],
    [product.precio_extras_eur, expectedExtras, "precio de extras"],
    [
      product.precio_unitario_mostrado_eur,
      (expectedUnitCents / 100).toFixed(2),
      "precio unitario"
    ],
    [
      product.precio_total_eur,
      (expectedSubtotalCents / 100).toFixed(2),
      "subtotal de producto"
    ],
    [product.catalog_version, rules.catalog_version, "versión de catálogo"],
    [product.pricing_version, rules.pricing_version, "versión de pricing"]
  ];

  checks.forEach(function (check) {
    if (check[0] !== check[1]) {
      throw new Error(
        "El " + check[2] + " no coincide con el catálogo del servidor."
      );
    }
  });
}


function validarFichaVisual_(archivos) {
  if (!archivos.ficha_visual_base64) {
    return;
  }

  if (archivos.ficha_visual_version !== CFG.VISUAL_PROOF_VERSION) {
    throw new Error("La versi\u00F3n de la ficha visual no es compatible.");
  }

  if (archivos.ficha_visual_estado !== "generada") {
    throw new Error("El estado de la ficha visual no es coherente.");
  }

  if (archivos.ficha_visual_content_type !== "image/jpeg") {
    throw new Error("La ficha visual debe recibirse en formato JPEG.");
  }

  if (
    archivos.ficha_visual_size_bytes === "" ||
    archivos.ficha_visual_size_bytes < 1 ||
    archivos.ficha_visual_size_bytes > CFG.MAX_VISUAL_PROOF_BYTES
  ) {
    throw new Error("El tama\u00F1o declarado de la ficha visual no es v\u00E1lido.");
  }
}

function validarPersonalizacionMarco_(personalizacion, orientacionPedido, precioUnitarioPedido) {
  const baseCents = importeEnCentimos_(CFG.PRECIO_UNITARIO_MOSTRADO_EUR);
  const unitCents = importeEnCentimos_(precioUnitarioPedido);

  if (!personalizacion || !personalizacion.activa) {
    if (unitCents !== baseCents) {
      throw new Error("El precio del pedido sin texto personalizado no coincide con el precio base.");
    }
    return;
  }

  if (personalizacion.version !== CFG.FRAME_TEXT_VERSION) {
    throw new Error("Versi\u00F3n de personalizaci\u00F3n del marco no compatible.");
  }

  if (personalizacion.orientacion !== orientacionPedido) {
    throw new Error("La orientaci\u00F3n del texto no coincide con el formato del marco.");
  }

  if (personalizacion.geometry_contract !== CFG.FRAME_TEXT_GEOMETRY[orientacionPedido]) {
    throw new Error("La geometr\u00EDa del texto no coincide con el formato del marco.");
  }

  const count = personalizacion.numero_lados;
  if (!isFinite(count) || count < 1 || count > 4 || Math.floor(count) !== count) {
    throw new Error("El n\u00FAmero de lados personalizados no es v\u00E1lido.");
  }

  const allowedSides = Object.keys(CFG.FRAME_TEXT_SIDE_LABELS);
  const receivedKeys = personalizacion.claves_lados_recibidas || [];
  const unexpectedSides = receivedKeys.filter(function (side) {
    return allowedSides.indexOf(side) === -1;
  });

  if (unexpectedSides.length > 0) {
    throw new Error("La personalizaci\u00F3n contiene un lado no permitido.");
  }

  const selectedSides = Object.keys(personalizacion.lados || {});
  if (selectedSides.length !== count || receivedKeys.length !== count) {
    throw new Error("Los textos recibidos no coinciden con el n\u00FAmero de lados seleccionado.");
  }

  selectedSides.forEach(function (side) {
    const sideText = texto_(personalizacion.lados[side]);

    if (!sideText) {
      throw new Error("Falta el texto del lado " + CFG.FRAME_TEXT_SIDE_LABELS[side].toLowerCase() + ".");
    }

    if (/[\u0000-\u001F\u007F]/.test(sideText)) {
      throw new Error("El texto personalizado contiene caracteres no permitidos.");
    }

    if (Array.from(sideText).length > CFG.FRAME_TEXT_MAX_CHARS) {
      throw new Error("El texto del lado " + CFG.FRAME_TEXT_SIDE_LABELS[side].toLowerCase() + " supera el l\u00EDmite permitido.");
    }
  });

  const expectedSupplement = CFG.FRAME_TEXT_PRICE_BY_SIDE_COUNT[count];
  if (personalizacion.suplemento_unitario_eur !== expectedSupplement) {
    throw new Error("El suplemento del texto no coincide con el n\u00FAmero de lados.");
  }

  const expectedColorName = CFG.FRAME_TEXT_COLOR_LABELS[personalizacion.color_texto];
  if (!expectedColorName || personalizacion.color_texto_nombre !== expectedColorName) {
    throw new Error("El color del texto del marco no es v\u00E1lido.");
  }

  const expectedUnitCents = baseCents + importeEnCentimos_(expectedSupplement);
  if (unitCents !== expectedUnitCents) {
    throw new Error("El precio del pedido no incluye correctamente el suplemento del texto.");
  }
}

/* ============================================================
   ENTREGA DE PEDIDO
   Clasificación, cotización y validación en OrderDelivery.gs.
   ============================================================ */
