const CFG = Object.freeze({
  DESTINO_PEDIDOS: "3d.takara@gmail.com",
  TZ: "Europe/Madrid",
  ROOT_FOLDER: "Takara3D",
  PEDIDOS_FOLDER: "Pedidos Web",
  VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V1",
  VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_11_2_PRICE_BREAKDOWN",
  ORIGEN: "web takara3d.es",
  CANAL_ENTRADA: "web_gmail",
  ID_MICROFACTORY_INICIAL: "pendiente_asignar",
  CODIGO_PRODUCTO: "MARCO_LITOFANIA_144X108",
  PRODUCTO: "Marco litofan\u00EDa personalizado",
  COLOR_LITOFANIA: "Blanco natural",
  PRECIO_UNITARIO_MOSTRADO_EUR: "35.00",
  MONEDA: "EUR",
  ESTADO_ARCHIVO_INICIAL: "pendiente_descarga",
  ACEPTA_CUSTODIA_PROCESADO_IMAGEN: "s\u00ED",
  OBSERVACIONES_TECNICAS: "",
  MAX_FOTO_BYTES: 20 * 1024 * 1024,
  VISUAL_PROOF_VERSION: "TAKARA_ORDER_VISUAL_PROOF_V1",
  MAX_VISUAL_PROOF_BYTES: 900 * 1024,
  FRAME_TEXT_VERSION: "TAKARA_FRAME_TEXT_V1_4",
  FRAME_TEXT_MAX_CHARS: 40,
  FRAME_TEXT_GEOMETRY: Object.freeze({
    vertical: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
    horizontal: "FRAME_TEXT_GEOMETRY_HORIZONTAL_V1"
  }),
  FRAME_TEXT_PRICE_BY_SIDE_COUNT: Object.freeze({
    1: "4.00",
    2: "6.00",
    3: "8.00",
    4: "8.00"
  }),
  FRAME_TEXT_COLOR_LABELS: Object.freeze({
    actual: "Madera clara",
    rosewood: "Rosewood",
    ebano: "\u00C9bano",
    negro: "Negro",
    "blanco-mate": "Blanco mate"
  }),
  FRAME_TEXT_SIDE_LABELS: Object.freeze({
    top: "Superior",
    right: "Derecho",
    bottom: "Inferior",
    left: "Izquierdo"
  })
});

function doGet() {
  return json_({
    ok: true,
    service: "Takara Pedidos Web",
    version: CFG.VERSION_PLANTILLA,
    script: CFG.VERSION_SCRIPT,
    status: "online"
  });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const tipoSolicitud = texto_(payload.tipo_solicitud).toUpperCase();

    if (tipoSolicitud === "CONTACTO_WEB") {
      return procesarContactoWeb_(payload);
    }

    const now = new Date();
    const idPedidoWeb = resolverIdPedidoWeb_(payload, now);
    const pedido = normalizarPedido_(payload);

    validarPedido_(pedido, payload);

    const folder = asegurarCarpetaPedido_(idPedidoWeb, now);
    const foto = guardarFoto_(idPedidoWeb, pedido.archivos, folder);
    const fichaVisual = prepararFichaVisualSegura_(
      idPedidoWeb,
      pedido.archivos
    );

    const subject = construirAsunto_(idPedidoWeb, pedido);
    const body = construirCuerpoInterno_(
      idPedidoWeb,
      now,
      pedido,
      foto,
      fichaVisual
    );

    enviarEmailInterno_(
      subject,
      body,
      idPedidoWeb,
      pedido,
      foto,
      fichaVisual
    );
    enviarConfirmacionCliente_(idPedidoWeb, pedido, foto, fichaVisual);

    return json_({
      ok: true,
      id_pedido_web: idPedidoWeb,
      estado: "recibido",
      email_destino: CFG.DESTINO_PEDIDOS,
      enlace_drive: foto.enlace_drive || "",
      id_archivo_drive: foto.id_archivo_drive || "",
      nombre_archivo_foto: foto.nombre_archivo_foto || "",
      ficha_visual_recibida: !!fichaVisual.ficha_visual_recibida,
      estado_ficha_visual: fichaVisual.estado || "",
      nombre_archivo_ficha_visual: fichaVisual.nombre_archivo || "",
      version: CFG.VERSION_PLANTILLA,
      script: CFG.VERSION_SCRIPT
    });
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error),
      version: CFG.VERSION_PLANTILLA,
      script: CFG.VERSION_SCRIPT
    });
  }
}

function parsePayload_(e) {
  if (!e) {
    throw new Error("No se recibieron datos.");
  }

  if (e.postData && e.postData.contents) {
    const contents = String(e.postData.contents || "").trim();

    if (contents) {
      try {
        return JSON.parse(contents);
      } catch (error) {
        // Si no es JSON, seguimos abajo para aceptar formularios normales.
      }
    }
  }

  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }

  throw new Error("No se recibieron datos v\u00E1lidos.");
}

/* ============================================================
   CONTACTO WEB
   ============================================================ */

function procesarContactoWeb_(payload) {
  const now = new Date();
  const contacto = normalizarContactoWeb_(payload);

  validarContactoWeb_(contacto);

  const idContacto = generarIdContactoWeb_(now);
  const subject = construirAsuntoContactoWeb_(idContacto, contacto);
  const body = construirCuerpoContactoWeb_(idContacto, now, contacto);

  enviarEmailContactoInterno_(subject, body, contacto, idContacto, now);
  enviarConfirmacionContactoCliente_(idContacto, contacto);

  return json_({
    ok: true,
    tipo_solicitud: "CONTACTO_WEB",
    id_contacto_web: idContacto,
    estado: "recibido",
    email_destino: CFG.DESTINO_PEDIDOS,
    version: CFG.VERSION_PLANTILLA,
    script: CFG.VERSION_SCRIPT
  });
}

function normalizarContactoWeb_(payload) {
  return {
    nombre: texto_(payload.nombre),
    email: texto_(payload.email),
    telefono: texto_(payload.telefono),
    whatsapp: texto_(payload.whatsapp),
    asunto: texto_(payload.asunto),
    mensaje: texto_(payload.mensaje),
    origen: texto_(payload.origen) || "contacto.html",
    fecha_cliente: texto_(payload.fecha_cliente)
  };
}

function validarContactoWeb_(contacto) {
  if (!contacto.nombre) {
    throw new Error("Falta el nombre en la consulta de contacto.");
  }

  if (!contacto.email) {
    throw new Error("Falta el email en la consulta de contacto.");
  }

  if (!contacto.asunto) {
    throw new Error("Falta el asunto en la consulta de contacto.");
  }

  if (!contacto.mensaje) {
    throw new Error("Falta el mensaje en la consulta de contacto.");
  }
}

function generarIdContactoWeb_(date) {
  const stamp = Utilities.formatDate(date, CFG.TZ, "yyyyMMdd-HHmmss");
  const suffix = Utilities.getUuid().split("-")[0].toUpperCase();
  return "TK-CONTACTO-" + stamp + "-" + suffix;
}

function construirAsuntoContactoWeb_(idContacto, contacto) {
  return "Nueva consulta desde Takara 3D \u00B7 " +
    contacto.nombre +
    " \u00B7 " +
    contacto.asunto;
}

function construirCuerpoContactoWeb_(idContacto, now, contacto) {
  const fecha = Utilities.formatDate(now, CFG.TZ, "dd/MM/yyyy HH:mm");

  const lines = [
    "Hola,",
    "",
    "Has recibido una nueva consulta desde la web de Takara 3D.",
    "",
    "Asunto:",
    contacto.asunto,
    "",
    "Mensaje:",
    contacto.mensaje,
    "",
    "Datos de contacto:",
    "Nombre: " + contacto.nombre,
    "Email: " + contacto.email
  ];

  if (contacto.telefono) {
    lines.push("Tel\u00E9fono: " + contacto.telefono);
  }

  if (contacto.whatsapp) {
    lines.push("WhatsApp: " + contacto.whatsapp);
  }

  lines.push(
    "",
    "Puedes responder directamente a este correo.",
    "",
    "---",
    "Referencia interna: " + idContacto,
    "Origen: " + contacto.origen,
    "Fecha: " + fecha,
    "Script: " + CFG.VERSION_SCRIPT
  );

  return lines.join("\n");
}

function enviarEmailContactoInterno_(subject, body, contacto, idContacto, now) {
  const options = {
    to: CFG.DESTINO_PEDIDOS,
    subject: subject,
    body: body,
    htmlBody: construirHtmlContactoHumano_(contacto, idContacto, now),
    name: "Takara 3D \u00B7 Contacto Web"
  };

  if (contacto.email) {
    options.replyTo = contacto.email;
  }

  MailApp.sendEmail(options);
}

function construirHtmlContactoHumano_(contacto, idContacto, now) {
  const fecha = Utilities.formatDate(now, CFG.TZ, "dd/MM/yyyy HH:mm");

  const safeNombre = escapeHtml_(contacto.nombre);
  const safeEmail = escapeHtml_(contacto.email);
  const safeAsunto = escapeHtml_(contacto.asunto);
  const safeMensaje = escapeHtml_(contacto.mensaje).replace(/\n/g, "<br>");
  const safeTelefono = escapeHtml_(contacto.telefono);
  const safeWhatsapp = escapeHtml_(contacto.whatsapp);
  const safeId = escapeHtml_(idContacto);
  const safeOrigen = escapeHtml_(contacto.origen);
  const safeFecha = escapeHtml_(fecha);

  const telefonoHtml = safeTelefono
    ? '<p style="margin:0 0 4px 0;"><strong>Tel\u00E9fono:</strong> ' + safeTelefono + '</p>'
    : "";

  const whatsappHtml = safeWhatsapp
    ? '<p style="margin:0 0 4px 0;"><strong>WhatsApp:</strong> ' + safeWhatsapp + '</p>'
    : "";

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2a211b;background:#fffaf3;padding:22px;border-radius:18px;border:1px solid #ead9bd;">',

    '<h2 style="margin:0 0 14px 0;color:#3a2a1d;font-size:22px;">Nueva consulta desde Takara 3D</h2>',
    '<p style="margin:0 0 18px 0;color:#6b5a4a;">Has recibido un mensaje desde la p\u00E1gina de contacto.</p>',

    '<div style="background:#ffffff;border:1px solid #ead9bd;border-radius:14px;padding:16px;margin-bottom:16px;">',
    '<p style="margin:0 0 6px 0;color:#8a6a3e;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">Asunto</p>',
    '<p style="margin:0;font-size:18px;color:#2a211b;"><strong>' + safeAsunto + '</strong></p>',
    '</div>',

    '<div style="background:#ffffff;border:1px solid #ead9bd;border-radius:14px;padding:16px;margin-bottom:16px;">',
    '<p style="margin:0 0 6px 0;color:#8a6a3e;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">Mensaje</p>',
    '<p style="margin:0;color:#2a211b;">' + safeMensaje + '</p>',
    '</div>',

    '<div style="background:#ffffff;border:1px solid #ead9bd;border-radius:14px;padding:16px;margin-bottom:16px;">',
    '<p style="margin:0 0 8px 0;color:#8a6a3e;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">Datos de contacto</p>',
    '<p style="margin:0 0 4px 0;"><strong>Nombre:</strong> ' + safeNombre + '</p>',
    '<p style="margin:0 0 4px 0;"><strong>Email:</strong> <a href="mailto:' + safeEmail + '" style="color:#9a6a21;text-decoration:underline;">' + safeEmail + '</a></p>',
    telefonoHtml,
    whatsappHtml,
    '</div>',

    '<div style="background:#fff8ec;border:1px solid #ead9bd;border-radius:14px;padding:14px;margin-bottom:16px;">',
    '<p style="margin:0;color:#6b5a4a;font-size:14px;">Puedes responder directamente a este correo: la respuesta ir\u00E1 al email del cliente.</p>',
    '</div>',

    '<div style="color:#8a8178;font-size:12px;border-top:1px solid #ead9bd;padding-top:12px;">',
    '<p style="margin:0 0 4px 0;"><strong>Referencia interna:</strong> ' + safeId + '</p>',
    '<p style="margin:0 0 4px 0;"><strong>Origen:</strong> ' + safeOrigen + '</p>',
    '<p style="margin:0;"><strong>Fecha:</strong> ' + safeFecha + '</p>',
    '</div>',

    '</div>'
  ].join("");
}

function enviarConfirmacionContactoCliente_(idContacto, contacto) {
  if (!contacto.email) {
    return;
  }

  const subject = "Hemos recibido tu consulta Takara 3D";

  const body = [
    "Hola " + contacto.nombre + ",",
    "",
    "Hemos recibido tu consulta en Takara 3D.",
    "",
    "Asunto: " + contacto.asunto,
    "",
    "Te responderemos por correo lo antes posible.",
    "",
    "Referencia: " + idContacto,
    "",
    "Gracias,",
    "Takara 3D"
  ].join("\n");

  const htmlBody = construirHtmlConfirmacionContactoCliente_(idContacto, contacto);

  MailApp.sendEmail({
    to: contacto.email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "Takara 3D"
  });
}

function construirHtmlConfirmacionContactoCliente_(idContacto, contacto) {
  const safeNombre = escapeHtml_(contacto.nombre);
  const safeAsunto = escapeHtml_(contacto.asunto);
  const safeId = escapeHtml_(idContacto);

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2a211b;background:#fffaf3;padding:22px;border-radius:18px;border:1px solid #ead9bd;">',
    '<h2 style="margin:0 0 14px 0;color:#3a2a1d;font-size:22px;">Hemos recibido tu consulta</h2>',
    '<p style="margin:0 0 12px 0;">Hola ' + safeNombre + ',</p>',
    '<p style="margin:0 0 12px 0;">Gracias por escribir a Takara 3D. Hemos recibido tu mensaje correctamente.</p>',
    '<div style="background:#ffffff;border:1px solid #ead9bd;border-radius:14px;padding:16px;margin:16px 0;">',
    '<p style="margin:0 0 6px 0;color:#8a6a3e;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">Asunto</p>',
    '<p style="margin:0;color:#2a211b;"><strong>' + safeAsunto + '</strong></p>',
    '</div>',
    '<p style="margin:0 0 12px 0;">Te responderemos por correo lo antes posible.</p>',
    '<p style="margin:0;color:#8a8178;font-size:12px;">Referencia: ' + safeId + '</p>',
    '</div>'
  ].join("");
}

/* ============================================================
   PEDIDOS WEB
   ============================================================ */

function generarIdPedidoWeb_(date) {
  const stamp = Utilities.formatDate(date, CFG.TZ, "yyyyMMdd-HHmmss");
  const suffix = Utilities.getUuid().split("-")[0].toUpperCase();
  return "TK-WEB-" + stamp + "-" + suffix;
}

function resolverIdPedidoWeb_(payload, now) {
  const id = texto_(payload && payload.pedido_web_id).toUpperCase();

  if (/^TK-WEB-[A-Z0-9-]{6,80}$/.test(id)) {
    return id;
  }

  return generarIdPedidoWeb_(now);
}

function esPedidoLigeroSinFoto_(pedido, payload) {
  const modo = texto_(pedido.modo_transporte || (payload && payload.modo_transporte)).toLowerCase();

  if (modo === "pedido_ligero_sin_foto_base64") {
    return true;
  }

  if (!pedido.archivos.foto_base64 && pedido.archivos.foto_base64_presente) {
    return true;
  }

  return false;
}

function normalizarPedido_(payload) {
  const cliente = payload.cliente || {};
  const producto = payload.producto || {};
  const archivos = payload.archivos || {};
  const control = payload.control || {};
  const meta = payload.meta || {};

  const orientacion = normalizarOrientacion_(producto.orientacion, producto.formato);
  const formatoHumano = normalizarFormatoHumano_(producto.formato, orientacion);
  const medida = texto_(producto.medida) || (orientacion === "horizontal" ? "144 x 108 mm" : "108 x 144 mm");

  const precioUnitario = normalizarPrecio_(
    producto.precio_unitario_mostrado_eur ||
    producto.precio_mostrado_eur ||
    CFG.PRECIO_UNITARIO_MOSTRADO_EUR
  );
  const personalizacionMarco = normalizarPersonalizacionMarco_(
    producto.personalizacion_marco,
    orientacion
  );

  return {
    payload_version: texto_(payload.payload_version),
    pedido_web_id: texto_(payload.pedido_web_id),
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
      formato: formatoHumano,
      orientacion: orientacion,
      medida: medida,
      color_marco: texto_(producto.color_marco),
      color_litofania: texto_(producto.color_litofania) || CFG.COLOR_LITOFANIA,
      cantidad: normalizarCantidad_(producto.cantidad),
      precio_unitario_mostrado_eur: precioUnitario,
      personalizacion_marco: personalizacionMarco
    },
    archivos: {
      foto_base64: texto_(archivos.foto_base64),
      nombre_archivo: texto_(archivos.nombre_archivo),
      content_type: texto_(archivos.content_type),
      size_bytes: normalizarTamanoArchivo_(archivos.size_bytes),
      foto_base64_presente: booleano_(archivos.foto_base64_presente),
      foto_base64_length: normalizarTamanoArchivo_(archivos.foto_base64_length),
      foto_base64_prefix: texto_(archivos.foto_base64_prefix),
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
      acepta_politica_privacidad: normalizarPrivacidad_(control.acepta_politica_privacidad)
    }
  };
}

function validarPedido_(pedido, payload) {
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

  if (!pedido.control.acepta_contacto) {
    throw new Error("Falta aceptaci\u00F3n de contacto.");
  }

  if (!pedido.control.acepta_revision) {
    throw new Error("Falta aceptaci\u00F3n de revisi\u00F3n de imagen.");
  }

  const pedidoLigeroSinFoto = esPedidoLigeroSinFoto_(pedido, payload);

  if (!pedido.archivos.foto_base64 && !pedidoLigeroSinFoto && payload.modo_prueba !== true) {
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

function numeroEnteroEstricto_(value) {
  const number = Number(value);
  return isFinite(number) && Math.floor(number) === number ? number : NaN;
}

function normalizarImporteEstricto_(value) {
  const cents = importeEnCentimos_(value);
  return isFinite(cents) ? (cents / 100).toFixed(2) : "";
}

function importeEnCentimos_(value) {
  const raw = texto_(value).replace(",", ".");

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    return NaN;
  }

  const amount = Number(raw);
  return isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
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

function construirCuerpoInterno_(idPedidoWeb, now, pedido, foto, fichaVisual) {
  fichaVisual = fichaVisual || {
    ficha_visual_recibida: false,
    nombre_archivo: "",
    content_type: "",
    tamano_bytes: 0,
    modo: "encendida",
    estado: "no_generada",
    nota: ""
  };

  const fecha = Utilities.formatDate(now, CFG.TZ, "yyyy-MM-dd HH:mm:ss");

  return [
    "[" + CFG.VERSION_PLANTILLA + "]",
    "",
    "ID pedido web: " + idPedidoWeb,
    "ID MicroFactory: " + CFG.ID_MICROFACTORY_INICIAL,
    "Fecha solicitud: " + fecha,
    "Origen: " + CFG.ORIGEN,
    "P\u00E1gina origen: " + pedido.meta.pagina_origen,
    "Entorno: " + pedido.meta.entorno,
    "Canal entrada: " + CFG.CANAL_ENTRADA,
    "Modo transporte: " + (pedido.modo_transporte || "pedido_con_foto_base64"),
    "Payload version: " + pedido.payload_version,
    "",
    "[CLIENTE]",
    "Nombre: " + pedido.cliente.nombre,
    "Email: " + pedido.cliente.email,
    "Tel\u00E9fono: " + pedido.cliente.telefono,
    "",
    "[PRODUCTO]",
    "Producto: " + pedido.producto.producto,
    "C\u00F3digo producto: " + pedido.producto.codigo_producto,
    "Formato: " + pedido.producto.formato,
    "Orientaci\u00F3n: " + pedido.producto.orientacion,
    "Medida: " + pedido.producto.medida,
    "Color marco: " + pedido.producto.color_marco,
    "Color litofan\u00EDa: " + pedido.producto.color_litofania,
    "Cantidad: " + pedido.producto.cantidad,
    "Precio unitario mostrado EUR: " + pedido.producto.precio_unitario_mostrado_eur,
    "Precio total mostrado EUR: " + calcularTotalMostrado_(pedido.producto.precio_unitario_mostrado_eur, pedido.producto.cantidad),
    "Moneda: " + CFG.MONEDA,
    "",
    "[PERSONALIZACION_MARCO]",
    "Activa: " + siNo_(pedido.producto.personalizacion_marco.activa),
    "Versi\u00F3n: " + pedido.producto.personalizacion_marco.version,
    "Contrato geom\u00E9trico: " + pedido.producto.personalizacion_marco.geometry_contract,
    "Orientaci\u00F3n: " + pedido.producto.personalizacion_marco.orientacion,
    "N\u00FAmero de lados: " + pedido.producto.personalizacion_marco.numero_lados,
    "Suplemento unitario EUR: " + pedido.producto.personalizacion_marco.suplemento_unitario_eur,
    "Color texto c\u00F3digo: " + pedido.producto.personalizacion_marco.color_texto,
    "Color texto: " + pedido.producto.personalizacion_marco.color_texto_nombre,
    "Texto superior: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "top"),
    "Texto derecho: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "right"),
    "Texto inferior: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "bottom"),
    "Texto izquierdo: " + textoLadoPersonalizacion_(pedido.producto.personalizacion_marco, "left"),
    "",
    "[ARCHIVOS]",
    "Foto adjunta: " + (foto.foto_recibida ? "s\u00ED" : "no"),
    "Enlace Drive: " + foto.enlace_drive,
    "ID archivo Drive: " + foto.id_archivo_drive,
    "Nombre archivo foto: " + foto.nombre_archivo_foto,
    "Tipo archivo foto: " + foto.tipo_archivo_foto,
    "Tama\u00F1o archivo foto bytes: " + foto.tamano_archivo_foto_bytes,
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
    "Acepta revisi\u00F3n de imagen: " + siNo_(pedido.control.acepta_revision),
    "Acepta pol\u00EDtica privacidad: " + pedido.control.acepta_politica_privacidad,
    "Acepta custodia/procesado de imagen: " + CFG.ACEPTA_CUSTODIA_PROCESADO_IMAGEN,
    "Estado inicial: recibido",
    "Prioridad inicial: normal",
    "",
    "[TECNICO]",
    "Versi\u00F3n plantilla: " + CFG.VERSION_PLANTILLA,
    "Generado por: takara3d-web",
    "Observaciones t\u00E9cnicas: " + CFG.OBSERVACIONES_TECNICAS
  ].join("\n");
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
      false,
      true
    ),
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
    "Total del pedido: " +
      formatearEuros_(
        calcularTotalMostrado_(
          pedido.producto.precio_unitario_mostrado_eur,
          pedido.producto.cantidad
        )
      )
  );

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
    "Total del pedido",
    escapeHtml_(formatearEuros_(
      calcularTotalMostrado_(
        pedido.producto.precio_unitario_mostrado_eur,
        pedido.producto.cantidad
      )
    )),
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

function guardarFoto_(idPedidoWeb, archivos, folder) {
  const vacio = {
    foto_recibida: false,
    enlace_drive: "",
    id_archivo_drive: "",
    nombre_archivo_foto: "",
    tipo_archivo_foto: texto_(archivos.content_type),
    tamano_archivo_foto_bytes: archivos.size_bytes,
    estado_archivo: "pendiente_adjuntar_custodiar_microfactory",
    nota_archivo: "Pedido recibido sin foto_base64. Foto pendiente de asociar por Gmail/MicroFactory."
  };

  if (!archivos.foto_base64) {
    return vacio;
  }

  const parsed = parseFotoBase64_(archivos.foto_base64, archivos.content_type);
  const bytes = Utilities.base64Decode(parsed.base64);

  if (bytes.length > CFG.MAX_FOTO_BYTES) {
    throw new Error("La foto supera el m\u00E1ximo permitido de 20 MB.");
  }

  const contentType = parsed.contentType || archivos.content_type || "image/jpeg";
  const extension = extensionDesdeContentType_(contentType, archivos.nombre_archivo);
  const filename = idPedidoWeb + "_original." + extension;

  const blob = Utilities.newBlob(bytes, contentType, filename);
  const file = folder.createFile(blob);

  return {
    foto_recibida: true,
    enlace_drive: file.getUrl(),
    id_archivo_drive: file.getId(),
    nombre_archivo_foto: filename,
    tipo_archivo_foto: contentType,
    tamano_archivo_foto_bytes: archivos.size_bytes,
    estado_archivo: CFG.ESTADO_ARCHIVO_INICIAL,
    nota_archivo: "Foto recibida y guardada en Drive."
  };
}

function prepararFichaVisual_(idPedidoWeb, archivos) {
  const vacio = {
    ficha_visual_recibida: false,
    nombre_archivo: "",
    content_type: "",
    tamano_bytes: 0,
    modo: archivos.ficha_visual_modo || "encendida",
    blob: null,
    estado: "no_generada",
    nota: "El navegador no adjunt\u00F3 una ficha visual; el pedido conserva los datos estructurados."
  };

  if (!archivos.ficha_visual_base64) {
    return vacio;
  }

  const parsed = parseFotoBase64_(
    archivos.ficha_visual_base64,
    archivos.ficha_visual_content_type
  );
  const contentType = parsed.contentType || archivos.ficha_visual_content_type;

  if (contentType !== "image/jpeg") {
    throw new Error("La ficha visual recibida no es un JPEG v\u00E1lido.");
  }

  const bytes = Utilities.base64Decode(parsed.base64);

  if (bytes.length < 1 || bytes.length > CFG.MAX_VISUAL_PROOF_BYTES) {
    throw new Error("La ficha visual supera el l\u00EDmite de seguridad.");
  }

  if (
    archivos.ficha_visual_size_bytes !== "" &&
    bytes.length !== archivos.ficha_visual_size_bytes
  ) {
    throw new Error("El tama\u00F1o real de la ficha visual no coincide con el declarado.");
  }

  const filename = idPedidoWeb + "_vista_previa.jpg";
  const blob = Utilities.newBlob(bytes, contentType, filename);

  return {
    ficha_visual_recibida: true,
    nombre_archivo: filename,
    content_type: contentType,
    tamano_bytes: bytes.length,
    modo: archivos.ficha_visual_modo || "encendida",
    blob: blob,
    estado: "preparada",
    nota: "Ficha visual validada para los correos y no almacenada en Drive."
  };
}

function prepararFichaVisualSegura_(idPedidoWeb, archivos) {
  try {
    validarFichaVisual_(archivos);
    return prepararFichaVisual_(idPedidoWeb, archivos);
  } catch (error) {
    return {
      ficha_visual_recibida: false,
      nombre_archivo: "",
      content_type: "",
      tamano_bytes: 0,
      modo: archivos.ficha_visual_modo || "encendida",
      blob: null,
      estado: "descartada",
      nota: "Ficha visual descartada sin bloquear el pedido: " +
        texto_(error && error.message ? error.message : error)
    };
  }
}

function parseFotoBase64_(value, fallbackContentType) {
  const text = texto_(value);

  if (!text) {
    return {
      base64: "",
      contentType: fallbackContentType || ""
    };
  }

  const match = text.match(/^data:([^;]+);base64,(.+)$/);

  if (match) {
    return {
      contentType: match[1],
      base64: match[2]
    };
  }

  return {
    contentType: fallbackContentType || "",
    base64: text
  };
}

function asegurarCarpetaPedido_(idPedidoWeb, now) {
  const root = getOrCreateRootFolder_();
  const pedidos = getOrCreateChildFolder_(root, CFG.PEDIDOS_FOLDER);
  const year = Utilities.formatDate(now, CFG.TZ, "yyyy");
  const yearFolder = getOrCreateChildFolder_(pedidos, year);
  return getOrCreateChildFolder_(yearFolder, idPedidoWeb);
}

function getOrCreateRootFolder_() {
  const folders = DriveApp.getFoldersByName(CFG.ROOT_FOLDER);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(CFG.ROOT_FOLDER);
}

function getOrCreateChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parent.createFolder(name);
}

/* ============================================================
   UTILIDADES
   ============================================================ */

function normalizarFormatoHumano_(formato, orientacion) {
  const f = texto_(formato).toLowerCase();

  if (f.indexOf("horizontal") >= 0 || orientacion === "horizontal") {
    return "Marco horizontal";
  }

  return "Marco vertical";
}

function normalizarOrientacion_(orientacion, formato) {
  const o = texto_(orientacion).toLowerCase();

  if (o === "horizontal" || o === "vertical") {
    return o;
  }

  const f = texto_(formato).toLowerCase();

  if (f.indexOf("horizontal") >= 0) {
    return "horizontal";
  }

  return "vertical";
}

function normalizarEntorno_(entorno, paginaOrigen) {
  const e = texto_(entorno).toLowerCase();
  const p = texto_(paginaOrigen).toLowerCase();

  if (e === "local" || p.indexOf("localhost") >= 0 || p.indexOf("127.0.0.1") >= 0) {
    return "local";
  }

  return "produccion";
}

function telefonoPedidoValido_(value) {
  return /^[0-9]{9,15}$/.test(texto_(value));
}

function emailPedidoValido_(value) {
  const email = texto_(value);

  if (!email || email.length > 254) {
    return false;
  }

  const partes = email.split("@");

  if (partes.length !== 2) {
    return false;
  }

  const local = partes[0];
  const dominio = partes[1];

  if (!local || local.length > 64) {
    return false;
  }

  if (
    local.charAt(0) === "." ||
    local.charAt(local.length - 1) === "." ||
    local.indexOf("..") !== -1
  ) {
    return false;
  }

  if (!/^[a-z0-9!#$%&*+/=?^_{}|~.-]+$/i.test(local)) {
    return false;
  }

  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(dominio);
}

function normalizarCantidad_(value) {
  const n = parseInt(value, 10);

  if (!isFinite(n) || n < 1) {
    return 1;
  }

  return Math.min(n, 20);
}

function normalizarTamanoArchivo_(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const n = parseInt(value, 10);

  if (!isFinite(n) || n < 1) {
    return "";
  }

  return n;
}

function normalizarPrecio_(value) {
  const text = texto_(value).replace(",", ".");
  const n = parseFloat(text);

  if (!isFinite(n) || n < 0) {
    return CFG.PRECIO_UNITARIO_MOSTRADO_EUR;
  }

  return n.toFixed(2);
}

function calcularTotalMostrado_(unitario, cantidad) {
  const precio = parseFloat(texto_(unitario).replace(",", "."));
  const unidades = parseInt(cantidad, 10);

  if (!isFinite(precio) || !isFinite(unidades) || unidades < 1) {
    return "";
  }

  return (precio * unidades).toFixed(2);
}

function formatearEuros_(value) {
  const precio = parseFloat(texto_(value).replace(",", "."));

  if (!isFinite(precio)) {
    return "";
  }

  return precio.toFixed(2).replace(".", ",") + " \u20AC";
}

function formatearCantidad_(value) {
  const cantidad = normalizarCantidad_(value);
  return cantidad + (cantidad === 1 ? " unidad" : " unidades");
}

function capitalizar_(value) {
  const text = texto_(value);

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizarPrivacidad_(value) {
  const text = texto_(value).toLowerCase();

  if (text === "no" || text === "false" || text === "0") {
    return "no";
  }

  return "s\u00ED";
}

function extensionDesdeContentType_(contentType, filename) {
  const ct = texto_(contentType).toLowerCase();
  const name = texto_(filename).toLowerCase();

  if (ct.indexOf("png") >= 0 || name.endsWith(".png")) {
    return "png";
  }

  if (ct.indexOf("webp") >= 0 || name.endsWith(".webp")) {
    return "webp";
  }

  return "jpg";
}

function booleano_(value) {
  return value === true ||
    value === "true" ||
    value === "s\u00ED" ||
    value === "si" ||
    value === "1";
}

function siNo_(value) {
  return value ? "s\u00ED" : "no";
}

function texto_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
