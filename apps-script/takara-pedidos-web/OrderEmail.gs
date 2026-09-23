/*
 * TAKARA ORDER EMAIL V1
 *
 * Order email subjects, text/HTML bodies, MailApp handoff and premium rendering.
 * Shared numeric normalization remains outside this module.
 */

function nombreModalidadEntrega_(entrega) {
  if (!entrega) {
    return "Pendiente de confirmar";
  }

  if (entrega.modalidad === CFG.DELIVERY_MODE_LOCAL) {
    return "Entrega local";
  }

  if (entrega.modalidad === CFG.DELIVERY_MODE_TRACKED) {
    return "Env\u00EDo con seguimiento";
  }

  return "Pendiente de confirmar";
}

function textoPrecioEntrega_(entrega) {
  if (entrega && entrega.estado_precio === "confirmado" && entrega.precio_eur !== "") {
    return formatearEuros_(entrega.precio_eur);
  }

  return "Pendiente de confirmar";
}

function textoTotalEstimado_(totales) {
  if (totales && totales.estado_total === "confirmado" && totales.total_estimado_eur !== "") {
    return formatearEuros_(totales.total_estimado_eur);
  }

  return "Pendiente de confirmar";
}

function construirBloqueEntregaClienteTexto_(pedido) {
  const entrega = pedido.entrega || {};
  const lines = [
    "Modalidad: " + nombreModalidadEntrega_(entrega),
    "C\u00F3digo postal: " + (entrega.codigo_postal || "Pendiente"),
    "Zona: " + (entrega.zona_nombre || "Pendiente de confirmar"),
    "Coste de entrega: " + textoPrecioEntrega_(entrega),
    "Direcci\u00F3n completa: se solicitar\u00E1 despu\u00E9s de revisar la fotograf\u00EDa y confirmar el pedido"
  ];

  if (entrega.ubicacion_requerida && entrega.ubicacion_nombre) {
    lines.splice(3, 0, "Localidad o distrito: " + entrega.ubicacion_nombre);
  } else if (entrega.municipio_nombre) {
    lines.splice(3, 0, "Municipio: " + entrega.municipio_nombre +
      (entrega.provincia_nombre ? " (" + entrega.provincia_nombre + ")" : ""));
  } else if (entrega.localidad_informativa) {
    lines.splice(3, 0, "Localidad indicada: " + entrega.localidad_informativa);
  }

  if (entrega.texto_cliente) {
    lines.push("Nota: " + entrega.texto_cliente);
  }

  return lines.join("\n");
}

function construirFilasEntregaEmailPremium_(pedido) {
  const entrega = pedido.entrega || {};
  const rows = [
    construirFilaResumenEmailPremium_("Modalidad", escapeHtml_(nombreModalidadEntrega_(entrega)), false),
    construirFilaResumenEmailPremium_("C\u00F3digo postal", escapeHtml_(entrega.codigo_postal || "Pendiente"), false),
    construirFilaResumenEmailPremium_("Zona", escapeHtml_(entrega.zona_nombre || "Pendiente de confirmar"), false)
  ];

  if (entrega.ubicacion_requerida && entrega.ubicacion_nombre) {
    rows.push(
      construirFilaResumenEmailPremium_(
        "Localidad o distrito",
        escapeHtml_(entrega.ubicacion_nombre),
        false
      )
    );
  } else if (entrega.municipio_nombre) {
    rows.push(
      construirFilaResumenEmailPremium_(
        "Municipio",
        escapeHtml_(entrega.municipio_nombre +
          (entrega.provincia_nombre ? " (" + entrega.provincia_nombre + ")" : "")),
        false
      )
    );
  } else if (entrega.localidad_informativa) {
    rows.push(
      construirFilaResumenEmailPremium_(
        "Localidad indicada",
        escapeHtml_(entrega.localidad_informativa),
        false
      )
    );
  }

  rows.push(
    construirFilaResumenEmailPremium_("Coste de entrega", escapeHtml_(textoPrecioEntrega_(entrega)), false),
    construirFilaResumenEmailPremium_(
      "Direcci\u00F3n completa",
      "Se solicitar\u00E1 despu\u00E9s de revisar la fotograf\u00EDa y confirmar el pedido",
      false,
      true
    )
  );

  return rows.join("");
}

function construirAsunto_(idPedidoWeb, pedido) {
  return "[TAKARA PEDIDO WEB] " +
    idPedidoWeb +
    " \u00B7 " +
    pedido.producto.formato +
    " \u00B7 " +
    pedido.producto.color_marco +
    " \u00B7 " +
    pedido.cliente.nombre;
}

function versionPlantillaPedido_(pedido) {
  return pedido && pedido.contrato_entrada === "v1_compat"
    ? CFG.VERSION_PLANTILLA_V1_COMPAT
    : CFG.VERSION_PLANTILLA;
}

function construirCuerpoInterno_(idPedidoWeb, now, pedido, foto, fichaVisual) {
  return pedido && pedido.contrato_entrada === "v1_compat"
    ? construirCuerpoInternoV1Compat_(idPedidoWeb, now, pedido, foto, fichaVisual)
    : construirCuerpoInternoV2_(idPedidoWeb, now, pedido, foto, fichaVisual);
}

function construirCuerpoInternoV1Compat_(idPedidoWeb, now, pedido, foto, fichaVisual) {
  const fecha = Utilities.formatDate(now, CFG.TZ, "yyyy-MM-dd HH:mm:ss");

  return [
    "[" + CFG.VERSION_PLANTILLA_V1_COMPAT + "]",
    "",
    "ID pedido web: " + idPedidoWeb,
    "ID MicroFactory: " + CFG.ID_MICROFACTORY_INICIAL,
    "Fecha solicitud: " + fecha,
    "Origen: " + CFG.ORIGEN,
    "Página origen: " + pedido.meta.pagina_origen,
    "Entorno: " + pedido.meta.entorno,
    "Canal entrada: " + CFG.CANAL_ENTRADA,
    "Modo transporte: " + (pedido.modo_transporte || "pedido_con_foto_base64"),
    "Payload version: " + pedido.payload_version,
    "",
    "[ATRIBUCION]",
    "Versión atribución: " + pedido.attribution.version,
    "Origen pedido: " + pedido.attribution.source_type,
    "Store ID: " + (pedido.attribution.store_id || ""),
    "Store nombre snapshot: " + (pedido.attribution.store_name_snapshot || ""),
    "",
    "[CLIENTE]",
    "Nombre: " + pedido.cliente.nombre,
    "Email: " + pedido.cliente.email,
    "Teléfono: " + pedido.cliente.telefono,
    "",
    "[PRODUCTO]",
    "Producto: " + pedido.producto.producto,
    "Código producto: " + pedido.producto.codigo_producto,
    "Formato: " + pedido.producto.formato,
    "Orientación: " + pedido.producto.orientacion,
    "Medida: " + pedido.producto.medida,
    "Color marco: " + pedido.producto.color_marco,
    "Color litofanía: " + pedido.producto.color_litofania,
    "Cantidad: " + pedido.producto.cantidad,
    "Precio unitario mostrado EUR: " + pedido.producto.precio_unitario_mostrado_eur,
    "Precio total mostrado EUR: " + pedido.producto.precio_total_eur,
    "Moneda: " + CFG.MONEDA,
    "",
    "[PERSONALIZACION_MARCO]",
    "Activa: " + siNo_(pedido.producto.personalizacion_marco.activa),
    "Versión: " + pedido.producto.personalizacion_marco.version,
    "Contrato geométrico: " + pedido.producto.personalizacion_marco.geometry_contract,
    "Orientación: " + pedido.producto.personalizacion_marco.orientacion,
    "Número de lados: " + pedido.producto.personalizacion_marco.numero_lados,
    "Suplemento unitario EUR: " + pedido.producto.personalizacion_marco.suplemento_unitario_eur,
    "Color texto código: " + pedido.producto.personalizacion_marco.color_texto,
    "Color texto: " + pedido.producto.personalizacion_marco.color_texto_nombre,
    "Texto superior: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "top"),
    "Texto derecho: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "right"),
    "Texto inferior: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "bottom"),
    "Texto izquierdo: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "left"),
    "",
    "[ARCHIVOS]",
    "Foto adjunta: " + (foto.foto_recibida ? "sí" : "no"),
    "Enlace Drive: " + foto.enlace_drive,
    "ID archivo Drive: " + foto.id_archivo_drive,
    "Nombre archivo foto: " + foto.nombre_archivo_foto,
    "Tipo archivo foto: " + foto.tipo_archivo_foto,
    "Tamaño archivo foto bytes: " + foto.tamano_archivo_foto_bytes,
    "Foto base64 presente en payload: " + siNo_(pedido.archivos.foto_base64_presente || !!pedido.archivos.foto_base64),
    "Foto base64 longitud declarada: " + pedido.archivos.foto_base64_length,
    "Foto base64 prefijo: " + pedido.archivos.foto_base64_prefix,
    "Estado archivo: " + (foto.estado_archivo || CFG.ESTADO_ARCHIVO_INICIAL),
    "Nota archivo: " + (foto.nota_archivo || ""),
    "",
    "[MENSAJE CLIENTE]",
    "Mensaje: " + pedido.mensaje_cliente,
    "",
    "[CONTROL]",
    "Acepta contacto: " + siNo_(pedido.control.acepta_contacto),
    "Acepta revisión de imagen: " + siNo_(pedido.control.acepta_revision),
    "Acepta política privacidad: " + pedido.control.acepta_politica_privacidad,
    "Autoriza publicación del resultado: " + siNo_(pedido.control.autoriza_publicacion_resultado),
    "Acepta custodia/procesado de imagen: " + CFG.ACEPTA_CUSTODIA_PROCESADO_IMAGEN,
    "Estado inicial: recibido",
    "Prioridad inicial: normal",
    "",
    "[TECNICO]",
    "Versión plantilla: " + CFG.VERSION_PLANTILLA_V1_COMPAT,
    "Generado por: takara3d-web",
    "Observaciones técnicas: " + CFG.OBSERVACIONES_TECNICAS
  ].join("\n");
}

function construirCuerpoInternoV2_(idPedidoWeb, now, pedido, foto, fichaVisual) {
  const fecha = Utilities.formatDate(now, CFG.TZ, "yyyy-MM-dd HH:mm:ss");
  const entregaEur = pedido.totales.entrega_eur;
  const totalEur = pedido.totales.total_estimado_eur;
  const p = pedido.producto.personalizacion_marco;
  const lines = [
    "[" + CFG.VERSION_PLANTILLA + "]",
    "",
    "ID pedido web: " + idPedidoWeb,
    "ID pedido TK:",
    "Fecha solicitud: " + fecha,
    "Origen: " + CFG.ORIGEN,
    "Página origen: " + pedido.meta.pagina_origen,
    "Entorno: " + pedido.meta.entorno,
    "Canal entrada: " + CFG.CANAL_ENTRADA,
    "",
    "[ATRIBUCION]",
    "Versión atribución: " + pedido.attribution.version,
    "Origen pedido: " + pedido.attribution.source_type,
    "Store ID: " + (pedido.attribution.store_id || ""),
    "Store nombre snapshot: " + (pedido.attribution.store_name_snapshot || ""),
    "",
    "[CLIENTE]",
    "Nombre: " + pedido.cliente.nombre,
    "Email: " + pedido.cliente.email,
    "Teléfono: " + pedido.cliente.telefono,
    "",
    "[PRODUCTO]",
    "Producto: " + pedido.producto.producto,
    "Código producto: " + pedido.producto.codigo_producto,
    "Variante código: " + pedido.producto.variante_codigo,
    "Formato: " + pedido.producto.formato,
    "Orientación: " + pedido.producto.orientacion,
    "Medida: " + pedido.producto.medida,
    "Color marco: " + pedido.producto.color_marco,
    "Color litofanía: " + pedido.producto.color_litofania,
    "Atributos JSON: " + JSON.stringify(pedido.producto.atributos || {}),
    "Extras JSON: " + JSON.stringify(pedido.producto.extras || []),
    "Cantidad: " + pedido.producto.cantidad,
    "Precio unitario mostrado EUR: " + pedido.producto.precio_unitario_mostrado_eur,
    "Precio total mostrado EUR: " + pedido.producto.precio_total_eur,
    "Moneda: " + CFG.MONEDA,
    "",
    "[IMPORTES]",
    "Precio base EUR: " + pedido.producto.precio_base_eur,
    "Precio variante EUR: " + pedido.producto.precio_variante_eur,
    "Precio extras EUR: " + pedido.producto.precio_extras_eur,
    "Precio unitario final EUR: " + pedido.producto.precio_unitario_mostrado_eur,
    "Subtotal productos EUR: " + pedido.totales.producto_eur,
    "Precio entrega EUR: " + (entregaEur === null ? "" : entregaEur),
    "Total estimado EUR: " + (totalEur === null ? "" : totalEur),
    "Estado total: " + pedido.totales.estado_total,
    "Moneda: " + CFG.MONEDA,
    "Origen precio: " + pedido.producto.origen_precio,
    "Versión catálogo: " + pedido.producto.catalog_version,
    "Versión pricing: " + pedido.producto.pricing_version,
    "",
    "[ENTREGA]",
    "Versión entrega: " + pedido.entrega.version,
    "Código postal: " + pedido.entrega.codigo_postal,
    "Localidad informada: " + pedido.entrega.localidad_informativa,
    "Ubicación requerida: " + siNo_(pedido.entrega.ubicacion_requerida),
    "Ubicación código: " + (
      pedido.entrega.ubicacion_codigo || pedido.entrega.municipio_codigo
    ),
    "Ubicación nombre: " + (
      pedido.entrega.ubicacion_nombre || pedido.entrega.municipio_nombre
    ),
    "Zona código: " + pedido.entrega.zona_codigo,
    "Zona nombre: " + pedido.entrega.zona_nombre,
    "Área código: " + pedido.entrega.area_codigo,
    "Modalidad solicitada: " + pedido.entrega.modalidad_solicitada,
    "Modalidad resuelta: " + pedido.entrega.modalidad,
    "Fuente decisión: " + pedido.entrega.fuente_decision,
    "Precio entrega EUR: " + (entregaEur === null ? "" : entregaEur),
    "Estado precio entrega: " + pedido.entrega.estado_precio,
    "Moneda: " + CFG.MONEDA,
    "Dirección completa solicitada: " + siNo_(
      pedido.entrega.direccion_completa_solicitada
    ),
    "Texto mostrado al cliente: " + pedido.entrega.texto_cliente,
    ""
  ];

  if (p && p.activa) {
    lines.push(
      "[PERSONALIZACION_MARCO]",
      "Activa: sí",
      "Versión: " + p.version,
      "Contrato geométrico: " + p.geometry_contract,
      "Orientación: " + p.orientacion,
      "Número de lados: " + p.numero_lados,
      "Suplemento unitario EUR: " + p.suplemento_unitario_eur,
      "Color texto código: " + p.color_texto,
      "Color texto: " + p.color_texto_nombre,
      "Texto superior: " + textoLadoPersonalizacion_(p, "top"),
      "Texto derecho: " + textoLadoPersonalizacion_(p, "right"),
      "Texto inferior: " + textoLadoPersonalizacion_(p, "bottom"),
      "Texto izquierdo: " + textoLadoPersonalizacion_(p, "left"),
      ""
    );
  }

  lines.push(
    "[ARCHIVOS]",
    "Foto adjunta: " + (foto.foto_recibida ? "sí" : "no"),
    "Enlace Drive: " + foto.enlace_drive,
    "ID archivo Drive: " + foto.id_archivo_drive,
    "Nombre archivo foto: " + foto.nombre_archivo_foto,
    "Tipo archivo foto: " + foto.tipo_archivo_foto,
    "Tamaño archivo foto bytes: " + foto.tamano_archivo_foto_bytes,
    "Estado archivo: " + (foto.estado_archivo || CFG.ESTADO_ARCHIVO_INICIAL),
    "",
    "[MENSAJE CLIENTE]",
    "Mensaje: " + pedido.mensaje_cliente,
    "",
    "[CONTROL]",
    "Consiente gestión de datos: " + siNo_(
      pedido.control.consiente_gestion_datos
    ),
    "Declara derechos y autoriza revisión de imagen: " + siNo_(
      pedido.control.declara_derechos_y_autoriza_revision_imagen
    ),
    "Autoriza publicación del resultado: " + siNo_(
      pedido.control.autoriza_publicacion_resultado
    ),
    "Acepta custodia/procesado de imagen: " + CFG.ACEPTA_CUSTODIA_PROCESADO_IMAGEN,
    "Estado inicial: recibido",
    "Prioridad inicial: normal",
    "",
    "[TECNICO]",
    "Versión plantilla: " + CFG.VERSION_PLANTILLA,
    "Generado por: takara3d-web",
    "Observaciones técnicas: " + CFG.OBSERVACIONES_TECNICAS,
    "Payload version: " + pedido.payload_version,
    "Snapshot version: " + pedido.snapshot_version,
    "Delivery version: " + pedido.entrega.version,
    "Catalog version: " + pedido.producto.catalog_version,
    "Pricing version: " + pedido.producto.pricing_version,
    "Creado cliente ISO: " + pedido.creado_en_iso,
    "Recibido Apps Script ISO: " + pedido.recibido_apps_script_iso,
    "Modo prueba: " + siNo_(pedido.modo_prueba),
    "Estado registro TK: pendiente_registro_tk"
  );

  return lines.join("\n");
}

/* TAKARA EMAIL PEDIDO PREMIUM V1 START */

function enviarEmailInterno_(
  subject,
  body,
  idPedidoWeb,
  pedido,
  foto,
  fichaVisual
) {
  fichaVisual = fichaVisual || {
    ficha_visual_recibida: false,
    blob: null
  };

  const options = {
    to: CFG.DESTINO_PEDIDOS,
    subject: subject,
    body: body,
    htmlBody: construirHtmlInterno_(idPedidoWeb, pedido, foto, fichaVisual),
    name: "Takara 3D \u00B7 Pedidos Web"
  };

  if (pedido.cliente.email) {
    options.replyTo = pedido.cliente.email;
  }

  if (fichaVisual.ficha_visual_recibida && fichaVisual.blob) {
    options.inlineImages = {
      takaraOrderVisualProof: fichaVisual.blob
    };
    options.attachments = [
      fichaVisual.blob.copyBlob().setName(
        fichaVisual.nombre_archivo || idPedidoWeb + "_vista_previa.jpg"
      )
    ];
  }

  MailApp.sendEmail(options);
}

function construirHtmlInterno_(idPedidoWeb, pedido, foto, fichaVisual) {
  const safeId = escapeHtml_(idPedidoWeb);
  const safeNombre = escapeHtml_(pedido.cliente.nombre);
  const safeEmail = escapeHtml_(pedido.cliente.email);
  const safeTelefono = escapeHtml_(pedido.cliente.telefono);
  const safeProducto = escapeHtml_(pedido.producto.producto);
  const safeFormato = escapeHtml_(pedido.producto.formato);
  const safeOrientacion = escapeHtml_(capitalizar_(pedido.producto.orientacion));
  const safeMedida = escapeHtml_(pedido.producto.medida);
  const safeColorMarco = escapeHtml_(pedido.producto.color_marco);
  const safeColorLitofania = escapeHtml_(pedido.producto.color_litofania);
  const safeCantidad = escapeHtml_(formatearCantidad_(pedido.producto.cantidad));
  const safeMensaje = escapeHtml_(
    pedido.mensaje_cliente || "Sin observaciones."
  ).replace(/\n/g, "<br>");
  const safeAutorizacionResultado = Boolean(
    pedido.control && pedido.control.autoriza_publicacion_resultado
  )
    ? "S\u00ED, autorizada (solo si no aparecen menores)"
    : "No autorizada";
  const safeEstadoFoto = foto.foto_recibida
    ? "Fotograf\u00EDa guardada correctamente"
    : "Fotograf\u00EDa pendiente de asociar";
  const safeDriveUrl = escapeHtml_(foto.enlace_drive || "");

  const driveButton = foto.enlace_drive
    ? [
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">',
        '<tr><td bgcolor="#24170F" style="border-radius:999px;">',
        '<a href="' + safeDriveUrl + '" target="_blank" rel="noopener noreferrer" ',
        'style="display:inline-block;padding:13px 22px;color:#FFFBF6;font-family:Arial,Helvetica,sans-serif;',
        'font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;">Abrir fotograf\u00EDa en Drive</a>',
        '</td></tr></table>'
      ].join("")
    : "";

  const header = construirCabeceraEmailPremium_(
    "Pedido web recibido",
    "Gesti\u00F3n de pedidos",
    "Nueva solicitud lista para revisar.",
    safeFormato + " \u00B7 " + safeColorMarco + " \u00B7 " + safeNombre
  );

  const body = [
    '<tr><td bgcolor="#FFFBF6" style="padding:36px 40px 34px 40px;">',
    '<div style="margin:0 0 26px 0;padding:15px 17px;border:1px solid #DFEADE;',
    'border-radius:10px;color:#31583D;background:#F0F8F1;font-family:Arial,Helvetica,sans-serif;',
    'font-size:13px;line-height:1.55;"><strong>' + safeEstadoFoto + '.</strong> ',
    'El cuerpo de texto plano conserva \u00EDntegro el contrato <strong>[',
    escapeHtml_(CFG.VERSION_PLANTILLA),
    ']</strong> para MicroFactory.</div>',

    construirReferenciaEmailPremium_("ID pedido web", safeId),

    construirTituloSeccionEmailPremium_("Cliente"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilaResumenEmailPremium_("Nombre", safeNombre, false),
    construirFilaResumenEmailPremium_(
      "Email",
      '<a href="mailto:' + safeEmail + '" style="color:#A77B2F;text-decoration:underline;">' + safeEmail + '</a>',
      false
    ),
    construirFilaResumenEmailPremium_(
      "Tel\u00E9fono",
      '<a href="tel:' + safeTelefono + '" style="color:#A77B2F;text-decoration:underline;">' + safeTelefono + '</a>',
      false
    ),
    construirFilaResumenEmailPremium_(
      "Publicaci\u00F3n del resultado",
      safeAutorizacionResultado,
      false
    ),
    '</table>',

    construirTituloSeccionEmailPremium_("Producto"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilaResumenEmailPremium_("Producto", safeProducto, false),
    construirFilaResumenEmailPremium_("Formato / orientaci\u00F3n", safeFormato + " \u00B7 " + safeOrientacion, false),
    construirFilaResumenEmailPremium_("Medida", safeMedida, false),
    construirFilaResumenEmailPremium_("Color del marco", safeColorMarco, false),
    construirFilaResumenEmailPremium_("Color litofan\u00EDa", safeColorLitofania, false),
    construirFilaResumenEmailPremium_("Cantidad", safeCantidad, false, true),
    '</table>',

    construirTituloSeccionEmailPremium_("Entrega"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasEntregaEmailPremium_(pedido),
    '</table>',

    construirTituloSeccionEmailPremium_("Desglose del precio"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasDesglosePrecioEmailPremium_(pedido),
    '</table>',

    construirTituloSeccionEmailPremium_("Texto en el marco"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasPersonalizacionEmailPremium_(pedido.producto.personalizacion_marco),
    '</table>',

    construirBloqueFichaVisualEmailPremium_(
      fichaVisual
    ),

    construirTituloSeccionEmailPremium_("Observaciones del cliente"),
    '<div style="margin:0 0 28px 0;padding:18px;border-radius:10px;color:#5F5045;',
    'background:#F8F3EC;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">',
    safeMensaje,
    '</div>',

    driveButton,

    '<div style="margin:0;padding:18px;border:1px solid #E5D4BB;border-radius:12px;background:#FBF6ED;">',
    '<p style="margin:0 0 8px 0;color:#24170F;font-family:Arial,Helvetica,sans-serif;',
    'font-size:14px;font-weight:700;">Siguiente revisi\u00F3n</p>',
    '<ul style="margin:0;padding-left:18px;color:#7A6758;font-family:Arial,Helvetica,sans-serif;',
    'font-size:13px;line-height:1.65;">',
    '<li>Comprobar la fotograf\u00EDa original y su encuadre.</li>',
    '<li>Validar formato, colores, textos y precio mostrado.</li>',
    '<li>Contactar con el cliente antes de iniciar fabricaci\u00F3n.</li>',
    '</ul></div>',
    '</td></tr>'
  ].join("");

  const footer = construirPieEmailPremium_(
    'Takara 3D \u00B7 <span style="color:#A77B2F;">Pedidos Web</span>',
    "Correo operativo con presentaci\u00F3n premium.",
    "La versi\u00F3n de texto plano conserva todos los campos t\u00E9cnicos, enlaces, controles y metadatos exigidos por el sistema de trazabilidad."
  );

  return envolverEmailPremium_(header + body + footer);
}

function enviarConfirmacionCliente_(idPedidoWeb, pedido, foto, fichaVisual) {
  fichaVisual = fichaVisual || {
    ficha_visual_recibida: false,
    blob: null
  };

  if (!pedido.cliente.email) {
    return;
  }

  const subject = "Tu recuerdo ha llegado a Takara 3D \u00B7 " + idPedidoWeb;

  const body = [
    "TAKARA 3D",
    "SOLICITUD RECIBIDA",
    "",
    "Hola, " + pedido.cliente.nombre + ":",
    "",
    "Gracias por confiar en Takara 3D.",
    "",
    foto.foto_recibida
      ? "Hemos recibido tu solicitud y la fotograf\u00EDa correctamente."
      : "Hemos recibido los datos de tu solicitud. La fotograf\u00EDa queda pendiente de asociar antes de producir.",
    "Ahora revisaremos el encuadre, la calidad de la imagen y todos los detalles para asegurarnos de que el resultado est\u00E9 a la altura de tu recuerdo.",
    "",
    "Referencia: " + idPedidoWeb,
    "",
    "RESUMEN DE TU SOLICITUD",
    "Producto: " + pedido.producto.producto,
    "Formato: " + pedido.producto.formato,
    "Medida: " + pedido.producto.medida,
    "Color marco: " + pedido.producto.color_marco,
    "Cantidad: " + pedido.producto.cantidad,
    "Fotograf\u00EDa: " + (foto.foto_recibida ? "Recibida correctamente" : "Pendiente de asociar"),
    "Publicaci\u00F3n del resultado final: " + (
      Boolean(pedido.control && pedido.control.autoriza_publicacion_resultado)
        ? "Autorizada, siempre que no aparezcan menores"
        : "No autorizada"
    ),
    "",
    "ENTREGA",
    construirBloqueEntregaClienteTexto_(pedido),
    "",
    "DESGLOSE DEL PRECIO",
    construirBloqueDesglosePrecioClienteTexto_(pedido),
    "",
    "TEXTO EN EL MARCO",
    construirBloquePersonalizacionClienteTexto_(pedido.producto.personalizacion_marco),
    "",
    "QU\u00C9 OCURRIR\u00C1 AHORA",
    "",
    "1. Revisaremos personalmente la fotograf\u00EDa y su adaptaci\u00F3n a la litofan\u00EDa.",
    "2. Contactaremos contigo para confirmar la viabilidad, el plazo y la entrega.",
    "3. Cuando todo est\u00E9 confirmado, comenzaremos a fabricar tu pieza.",
    "",
    "Si necesitas a\u00F1adir alg\u00FAn detalle, responde directamente a este correo e indica la referencia " + idPedidoWeb + ".",
    "",
    "TAKARA significa tesoro.",
    "Y as\u00ED tratamos cada pieza.",
    "",
    "Takara 3D",
    "Convertimos tus recuerdos en luz",
    "www.takara3d.es",
    "",
    "Este mensaje confirma que hemos recibido tu solicitud. No implica todav\u00EDa la aceptaci\u00F3n definitiva del encargo ni el inicio de su fabricaci\u00F3n."
  ].join("\n");

  const options = {
    to: pedido.cliente.email,
    subject: subject,
    body: body,
    htmlBody: construirHtmlConfirmacionPedidoCliente_(
      idPedidoWeb,
      pedido,
      foto,
      fichaVisual
    ),
    name: "Takara 3D",
    replyTo: CFG.DESTINO_PEDIDOS
  };

  if (fichaVisual.ficha_visual_recibida && fichaVisual.blob) {
    options.inlineImages = {
      takaraOrderVisualProof: fichaVisual.blob
    };
  }

  MailApp.sendEmail(options);
}

function construirHtmlConfirmacionPedidoCliente_(
  idPedidoWeb,
  pedido,
  foto,
  fichaVisual
) {
  const safeId = escapeHtml_(idPedidoWeb);
  const safeNombre = escapeHtml_(pedido.cliente.nombre);
  const safeProducto = escapeHtml_(pedido.producto.producto);
  const safeFormato = escapeHtml_(pedido.producto.formato);
  const safeMedida = escapeHtml_(pedido.producto.medida);
  const safeColorMarco = escapeHtml_(pedido.producto.color_marco);
  const safeCantidad = escapeHtml_(formatearCantidad_(pedido.producto.cantidad));
  const safeFotoEstado = foto.foto_recibida
    ? "Recibida correctamente"
    : "Pendiente de asociar";
  const safeAutorizacionResultado = Boolean(
    pedido.control && pedido.control.autoriza_publicacion_resultado
  )
    ? "Autorizada (no aplicable si aparecen menores)"
    : "No autorizada";
  const introFoto = foto.foto_recibida
    ? "Hemos recibido tu solicitud y la fotograf\u00EDa correctamente. Ahora comienza nuestra revisi\u00F3n personal."
    : "Hemos recibido los datos de tu solicitud. La fotograf\u00EDa queda pendiente de asociar antes de comenzar la revisi\u00F3n.";

  const header = construirCabeceraEmailPremium_(
    "Solicitud recibida",
    "Gracias por confiar en nosotros",
    "Tu recuerdo ya est\u00E1 en buenas manos.",
    escapeHtml_(introFoto)
  );

  const body = [
    '<tr><td bgcolor="#FFFBF6" style="padding:36px 40px 34px 40px;">',
    '<p style="margin:0 0 10px 0;color:#24170F;font-family:Arial,Helvetica,sans-serif;',
    'font-size:17px;font-weight:700;">Hola, ' + safeNombre + ':</p>',
    '<p style="margin:0 0 22px 0;color:#5F5045;font-family:Arial,Helvetica,sans-serif;',
    'font-size:15px;line-height:1.7;">Revisaremos el encuadre, la calidad de la imagen y todos los detalles ',
    'para asegurarnos de que el resultado est\u00E9 a la altura de tu recuerdo.</p>',

    construirReferenciaEmailPremium_("Referencia", safeId),

    construirTituloSeccionEmailPremium_("Resumen de tu solicitud"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilaResumenEmailPremium_("Producto", safeProducto, false),
    construirFilaResumenEmailPremium_("Formato", safeFormato, false),
    construirFilaResumenEmailPremium_("Medida", safeMedida, false),
    construirFilaResumenEmailPremium_("Color del marco", safeColorMarco, false),
    construirFilaResumenEmailPremium_("Cantidad", safeCantidad, false),
    construirFilaResumenEmailPremium_(
      "Fotograf\u00EDa",
      '<span style="color:#376347;">' + safeFotoEstado + '</span>',
      false
    ),
    construirFilaResumenEmailPremium_(
      "Publicaci\u00F3n del resultado final",
      safeAutorizacionResultado,
      false,
      true
    ),
    '</table>',

    construirTituloSeccionEmailPremium_("Entrega"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasEntregaEmailPremium_(pedido),
    '</table>',

    construirTituloSeccionEmailPremium_("Desglose del precio"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasDesglosePrecioEmailPremium_(pedido),
    '</table>',

    construirTituloSeccionEmailPremium_("Texto en el marco"),
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    construirFilasPersonalizacionEmailPremium_(pedido.producto.personalizacion_marco),
    '</table>',

    construirBloqueFichaVisualEmailPremium_(
      fichaVisual
    ),

    construirTituloSeccionEmailPremium_("Qu\u00E9 ocurrir\u00E1 ahora"),
    construirPasosClienteEmailPremium_(),

    '<div style="margin:0 0 28px 0;padding:17px 18px;border:1px solid #EADFCE;',
    'border-radius:10px;color:#655548;background:#FFFDF9;font-family:Arial,Helvetica,sans-serif;',
    'font-size:13px;line-height:1.6;">Si necesitas a\u00F1adir alg\u00FAn detalle, responde directamente ',
    'a este correo. Conserva la referencia <strong>' + safeId + '</strong> para que podamos ',
    'localizar tu solicitud r\u00E1pidamente.</div>',

    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" ',
    'style="margin:0 auto 12px auto;"><tr><td bgcolor="#24170F" style="border-radius:999px;">',
    '<a href="https://www.takara3d.es" target="_blank" rel="noopener noreferrer" ',
    'style="display:inline-block;padding:13px 22px;color:#FFFBF6;font-family:Arial,Helvetica,sans-serif;',
    'font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;">Visitar Takara 3D</a>',
    '</td></tr></table>',
    '<p style="margin:0;color:#7A6758;font-family:Arial,Helvetica,sans-serif;font-size:12px;',
    'line-height:1.55;text-align:center;">Tambi\u00E9n puedes responder directamente a este mensaje.</p>',
    '</td></tr>'
  ].join("");

  const footer = construirPieEmailPremium_(
    'TAKARA significa <span style="color:#A77B2F;">tesoro</span>.',
    "Y as\u00ED tratamos cada pieza.",
    "Este mensaje confirma que hemos recibido tu solicitud. No implica todav\u00EDa la aceptaci\u00F3n definitiva del encargo ni el inicio de su fabricaci\u00F3n."
  );

  return envolverEmailPremium_(header + body + footer);
}

function textoLadoPersonalizacion_(personalizacion, side) {
  if (!personalizacion || !personalizacion.lados) {
    return "";
  }

  return texto_(personalizacion.lados[side]);
}

function formatearNumeroLadosPersonalizados_(value) {
  const numeroLados = parseInt(value, 10);

  if (!isFinite(numeroLados) || numeroLados < 1 || numeroLados > 4) {
    return "texto personalizado";
  }

  return numeroLados + (numeroLados === 1 ? " lado" : " lados");
}

function construirBloqueDesglosePrecioClienteTexto_(pedido) {
  const personalizacion = pedido.producto.personalizacion_marco;
  const lines = [
    "Marco con litofan\u00EDa: " +
      formatearEuros_(CFG.PRECIO_UNITARIO_MOSTRADO_EUR)
  ];

  if (personalizacion && personalizacion.activa) {
    lines.push(
      "Personalizaci\u00F3n de texto \u00B7 " +
        formatearNumeroLadosPersonalizados_(personalizacion.numero_lados) +
        ": +" +
        formatearEuros_(personalizacion.suplemento_unitario_eur)
    );
  }

  lines.push(
    "Total por unidad: " +
      formatearEuros_(pedido.producto.precio_unitario_mostrado_eur)
  );
  lines.push(
    "Subtotal de productos (" + formatearCantidad_(pedido.producto.cantidad) + "): " +
      formatearEuros_(pedido.totales.producto_eur)
  );
  lines.push("Entrega: " + textoPrecioEntrega_(pedido.entrega));
  lines.push("Total estimado: " + textoTotalEstimado_(pedido.totales));

  return lines.join("\n");
}

function construirFilasDesglosePrecioEmailPremium_(pedido) {
  const personalizacion = pedido.producto.personalizacion_marco;
  const rows = [
    construirFilaResumenEmailPremium_(
      "Marco con litofan\u00EDa",
      escapeHtml_(formatearEuros_(CFG.PRECIO_UNITARIO_MOSTRADO_EUR)),
      false
    )
  ];

  if (personalizacion && personalizacion.activa) {
    rows.push(construirFilaResumenEmailPremium_(
      "Personalizaci\u00F3n de texto \u00B7 " +
        formatearNumeroLadosPersonalizados_(personalizacion.numero_lados),
      '<span style="color:#8A5D14;">+' +
        escapeHtml_(formatearEuros_(personalizacion.suplemento_unitario_eur)) +
        '</span>',
      false
    ));
  }

  rows.push(construirFilaResumenEmailPremium_(
    "Total por unidad",
    escapeHtml_(formatearEuros_(pedido.producto.precio_unitario_mostrado_eur)),
    false
  ));
  rows.push(construirFilaResumenEmailPremium_(
    "Subtotal de productos \u00B7 " + formatearCantidad_(pedido.producto.cantidad),
    escapeHtml_(formatearEuros_(pedido.totales.producto_eur)),
    false
  ));
  rows.push(construirFilaResumenEmailPremium_(
    "Entrega",
    escapeHtml_(textoPrecioEntrega_(pedido.entrega)),
    false
  ));
  rows.push(construirFilaResumenEmailPremium_(
    "Total estimado",
    escapeHtml_(textoTotalEstimado_(pedido.totales)),
    true
  ));

  return rows.join("");
}

function construirBloquePersonalizacionClienteTexto_(personalizacion) {
  if (!personalizacion || !personalizacion.activa) {
    return "Sin texto personalizado.";
  }

  const lines = [
    "Lados personalizados: " + personalizacion.numero_lados,
    "Color del texto: " + personalizacion.color_texto_nombre
  ];

  Object.keys(CFG.FRAME_TEXT_SIDE_LABELS).forEach(function (side) {
    const sideText = textoLadoPersonalizacion_(personalizacion, side);
    if (sideText) {
      lines.push(CFG.FRAME_TEXT_SIDE_LABELS[side] + ": " + sideText);
    }
  });

  return lines.join("\n");
}

function construirFilasPersonalizacionEmailPremium_(personalizacion) {
  if (!personalizacion || !personalizacion.activa) {
    return construirFilaResumenEmailPremium_(
      "Personalizaci\u00F3n",
      "Sin texto personalizado",
      false,
      true
    );
  }

  const rows = [
    construirFilaResumenEmailPremium_(
      "Lados personalizados",
      escapeHtml_(personalizacion.numero_lados),
      false
    ),
    construirFilaResumenEmailPremium_(
      "Color del texto",
      escapeHtml_(personalizacion.color_texto_nombre),
      false
    )
  ];

  const sidesWithText = Object.keys(CFG.FRAME_TEXT_SIDE_LABELS).filter(function (side) {
    return !!textoLadoPersonalizacion_(personalizacion, side);
  });

  sidesWithText.forEach(function (side, index) {
    const sideText = textoLadoPersonalizacion_(personalizacion, side);
    rows.push(construirFilaResumenEmailPremium_(
      CFG.FRAME_TEXT_SIDE_LABELS[side],
      escapeHtml_(sideText),
      false,
      index === sidesWithText.length - 1
    ));
  });

  return rows.join("");
}

function construirBloqueFichaVisualEmailPremium_(fichaVisual) {
  if (!fichaVisual || !fichaVisual.ficha_visual_recibida) {
    return "";
  }

  return [
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-collapse:collapse;">',
    '<tr><td align="center" bgcolor="#F4EBDD" style="padding:16px;border:1px solid #E5D4BB;',
    'border-radius:12px;">',
    '<img src="cid:takaraOrderVisualProof" alt="Vista previa del marco configurado" ',
    'width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;',
    'border-radius:8px;">',
    '</td></tr></table>'
  ].join("");
}

function envolverEmailPremium_(content) {
  return [
    '<!doctype html><html lang="es"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"></head>',
    '<body style="margin:0;padding:0;background:#F7F3EE;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'bgcolor="#F7F3EE" style="width:100%;margin:0;padding:0;background:#F7F3EE;">',
    '<tr><td align="center" style="padding:28px 12px;">',
    '<table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;max-width:640px;border:1px solid #E3D7C7;border-collapse:separate;',
    'border-spacing:0;background:#FFFBF6;">',
    content,
    '</table></td></tr></table></body></html>'
  ].join("");
}

function construirCabeceraEmailPremium_(estado, eyebrow, titulo, texto) {
  const marca = [
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>',
    '<td width="58" style="width:58px;padding:0 14px 0 0;vertical-align:middle;">',
    '<img src="https://takara3d.es/assets/brand/takara-logo-principal-header.png" ',
    'width="54" height="54" alt="Takara 3D" ',
    'style="display:block;width:54px;height:54px;border:0;outline:none;text-decoration:none;">',
    '</td><td style="color:#FFFBF6;font-family:Georgia,Times New Roman,serif;font-size:22px;',
    'font-weight:400;letter-spacing:1.8px;white-space:nowrap;vertical-align:middle;">',
    'TAKARA <span style="color:#C89B4A;">3D</span></td></tr></table>'
  ].join("");

  return [
    '<tr><td bgcolor="#24170F" style="padding:30px 40px 34px 40px;background:#24170F;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '<tr><td valign="middle">' + marca + '</td>',
    '<td align="right" valign="middle" style="padding-left:14px;"><span ',
    'style="display:inline-block;padding:7px 11px;border:1px solid #8A6A32;',
    'border-radius:999px;color:#F2D292;font-family:Arial,Helvetica,sans-serif;font-size:10px;',
    'font-weight:700;letter-spacing:1px;text-transform:uppercase;">' + escapeHtml_(estado) + '</span></td>',
    '</tr></table>',
    '<p style="margin:26px 0 8px 0;color:#DDB968;font-family:Arial,Helvetica,sans-serif;',
    'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">',
    escapeHtml_(eyebrow),
    '</p>',
    '<h1 style="margin:0;max-width:500px;color:#FFFBF6;font-family:Georgia,Times New Roman,serif;',
    'font-size:34px;font-weight:400;line-height:1.15;">' + escapeHtml_(titulo) + '</h1>',
    '<p style="margin:12px 0 0 0;max-width:520px;color:#D8CEC8;font-family:Arial,Helvetica,sans-serif;',
    'font-size:15px;line-height:1.65;">' + texto + '</p>',
    '</td></tr>'
  ].join("");
}

function construirReferenciaEmailPremium_(label, value) {
  return [
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:26px 0 30px 0;border:1px solid #E6D6BE;border-collapse:separate;',
    'border-spacing:0;background:#FBF6ED;">',
    '<tr><td style="padding:16px 18px;color:#7A6758;font-family:Arial,Helvetica,sans-serif;',
    'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">',
    escapeHtml_(label),
    '</td><td align="right" style="padding:16px 18px;color:#24170F;font-family:Arial,Helvetica,sans-serif;',
    'font-size:15px;font-weight:700;overflow-wrap:anywhere;">' + value + '</td></tr></table>'
  ].join("");
}

function construirTituloSeccionEmailPremium_(title) {
  return [
    '<p style="margin:0 0 14px 0;color:#A77B2F;font-family:Arial,Helvetica,sans-serif;',
    'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">',
    escapeHtml_(title),
    '</p>'
  ].join("");
}

function construirFilaResumenEmailPremium_(label, value, total, last) {
  const border = total || last
    ? "border-bottom:0;"
    : "border-bottom:1px solid #EEE4D7;";
  const size = total ? "font-size:17px;" : "font-size:14px;";
  const labelColor = total ? "color:#24170F;font-weight:700;" : "color:#7A6758;";

  return [
    '<tr><td width="43%" style="width:43%;padding:11px 16px 11px 0;' + border,
    labelColor,
    'font-family:Arial,Helvetica,sans-serif;' + size + 'line-height:1.45;vertical-align:top;">',
    escapeHtml_(label),
    '</td><td align="right" style="padding:11px 0;' + border,
    'color:#2B1E16;font-family:Arial,Helvetica,sans-serif;' + size,
    'font-weight:700;line-height:1.45;vertical-align:top;">' + value + '</td></tr>'
  ].join("");
}

function construirPasosClienteEmailPremium_() {
  const steps = [
    ["1", "Revisaremos tu fotograf\u00EDa", "Comprobaremos encuadre, contraste y adaptaci\u00F3n a la litofan\u00EDa."],
    ["2", "Confirmaremos todos los detalles", "Contactaremos contigo para validar viabilidad, plazo y entrega."],
    ["3", "Fabricaremos tu pieza", "Solo comenzaremos cuando todo est\u00E9 revisado y confirmado contigo."]
  ];

  const rows = steps.map(function (step) {
    return [
      '<tr><td width="34" valign="top" style="width:34px;padding:0 0 18px 0;">',
      '<span style="display:inline-block;width:24px;height:24px;border-radius:50%;color:#FFFBF6;',
      'background:#24170F;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;',
      'line-height:24px;text-align:center;">' + step[0] + '</span></td>',
      '<td valign="top" style="padding:0 0 18px 0;">',
      '<p style="margin:0 0 3px 0;color:#24170F;font-family:Arial,Helvetica,sans-serif;',
      'font-size:14px;font-weight:700;">' + escapeHtml_(step[1]) + '</p>',
      '<p style="margin:0;color:#7A6758;font-family:Arial,Helvetica,sans-serif;',
      'font-size:13px;line-height:1.55;">' + escapeHtml_(step[2]) + '</p>',
      '</td></tr>'
    ].join("");
  }).join("");

  return [
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" ',
    'style="width:100%;margin:0 0 30px 0;border-left:3px solid #C89B4A;background:#FAF4EA;">',
    '<tr><td style="padding:22px 22px 4px 22px;">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    rows,
    '</table></td></tr></table>'
  ].join("");
}

function construirPieEmailPremium_(signatureHtml, tagline, legal) {
  return [
    '<tr><td align="center" bgcolor="#F4EDE3" style="padding:26px 40px 30px 40px;',
    'border-top:1px solid #EADFCE;background:#F4EDE3;">',
    '<p style="margin:0 0 5px 0;color:#24170F;font-family:Georgia,Times New Roman,serif;',
    'font-size:18px;">' + signatureHtml + '</p>',
    '<p style="margin:0 0 14px 0;color:#7A6758;font-family:Arial,Helvetica,sans-serif;',
    'font-size:12px;">' + escapeHtml_(tagline) + '</p>',
    '<a href="https://www.takara3d.es" style="color:#A77B2F;font-family:Arial,Helvetica,sans-serif;',
    'font-size:12px;font-weight:700;text-decoration:none;">www.takara3d.es</a>',
    '<p style="margin:16px auto 0 auto;max-width:500px;color:#8A7A6E;',
    'font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.55;">',
    escapeHtml_(legal),
    '</p></td></tr>'
  ].join("");
}

/* TAKARA EMAIL PEDIDO PREMIUM V1 END */

/* ============================================================
   MEDIA DE PEDIDO Y DRIVE
   Implementación en OrderMedia.gs y DriveStorage.gs.
   ============================================================ */
