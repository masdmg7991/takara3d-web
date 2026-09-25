/*
 * TAKARA ORDER DELIVERY V1
 *
 * Postal classification, delivery quote normalization and validation.
 * Shared numeric helpers remain in Code.gs.
 */

function normalizarCodigoPostalEntrega_(value) {
  return texto_(value);
}

function normalizarUbicacionEntregaCodigo_(value) {
  return texto_(value).toLowerCase();
}

function codigoPostalEspanolValido_(value) {
  const postalCode = texto_(value);

  if (!/^\d{5}$/.test(postalCode)) {
    return false;
  }

  const prefix = parseInt(postalCode.slice(0, 2), 10);
  return isFinite(prefix) && prefix >= 1 && prefix <= 52;
}

function opcionesUbicacionEntrega_(postalCode) {
  const options = CFG.DELIVERY_AMBIGUOUS_POSTAL_OPTIONS[postalCode];
  return Array.isArray(options) ? options : [];
}

function buscarOpcionUbicacionEntrega_(postalCode, locationCode) {
  const options = opcionesUbicacionEntrega_(postalCode);

  for (let index = 0; index < options.length; index += 1) {
    if (options[index].code === locationCode) {
      return options[index];
    }
  }

  return null;
}

function buscarAreaEntregaCercana_(postalCode) {
  const areas = Object.keys(CFG.DELIVERY_AUTOMATIC_NEARBY_BY_AREA);

  for (let index = 0; index < areas.length; index += 1) {
    const area = areas[index];
    if (CFG.DELIVERY_AUTOMATIC_NEARBY_BY_AREA[area].indexOf(postalCode) >= 0) {
      return area;
    }
  }

  return "";
}

function clasificacionEntregaInvalida_(postalCode, code, options, locationCode) {
  return {
    valida: false,
    resuelta: false,
    codigo: code,
    codigo_postal: postalCode,
    zona_codigo: "",
    zona_nombre: "",
    area_codigo: "",
    modalidad: "",
    precio_eur: "",
    fuente_decision: "",
    ubicacion_requerida: Array.isArray(options) && options.length > 0,
    ubicacion_codigo: locationCode || "",
    ubicacion_nombre: "",
    opciones_ubicacion: options || []
  };
}

function clasificarCodigoPostalEntrega_(postalCodeValue, locationCodeValue) {
  const postalCode = normalizarCodigoPostalEntrega_(postalCodeValue);
  const locationCode = normalizarUbicacionEntregaCodigo_(locationCodeValue);

  if (!codigoPostalEspanolValido_(postalCode)) {
    return clasificacionEntregaInvalida_(
      postalCode,
      postalCode ? "codigo_postal_invalido" : "codigo_postal_vacio",
      [],
      locationCode
    );
  }

  const locationOptions = opcionesUbicacionEntrega_(postalCode);
  if (locationOptions.length > 0) {
    if (!locationCode) {
      return clasificacionEntregaInvalida_(
        postalCode,
        "ubicacion_requerida",
        locationOptions,
        ""
      );
    }

    const selected = buscarOpcionUbicacionEntrega_(postalCode, locationCode);
    if (!selected) {
      return clasificacionEntregaInvalida_(
        postalCode,
        "ubicacion_invalida",
        locationOptions,
        locationCode
      );
    }

    return {
      valida: true,
      resuelta: true,
      codigo: "ok",
      codigo_postal: postalCode,
      zona_codigo: selected.zone_code,
      zona_nombre: selected.zone_name,
      area_codigo: selected.area_code,
      modalidad: selected.mode,
      precio_eur: Number(selected.price_eur).toFixed(2),
      fuente_decision: CFG.DELIVERY_DECISION_OFFICIAL_SELECTION,
      ubicacion_requerida: true,
      ubicacion_codigo: selected.code,
      ubicacion_nombre: selected.label,
      opciones_ubicacion: locationOptions
    };
  }

  if (locationCode) {
    return clasificacionEntregaInvalida_(
      postalCode,
      "ubicacion_no_permitida",
      [],
      locationCode
    );
  }

  if (CFG.DELIVERY_AUTOMATIC_FREE_POSTAL_CODES.indexOf(postalCode) >= 0) {
    return {
      valida: true,
      resuelta: true,
      codigo: "ok",
      codigo_postal: postalCode,
      zona_codigo: "leganes",
      zona_nombre: "Legan\u00E9s",
      area_codigo: "leganes",
      modalidad: CFG.DELIVERY_MODE_LOCAL,
      precio_eur: CFG.DELIVERY_PRICE_LOCAL_FREE_EUR,
      fuente_decision: CFG.DELIVERY_DECISION_AUTOMATIC,
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: "Legan\u00E9s",
      opciones_ubicacion: []
    };
  }

  const nearbyArea = buscarAreaEntregaCercana_(postalCode);
  if (nearbyArea) {
    return {
      valida: true,
      resuelta: true,
      codigo: "ok",
      codigo_postal: postalCode,
      zona_codigo: "madrid_sur_cercano",
      zona_nombre: CFG.DELIVERY_AREA_LABELS[nearbyArea],
      area_codigo: nearbyArea,
      modalidad: CFG.DELIVERY_MODE_LOCAL,
      precio_eur: CFG.DELIVERY_PRICE_LOCAL_NEARBY_EUR,
      fuente_decision: CFG.DELIVERY_DECISION_AUTOMATIC,
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: CFG.DELIVERY_AREA_LABELS[nearbyArea],
      opciones_ubicacion: []
    };
  }

  const prefix = postalCode.slice(0, 2);
  if (CFG.DELIVERY_SPECIAL_PREFIX_LABELS[prefix]) {
    return {
      valida: true,
      resuelta: true,
      codigo: "ok",
      codigo_postal: postalCode,
      zona_codigo: "destino_especial",
      zona_nombre: CFG.DELIVERY_SPECIAL_PREFIX_LABELS[prefix],
      area_codigo: prefix,
      modalidad: CFG.DELIVERY_MODE_TRACKED,
      precio_eur: "",
      fuente_decision: CFG.DELIVERY_DECISION_AUTOMATIC,
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: CFG.DELIVERY_SPECIAL_PREFIX_LABELS[prefix],
      opciones_ubicacion: []
    };
  }

  return {
    valida: true,
    resuelta: true,
    codigo: "ok",
    codigo_postal: postalCode,
    zona_codigo: "peninsula",
    zona_nombre: "Espa\u00F1a peninsular",
    area_codigo: "",
    modalidad: CFG.DELIVERY_MODE_TRACKED,
    precio_eur: CFG.DELIVERY_PRICE_MAINLAND_TRACKED_EUR,
    fuente_decision: CFG.DELIVERY_DECISION_AUTOMATIC,
    ubicacion_requerida: false,
    ubicacion_codigo: "",
    ubicacion_nombre: "",
    opciones_ubicacion: []
  };
}

function calcularCotizacionEntrega_(postalCodeValue, locationCodeValue, quantityValue) {
  const classification = clasificarCodigoPostalEntrega_(
    postalCodeValue,
    locationCodeValue
  );
  const quantity = normalizarCantidad_(quantityValue);

  if (!classification.valida) {
    let customerText = "El c\u00F3digo postal de entrega no es v\u00E1lido.";

    if (classification.codigo === "codigo_postal_vacio") {
      customerText = "Introduce el c\u00F3digo postal de entrega.";
    } else if (classification.codigo === "ubicacion_requerida") {
      customerText = "Este c\u00F3digo postal abarca varias zonas. Selecciona tu localidad o distrito.";
    } else if (classification.codigo === "ubicacion_invalida") {
      customerText = "La localidad o distrito seleccionado no corresponde a este c\u00F3digo postal.";
    } else if (classification.codigo === "ubicacion_no_permitida") {
      customerText = "La ubicaci\u00F3n declarada no coincide con el c\u00F3digo postal.";
    }

    return {
      valida: false,
      codigo: classification.codigo,
      modalidad_solicitada: "",
      modalidad: "",
      codigo_postal: classification.codigo_postal,
      zona_codigo: "",
      zona_nombre: "",
      area_codigo: "",
      fuente_decision: classification.fuente_decision,
      ubicacion_requerida: classification.ubicacion_requerida,
      ubicacion_codigo: classification.ubicacion_codigo,
      ubicacion_nombre: "",
      precio_eur: "",
      estado_precio: "invalido",
      texto_cliente: customerText
    };
  }

  const base = {
    valida: true,
    codigo: "ok",
    modalidad_solicitada: classification.modalidad,
    modalidad: classification.modalidad,
    codigo_postal: classification.codigo_postal,
    zona_codigo: classification.zona_codigo,
    zona_nombre: classification.zona_nombre,
    area_codigo: classification.area_codigo,
    fuente_decision: classification.fuente_decision,
    ubicacion_requerida: classification.ubicacion_requerida,
    ubicacion_codigo: classification.ubicacion_codigo,
    ubicacion_nombre: classification.ubicacion_nombre,
    precio_eur: classification.precio_eur,
    estado_precio: "confirmado",
    texto_cliente: ""
  };

  if (classification.zona_codigo === "destino_especial") {
    base.codigo = "destino_especial";
    base.precio_eur = "";
    base.estado_precio = "pendiente_confirmacion";
    base.texto_cliente = "El env\u00EDo a " + classification.zona_nombre +
      " se confirmar\u00E1 personalmente antes de fabricar.";
    return base;
  }

  if (
    classification.modalidad === CFG.DELIVERY_MODE_TRACKED &&
    quantity > CFG.DELIVERY_FIXED_MAINLAND_MAX_QUANTITY
  ) {
    base.codigo = "envio_multiple";
    base.precio_eur = "";
    base.estado_precio = "pendiente_confirmacion";
    base.texto_cliente = "Para " + quantity +
      " unidades confirmaremos el coste de env\u00EDo seg\u00FAn el embalaje final.";
    return base;
  }

  if (classification.zona_codigo === "leganes") {
    base.texto_cliente = "Entrega local gratuita en Legan\u00E9s. " +
      "Acordaremos contigo el d\u00EDa y el lugar.";
    return base;
  }

  if (classification.zona_codigo === "madrid_sur_cercano") {
    base.texto_cliente = "Entrega local en " + classification.zona_nombre +
      " por 3,00 \u20AC. Acordaremos contigo el d\u00EDa y el lugar.";
    return base;
  }

  base.texto_cliente = "Env\u00EDo est\u00E1ndar con seguimiento a " +
    "Espa\u00F1a peninsular por 6,50 \u20AC.";
  return base;
}

function normalizarEntregaPedido_(rawEntrega, rawTotales, cantidad, precioUnitario) {
  const deliverySource = rawEntrega && typeof rawEntrega === "object" && !Array.isArray(rawEntrega)
    ? rawEntrega
    : {};
  const totalsSource = rawTotales && typeof rawTotales === "object" && !Array.isArray(rawTotales)
    ? rawTotales
    : {};
  const hasDeliveryContract = Object.keys(deliverySource).length > 0;
  const productTotal = calcularTotalMostrado_(precioUnitario, cantidad);
  const fulfillmentMethod = normalizarFulfillmentMethod_(
    deliverySource.fulfillment_method
  );

  if (
    hasDeliveryContract &&
    fulfillmentMethod === TAKARA_FULFILLMENT_METHOD.STORE_PICKUP
  ) {
    return construirRecogidaTienda_(deliverySource, totalsSource, productTotal);
  }

  if (!hasDeliveryContract) {
    return {
      entrega: {
        contrato_activo: false,
        version: "TAKARA_DELIVERY_LEGACY_TRANSITION",
        valida: true,
        codigo: "legacy_sin_entrega",
        modalidad_solicitada: "",
        modalidad: "pendiente_confirmar",
        codigo_postal: "",
        zona_codigo: "",
        zona_nombre: "",
        area_codigo: "",
        fuente_decision: "",
        ubicacion_requerida: false,
        ubicacion_codigo: "",
        ubicacion_nombre: "",
        localidad_informativa: "",
        municipio_codigo: "",
        municipio_nombre: "",
        provincia_nombre: "",
        municipio_fuente: "",
        precio_eur: "",
        moneda: CFG.MONEDA,
        estado_precio: "pendiente_confirmacion",
        direccion_completa_solicitada: false,
        texto_cliente: "La modalidad y el coste de entrega se confirmar\u00E1n personalmente.",
        declarada: {}
      },
      totales: {
        version: "TAKARA_DELIVERY_LEGACY_TRANSITION",
        producto_eur: productTotal,
        entrega_eur: "",
        total_estimado_eur: "",
        moneda: CFG.MONEDA,
        estado_total: "pendiente_confirmacion",
        declarado: {}
      }
    };
  }

  const quote = calcularCotizacionEntrega_(
    deliverySource.codigo_postal,
    deliverySource.ubicacion_codigo,
    cantidad
  );
  const deliveryCents = quote.estado_precio === "confirmado"
    ? importeEnCentimos_(quote.precio_eur)
    : NaN;
  const productCents = importeEnCentimos_(productTotal);
  const estimatedTotal = isFinite(deliveryCents) && isFinite(productCents)
    ? ((productCents + deliveryCents) / 100).toFixed(2)
    : "";
  const municipality = normalizarMunicipioInformativo_(
    deliverySource,
    quote.ubicacion_requerida
  );
  const informativeLocality = quote.ubicacion_requerida
    ? ""
    : (municipality.nombre ||
      normalizarLocalidadInformativa_(deliverySource.localidad_informativa));

  return {
    entrega: {
      contrato_activo: true,
      version: CFG.DELIVERY_VERSION,
      fulfillment_method: TAKARA_FULFILLMENT_METHOD.DELIVERY,
      valida: quote.valida,
      codigo: quote.codigo,
      modalidad_solicitada: quote.modalidad_solicitada,
      modalidad: quote.modalidad,
      codigo_postal: quote.codigo_postal,
      zona_codigo: quote.zona_codigo,
      zona_nombre: quote.zona_nombre,
      area_codigo: quote.area_codigo,
      fuente_decision: quote.fuente_decision,
      ubicacion_requerida: quote.ubicacion_requerida,
      ubicacion_codigo: quote.ubicacion_codigo,
      ubicacion_nombre: quote.ubicacion_nombre,
      localidad_informativa: informativeLocality,
      municipio_codigo: municipality.codigo,
      municipio_nombre: municipality.nombre,
      provincia_nombre: municipality.provincia,
      municipio_fuente: municipality.fuente,
      precio_eur: quote.precio_eur,
      moneda: CFG.MONEDA,
      estado_precio: quote.estado_precio,
      direccion_completa_solicitada: false,
      texto_cliente: quote.texto_cliente,
      declarada: {
        fulfillment_method: fulfillmentMethod,
        version: texto_(deliverySource.version),
        modalidad_solicitada: texto_(deliverySource.modalidad_solicitada),
        modalidad: texto_(deliverySource.modalidad_resuelta || deliverySource.modalidad),
        codigo_postal: texto_(deliverySource.codigo_postal),
        zona_codigo: texto_(deliverySource.zona_codigo),
        zona_nombre: texto_(deliverySource.zona_nombre),
        area_codigo: texto_(deliverySource.area_codigo),
        fuente_decision: texto_(deliverySource.fuente_decision),
        ubicacion_requerida: deliverySource.ubicacion_requerida === true,
        ubicacion_codigo: texto_(deliverySource.ubicacion_codigo),
        ubicacion_nombre: texto_(deliverySource.ubicacion_nombre),
        localidad_informativa: informativeLocality,
        municipio_codigo: municipality.codigo,
        municipio_nombre: municipality.nombre,
        provincia_nombre: municipality.provincia,
        municipio_fuente: municipality.fuente,
        precio_eur: normalizarImporteOpcional_(deliverySource.precio_eur),
        moneda: texto_(deliverySource.moneda),
        estado_precio: texto_(deliverySource.estado_precio),
        direccion_completa_solicitada: deliverySource.direccion_completa_solicitada === true,
        texto_cliente: texto_(deliverySource.texto_cliente)
      }
    },
    totales: {
      version: CFG.DELIVERY_VERSION,
      producto_eur: productTotal,
      entrega_eur: quote.precio_eur,
      total_estimado_eur: estimatedTotal,
      moneda: CFG.MONEDA,
      estado_total: estimatedTotal ? "confirmado" : "pendiente_confirmacion",
      declarado: {
        version: texto_(totalsSource.version),
        producto_eur: normalizarImporteOpcional_(totalsSource.subtotal_productos_eur || totalsSource.product_eur || totalsSource.producto_eur),
        entrega_eur: normalizarImporteOpcional_(totalsSource.precio_entrega_eur || totalsSource.delivery_eur || totalsSource.entrega_eur),
        total_estimado_eur: normalizarImporteOpcional_(totalsSource.total_estimado_eur || totalsSource.estimated_total_eur),
        moneda: texto_(totalsSource.moneda || totalsSource.currency),
        estado_total: texto_(totalsSource.estado_total || totalsSource.total_status)
      }
    }
  };
}

function normalizarLocalidadInformativa_(value) {
  return texto_(value)
    .replace(/\s+/g, " ")
    .slice(0, CFG.DELIVERY_LOCALITY_MAX_CHARS);
}

function normalizarMunicipioInformativo_(deliverySource, commercialLocationRequired) {
  if (commercialLocationRequired) {
    return { codigo: "", nombre: "", provincia: "", fuente: "" };
  }

  const source = deliverySource && typeof deliverySource === "object"
    ? deliverySource
    : {};
  const rawCode = texto_(source.municipio_codigo)
    .slice(0, CFG.DELIVERY_MUNICIPALITY_CODE_MAX_CHARS);
  const code = /^\d{5}$/.test(rawCode) ? rawCode : "";
  const name = normalizarLocalidadInformativa_(source.municipio_nombre);
  const province = normalizarLocalidadInformativa_(source.provincia_nombre);
  const rawSource = texto_(source.municipio_fuente)
    .slice(0, CFG.DELIVERY_MUNICIPALITY_SOURCE_MAX_CHARS);
  const allowedSource = CFG.DELIVERY_MUNICIPALITY_SOURCES.indexOf(rawSource) >= 0
    ? rawSource
    : "";
  const cartoSource = allowedSource === "cartociudad_automatico" ||
    allowedSource === "cartociudad_seleccion";

  if (cartoSource && (!code || !name || !province)) {
    return { codigo: "", nombre: "", provincia: "", fuente: "" };
  }

  if (!cartoSource) {
    return {
      codigo: "",
      nombre: "",
      provincia: "",
      fuente: allowedSource
    };
  }

  return {
    codigo: code,
    nombre: name,
    provincia: province,
    fuente: allowedSource
  };
}

function normalizarImporteOpcional_(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return normalizarImporteEstricto_(value);
}

function validarEntregaPedido_(entrega, totales, attribution) {
  if (!entrega || !entrega.contrato_activo) {
    return;
  }

  const fulfillmentMethod = normalizarFulfillmentMethod_(
    entrega.fulfillment_method
  );

  validarRecogidaTienda_(entrega, attribution, fulfillmentMethod);

  if (!entrega.valida) {
    throw new Error("El c\u00F3digo postal y la ubicaci\u00F3n de entrega no son compatibles.");
  }

  const declarada = entrega.declarada || {};
  const declaredTotals = totales && totales.declarado ? totales.declarado : {};
  const deliveryChecks = [
    [declarada.fulfillment_method, fulfillmentMethod, "método de entrega"],
    [declarada.version, CFG.DELIVERY_VERSION, "versi\u00F3n"],
    [declarada.modalidad_solicitada, entrega.modalidad_solicitada, "modalidad calculada"],
    [declarada.modalidad, entrega.modalidad, "modalidad"],
    [declarada.codigo_postal, entrega.codigo_postal, "c\u00F3digo postal"],
    [declarada.zona_codigo, entrega.zona_codigo, "zona"],
    [declarada.zona_nombre, entrega.zona_nombre, "nombre de zona"],
    [declarada.area_codigo, entrega.area_codigo, "\u00E1rea"],
    [declarada.fuente_decision, entrega.fuente_decision, "fuente de decisi\u00F3n"],
    [declarada.ubicacion_requerida, entrega.ubicacion_requerida, "requisito de ubicaci\u00F3n"],
    [declarada.ubicacion_codigo, entrega.ubicacion_codigo, "c\u00F3digo de ubicaci\u00F3n"],
    [declarada.ubicacion_nombre, entrega.ubicacion_nombre, "nombre de ubicaci\u00F3n"],
    [declarada.localidad_informativa, entrega.localidad_informativa, "localidad informativa"],
    [declarada.municipio_codigo, entrega.municipio_codigo, "c\u00F3digo de municipio"],
    [declarada.municipio_nombre, entrega.municipio_nombre, "nombre de municipio"],
    [declarada.provincia_nombre, entrega.provincia_nombre, "nombre de provincia"],
    [declarada.municipio_fuente, entrega.municipio_fuente, "fuente de municipio"],
    [declarada.precio_eur, entrega.precio_eur, "precio de entrega"],
    [declarada.moneda, CFG.MONEDA, "moneda de entrega"],
    [declarada.estado_precio, entrega.estado_precio, "estado del precio de entrega"],
    [declarada.texto_cliente, entrega.texto_cliente, "texto de entrega"]
  ];

  deliveryChecks.forEach(function (check) {
    if (check[0] !== check[1]) {
      throw new Error("Los datos declarados de " + check[2] +
        " no coinciden con la pol\u00EDtica de Takara 3D.");
    }
  });

  if (declarada.direccion_completa_solicitada) {
    throw new Error("La solicitud inicial no debe incluir ni marcar una direcci\u00F3n completa.");
  }

  const totalChecks = [
    [declaredTotals.version, CFG.DELIVERY_VERSION, "versi\u00F3n de totales"],
    [declaredTotals.producto_eur, totales.producto_eur, "subtotal de productos"],
    [declaredTotals.entrega_eur, totales.entrega_eur, "importe de entrega"],
    [declaredTotals.total_estimado_eur, totales.total_estimado_eur, "total estimado"],
    [declaredTotals.moneda, CFG.MONEDA, "moneda de totales"],
    [declaredTotals.estado_total, totales.estado_total, "estado del total"]
  ];

  totalChecks.forEach(function (check) {
    if (check[0] !== check[1]) {
      throw new Error("El " + check[2] +
        " declarado no coincide con el c\u00E1lculo del servidor.");
    }
  });
}

/* ============================================================
   EMAIL DE PEDIDO
   Render y envío en OrderEmail.gs.
   ============================================================ */
