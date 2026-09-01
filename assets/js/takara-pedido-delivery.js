/* TAKARA PEDIDO DELIVERY UI V2.2 NATIONAL MUNICIPALITY */
(function () {
  "use strict";

  const PRODUCT_CODE = "MARCO_LITOFANIA_144X108";
  const SOURCE_AUTOMATIC = "cartociudad_automatico";
  const SOURCE_SELECTION = "cartociudad_seleccion";
  const SOURCE_MANUAL = "manual";
  const SOURCE_EMPTY = "sin_dato";
  const EXTRA_CODE_BY_SIDE_COUNT = Object.freeze({
    1: "personalizacion_texto_1_lado",
    2: "personalizacion_texto_2_lados",
    3: "personalizacion_texto_3_lados",
    4: "personalizacion_texto_4_lados"
  });

  function init() {
    const form = document.querySelector("[data-takara-pedido-form]");
    const panel = document.querySelector("[data-takara-delivery-panel]");
    const deliveryApi = window.TAKARA_DELIVERY_CORE_V2;
    const postalApi = window.TAKARA_POSTAL_NATIONAL_CORE_V1;

    if (!form || !panel || !deliveryApi || !postalApi) return;

    const state = {
      catalog: null,
      quote: null,
      totals: null,
      lastPostalCode: "",
      postalMap: null,
      postalMapPromise: null,
      municipalityStatus: "idle",
      municipalityPostalCode: "",
      municipalityResolution: null,
      municipalityLoadFailed: false
    };

    const nodes = {
      form: form,
      panel: panel,
      realMode: form.querySelector('[name="modalidad_entrega"]'),
      realPostal: form.querySelector('[name="codigo_postal_entrega"]'),
      realLocationCode: form.querySelector('[name="ubicacion_entrega_codigo"]'),
      realLocationName: form.querySelector('[name="ubicacion_entrega_nombre"]'),
      realInformativeLocality: form.querySelector('[name="localidad_entrega_informativa"]'),
      realMunicipalityCode: form.querySelector('[name="municipio_entrega_codigo"]'),
      realMunicipalityName: form.querySelector('[name="municipio_entrega_nombre"]'),
      realProvinceName: form.querySelector('[name="provincia_entrega_nombre"]'),
      realMunicipalitySource: form.querySelector('[name="municipio_entrega_fuente"]'),
      proxyPostal: panel.querySelector("[data-takara-delivery-postal]"),
      localityWrap: panel.querySelector("[data-takara-delivery-locality-wrap]"),
      localityLabel: panel.querySelector("[data-takara-delivery-locality-label]"),
      localityOptional: panel.querySelector("[data-takara-delivery-locality-optional]"),
      proxyLocality: panel.querySelector("[data-takara-delivery-locality]"),
      municipalityWrap: panel.querySelector("[data-takara-delivery-municipality-wrap]"),
      proxyMunicipality: panel.querySelector("[data-takara-delivery-municipality]"),
      locationWrap: panel.querySelector("[data-takara-delivery-location-wrap]"),
      proxyLocation: panel.querySelector("[data-takara-delivery-location]"),
      locationNote: panel.querySelector("[data-takara-delivery-location-note]"),
      status: panel.querySelector("[data-takara-delivery-status]"),
      product: panel.querySelector("[data-takara-delivery-product]"),
      personalization: panel.querySelector("[data-takara-delivery-personalization]"),
      delivery: panel.querySelector("[data-takara-delivery-price]"),
      total: panel.querySelector("[data-takara-delivery-total]"),
      quantity: panel.querySelector("[data-takara-delivery-quantity]"),
      localReview: panel.querySelector("[data-takara-local-review]")
    };

    if (
      !nodes.realMode ||
      !nodes.realPostal ||
      !nodes.realLocationCode ||
      !nodes.realLocationName ||
      !nodes.realInformativeLocality ||
      !nodes.realMunicipalityCode ||
      !nodes.realMunicipalityName ||
      !nodes.realProvinceName ||
      !nodes.realMunicipalitySource ||
      !nodes.proxyPostal ||
      !nodes.localityWrap ||
      !nodes.proxyLocality ||
      !nodes.municipalityWrap ||
      !nodes.proxyMunicipality ||
      !nodes.locationWrap ||
      !nodes.proxyLocation
    ) {
      return;
    }

    revealLocalReview(nodes);
    bindPostalBridge(nodes, state, deliveryApi, postalApi);
    bindInformativeLocalityBridge(nodes);
    bindMunicipalityBridge(nodes, state, deliveryApi, postalApi);
    bindLocationBridge(nodes, state, deliveryApi, postalApi);
    bindPriceRefresh(nodes, state, deliveryApi, postalApi);
    bindSubmitGuard(nodes, state, deliveryApi, postalApi);

    loadCatalog(state).then(function () {
      refresh(nodes, state, deliveryApi, postalApi, false);
    }).catch(function () {
      refresh(nodes, state, deliveryApi, postalApi, false);
    });

    refresh(nodes, state, deliveryApi, postalApi, false);

    window.TAKARA_DELIVERY_UI_V2 = Object.freeze({
      refresh: function () {
        return refresh(nodes, state, deliveryApi, postalApi, false);
      },
      validate: function () {
        return validate(nodes, state, deliveryApi, postalApi, true);
      },
      getQuote: function () {
        return state.quote;
      },
      getTotals: function () {
        return state.totals;
      },
      getMunicipalityResolution: function () {
        return state.municipalityResolution;
      }
    });
  }

  function loadCatalog(state) {
    const catalogApi = window.TAKARA_CATALOGO_CORE_V1;
    if (!catalogApi || typeof catalogApi.loadCatalog !== "function") {
      return Promise.reject(new Error("Catálogo no disponible"));
    }

    return catalogApi.loadCatalog().then(function (catalog) {
      state.catalog = catalog;
      return catalog;
    });
  }

  function revealLocalReview(nodes) {
    const host = window.location && window.location.hostname
      ? window.location.hostname.toLowerCase()
      : "";
    const local = host === "localhost" || host === "127.0.0.1" || host === "";
    if (nodes.localReview) nodes.localReview.hidden = !local;
  }

  function bindPostalBridge(nodes, state, deliveryApi, postalApi) {
    nodes.proxyPostal.value = deliveryApi.normalizePostalCode(nodes.realPostal.value);

    nodes.proxyPostal.addEventListener("input", function () {
      const normalized = deliveryApi.normalizePostalCode(nodes.proxyPostal.value);
      if (nodes.proxyPostal.value !== normalized) nodes.proxyPostal.value = normalized;

      if (state.lastPostalCode !== normalized) {
        resetPostalDependentFields(nodes, state);
      }
      state.lastPostalCode = normalized;

      nodes.realPostal.value = normalized;
      nodes.realPostal.dispatchEvent(new Event("input", { bubbles: true }));
      clearPostalValidity(nodes);
      clearLocationValidity(nodes);
      clearMunicipalityValidity(nodes);
      refresh(nodes, state, deliveryApi, postalApi, false);
    });

    nodes.proxyPostal.addEventListener("blur", function () {
      validate(nodes, state, deliveryApi, postalApi, false);
    });

    nodes.realPostal.addEventListener("input", function () {
      const normalized = deliveryApi.normalizePostalCode(nodes.realPostal.value);
      if (nodes.realPostal.value !== normalized) nodes.realPostal.value = normalized;
      if (nodes.proxyPostal.value !== normalized) nodes.proxyPostal.value = normalized;
      if (state.lastPostalCode !== normalized) {
        resetPostalDependentFields(nodes, state);
      }
      state.lastPostalCode = normalized;
      refresh(nodes, state, deliveryApi, postalApi, false);
    });
  }

  function bindInformativeLocalityBridge(nodes) {
    nodes.proxyLocality.value = normalizeInformativeLocality(
      nodes.realInformativeLocality.value,
      false
    );

    nodes.proxyLocality.addEventListener("input", function () {
      if (nodes.proxyLocality.readOnly) return;
      const normalized = normalizeInformativeLocality(nodes.proxyLocality.value, false);
      if (nodes.proxyLocality.value !== normalized) nodes.proxyLocality.value = normalized;
      nodes.realInformativeLocality.value = normalized;
      clearMunicipalityFields(nodes);
      nodes.realMunicipalitySource.value = normalized ? SOURCE_MANUAL : SOURCE_EMPTY;
    });

    nodes.proxyLocality.addEventListener("blur", function () {
      if (nodes.proxyLocality.readOnly) return;
      const normalized = normalizeInformativeLocality(nodes.proxyLocality.value, true);
      nodes.proxyLocality.value = normalized;
      nodes.realInformativeLocality.value = normalized;
      nodes.realMunicipalitySource.value = normalized ? SOURCE_MANUAL : SOURCE_EMPTY;
    });
  }

  function bindMunicipalityBridge(nodes, state, deliveryApi, postalApi) {
    nodes.proxyMunicipality.addEventListener("change", function () {
      syncNationalMunicipalityFields(nodes, state);
      clearMunicipalityValidity(nodes);
      refresh(nodes, state, deliveryApi, postalApi, false);
    });
  }

  function normalizeInformativeLocality(value, trimEnds) {
    let text = String(value || "").replace(/\s+/g, " ");
    text = trimEnds ? text.trim() : text.replace(/^\s+/, "");
    return Array.from(text).slice(0, 80).join("");
  }

  function bindLocationBridge(nodes, state, deliveryApi, postalApi) {
    nodes.proxyLocation.addEventListener("change", function () {
      syncLocationFields(nodes, deliveryApi);
      clearLocationValidity(nodes);
      refresh(nodes, state, deliveryApi, postalApi, false);
    });
  }

  function bindPriceRefresh(nodes, state, deliveryApi, postalApi) {
    document.addEventListener("input", function (event) {
      if (!event.target) return;
      if (
        event.target.matches('[name="cantidad"]') ||
        event.target.matches("[data-takara-contact-proxy=\"cantidad\"]") ||
        event.target.matches("[data-takara-frame-text-input]") ||
        event.target.matches("[data-takara-frame-text-switch]") ||
        event.target.matches("[name=\"color_texto_marco\"]")
      ) {
        window.setTimeout(function () {
          refresh(nodes, state, deliveryApi, postalApi, false);
        }, 0);
      }
    }, true);

    document.addEventListener("change", function (event) {
      if (!event.target) return;
      if (
        event.target.matches('[name="cantidad"]') ||
        event.target.matches("[data-takara-contact-proxy=\"cantidad\"]") ||
        event.target.matches("[data-takara-frame-text-side]") ||
        event.target.matches("[data-takara-frame-text-switch]")
      ) {
        window.setTimeout(function () {
          refresh(nodes, state, deliveryApi, postalApi, false);
        }, 0);
      }
    }, true);
  }

  function bindSubmitGuard(nodes, state, deliveryApi, postalApi) {
    nodes.form.addEventListener("submit", function (event) {
      if (!validate(nodes, state, deliveryApi, postalApi, true)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  function getQuantity(nodes) {
    const real = nodes.form.querySelector('[name="cantidad"]');
    const value = real ? Number.parseInt(String(real.value || "1"), 10) : 1;
    if (!Number.isFinite(value) || value < 1) return 1;
    return Math.min(value, 20);
  }

  function getProduct(nodes, state) {
    const catalog = state.catalog;
    if (!catalog || !Array.isArray(catalog.productos)) return null;
    return catalog.productos.find(function (product) {
      return product && product.codigo === PRODUCT_CODE;
    }) || null;
  }

  function getPersonalizationCount(nodes) {
    const field = nodes.form.querySelector('[name="personalizacion_marco"]');
    const raw = field && typeof field.value === "string" ? field.value.trim() : "";
    if (!raw) return 0;

    try {
      const parsed = JSON.parse(raw);
      const count = Number(parsed && parsed.numero_lados);
      return Number.isInteger(count) && count >= 1 && count <= 4 ? count : 0;
    } catch (error) {
      return 0;
    }
  }

  function getPricing(nodes, state) {
    const product = getProduct(nodes, state);
    const base = product ? Number(product.precio_base_eur) : 35;
    const quantity = getQuantity(nodes);
    const sideCount = getPersonalizationCount(nodes);
    let supplement = 0;

    if (product && sideCount > 0 && Array.isArray(product.extras)) {
      const extraCode = EXTRA_CODE_BY_SIDE_COUNT[sideCount];
      const extra = product.extras.find(function (item) {
        return item && item.codigo === extraCode && item.estado === "activo";
      });
      supplement = extra ? Number(extra.precio_extra_eur) : 0;
    }

    const safeBase = Number.isFinite(base) && base >= 0 ? base : 35;
    const safeSupplement = Number.isFinite(supplement) && supplement >= 0 ? supplement : 0;
    const unit = safeBase + safeSupplement;

    return {
      base: safeBase,
      sideCount: sideCount,
      supplement: safeSupplement,
      unit: unit,
      quantity: quantity,
      productSubtotal: unit * quantity
    };
  }

  function updateCommercialLocationOptions(nodes, state, deliveryApi, postalCode) {
    const options = deliveryApi.getLocationOptions(postalCode);
    const previous = deliveryApi.normalizeLocationCode(nodes.proxyLocation.value);

    while (nodes.proxyLocation.firstChild) {
      nodes.proxyLocation.removeChild(nodes.proxyLocation.firstChild);
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona tu localidad o distrito";
    nodes.proxyLocation.appendChild(placeholder);

    options.forEach(function (option) {
      const node = document.createElement("option");
      node.value = option.code;
      node.textContent = option.label;
      nodes.proxyLocation.appendChild(node);
    });

    const previousStillValid = options.some(function (option) {
      return option.code === previous;
    });
    nodes.proxyLocation.value = previousStillValid ? previous : "";

    const required = options.length > 0;
    nodes.locationWrap.hidden = !required;
    nodes.proxyLocation.disabled = !required;

    if (!required) {
      clearLocation(nodes);
      return false;
    }

    state.municipalityStatus = "commercial";
    state.municipalityResolution = null;
    hideNationalMunicipalityControls(nodes);
    clearMunicipalityFields(nodes);
    clearInformativeLocality(nodes);
    setLocationNote(
      nodes,
      "Este código postal abarca varias zonas comerciales. Confirma la localidad o el distrito para calcular la tarifa correcta."
    );
    syncLocationFields(nodes, deliveryApi);
    return true;
  }

  function updateNationalMunicipality(nodes, state, postalApi, postalCode) {
    if (postalCode.length !== 5) {
      state.municipalityStatus = "idle";
      state.municipalityResolution = null;
      showManualLocality(nodes, {
        value: "",
        readOnly: true,
        label: "Localidad o municipio",
        optional: false,
        placeholder: "Se completará al introducir el código postal"
      });
      setLocationNote(nodes, "");
      return;
    }

    if (state.postalMap) {
      applyNationalResolution(nodes, state, postalApi.resolve(state.postalMap, postalCode));
      return;
    }

    if (state.municipalityLoadFailed) {
      applyManualFallback(nodes, state, "mapa_no_disponible");
      return;
    }

    if (
      state.municipalityStatus === "loading" &&
      state.municipalityPostalCode === postalCode
    ) {
      return;
    }

    state.municipalityStatus = "loading";
    state.municipalityPostalCode = postalCode;
    state.municipalityResolution = null;
    showManualLocality(nodes, {
      value: "",
      readOnly: true,
      label: "Municipio",
      optional: false,
      placeholder: "Buscando municipio…"
    });
    setLocationNote(nodes, "Consultando la información postal local…");

    if (!state.postalMapPromise) {
      state.postalMapPromise = postalApi.loadMap().then(function (map) {
        state.postalMap = map;
        state.municipalityLoadFailed = false;
        return map;
      }).catch(function () {
        state.municipalityLoadFailed = true;
        return null;
      });
    }

    state.postalMapPromise.then(function (map) {
      const currentPostal = postalApi.normalizePostalCode(nodes.realPostal.value);
      if (currentPostal !== postalCode || deliveryHasCommercialOptions(nodes, currentPostal)) return;
      if (map) {
        applyNationalResolution(nodes, state, postalApi.resolve(map, currentPostal));
      } else {
        applyManualFallback(nodes, state, "mapa_no_disponible");
      }
    });
  }

  function deliveryHasCommercialOptions(nodes, postalCode) {
    const deliveryApi = window.TAKARA_DELIVERY_CORE_V2;
    return Boolean(deliveryApi && deliveryApi.getLocationOptions(postalCode).length > 0);
  }

  function applyNationalResolution(nodes, state, resolution) {
    state.municipalityResolution = resolution;
    state.municipalityPostalCode = resolution.postal_code;

    if (resolution.status === "automatic") {
      state.municipalityStatus = "automatic";
      const option = resolution.selected;
      setMunicipalityFields(nodes, option, SOURCE_AUTOMATIC);
      showManualLocality(nodes, {
        value: option.municipality,
        readOnly: true,
        label: "Municipio detectado",
        optional: false,
        placeholder: ""
      });
      setLocationNote(nodes, option.province ? "Provincia: " + option.province : "");
      return;
    }

    if (resolution.status === "selection") {
      state.municipalityStatus = "selection";
      showNationalMunicipalitySelect(nodes, resolution.options);
      setLocationNote(
        nodes,
        "Este código postal corresponde a varios municipios. Selecciona el correcto; la tarifa seguirá calculándose automáticamente."
      );
      return;
    }

    applyManualFallback(nodes, state, resolution.reason || "sin_cobertura");
  }

  function applyManualFallback(nodes, state, reason) {
    state.municipalityStatus = "manual";
    state.municipalityResolution = Object.freeze({
      status: "manual",
      reason: reason,
      options: Object.freeze([])
    });
    clearMunicipalityFields(nodes);
    nodes.realMunicipalitySource.value = nodes.realInformativeLocality.value
      ? SOURCE_MANUAL
      : SOURCE_EMPTY;
    showManualLocality(nodes, {
      value: nodes.realInformativeLocality.value,
      readOnly: false,
      label: "Localidad o municipio",
      optional: true,
      placeholder: "Por ejemplo, Zaragoza"
    });
    setLocationNote(
      nodes,
      reason === "revision_interprovincial"
        ? "Este código postal necesita revisión entre provincias. Puedes indicar la localidad, pero no es obligatorio para enviar la solicitud."
        : "Puedes indicar la localidad para ayudarnos a ubicar el pedido, pero no es obligatorio."
    );
  }

  function showManualLocality(nodes, options) {
    nodes.locationWrap.hidden = true;
    nodes.proxyLocation.disabled = true;
    nodes.municipalityWrap.hidden = true;
    nodes.proxyMunicipality.disabled = true;
    nodes.localityWrap.hidden = false;
    nodes.proxyLocality.disabled = false;
    nodes.proxyLocality.readOnly = Boolean(options.readOnly);
    nodes.proxyLocality.value = options.value || "";
    nodes.proxyLocality.placeholder = options.placeholder || "";
    nodes.proxyLocality.setAttribute("aria-readonly", options.readOnly ? "true" : "false");
    if (nodes.localityLabel) nodes.localityLabel.textContent = options.label;
    if (nodes.localityOptional) nodes.localityOptional.hidden = !options.optional;
  }

  function showNationalMunicipalitySelect(nodes, options) {
    nodes.locationWrap.hidden = true;
    nodes.proxyLocation.disabled = true;
    nodes.localityWrap.hidden = true;
    nodes.proxyLocality.disabled = true;
    nodes.municipalityWrap.hidden = false;
    nodes.proxyMunicipality.disabled = false;

    const previous = String(nodes.proxyMunicipality.value || "");
    while (nodes.proxyMunicipality.firstChild) {
      nodes.proxyMunicipality.removeChild(nodes.proxyMunicipality.firstChild);
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona tu municipio";
    nodes.proxyMunicipality.appendChild(placeholder);

    options.forEach(function (option) {
      const node = document.createElement("option");
      node.value = option.code;
      node.textContent = option.label;
      nodes.proxyMunicipality.appendChild(node);
    });

    const previousStillValid = options.some(function (option) {
      return option.code === previous;
    });
    nodes.proxyMunicipality.value = previousStillValid ? previous : "";
    syncNationalMunicipalityFields(nodes, {
      municipalityResolution: Object.freeze({ options: Object.freeze(options) })
    });
  }

  function hideNationalMunicipalityControls(nodes) {
    nodes.localityWrap.hidden = true;
    nodes.proxyLocality.disabled = true;
    nodes.municipalityWrap.hidden = true;
    nodes.proxyMunicipality.disabled = true;
  }

  function syncNationalMunicipalityFields(nodes, state) {
    const options = state.municipalityResolution && state.municipalityResolution.options
      ? state.municipalityResolution.options
      : [];
    const code = String(nodes.proxyMunicipality.value || "");
    const selected = options.find(function (option) {
      return option.code === code;
    });

    if (!selected) {
      clearMunicipalityFields(nodes);
      clearInformativeLocality(nodes);
      return;
    }

    setMunicipalityFields(nodes, selected, SOURCE_SELECTION);
  }

  function setMunicipalityFields(nodes, option, source) {
    nodes.realMunicipalityCode.value = option.code || "";
    nodes.realMunicipalityName.value = option.municipality || "";
    nodes.realProvinceName.value = option.province || "";
    nodes.realMunicipalitySource.value = source || "";
    nodes.realInformativeLocality.value = option.municipality || "";
    nodes.proxyLocality.value = option.municipality || "";
  }

  function clearMunicipalityFields(nodes) {
    nodes.realMunicipalityCode.value = "";
    nodes.realMunicipalityName.value = "";
    nodes.realProvinceName.value = "";
    nodes.realMunicipalitySource.value = "";
  }

  function clearInformativeLocality(nodes) {
    nodes.proxyLocality.value = "";
    nodes.realInformativeLocality.value = "";
  }

  function setLocationNote(nodes, message) {
    if (!nodes.locationNote) return;
    nodes.locationNote.textContent = message || "";
    nodes.locationNote.hidden = !message;
  }

  function syncLocationFields(nodes, deliveryApi) {
    const postalCode = deliveryApi.normalizePostalCode(nodes.realPostal.value);
    const locationCode = deliveryApi.normalizeLocationCode(nodes.proxyLocation.value);
    const options = deliveryApi.getLocationOptions(postalCode);
    const selected = options.find(function (option) {
      return option.code === locationCode;
    });

    nodes.realLocationCode.value = selected ? selected.code : "";
    nodes.realLocationName.value = selected ? selected.label : "";
  }

  function clearLocation(nodes) {
    nodes.proxyLocation.value = "";
    nodes.realLocationCode.value = "";
    nodes.realLocationName.value = "";
  }

  function resetPostalDependentFields(nodes, state) {
    clearLocation(nodes);
    clearMunicipalityFields(nodes);
    clearInformativeLocality(nodes);
    nodes.proxyMunicipality.value = "";
    state.municipalityStatus = "idle";
    state.municipalityPostalCode = "";
    state.municipalityResolution = null;
  }

  function syncDerivedDelivery(nodes, quote) {
    nodes.realMode.value = quote && quote.valid ? quote.mode : "";
    if (quote && quote.location_required) {
      nodes.realLocationCode.value = quote.location_code || "";
      nodes.realLocationName.value = quote.location_name || "";
    }
  }

  function refresh(nodes, state, deliveryApi, postalApi, announce) {
    const postalCode = deliveryApi.normalizePostalCode(nodes.realPostal.value);
    const pricing = getPricing(nodes, state);
    const commercial = updateCommercialLocationOptions(nodes, state, deliveryApi, postalCode);

    if (!commercial) {
      updateNationalMunicipality(nodes, state, postalApi, postalCode);
    }

    const quote = deliveryApi.quote({
      postalCode: postalCode,
      locationCode: nodes.realLocationCode.value,
      quantity: pricing.quantity
    });
    const totals = quote.valid
      ? deliveryApi.calculateTotals(pricing.productSubtotal, quote)
      : null;

    state.quote = quote;
    state.totals = totals;

    syncDerivedDelivery(nodes, quote);
    renderPricing(nodes, pricing, quote, totals, deliveryApi);
    renderStatus(nodes, quote, announce);
    return quote;
  }

  function renderPricing(nodes, pricing, quote, totals, deliveryApi) {
    if (nodes.product) {
      nodes.product.textContent = deliveryApi.formatEuro(pricing.base * pricing.quantity);
    }

    if (nodes.personalization) {
      nodes.personalization.textContent = pricing.sideCount > 0
        ? "+" + deliveryApi.formatEuro(pricing.supplement * pricing.quantity)
        : "Sin personalización";
    }

    if (nodes.quantity) {
      nodes.quantity.textContent = pricing.quantity === 1
        ? "1 unidad"
        : pricing.quantity + " unidades";
    }

    if (nodes.delivery) {
      nodes.delivery.textContent = quote.valid
        ? deliveryApi.formatEuro(quote.price_eur)
        : "—";
    }

    if (nodes.total) {
      nodes.total.textContent = totals
        ? deliveryApi.formatEuro(totals.estimated_total_eur)
        : "—";
    }
  }

  function renderStatus(nodes, quote, announce) {
    if (!nodes.status) return;

    let message = "Introduce tu código postal para calcular automáticamente la entrega.";
    let status = "neutral";

    if (quote.code === "ubicacion_requerida") {
      message = quote.customer_text;
      status = "pending";
    } else if (quote.valid) {
      message = quote.customer_text;
      status = quote.price_status === "confirmado" ? "success" : "pending";
    } else if (quote.code !== "postal_vacio") {
      message = quote.customer_text;
      status = "error";
    }

    nodes.status.textContent = message;
    nodes.status.setAttribute("data-state", status);
    nodes.status.setAttribute("role", announce ? "alert" : "status");
  }

  function validate(nodes, state, deliveryApi, postalApi, showMessage) {
    const quote = refresh(nodes, state, deliveryApi, postalApi, showMessage);
    clearPostalValidity(nodes);
    clearLocationValidity(nodes);
    clearMunicipalityValidity(nodes);

    if (quote.code === "postal_vacio" || quote.code === "postal_invalido") {
      nodes.proxyPostal.setCustomValidity(quote.customer_text);
      nodes.realPostal.setCustomValidity(quote.customer_text);
      if (showMessage) reportField(nodes.proxyPostal);
      return false;
    }

    if (quote.code === "ubicacion_requerida" || quote.code === "ubicacion_invalida") {
      nodes.proxyLocation.setCustomValidity(quote.customer_text);
      if (showMessage) reportField(nodes.proxyLocation);
      return false;
    }

    if (state.municipalityStatus === "loading") {
      const message = "Espera un instante mientras identificamos el municipio.";
      nodes.proxyPostal.setCustomValidity(message);
      nodes.realPostal.setCustomValidity(message);
      if (showMessage) reportField(nodes.proxyPostal);
      return false;
    }

    if (state.municipalityStatus === "selection" && !nodes.realMunicipalityCode.value) {
      const message = "Selecciona el municipio correspondiente a este código postal.";
      nodes.proxyMunicipality.setCustomValidity(message);
      if (showMessage) reportField(nodes.proxyMunicipality);
      return false;
    }

    if (!quote.valid) {
      nodes.proxyPostal.setCustomValidity(quote.customer_text);
      nodes.realPostal.setCustomValidity(quote.customer_text);
      if (showMessage) reportField(nodes.proxyPostal);
      return false;
    }

    return true;
  }

  function clearPostalValidity(nodes) {
    nodes.proxyPostal.setCustomValidity("");
    nodes.realPostal.setCustomValidity("");
  }

  function clearLocationValidity(nodes) {
    nodes.proxyLocation.setCustomValidity("");
  }

  function clearMunicipalityValidity(nodes) {
    nodes.proxyMunicipality.setCustomValidity("");
  }

  function reportField(field) {
    if (!field) return;
    if (typeof field.focus === "function") field.focus({ preventScroll: false });
    if (typeof field.reportValidity === "function") field.reportValidity();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
