const CFG = Object.freeze({
  DESTINO_PEDIDOS: "3d.takara@gmail.com",
  TZ: "Europe/Madrid",
  ROOT_FOLDER: "Takara3D",
  PEDIDOS_FOLDER: "Pedidos Web",
  VERSION_PLANTILLA: "TAKARA_PEDIDO_WEB_V2",
  PAYLOAD_VERSION: "TAKARA_WEB_ORDER_PAYLOAD_V2",
  SNAPSHOT_VERSION: "TAKARA_ORDER_SNAPSHOT_V2",
  PAYLOAD_VERSION_V1_COMPAT: "TAKARA_WEB_ORDER_PAYLOAD_V1",
  VERSION_PLANTILLA_V1_COMPAT: "TAKARA_PEDIDO_WEB_V1",
  VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1",
  ORIGEN: "web takara3d.es",
  CANAL_ENTRADA: "web_gmail",
  ID_MICROFACTORY_INICIAL: "pendiente_asignar",
  CODIGO_PRODUCTO: "MARCO_LITOFANIA_144X108",
  PRODUCTO: "Marco litofan\u00EDa personalizado",
  COLOR_LITOFANIA: "Blanco natural",
  PRECIO_UNITARIO_MOSTRADO_EUR: "35.00",
  MONEDA: "EUR",
  DELIVERY_VERSION: "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC",
  DELIVERY_MODE_LOCAL: "entrega_local",
  DELIVERY_MODE_TRACKED: "envio_seguimiento",
  DELIVERY_DECISION_AUTOMATIC: "codigo_postal_automatico",
  DELIVERY_DECISION_OFFICIAL_SELECTION: "seleccion_ubicacion_oficial",
  DELIVERY_PRICE_LOCAL_FREE_EUR: "0.00",
  DELIVERY_PRICE_LOCAL_NEARBY_EUR: "3.00",
  DELIVERY_PRICE_MAINLAND_TRACKED_EUR: "6.50",
  DELIVERY_FIXED_MAINLAND_MAX_QUANTITY: 1,
  DELIVERY_LOCALITY_MAX_CHARS: 80,
  DELIVERY_MUNICIPALITY_CODE_MAX_CHARS: 5,
  DELIVERY_MUNICIPALITY_SOURCE_MAX_CHARS: 32,
  DELIVERY_MUNICIPALITY_SOURCES: Object.freeze([
    "cartociudad_automatico",
    "cartociudad_seleccion",
    "manual",
    "sin_dato"
  ]),
  DELIVERY_AUTOMATIC_FREE_POSTAL_CODES: Object.freeze(["28911", "28912", "28913", "28915", "28916", "28918", "28919"]),
  DELIVERY_AUTOMATIC_NEARBY_BY_AREA: Object.freeze({"carabanchel": ["28019", "28025"], "getafe_villaverde": ["28021"], "getafe": ["28901", "28902", "28903", "28904", "28905", "28906", "28907", "28909"], "alcorcon": ["28921", "28922", "28923", "28924"], "mostoles": ["28931", "28932", "28933", "28934", "28935", "28937", "28938"], "alcorcon_mostoles": ["28936"], "mostoles_fuenlabrada": ["28942"], "fuenlabrada": ["28943", "28944", "28945", "28946", "28947"]}),
  DELIVERY_AREA_LABELS: Object.freeze({"carabanchel": "Carabanchel", "getafe_villaverde": "Getafe / Villaverde", "getafe": "Getafe", "alcorcon": "Alcorc\u00f3n", "mostoles": "M\u00f3stoles", "alcorcon_mostoles": "Alcorc\u00f3n / M\u00f3stoles", "mostoles_fuenlabrada": "M\u00f3stoles / Fuenlabrada", "fuenlabrada": "Fuenlabrada"}),
  DELIVERY_AMBIGUOUS_POSTAL_OPTIONS: Object.freeze({"28011": [{"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_latina", "label": "Latina (Madrid)", "zone_code": "peninsula", "zone_name": "Latina (Madrid)", "area_code": "madrid_latina", "mode": "envio_seguimiento", "price_eur": 6.5}, {"code": "madrid_moncloa_aravaca", "label": "Moncloa-Aravaca (Madrid)", "zone_code": "peninsula", "zone_name": "Moncloa-Aravaca (Madrid)", "area_code": "madrid_moncloa_aravaca", "mode": "envio_seguimiento", "price_eur": 6.5}, {"code": "madrid_centro", "label": "Centro (Madrid)", "zone_code": "peninsula", "zone_name": "Centro (Madrid)", "area_code": "madrid_centro", "mode": "envio_seguimiento", "price_eur": 6.5}], "28024": [{"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_latina", "label": "Latina (Madrid)", "zone_code": "peninsula", "zone_name": "Latina (Madrid)", "area_code": "madrid_latina", "mode": "envio_seguimiento", "price_eur": 6.5}, {"code": "pozuelo_de_alarcon", "label": "Pozuelo de Alarc\u00f3n", "zone_code": "peninsula", "zone_name": "Pozuelo de Alarc\u00f3n", "area_code": "pozuelo_de_alarcon", "mode": "envio_seguimiento", "price_eur": 6.5}], "28041": [{"code": "madrid_villaverde", "label": "Villaverde (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Villaverde", "area_code": "villaverde", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_usera", "label": "Usera (Madrid)", "zone_code": "peninsula", "zone_name": "Usera (Madrid)", "area_code": "madrid_usera", "mode": "envio_seguimiento", "price_eur": 6.5}, {"code": "madrid_puente_vallecas", "label": "Puente de Vallecas (Madrid)", "zone_code": "peninsula", "zone_name": "Puente de Vallecas (Madrid)", "area_code": "madrid_puente_vallecas", "mode": "envio_seguimiento", "price_eur": 6.5}], "28044": [{"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_latina", "label": "Latina (Madrid)", "zone_code": "peninsula", "zone_name": "Latina (Madrid)", "area_code": "madrid_latina", "mode": "envio_seguimiento", "price_eur": 6.5}], "28047": [{"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_latina", "label": "Latina (Madrid)", "zone_code": "peninsula", "zone_name": "Latina (Madrid)", "area_code": "madrid_latina", "mode": "envio_seguimiento", "price_eur": 6.5}], "28054": [{"code": "leganes", "label": "Legan\u00e9s", "zone_code": "leganes", "zone_name": "Legan\u00e9s", "area_code": "leganes", "mode": "entrega_local", "price_eur": 0.0}, {"code": "madrid_carabanchel", "label": "Carabanchel (Madrid)", "zone_code": "madrid_sur_cercano", "zone_name": "Carabanchel", "area_code": "carabanchel", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid_latina", "label": "Latina (Madrid)", "zone_code": "peninsula", "zone_name": "Latina (Madrid)", "area_code": "madrid_latina", "mode": "envio_seguimiento", "price_eur": 6.5}], "28668": [{"code": "alcorcon", "label": "Alcorc\u00f3n", "zone_code": "madrid_sur_cercano", "zone_name": "Alcorc\u00f3n", "area_code": "alcorcon", "mode": "entrega_local", "price_eur": 3.0}, {"code": "boadilla_del_monte", "label": "Boadilla del Monte", "zone_code": "peninsula", "zone_name": "Boadilla del Monte", "area_code": "boadilla_del_monte", "mode": "envio_seguimiento", "price_eur": 6.5}], "28670": [{"code": "alcorcon", "label": "Alcorc\u00f3n", "zone_code": "madrid_sur_cercano", "zone_name": "Alcorc\u00f3n", "area_code": "alcorcon", "mode": "entrega_local", "price_eur": 3.0}, {"code": "villaviciosa_de_odon", "label": "Villaviciosa de Od\u00f3n", "zone_code": "peninsula", "zone_name": "Villaviciosa de Od\u00f3n", "area_code": "villaviciosa_de_odon", "mode": "envio_seguimiento", "price_eur": 6.5}], "28914": [{"code": "leganes", "label": "Legan\u00e9s", "zone_code": "leganes", "zone_name": "Legan\u00e9s", "area_code": "leganes", "mode": "entrega_local", "price_eur": 0.0}, {"code": "fuenlabrada", "label": "Fuenlabrada", "zone_code": "madrid_sur_cercano", "zone_name": "Fuenlabrada", "area_code": "fuenlabrada", "mode": "entrega_local", "price_eur": 3.0}], "28917": [{"code": "leganes", "label": "Legan\u00e9s", "zone_code": "leganes", "zone_name": "Legan\u00e9s", "area_code": "leganes", "mode": "entrega_local", "price_eur": 0.0}, {"code": "alcorcon", "label": "Alcorc\u00f3n", "zone_code": "madrid_sur_cercano", "zone_name": "Alcorc\u00f3n", "area_code": "alcorcon", "mode": "entrega_local", "price_eur": 3.0}], "28925": [{"code": "leganes", "label": "Legan\u00e9s", "zone_code": "leganes", "zone_name": "Legan\u00e9s", "area_code": "leganes", "mode": "entrega_local", "price_eur": 0.0}, {"code": "alcorcon", "label": "Alcorc\u00f3n", "zone_code": "madrid_sur_cercano", "zone_name": "Alcorc\u00f3n", "area_code": "alcorcon", "mode": "entrega_local", "price_eur": 3.0}, {"code": "madrid", "label": "Madrid", "zone_code": "peninsula", "zone_name": "Madrid", "area_code": "madrid", "mode": "envio_seguimiento", "price_eur": 6.5}], "28939": [{"code": "mostoles", "label": "M\u00f3stoles", "zone_code": "madrid_sur_cercano", "zone_name": "M\u00f3stoles", "area_code": "mostoles", "mode": "entrega_local", "price_eur": 3.0}, {"code": "arroyomolinos", "label": "Arroyomolinos", "zone_code": "peninsula", "zone_name": "Arroyomolinos", "area_code": "arroyomolinos", "mode": "envio_seguimiento", "price_eur": 6.5}, {"code": "batres", "label": "Batres", "zone_code": "peninsula", "zone_name": "Batres", "area_code": "batres", "mode": "envio_seguimiento", "price_eur": 6.5}], "28941": [{"code": "leganes", "label": "Legan\u00e9s", "zone_code": "leganes", "zone_name": "Legan\u00e9s", "area_code": "leganes", "mode": "entrega_local", "price_eur": 0.0}, {"code": "fuenlabrada", "label": "Fuenlabrada", "zone_code": "madrid_sur_cercano", "zone_name": "Fuenlabrada", "area_code": "fuenlabrada", "mode": "entrega_local", "price_eur": 3.0}]}),
  DELIVERY_SPECIAL_PREFIX_LABELS: Object.freeze({"07": "Baleares", "35": "Las Palmas", "38": "Santa Cruz de Tenerife", "51": "Ceuta", "52": "Melilla"}),
  ESTADO_ARCHIVO_INICIAL: "pendiente_descarga",
  ACEPTA_CUSTODIA_PROCESADO_IMAGEN: "s\u00ED",
  OBSERVACIONES_TECNICAS: "",
  MAX_FOTO_BYTES: 20 * 1024 * 1024,
  MAX_FOTO_BASE64_CHARS: Math.ceil((20 * 1024 * 1024) / 3) * 4,
  CONTACT_NAME_MAX_CHARS: 100,
  CONTACT_SUBJECT_MAX_CHARS: 160,
  CONTACT_MESSAGE_MAX_CHARS: 5000,
  CONTACT_OPTIONAL_PHONE_MAX_CHARS: 32,
  CONTACT_METADATA_MAX_CHARS: 64,
  VISUAL_PROOF_VERSION: "TAKARA_ORDER_VISUAL_PROOF_V1",
  MAX_VISUAL_PROOF_BYTES: 900 * 1024,
  MAX_VISUAL_PROOF_BASE64_CHARS: Math.ceil((900 * 1024) / 3) * 4,
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

const PRODUCT_RULES_V2 = Object.freeze({
  MARCO_LITOFANIA_144X108: Object.freeze({
    precio_base_eur: "35.00",
    catalog_version: "TAKARA_CATALOGO_V1",
    pricing_version: "TAKARA_PRICING_V1",
    variantes: Object.freeze({
      vertical: "0.00",
      horizontal: "0.00"
    })
  })
});


function doGet(e) {
  if (e && e.parameter && e.parameter.route === "store-admin") {
    return getStoreAdminUiDeploymentOutput_();
  }
  const storeResponse = routeStorePublicGet_(e);
  if (storeResponse !== null) {
    return storeResponse;
  }

  return json_({
    ok: true,
    service: "Takara Pedidos Web",
    version: CFG.VERSION_PLANTILLA,
    script: CFG.VERSION_SCRIPT,
    status: "online"
  });
}

function doPost(e) {
  let browserResponseRequest = null;
  let contactResponseRequest = null;
  let idPedidoWeb = "";
  let idempotencyExecution = null;

  try {
    browserResponseRequest = parseOrderBrowserResponseRequest_(e);
    contactResponseRequest = parseContactBrowserResponseRequest_(e);

    const payload = parsePayload_(e);
    assertOrderBrowserPayloadMatches_(browserResponseRequest, payload);

    const tipoSolicitud = texto_(payload.tipo_solicitud).toUpperCase();

    if (tipoSolicitud === "CONTACTO_WEB") {
      if (browserResponseRequest) {
        throw new Error("El ACK de pedido no admite solicitudes de contacto.");
      }
      return procesarContactoWeb_(payload, contactResponseRequest);
    }

    if (contactResponseRequest) {
      throw new Error("El ACK de contacto no admite solicitudes de pedido.");
    }

    const now = new Date();
    idPedidoWeb = resolverIdPedidoWeb_(payload, now);
    const pedido = normalizarPedido_(payload);
    pedido.attribution = buildAuthoritativeOrderAttribution_(payload);
    pedido.recibido_apps_script_iso = now.toISOString();

    validarPedido_(pedido);

    if (pedido.modo_prueba) {
      const fotoPrueba = {
        foto_recibida: true,
        enlace_drive: "DRY_RUN_SIN_DRIVE",
        id_archivo_drive: "DRY_RUN_SIN_DRIVE",
        nombre_archivo_foto: pedido.archivos.nombre_archivo || "dry-run.jpg",
        tipo_archivo_foto: pedido.archivos.content_type || "image/jpeg",
        tamano_archivo_foto_bytes: pedido.archivos.size_bytes || 1,
        estado_archivo: CFG.ESTADO_ARCHIVO_INICIAL,
        nota_archivo: "dry_run_sin_efectos"
      };
      const bodyPrueba = construirCuerpoInterno_(
        idPedidoWeb,
        now,
        pedido,
        fotoPrueba,
        null
      );
      return orderBrowserResponseOrJson_(browserResponseRequest, {
        ok: true,
        dry_run: true,
        id_pedido_web: idPedidoWeb,
        technical_email_body: bodyPrueba,
        version: versionPlantillaPedido_(pedido),
        script: CFG.VERSION_SCRIPT
      });
    }

    assertOrderIdempotencyOrderId_(payload, idPedidoWeb);
    const fingerprint = buildOrderIdempotencyFingerprint_(pedido);
    idempotencyExecution = beginOrderIdempotency_(
      idPedidoWeb,
      fingerprint,
      now
    );

    if (idempotencyExecution.mode === "COMPLETED") {
      if (!idempotencyExecution.ack) {
        throw orderIdempotencyError_(
          "ORDER_IDEMPOTENCY_ACK_MISSING",
          "El pedido consta como completado pero no conserva su ACK."
        );
      }
      return orderBrowserResponseOrJson_(
        browserResponseRequest,
        idempotencyExecution.ack
      );
    }

    reservePublicSideEffectBudget_(
      "ORDER",
      pedido.cliente.email,
      2,
      new Date()
    );

    const token = idempotencyExecution.token;
    let record = idempotencyExecution.record;
    let foto = record.photo || null;
    let fichaVisual = null;

    if (record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.RESERVED) {
      const fotoPreparada = prepararFotoOriginal_(
        idPedidoWeb,
        pedido.archivos
      );

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.RESERVED,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT,
        {},
        new Date()
      );

      const folder = asegurarCarpetaPedido_(idPedidoWeb, now);
      foto = guardarFoto_(fotoPreparada, folder);

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED,
        { photo: foto },
        new Date()
      );
    }

    if (!foto || !foto.foto_recibida) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_PHOTO_MISSING",
        "El ledger del pedido no conserva una fotografia valida."
      );
    }

    if (
      record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED ||
      record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT
    ) {
      fichaVisual = prepararFichaVisualSegura_(
        idPedidoWeb,
        pedido.archivos
      );
    }

    if (record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED) {
      const subject = construirAsunto_(idPedidoWeb, pedido);
      const body = construirCuerpoInterno_(
        idPedidoWeb,
        now,
        pedido,
        foto,
        fichaVisual
      );

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT,
        { visual_proof: summarizeOrderVisualProof_(fichaVisual) },
        new Date()
      );

      enviarEmailInterno_(
        subject,
        body,
        idPedidoWeb,
        pedido,
        foto,
        fichaVisual
      );

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT,
        {},
        new Date()
      );
    }

    if (record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT) {
      if (!fichaVisual) {
        fichaVisual = prepararFichaVisualSegura_(
          idPedidoWeb,
          pedido.archivos
        );
      }

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT,
        {},
        new Date()
      );

      enviarConfirmacionCliente_(
        idPedidoWeb,
        pedido,
        foto,
        fichaVisual
      );

      record = transitionOrderIdempotency_(
        idPedidoWeb,
        token,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT,
        TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_SENT,
        {},
        new Date()
      );
    }

    if (record.phase !== TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_SENT) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_UNEXPECTED_PHASE",
        "El pedido termino en una fase idempotente inesperada."
      );
    }

    const visualProof = record.visual_proof || {};
    const ack = {
      ok: true,
      id_pedido_web: idPedidoWeb,
      estado: "recibido",
      email_destino: CFG.DESTINO_PEDIDOS,
      enlace_drive: foto.enlace_drive || "",
      id_archivo_drive: foto.id_archivo_drive || "",
      nombre_archivo_foto: foto.nombre_archivo_foto || "",
      ficha_visual_recibida: !!visualProof.ficha_visual_recibida,
      estado_ficha_visual: visualProof.estado || "",
      nombre_archivo_ficha_visual: visualProof.nombre_archivo || "",
      version: versionPlantillaPedido_(pedido),
      script: CFG.VERSION_SCRIPT
    };

    transitionOrderIdempotency_(
      idPedidoWeb,
      token,
      TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_SENT,
      TAKARA_ORDER_IDEMPOTENCY_PHASE.COMPLETED,
      { ack: ack },
      new Date()
    );

    return orderBrowserResponseOrJson_(browserResponseRequest, ack);
  } catch (error) {
    const errorPayload = {
      ok: false,
      error: String(error && error.message ? error.message : error),
      error_code: String(error && error.code ? error.code : ""),
      version: CFG.VERSION_PLANTILLA,
      script: CFG.VERSION_SCRIPT
    };

    if (contactResponseRequest) {
      return contactBrowserResponseOrJson_(
        contactResponseRequest,
        errorPayload
      );
    }

    return orderBrowserResponseOrJson_(
      browserResponseRequest,
      errorPayload
    );
  } finally {
    if (
      idempotencyExecution &&
      idempotencyExecution.token &&
      idPedidoWeb
    ) {
      try {
        releaseOrderIdempotencyLease_(
          idPedidoWeb,
          idempotencyExecution.token,
          new Date()
        );
      } catch (releaseError) {
        console.error(
          "[TAKARA_ORDER_IDEMPOTENCY_RELEASE_ERROR]",
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

function parsePayload_(e) {
  if (!e) {
    throw new Error("No se recibieron datos.");
  }

  if (e.parameter && e.parameter.takara_payload_json !== undefined) {
    const embeddedPayload = String(e.parameter.takara_payload_json || "").trim();

    if (!embeddedPayload) {
      throw new Error("El formulario de pedido no contiene payload JSON.");
    }

    try {
      return JSON.parse(embeddedPayload);
    } catch (error) {
      throw new Error("El formulario de pedido contiene un payload JSON no válido.");
    }
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

/* ============================================================
   CONTACTO WEB
   Implementación en ContactService.gs; Code.gs conserva sólo routing HTTP.
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

/* ============================================================
   NORMALIZACIÓN Y VALIDACIÓN DE PEDIDO
   Implementación en OrderNormalization.gs y OrderValidation.gs.
   ============================================================ */

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

  if (
    text === "si" ||
    text === "s\u00ED" ||
    text === "true" ||
    text === "1"
  ) {
    return "s\u00ED";
  }

  return "no";
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
