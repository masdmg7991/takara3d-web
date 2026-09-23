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

function validarEntregaPedido_(entrega, totales) {
  if (!entrega || !entrega.contrato_activo) {
    return;
  }

  if (!entrega.valida) {
    throw new Error("El c\u00F3digo postal y la ubicaci\u00F3n de entrega no son compatibles.");
  }

  const declarada = entrega.declarada || {};
  const declaredTotals = totales && totales.declarado ? totales.declarado : {};
  const deliveryChecks = [
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
