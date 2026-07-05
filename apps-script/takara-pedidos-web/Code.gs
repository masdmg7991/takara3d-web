const CFG = Object.freeze({
  DESTINO_PEDIDOS: "3d.takara@gmail.com",
  TZ: "Europe/Madrid",
  ROOT_FOLDER: "Takara3D",
  PEDIDOS_FOLDER: "Pedidos Web",
  VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V1",
  VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8",
  ORIGEN: "web takara3d.es",
  CANAL_ENTRADA: "web_gmail",
  ID_MICROFACTORY_INICIAL: "pendiente_asignar",
  CODIGO_PRODUCTO: "MARCO_LITOFANIA_144X108",
  PRODUCTO: "Marco litofanía personalizado",
  COLOR_LITOFANIA: "Blanco natural",
  PRECIO_UNITARIO_MOSTRADO_EUR: "35.00",
  MONEDA: "EUR",
  ESTADO_ARCHIVO_INICIAL: "pendiente_descarga",
  ACEPTA_CUSTODIA_PROCESADO_IMAGEN: "sí",
  OBSERVACIONES_TECNICAS: "",
  MAX_FOTO_BYTES: 20 * 1024 * 1024
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

    const subject = construirAsunto_(idPedidoWeb, pedido);
    const body = construirCuerpoInterno_(idPedidoWeb, now, pedido, foto);

    enviarEmailInterno_(subject, body, pedido);
    enviarConfirmacionCliente_(idPedidoWeb, pedido, foto);

    return json_({
      ok: true,
      id_pedido_web: idPedidoWeb,
      estado: "recibido",
      email_destino: CFG.DESTINO_PEDIDOS,
      enlace_drive: foto.enlace_drive || "",
      id_archivo_drive: foto.id_archivo_drive || "",
      nombre_archivo_foto: foto.nombre_archivo_foto || "",
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

  throw new Error("No se recibieron datos válidos.");
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
  return "Nueva consulta desde Takara 3D · " +
    contacto.nombre +
    " · " +
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
    lines.push("Teléfono: " + contacto.telefono);
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
    name: "Takara 3D · Contacto Web"
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
    ? '<p style="margin:0 0 4px 0;"><strong>Teléfono:</strong> ' + safeTelefono + '</p>'
    : "";

  const whatsappHtml = safeWhatsapp
    ? '<p style="margin:0 0 4px 0;"><strong>WhatsApp:</strong> ' + safeWhatsapp + '</p>'
    : "";

  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#2a211b;background:#fffaf3;padding:22px;border-radius:18px;border:1px solid #ead9bd;">',

    '<h2 style="margin:0 0 14px 0;color:#3a2a1d;font-size:22px;">Nueva consulta desde Takara 3D</h2>',
    '<p style="margin:0 0 18px 0;color:#6b5a4a;">Has recibido un mensaje desde la página de contacto.</p>',

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
    '<p style="margin:0;color:#6b5a4a;font-size:14px;">Puedes responder directamente a este correo: la respuesta irá al email del cliente.</p>',
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
      precio_unitario_mostrado_eur: precioUnitario
    },
    archivos: {
      foto_base64: texto_(archivos.foto_base64),
      nombre_archivo: texto_(archivos.nombre_archivo),
      content_type: texto_(archivos.content_type),
      size_bytes: normalizarTamanoArchivo_(archivos.size_bytes),
      foto_base64_presente: booleano_(archivos.foto_base64_presente),
      foto_base64_length: normalizarTamanoArchivo_(archivos.foto_base64_length),
      foto_base64_prefix: texto_(archivos.foto_base64_prefix)
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

  if (!pedido.cliente.email && !pedido.cliente.telefono) {
    throw new Error("Falta email o teléfono de contacto.");
  }

  if (!pedido.control.acepta_contacto) {
    throw new Error("Falta aceptación de contacto.");
  }

  if (!pedido.control.acepta_revision) {
    throw new Error("Falta aceptación de revisión de imagen.");
  }

  const pedidoLigeroSinFoto = esPedidoLigeroSinFoto_(pedido, payload);

  if (!pedido.archivos.foto_base64 && !pedidoLigeroSinFoto && payload.modo_prueba !== true) {
    throw new Error("Falta la foto del pedido.");
  }

  if (pedido.archivos.size_bytes !== "" && pedido.archivos.size_bytes > CFG.MAX_FOTO_BYTES) {
    throw new Error("La foto supera el máximo permitido de 20 MB.");
  }
}

function construirAsunto_(idPedidoWeb, pedido) {
  return "[TAKARA PEDIDO WEB] " +
    idPedidoWeb +
    " · " +
    pedido.producto.formato +
    " · " +
    pedido.producto.color_marco +
    " · " +
    pedido.cliente.nombre;
}

function construirCuerpoInterno_(idPedidoWeb, now, pedido, foto) {
  const fecha = Utilities.formatDate(now, CFG.TZ, "yyyy-MM-dd HH:mm:ss");

  return [
    "[" + CFG.VERSION_PLANTILLA + "]",
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
    "Precio total mostrado EUR: " + calcularTotalMostrado_(pedido.producto.precio_unitario_mostrado_eur, pedido.producto.cantidad),
    "Moneda: " + CFG.MONEDA,
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
    "Acepta custodia/procesado de imagen: " + CFG.ACEPTA_CUSTODIA_PROCESADO_IMAGEN,
    "Estado inicial: recibido",
    "Prioridad inicial: normal",
    "",
    "[TECNICO]",
    "Versión plantilla: " + CFG.VERSION_PLANTILLA,
    "Generado por: takara3d-web",
    "Observaciones técnicas: " + CFG.OBSERVACIONES_TECNICAS
  ].join("\n");
}

function enviarEmailInterno_(subject, body, pedido) {
  const options = {
    to: CFG.DESTINO_PEDIDOS,
    subject: subject,
    body: body,
    htmlBody: construirHtmlInterno_(body),
    name: "Takara 3D · Pedidos Web"
  };

  if (pedido.cliente.email) {
    options.replyTo = pedido.cliente.email;
  }

  MailApp.sendEmail(options);
}

function construirHtmlInterno_(body) {
  const lines = String(body || "").split("\n");

  const htmlLines = lines.map(function (line) {
    if (line.indexOf("Enlace Drive: ") === 0) {
      const url = line.substring("Enlace Drive: ".length);
      const safeUrl = escapeHtml_(url);

      return '<div style="white-space:nowrap;overflow:visible;">' +
        '<span style="white-space:nowrap;">Enlace&nbsp;Drive:&nbsp;</span>' +
        '<a href="' +
        safeUrl +
        '" target="_blank" rel="noopener noreferrer" style="white-space:nowrap;color:#1155cc;text-decoration:underline;">' +
        safeUrl +
        '</a>' +
        '</div>';
    }

    if (line === "") {
      return "<div>&nbsp;</div>";
    }

    return "<div>" + escapeHtml_(line) + "</div>";
  });

  return '<div style="font-family:Consolas,Menlo,Monaco,monospace;font-size:14px;line-height:1.45;color:#202124;white-space:normal;">' +
    htmlLines.join("") +
    "</div>";
}

function enviarConfirmacionCliente_(idPedidoWeb, pedido, foto) {
  if (!pedido.cliente.email) {
    return;
  }

  const subject = "Hemos recibido tu solicitud Takara 3D · " + idPedidoWeb;

  const body = [
    "Hola " + pedido.cliente.nombre + ",",
    "",
    "Hemos recibido tu solicitud de pedido en Takara 3D.",
    "",
    "ID pedido web: " + idPedidoWeb,
    "Producto: " + pedido.producto.producto,
    "Formato: " + pedido.producto.formato,
    "Color marco: " + pedido.producto.color_marco,
    "Cantidad: " + pedido.producto.cantidad,
    "Precio unitario mostrado EUR: " + pedido.producto.precio_unitario_mostrado_eur,
    "Precio total mostrado EUR: " + calcularTotalMostrado_(pedido.producto.precio_unitario_mostrado_eur, pedido.producto.cantidad),
    "",
    foto.foto_recibida
      ? "Revisaremos la imagen, el encuadre y los detalles del pedido."
      : "Hemos recibido los datos del pedido. La foto queda pendiente de adjuntar/custodiar antes de producir.",
    "Después te contactaremos para confirmar viabilidad, plazo y entrega.",
    "",
    "Gracias,",
    "Takara 3D"
  ].join("\n");

  MailApp.sendEmail({
    to: pedido.cliente.email,
    subject: subject,
    body: body,
    name: "Takara 3D"
  });
}

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
    throw new Error("La foto supera el máximo permitido de 20 MB.");
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

function normalizarPrivacidad_(value) {
  const text = texto_(value).toLowerCase();

  if (text === "no" || text === "false" || text === "0") {
    return "no";
  }

  return "sí";
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
    value === "sí" ||
    value === "si" ||
    value === "1";
}

function siNo_(value) {
  return value ? "sí" : "no";
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