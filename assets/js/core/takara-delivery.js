/* TAKARA DELIVERY CORE V2 */
(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TAKARA_DELIVERY_CORE_V2 = api;
  }
}(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERSION = "TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC";
  const CURRENCY = "EUR";
  const MODE_LOCAL = "entrega_local";
  const MODE_TRACKED = "envio_seguimiento";
  const STATUS_CONFIRMED = "confirmado";
  const STATUS_PENDING = "pendiente_confirmacion";
  const DECISION_AUTOMATIC = "codigo_postal_automatico";
  const DECISION_OFFICIAL_SELECTION = "seleccion_ubicacion_oficial";

  const AUTO_FREE_CODES = Object.freeze(["28911","28912","28913","28915","28916","28918","28919"]);
  const AUTO_NEARBY_BY_AREA = Object.freeze({"carabanchel":["28019","28025"],"getafe_villaverde":["28021"],"getafe":["28901","28902","28903","28904","28905","28906","28907","28909"],"alcorcon":["28921","28922","28923","28924"],"mostoles":["28931","28932","28933","28934","28935","28937","28938"],"alcorcon_mostoles":["28936"],"mostoles_fuenlabrada":["28942"],"fuenlabrada":["28943","28944","28945","28946","28947"]});
  const AREA_LABELS = Object.freeze({"carabanchel":"Carabanchel","getafe_villaverde":"Getafe / Villaverde","getafe":"Getafe","alcorcon":"Alcorcón","mostoles":"Móstoles","alcorcon_mostoles":"Alcorcón / Móstoles","mostoles_fuenlabrada":"Móstoles / Fuenlabrada","fuenlabrada":"Fuenlabrada"});
  const AMBIGUOUS_BY_POSTAL = Object.freeze({"28011":[{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_latina","label":"Latina (Madrid)","zone_code":"peninsula","zone_name":"Latina (Madrid)","area_code":"madrid_latina","mode":"envio_seguimiento","price_eur":6.5},{"code":"madrid_moncloa_aravaca","label":"Moncloa-Aravaca (Madrid)","zone_code":"peninsula","zone_name":"Moncloa-Aravaca (Madrid)","area_code":"madrid_moncloa_aravaca","mode":"envio_seguimiento","price_eur":6.5},{"code":"madrid_centro","label":"Centro (Madrid)","zone_code":"peninsula","zone_name":"Centro (Madrid)","area_code":"madrid_centro","mode":"envio_seguimiento","price_eur":6.5}],"28024":[{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_latina","label":"Latina (Madrid)","zone_code":"peninsula","zone_name":"Latina (Madrid)","area_code":"madrid_latina","mode":"envio_seguimiento","price_eur":6.5},{"code":"pozuelo_de_alarcon","label":"Pozuelo de Alarcón","zone_code":"peninsula","zone_name":"Pozuelo de Alarcón","area_code":"pozuelo_de_alarcon","mode":"envio_seguimiento","price_eur":6.5}],"28041":[{"code":"madrid_villaverde","label":"Villaverde (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Villaverde","area_code":"villaverde","mode":"entrega_local","price_eur":3.0},{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_usera","label":"Usera (Madrid)","zone_code":"peninsula","zone_name":"Usera (Madrid)","area_code":"madrid_usera","mode":"envio_seguimiento","price_eur":6.5},{"code":"madrid_puente_vallecas","label":"Puente de Vallecas (Madrid)","zone_code":"peninsula","zone_name":"Puente de Vallecas (Madrid)","area_code":"madrid_puente_vallecas","mode":"envio_seguimiento","price_eur":6.5}],"28044":[{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_latina","label":"Latina (Madrid)","zone_code":"peninsula","zone_name":"Latina (Madrid)","area_code":"madrid_latina","mode":"envio_seguimiento","price_eur":6.5}],"28047":[{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_latina","label":"Latina (Madrid)","zone_code":"peninsula","zone_name":"Latina (Madrid)","area_code":"madrid_latina","mode":"envio_seguimiento","price_eur":6.5}],"28054":[{"code":"leganes","label":"Leganés","zone_code":"leganes","zone_name":"Leganés","area_code":"leganes","mode":"entrega_local","price_eur":0.0},{"code":"madrid_carabanchel","label":"Carabanchel (Madrid)","zone_code":"madrid_sur_cercano","zone_name":"Carabanchel","area_code":"carabanchel","mode":"entrega_local","price_eur":3.0},{"code":"madrid_latina","label":"Latina (Madrid)","zone_code":"peninsula","zone_name":"Latina (Madrid)","area_code":"madrid_latina","mode":"envio_seguimiento","price_eur":6.5}],"28668":[{"code":"alcorcon","label":"Alcorcón","zone_code":"madrid_sur_cercano","zone_name":"Alcorcón","area_code":"alcorcon","mode":"entrega_local","price_eur":3.0},{"code":"boadilla_del_monte","label":"Boadilla del Monte","zone_code":"peninsula","zone_name":"Boadilla del Monte","area_code":"boadilla_del_monte","mode":"envio_seguimiento","price_eur":6.5}],"28670":[{"code":"alcorcon","label":"Alcorcón","zone_code":"madrid_sur_cercano","zone_name":"Alcorcón","area_code":"alcorcon","mode":"entrega_local","price_eur":3.0},{"code":"villaviciosa_de_odon","label":"Villaviciosa de Odón","zone_code":"peninsula","zone_name":"Villaviciosa de Odón","area_code":"villaviciosa_de_odon","mode":"envio_seguimiento","price_eur":6.5}],"28914":[{"code":"leganes","label":"Leganés","zone_code":"leganes","zone_name":"Leganés","area_code":"leganes","mode":"entrega_local","price_eur":0.0},{"code":"fuenlabrada","label":"Fuenlabrada","zone_code":"madrid_sur_cercano","zone_name":"Fuenlabrada","area_code":"fuenlabrada","mode":"entrega_local","price_eur":3.0}],"28917":[{"code":"leganes","label":"Leganés","zone_code":"leganes","zone_name":"Leganés","area_code":"leganes","mode":"entrega_local","price_eur":0.0},{"code":"alcorcon","label":"Alcorcón","zone_code":"madrid_sur_cercano","zone_name":"Alcorcón","area_code":"alcorcon","mode":"entrega_local","price_eur":3.0}],"28925":[{"code":"leganes","label":"Leganés","zone_code":"leganes","zone_name":"Leganés","area_code":"leganes","mode":"entrega_local","price_eur":0.0},{"code":"alcorcon","label":"Alcorcón","zone_code":"madrid_sur_cercano","zone_name":"Alcorcón","area_code":"alcorcon","mode":"entrega_local","price_eur":3.0},{"code":"madrid","label":"Madrid","zone_code":"peninsula","zone_name":"Madrid","area_code":"madrid","mode":"envio_seguimiento","price_eur":6.5}],"28939":[{"code":"mostoles","label":"Móstoles","zone_code":"madrid_sur_cercano","zone_name":"Móstoles","area_code":"mostoles","mode":"entrega_local","price_eur":3.0},{"code":"arroyomolinos","label":"Arroyomolinos","zone_code":"peninsula","zone_name":"Arroyomolinos","area_code":"arroyomolinos","mode":"envio_seguimiento","price_eur":6.5},{"code":"batres","label":"Batres","zone_code":"peninsula","zone_name":"Batres","area_code":"batres","mode":"envio_seguimiento","price_eur":6.5}],"28941":[{"code":"leganes","label":"Leganés","zone_code":"leganes","zone_name":"Leganés","area_code":"leganes","mode":"entrega_local","price_eur":0.0},{"code":"fuenlabrada","label":"Fuenlabrada","zone_code":"madrid_sur_cercano","zone_name":"Fuenlabrada","area_code":"fuenlabrada","mode":"entrega_local","price_eur":3.0}]});
  const SPECIAL_PREFIX_LABELS = Object.freeze({"07":"Baleares","35":"Las Palmas","38":"Santa Cruz de Tenerife","51":"Ceuta","52":"Melilla"});

  const PRICE_LOCAL_FREE = 0;
  const PRICE_LOCAL_NEARBY = 3;
  const PRICE_MAINLAND_TRACKED = 6.5;
  const FIXED_MAINLAND_MAX_QUANTITY = 1;

  function normalizePostalCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 5);
  }

  function normalizeLocationCode(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeQuantity(value) {
    const quantity = Number.parseInt(String(value || "1"), 10);
    if (!Number.isFinite(quantity) || quantity < 1) return 1;
    return Math.min(quantity, 20);
  }

  function isValidSpanishPostalCode(postalCode) {
    if (!/^\d{5}$/.test(postalCode)) return false;
    const prefix = Number.parseInt(postalCode.slice(0, 2), 10);
    return Number.isInteger(prefix) && prefix >= 1 && prefix <= 52;
  }

  function findAutomaticNearbyArea(postalCode) {
    const keys = Object.keys(AUTO_NEARBY_BY_AREA);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (AUTO_NEARBY_BY_AREA[key].indexOf(postalCode) >= 0) return key;
    }
    return "";
  }

  function cloneLocationOption(option) {
    return Object.freeze({
      code: option.code,
      label: option.label,
      zone_code: option.zone_code,
      zone_name: option.zone_name,
      area_code: option.area_code,
      mode: option.mode,
      price_eur: Number(option.price_eur).toFixed(2)
    });
  }

  function getLocationOptions(rawPostalCode) {
    const postalCode = normalizePostalCode(rawPostalCode);
    const options = AMBIGUOUS_BY_POSTAL[postalCode];
    if (!Array.isArray(options)) return Object.freeze([]);
    return Object.freeze(options.map(cloneLocationOption));
  }

  function baseInvalidClassification(postalCode, code) {
    return Object.freeze({
      valid: false,
      resolved: false,
      code: code,
      postal_code: postalCode,
      zone_code: "",
      zone_name: "",
      area_code: "",
      mode: "",
      price_eur: null,
      decision_source: "",
      location_required: false,
      location_code: "",
      location_name: "",
      location_options: Object.freeze([])
    });
  }

  function resolvedClassification(postalCode, data) {
    return Object.freeze({
      valid: true,
      resolved: true,
      code: "ok",
      postal_code: postalCode,
      zone_code: data.zone_code,
      zone_name: data.zone_name,
      area_code: data.area_code || "",
      mode: data.mode,
      price_eur: Number(data.price_eur).toFixed(2),
      decision_source: data.decision_source,
      location_required: Boolean(data.location_required),
      location_code: data.location_code || "",
      location_name: data.location_name || "",
      location_options: data.location_options || Object.freeze([])
    });
  }

  function classifyPostalCode(rawPostalCode, rawLocationCode) {
    const postalCode = normalizePostalCode(rawPostalCode);
    const locationCode = normalizeLocationCode(rawLocationCode);

    if (!postalCode) {
      return baseInvalidClassification("", "postal_vacio");
    }

    if (!isValidSpanishPostalCode(postalCode)) {
      return baseInvalidClassification(postalCode, "postal_invalido");
    }

    const locationOptions = getLocationOptions(postalCode);
    if (locationOptions.length > 0) {
      if (!locationCode) {
        return Object.freeze({
          valid: false,
          resolved: false,
          code: "ubicacion_requerida",
          postal_code: postalCode,
          zone_code: "",
          zone_name: "",
          area_code: "",
          mode: "",
          price_eur: null,
          decision_source: DECISION_OFFICIAL_SELECTION,
          location_required: true,
          location_code: "",
          location_name: "",
          location_options: locationOptions
        });
      }

      const selected = locationOptions.find(function (option) {
        return option.code === locationCode;
      });

      if (!selected) {
        return Object.freeze({
          valid: false,
          resolved: false,
          code: "ubicacion_invalida",
          postal_code: postalCode,
          zone_code: "",
          zone_name: "",
          area_code: "",
          mode: "",
          price_eur: null,
          decision_source: DECISION_OFFICIAL_SELECTION,
          location_required: true,
          location_code: locationCode,
          location_name: "",
          location_options: locationOptions
        });
      }

      return resolvedClassification(postalCode, {
        zone_code: selected.zone_code,
        zone_name: selected.zone_name,
        area_code: selected.area_code,
        mode: selected.mode,
        price_eur: selected.price_eur,
        decision_source: DECISION_OFFICIAL_SELECTION,
        location_required: true,
        location_code: selected.code,
        location_name: selected.label,
        location_options: locationOptions
      });
    }

    if (locationCode) {
      return Object.freeze({
        valid: false,
        resolved: false,
        code: "ubicacion_no_permitida",
        postal_code: postalCode,
        zone_code: "",
        zone_name: "",
        area_code: "",
        mode: "",
        price_eur: null,
        decision_source: DECISION_AUTOMATIC,
        location_required: false,
        location_code: locationCode,
        location_name: "",
        location_options: Object.freeze([])
      });
    }

    if (AUTO_FREE_CODES.indexOf(postalCode) >= 0) {
      return resolvedClassification(postalCode, {
        zone_code: "leganes",
        zone_name: "Leganés",
        area_code: "leganes",
        mode: MODE_LOCAL,
        price_eur: PRICE_LOCAL_FREE,
        decision_source: DECISION_AUTOMATIC,
        location_required: false,
        location_code: "",
        location_name: "Leganés"
      });
    }

    const nearbyArea = findAutomaticNearbyArea(postalCode);
    if (nearbyArea) {
      return resolvedClassification(postalCode, {
        zone_code: "madrid_sur_cercano",
        zone_name: AREA_LABELS[nearbyArea],
        area_code: nearbyArea,
        mode: MODE_LOCAL,
        price_eur: PRICE_LOCAL_NEARBY,
        decision_source: DECISION_AUTOMATIC,
        location_required: false,
        location_code: "",
        location_name: AREA_LABELS[nearbyArea]
      });
    }

    const prefix = postalCode.slice(0, 2);
    if (SPECIAL_PREFIX_LABELS[prefix]) {
      return resolvedClassification(postalCode, {
        zone_code: "destino_especial",
        zone_name: SPECIAL_PREFIX_LABELS[prefix],
        area_code: prefix,
        mode: MODE_TRACKED,
        price_eur: 0,
        decision_source: DECISION_AUTOMATIC,
        location_required: false,
        location_code: "",
        location_name: SPECIAL_PREFIX_LABELS[prefix]
      });
    }

    return resolvedClassification(postalCode, {
      zone_code: "peninsula",
      zone_name: "España peninsular",
      area_code: "",
      mode: MODE_TRACKED,
      price_eur: PRICE_MAINLAND_TRACKED,
      decision_source: DECISION_AUTOMATIC,
      location_required: false,
      location_code: "",
      location_name: ""
    });
  }

  function baseQuote(classification, valid, code, priceStatus, priceEur, customerText) {
    return Object.freeze({
      version: VERSION,
      valid: valid,
      code: code,
      requested_mode: classification.mode || "",
      mode: classification.mode || "",
      postal_code: classification.postal_code || "",
      zone_code: classification.zone_code || "",
      zone_name: classification.zone_name || "",
      area_code: classification.area_code || "",
      price_eur: priceEur,
      currency: CURRENCY,
      price_status: priceStatus,
      decision_source: classification.decision_source || "",
      location_required: Boolean(classification.location_required),
      location_code: classification.location_code || "",
      location_name: classification.location_name || "",
      location_options: classification.location_options || Object.freeze([]),
      full_address_requested: false,
      customer_text: customerText,
      suggestion: ""
    });
  }

  function invalidQuote(classification, code, message) {
    return baseQuote(classification, false, code, "invalido", null, message);
  }

  function pendingQuote(classification, code, message) {
    return baseQuote(classification, true, code, STATUS_PENDING, null, message);
  }

  function confirmedQuote(classification, message) {
    return baseQuote(
      classification,
      true,
      "ok",
      STATUS_CONFIRMED,
      classification.price_eur,
      message
    );
  }

  function quote(options) {
    const source = options || {};
    const quantity = normalizeQuantity(source.quantity);
    const classification = classifyPostalCode(source.postalCode, source.locationCode);

    if (!classification.valid) {
      if (classification.code === "postal_vacio") {
        return invalidQuote(classification, classification.code, "Introduce el código postal de entrega.");
      }
      if (classification.code === "postal_invalido") {
        return invalidQuote(classification, classification.code, "Introduce un código postal español válido de cinco cifras.");
      }
      if (classification.code === "ubicacion_requerida") {
        return invalidQuote(
          classification,
          classification.code,
          "Este código postal abarca varias zonas. Selecciona tu localidad o distrito."
        );
      }
      if (classification.code === "ubicacion_invalida") {
        return invalidQuote(
          classification,
          classification.code,
          "La localidad o distrito seleccionado no corresponde a este código postal."
        );
      }
      return invalidQuote(
        classification,
        classification.code,
        "La ubicación declarada no coincide con el código postal."
      );
    }

    if (classification.zone_code === "destino_especial") {
      return pendingQuote(
        classification,
        "destino_especial",
        "El envío a " + classification.zone_name + " se confirmará personalmente antes de fabricar."
      );
    }

    if (classification.mode === MODE_TRACKED && quantity > FIXED_MAINLAND_MAX_QUANTITY) {
      return pendingQuote(
        classification,
        "envio_multiple",
        "Para " + quantity + " unidades confirmaremos el coste de envío según el embalaje final."
      );
    }

    if (classification.zone_code === "leganes") {
      return confirmedQuote(
        classification,
        "Entrega local gratuita en Leganés. Acordaremos contigo el día y el lugar."
      );
    }

    if (classification.zone_code === "madrid_sur_cercano") {
      return confirmedQuote(
        classification,
        "Entrega local en " + classification.zone_name + " por 3,00 €. Acordaremos contigo el día y el lugar."
      );
    }

    return confirmedQuote(
      classification,
      "Envío estándar con seguimiento a España peninsular por 6,50 €."
    );
  }

  function toCents(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(String(value).replace(",", "."));
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.round(number * 100);
  }

  function centsToFixed(cents) {
    return (cents / 100).toFixed(2);
  }

  function calculateTotals(productSubtotalEur, deliveryQuote) {
    const productCents = toCents(productSubtotalEur);
    if (productCents === null) {
      throw new Error("No se ha podido calcular el subtotal del producto.");
    }

    const quoteValue = deliveryQuote || {};
    const deliveryCents = quoteValue.price_status === STATUS_CONFIRMED
      ? toCents(quoteValue.price_eur)
      : null;

    return Object.freeze({
      version: VERSION,
      product_eur: centsToFixed(productCents),
      delivery_eur: deliveryCents === null ? null : centsToFixed(deliveryCents),
      estimated_total_eur: deliveryCents === null
        ? null
        : centsToFixed(productCents + deliveryCents),
      currency: CURRENCY,
      total_status: deliveryCents === null ? STATUS_PENDING : STATUS_CONFIRMED
    });
  }

  function formatEuro(value) {
    const cents = toCents(value);
    if (cents === null) return "Pendiente de confirmar";
    return centsToFixed(cents).replace(".", ",") + " €";
  }

  return Object.freeze({
    version: VERSION,
    currency: CURRENCY,
    modes: Object.freeze({ local: MODE_LOCAL, tracked: MODE_TRACKED }),
    statuses: Object.freeze({ confirmed: STATUS_CONFIRMED, pending: STATUS_PENDING }),
    decisions: Object.freeze({
      automatic: DECISION_AUTOMATIC,
      officialSelection: DECISION_OFFICIAL_SELECTION
    }),
    policy: Object.freeze({
      local_free_eur: PRICE_LOCAL_FREE.toFixed(2),
      local_nearby_eur: PRICE_LOCAL_NEARBY.toFixed(2),
      mainland_tracked_eur: PRICE_MAINLAND_TRACKED.toFixed(2),
      fixed_mainland_max_quantity: FIXED_MAINLAND_MAX_QUANTITY,
      automatic_free_postal_codes: AUTO_FREE_CODES,
      automatic_nearby_postal_codes_by_area: AUTO_NEARBY_BY_AREA,
      area_labels: AREA_LABELS,
      ambiguous_postal_options: AMBIGUOUS_BY_POSTAL,
      special_prefix_labels: SPECIAL_PREFIX_LABELS
    }),
    normalizePostalCode: normalizePostalCode,
    normalizeLocationCode: normalizeLocationCode,
    getLocationOptions: getLocationOptions,
    classifyPostalCode: classifyPostalCode,
    quote: quote,
    calculateTotals: calculateTotals,
    formatEuro: formatEuro
  });
}));
