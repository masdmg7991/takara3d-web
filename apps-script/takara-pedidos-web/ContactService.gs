/*
 * TAKARA CONTACT SERVICE V1
 *
 * Contact normalization, validation, mail rendering and causal processing.
 * HTTP routing remains owned by Code.gs::doPost.
 */

function procesarContactoWeb_(payload, browserResponseRequest) {
  const now = new Date();
  const contacto = normalizarContactoWeb_(payload);

  validarContactoWeb_(contacto);

  if (!browserResponseRequest) {
    reservePublicSideEffectBudget_(
      "CONTACT",
      contacto.email,
      2,
      now
    );

    const idContactoLegacy = generarIdContactoWeb_(now);
    const subjectLegacy = construirAsuntoContactoWeb_(
      idContactoLegacy,
      contacto
    );
    const bodyLegacy = construirCuerpoContactoWeb_(
      idContactoLegacy,
      now,
      contacto
    );

    enviarEmailContactoInterno_(
      subjectLegacy,
      bodyLegacy,
      contacto,
      idContactoLegacy,
      now
    );
    enviarConfirmacionContactoCliente_(
      idContactoLegacy,
      contacto
    );

    return contactBrowserResponseOrJson_(null, {
      ok: true,
      tipo_solicitud: "CONTACTO_WEB",
      id_contacto_web: idContactoLegacy,
      estado: "recibido",
      email_destino: CFG.DESTINO_PEDIDOS,
      version: CFG.VERSION_PLANTILLA,
      script: CFG.VERSION_SCRIPT
    });
  }

  const requestId = assertContactIdempotencyRequestId_(
    contacto.request_id
  );

  if (browserResponseRequest.request_id !== requestId) {
    throw contactIdempotencyError_(
      "CONTACT_IDEMPOTENCY_REQUEST_MISMATCH",
      "La referencia del contacto no coincide con la solicitud de confirmacion."
    );
  }

  const fingerprint =
    buildContactIdempotencyFingerprint_(contacto);
  let execution = null;

  try {
    execution = beginContactIdempotency_(
      requestId,
      fingerprint,
      now
    );

    if (execution.mode === "COMPLETED") {
      if (!execution.ack) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_ACK_MISSING",
          "La consulta consta como completada pero no conserva su ACK."
        );
      }

      return contactBrowserResponseOrJson_(
        browserResponseRequest,
        execution.ack
      );
    }

    reservePublicSideEffectBudget_(
      "CONTACT",
      contacto.email,
      2,
      now
    );

    const token = execution.token;
    let record = execution.record;
    const idContacto = record.contact_id;
    const subject = construirAsuntoContactoWeb_(
      idContacto,
      contacto
    );
    const body = construirCuerpoContactoWeb_(
      idContacto,
      now,
      contacto
    );

    if (
      record.phase ===
      TAKARA_CONTACT_IDEMPOTENCY_PHASE.RESERVED
    ) {
      record = transitionContactIdempotency_(
        requestId,
        token,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE.RESERVED,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .INTERNAL_EMAIL_IN_FLIGHT,
        {},
        new Date()
      );

      enviarEmailContactoInterno_(
        subject,
        body,
        contacto,
        idContacto,
        now
      );

      record = transitionContactIdempotency_(
        requestId,
        token,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .INTERNAL_EMAIL_IN_FLIGHT,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .INTERNAL_EMAIL_SENT,
        {},
        new Date()
      );
    }

    if (
      record.phase ===
      TAKARA_CONTACT_IDEMPOTENCY_PHASE
        .INTERNAL_EMAIL_SENT
    ) {
      record = transitionContactIdempotency_(
        requestId,
        token,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .INTERNAL_EMAIL_SENT,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .CLIENT_EMAIL_IN_FLIGHT,
        {},
        new Date()
      );

      enviarConfirmacionContactoCliente_(
        idContacto,
        contacto
      );

      const ack = {
        ok: true,
        tipo_solicitud: "CONTACTO_WEB",
        contact_request_id: requestId,
        id_contacto_web: idContacto,
        estado: "recibido",
        version: CFG.VERSION_PLANTILLA,
        script: CFG.VERSION_SCRIPT
      };

      transitionContactIdempotency_(
        requestId,
        token,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .CLIENT_EMAIL_IN_FLIGHT,
        TAKARA_CONTACT_IDEMPOTENCY_PHASE.COMPLETED,
        { ack: ack },
        new Date()
      );

      return contactBrowserResponseOrJson_(
        browserResponseRequest,
        ack
      );
    }

    throw contactIdempotencyError_(
      "CONTACT_IDEMPOTENCY_UNEXPECTED_PHASE",
      "La consulta termino en una fase idempotente inesperada."
    );
  } finally {
    if (execution && execution.token) {
      try {
        releaseContactIdempotencyLease_(
          requestId,
          execution.token,
          new Date()
        );
      } catch (releaseError) {
        console.error(
          "[TAKARA_CONTACT_IDEMPOTENCY_RELEASE_ERROR]",
          String(
            releaseError && releaseError.message
              ? releaseError.message
              : releaseError
          )
        );
      }
    }
  }
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
    fecha_cliente: texto_(payload.fecha_cliente),
    website: texto_(payload.website),
    request_id: texto_(payload.contact_request_id).toUpperCase()
  };
}

function validarContactoWeb_(contacto) {
  if (contacto.website) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_HONEYPOT",
      "No se ha podido procesar la consulta."
    );
  }

  if (!contacto.nombre) {
    throw new Error("Falta el nombre en la consulta de contacto.");
  }

  if (contacto.nombre.length > CFG.CONTACT_NAME_MAX_CHARS) {
    throw new Error("El nombre de contacto es demasiado largo.");
  }

  if (!contacto.email) {
    throw new Error("Falta el email en la consulta de contacto.");
  }

  if (!emailPedidoValido_(contacto.email)) {
    throw new Error("El email de contacto no es valido.");
  }

  if (!contacto.asunto) {
    throw new Error("Falta el asunto en la consulta de contacto.");
  }

  if (contacto.asunto.length > CFG.CONTACT_SUBJECT_MAX_CHARS) {
    throw new Error("El asunto de contacto es demasiado largo.");
  }

  if (!contacto.mensaje) {
    throw new Error("Falta el mensaje en la consulta de contacto.");
  }

  if (contacto.mensaje.length > CFG.CONTACT_MESSAGE_MAX_CHARS) {
    throw new Error("El mensaje de contacto es demasiado largo.");
  }

  if (
    contacto.telefono.length > CFG.CONTACT_OPTIONAL_PHONE_MAX_CHARS ||
    contacto.whatsapp.length > CFG.CONTACT_OPTIONAL_PHONE_MAX_CHARS
  ) {
    throw new Error("Los datos telefonicos de contacto son demasiado largos.");
  }

  if (
    contacto.origen.length > CFG.CONTACT_METADATA_MAX_CHARS ||
    contacto.fecha_cliente.length > CFG.CONTACT_METADATA_MAX_CHARS
  ) {
    throw new Error("Los metadatos de contacto son demasiado largos.");
  }

  if (contacto.origen !== "contacto.html") {
    throw new Error("El origen de la consulta de contacto no es valido.");
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
