/* TAKARA PEDIDOS GMAIL V1 */
(function () {
  "use strict";

  const MAX_FILE_MB = 20;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
  const PRODUCT_CODE = "MARCO_LITOFANIA_144X108";
  const DISPLAY_PRICE_EUR = "";
  const ORDER_PAYLOAD_VERSION = "TAKARA_WEB_ORDER_PAYLOAD_V1";
  const ORDER_ID_PREFIX = "TK-WEB";
  const FRAME_TEXT_VERSION = "TAKARA_FRAME_TEXT_V1_4";
  const FRAME_TEXT_SIDES = Object.freeze(["top", "right", "bottom", "left"]);
  const FRAME_TEXT_GEOMETRY_BY_FORMAT = Object.freeze({
    vertical: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
    horizontal: "FRAME_TEXT_GEOMETRY_HORIZONTAL_V1"
  });
  const FRAME_TEXT_PRICE_BY_SIDE_COUNT = Object.freeze({
    1: "4.00",
    2: "6.00",
    3: "8.00",
    4: "8.00"
  });
  const FRAME_TEXT_EXTRA_CODE_BY_COUNT = Object.freeze({
    1: "personalizacion_texto_1_lado",
    2: "personalizacion_texto_2_lados",
    3: "personalizacion_texto_3_lados",
    4: "personalizacion_texto_4_lados"
  });
  const VISUAL_PROOF_VERSION = "TAKARA_ORDER_VISUAL_PROOF_V1";
  const VISUAL_PROOF_MAX_EDGE_PX = 960;
  const VISUAL_PROOF_MAX_BYTES = 900 * 1024;
  const VISUAL_PROOF_JPEG_QUALITY = 0.86;
  const VISUAL_PROOF_READY_TIMEOUT_MS = 2000;

  const COLOR_LABELS = {
    actual: "Madera clara",
    rosewood: "Rosewood",
    ebano: "Ébano",
    negro: "Negro",
    "blanco-mate": "Blanco mate"
  };

  const FORMAT_META = {
    vertical: {
      formato: "Marco vertical",
      medida: "108 x 144 mm"
    },
    horizontal: {
      formato: "Marco horizontal",
      medida: "144 x 108 mm"
    }
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    const form = document.querySelector("[data-takara-pedido-form][data-takara-pedido-web-v1]");
    if (!form) return;

    configurarTelefonos();
    document.addEventListener("input", filtrarTelefono, true);

    form.addEventListener("submit", handleSubmit, true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const submitButton = form.querySelector("[data-takara-pedido-submit]");
    const endpoint = form.getAttribute("data-takara-endpoint") || "";
    const statusNode = form.querySelector("[data-takara-pedido-status]");

    try {
      setBusy(submitButton, true);
      setStatus(statusNode, "Preparando solicitud...", "info");

      if (!endpoint || endpoint.indexOf("https://script.google.com/macros/s/") !== 0) {
        throw new Error("No está configurado el endpoint de pedidos.");
      }

      const basePayload = await buildPayload(form);
      const payload = await enrichPayloadWithCatalogSnapshot(basePayload);

      if (isDryRunEnabled()) {
        persistDryRunPayload(payload);
        setStatus(
          statusNode,
          "Modo prueba local: payload generado correctamente sin enviar al endpoint.",
          "success"
        );
        return;
      }

      setStatus(statusNode, "Enviando solicitud a Takara 3D...", "info");

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      setStatus(
        statusNode,
        "Solicitud transmitida. La recepción quedará confirmada cuando recibas el correo automático de Takara 3D. Si no lo recibes, los datos siguen en pantalla para que puedas revisarlos o volver a intentarlo.",
        "success"
      );
    } catch (error) {
      setStatus(statusNode, error && error.message ? error.message : "No se pudo enviar la solicitud.", "error");
    } finally {
      setBusy(submitButton, false);
    }
  }


  /* TAKARA PEDIDO CONTACT CONTRACT V2 START */
  function esCampoTelefono(node) {
    if (!node || typeof node.getAttribute !== "function") return false;

    return (
      node.getAttribute("name") === "whatsapp" ||
      node.getAttribute("data-takara-contact-proxy") === "telefono"
    );
  }

  function soloDigitos(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 15);
  }

  function configurarTelefonos() {
    const fields = document.querySelectorAll(
      '[name="whatsapp"], [data-takara-contact-proxy="telefono"]'
    );

    fields.forEach(function (field) {
      field.setAttribute("inputmode", "numeric");
      field.setAttribute("pattern", "[0-9]{9,15}");
      field.setAttribute("minlength", "9");
      field.setAttribute("maxlength", "15");
      field.setAttribute("required", "");
      field.setAttribute("aria-required", "true");
      field.value = soloDigitos(field.value);
    });
  }

  function filtrarTelefono(event) {
    const field = event && event.target;
    if (!esCampoTelefono(field)) return;

    const digits = soloDigitos(field.value);
    if (field.value !== digits) field.value = digits;
  }

  function telefonoValido(value) {
    return /^[0-9]{9,15}$/.test(String(value || ""));
  }

  function emailValido(value) {
    if (!value || value.length > 254) return false;

    const partes = value.split("@");
    if (partes.length !== 2) return false;

    const local = partes[0];
    const dominio = partes[1];

    if (!local || local.length > 64) return false;
    if (local.charAt(0) === "." || local.charAt(local.length - 1) === ".") return false;
    if (local.indexOf("..") !== -1) return false;
    if (!/^[a-z0-9!#$%&*+/=?^_{}|~.-]+$/i.test(local)) return false;

    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(dominio);
  }
  /* TAKARA PEDIDO CONTACT CONTRACT V2 END */

  function getTakaraCore(name) {
    const api = window[name];

    if (!api) {
      throw new Error("No se ha cargado el módulo " + name + ". No se puede enviar el pedido.");
    }

    return api;
  }

  async function loadCatalogForPedido() {
    const catalogApi = getTakaraCore("TAKARA_CATALOGO_CORE_V1");
    return catalogApi.loadCatalog();
  }

  function normalizeVariantCode(value) {
    const text = String(value || "").toLowerCase();

    if (text === "horizontal") {
      return "horizontal";
    }

    return "vertical";
  }

  function enrichPayloadWithCatalogSnapshot(payload) {
    return loadCatalogForPedido().then(function (catalog) {
      const snapshotApi = getTakaraCore("TAKARA_ORDER_SNAPSHOT_V1");

      const producto = payload.producto || {};
      const cliente = payload.cliente || {};
      const personalizacionMarco = producto.personalizacion_marco || null;
      const extraCodes = personalizacionMarco
        ? [FRAME_TEXT_EXTRA_CODE_BY_COUNT[personalizacionMarco.numero_lados]]
        : [];

      const baseSnapshot = snapshotApi.build({
        catalog: catalog,
        selection: {
          product_code: PRODUCT_CODE,
          variant_code: normalizeVariantCode(producto.orientacion),
          extra_codes: extraCodes,
          quantity: producto.cantidad || 1
        },
        cliente: cliente,
        archivos: payload.archivos || {},
        mensaje_cliente: payload.mensaje_cliente || "",
        meta: payload.meta || {}
      });

      const snapshot = Object.assign({}, baseSnapshot, {
        producto: Object.assign({}, baseSnapshot.producto, {
          personalizacion_marco: personalizacionMarco
        })
      });

      payload.snapshot_pedido = createPhotoBase64SafeCopy(snapshot);
      payload.producto = Object.assign({}, producto, {
        producto: snapshot.producto.producto,
        codigo_producto: snapshot.producto.codigo_producto,
        variante_codigo: snapshot.producto.variante_codigo,
        formato: snapshot.producto.formato,
        orientacion: snapshot.producto.orientacion,
        medida: snapshot.producto.medida,
        extras: snapshot.producto.extras,
        cantidad: snapshot.producto.cantidad,
        moneda: snapshot.producto.moneda,
        precio_base_eur: snapshot.producto.precio_base_eur,
        precio_variante_eur: snapshot.producto.precio_variante_eur,
        precio_extras_eur: snapshot.producto.precio_extras_eur,
        precio_unitario_final_eur: snapshot.producto.precio_unitario_final_eur,
        precio_total_eur: snapshot.producto.precio_total_eur,
        precio_mostrado_eur: snapshot.producto.precio_unitario_final_eur,
        origen_precio: snapshot.origen_precio,
        catalog_version: snapshot.catalog_version,
        pricing_version: snapshot.pricing_version,
        personalizacion_marco: personalizacionMarco
      });

      return payload;
    });
  }

  async function buildPayload(form) {
    const photoInput = form.querySelector("[data-takara-photo-input]");
    const file = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;

    const nombre = value(form, "nombre");
    const email = value(form, "email");
    const telefono = soloDigitos(value(form, "whatsapp"));
    const contactoPreferido = "";
    const cantidad = normalizeQuantity(value(form, "cantidad"));
    const formatoKey = normalizeFormat(value(form, "formato"));
    const formatoMeta = FORMAT_META[formatoKey];
    const paginaOrigen = getPageOrigin();
    const entorno = getEnvironment();
    const colorKey = checkedValue(form, "color_marco") || "actual";
    const colorMarco = COLOR_LABELS[colorKey] || COLOR_LABELS.actual;
    const personalizacionMarco = parseFrameTextPersonalization(
      value(form, "personalizacion_marco"),
      formatoKey
    );
    const notas = value(form, "notas");
    const aceptaContacto = isChecked(form, "acepta_contacto");
    const aceptaRevision = isChecked(form, "acepta_revision");
    const autorizaPublicacionResultado = isChecked(
      form,
      "autoriza_publicacion_resultado"
    );
    const pedidoWebId = createPedidoWebId();
    const creadoEnIso = new Date().toISOString();

    if (!nombre) {
      throw new Error("Falta tu nombre. Completa el campo Nombre para poder enviar la solicitud.");
    }

    if (!telefono) {
      throw new Error("Falta el tel\u00e9fono. Completa el campo Tel\u00e9fono / WhatsApp para poder enviar la solicitud.");
    }

    if (!telefonoValido(telefono)) {
      throw new Error("Introduce un tel\u00e9fono v\u00e1lido de entre 9 y 15 cifras, solo con n\u00fameros.");
    }

    if (!email) {
      throw new Error("Falta el correo electr\u00f3nico. Completa el campo Email para poder enviar la solicitud.");
    }

    if (!emailValido(email)) {
      throw new Error("Introduce un correo electr\u00f3nico v\u00e1lido, por ejemplo nombre@gmail.com.");
    }

    if (!file) {
      throw new Error("Falta la foto. Sube una imagen para que podamos revisar la litofanía.");
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error("La foto supera el máximo permitido de 20 MB.");
    }

    if (!isAllowedImage(file)) {
      throw new Error("Formato de foto no válido. Usa JPG, PNG o WEBP.");
    }

    if (!aceptaContacto) {
      throw new Error("Marca la casilla de datos de contacto para que podamos gestionar tu solicitud.");
    }

    if (!aceptaRevision) {
      throw new Error("Marca la casilla de imagen enviada para confirmar que podemos revisar la foto.");
    }

    const photoBase64 = await readFileAsDataUrl(file);
    const visualProof = await createVisualProofSafe(pedidoWebId, file.name);

    return {
      payload_version: ORDER_PAYLOAD_VERSION,
      pedido_web_id: pedidoWebId,
      creado_en_iso: creadoEnIso,
      modo_prueba: false,
      cliente: {
        nombre: nombre,
        email: email,
        telefono: telefono,
        contacto_preferido: contactoPreferido
      },
      meta: {
        pagina_origen: paginaOrigen,
        entorno: entorno,
        pedido_web_id: pedidoWebId,
        payload_version: ORDER_PAYLOAD_VERSION,
        creado_en_iso: creadoEnIso
      },
      producto: {
        producto: "Marco litofanía personalizado",
        codigo_producto: PRODUCT_CODE,
        formato: formatoMeta.formato,
        orientacion: formatoKey,
        medida: formatoMeta.medida,
        color_marco: colorMarco,
        color_litofania: "Blanco natural",
        cantidad: cantidad,
        precio_mostrado_eur: DISPLAY_PRICE_EUR,
        personalizacion_marco: personalizacionMarco
      },
      archivos: {
        foto_base64: photoBase64,
        nombre_archivo: file.name || "foto_original.jpg",
        content_type: file.type || "image/jpeg",
        size_bytes: file.size || 0,
        ficha_visual_base64: visualProof.data_url,
        ficha_visual_nombre_archivo: visualProof.filename,
        ficha_visual_content_type: visualProof.content_type,
        ficha_visual_size_bytes: visualProof.size_bytes,
        ficha_visual_version: visualProof.version,
        ficha_visual_estado: visualProof.status,
        ficha_visual_modo: visualProof.preview_mode
      },
      mensaje_cliente: notas,
      control: {
        acepta_contacto: true,
        acepta_revision: true,
        acepta_politica_privacidad: "no",
        autoriza_publicacion_resultado: autorizaPublicacionResultado
      }
    };
  }

  function parseFrameTextPersonalization(rawValue, expectedFormat) {
    const raw = String(rawValue || "").trim();

    if (!raw) {
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error("No se ha podido leer la personalización del marco. Revísala antes de enviar.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("La personalización del marco no tiene un formato válido.");
    }

    const format = normalizeVariantCode(expectedFormat);
    const count = Number(parsed.numero_lados);
    const sidesSource = parsed.lados;

    if (parsed.version !== FRAME_TEXT_VERSION) {
      throw new Error("La personalización del marco está desactualizada. Recarga la página y vuelve a revisarla.");
    }

    if (parsed.orientacion !== format) {
      throw new Error("La orientación del texto no coincide con el formato del marco.");
    }

    if (parsed.geometry_contract !== FRAME_TEXT_GEOMETRY_BY_FORMAT[format]) {
      throw new Error("La geometría del texto no coincide con el formato del marco.");
    }

    if (!Number.isInteger(count) || count < 1 || count > 4) {
      throw new Error("El número de lados personalizados no es válido.");
    }

    if (!sidesSource || typeof sidesSource !== "object" || Array.isArray(sidesSource)) {
      throw new Error("Faltan los textos de la personalización del marco.");
    }

    const unexpectedSides = Object.keys(sidesSource).filter(function (side) {
      return !FRAME_TEXT_SIDES.includes(side);
    });

    if (unexpectedSides.length > 0) {
      throw new Error("La personalización contiene un lado no permitido.");
    }

    const sides = {};
    FRAME_TEXT_SIDES.forEach(function (side) {
      if (!Object.prototype.hasOwnProperty.call(sidesSource, side)) return;

      if (typeof sidesSource[side] !== "string") {
        throw new Error("El texto de uno de los lados no tiene un formato válido.");
      }

      const sideText = normalizeFrameTextValue(sidesSource[side]);
      if (!sideText) {
        throw new Error("Escribe el texto de todos los lados seleccionados.");
      }

      if (Array.from(sideText).length > 40) {
        throw new Error("Uno de los textos del marco supera el límite permitido.");
      }

      sides[side] = sideText;
    });

    if (Object.keys(sides).length !== count) {
      throw new Error("Los lados personalizados no coinciden con la selección.");
    }

    const expectedSupplement = FRAME_TEXT_PRICE_BY_SIDE_COUNT[count];
    if (normalizeMoneyText(parsed.suplemento_unitario_eur) !== expectedSupplement) {
      throw new Error("El suplemento de la personalización no coincide con los lados seleccionados.");
    }

    const colorCode = String(parsed.color_texto || "").trim();
    const expectedColorName = COLOR_LABELS[colorCode];
    if (!expectedColorName || String(parsed.color_texto_nombre || "").trim() !== expectedColorName) {
      throw new Error("El color del texto del marco no es válido.");
    }

    return {
      version: FRAME_TEXT_VERSION,
      geometry_contract: FRAME_TEXT_GEOMETRY_BY_FORMAT[format],
      orientacion: format,
      numero_lados: count,
      suplemento_unitario_eur: expectedSupplement,
      color_texto: colorCode,
      color_texto_nombre: expectedColorName,
      lados: sides
    };
  }

  function normalizeFrameTextValue(value) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMoneyText(value) {
    const amount = Number(String(value || "").replace(",", "."));
    return Number.isFinite(amount) && amount >= 0 ? amount.toFixed(2) : "";
  }

  function getPageOrigin() {
    return window.location && window.location.href ? window.location.href : "";
  }

  function getEnvironment() {
    const host = window.location && window.location.hostname ? window.location.hostname.toLowerCase() : "";

    if (host === "localhost" || host === "127.0.0.1" || host === "") {
      return "local";
    }

    return "produccion";
  }

  window.TAKARA_FRAME_TEXT_ORDER_V1 = Object.freeze({
    parse: parseFrameTextPersonalization,
    extraCodeForSideCount: function (count) {
      return FRAME_TEXT_EXTRA_CODE_BY_COUNT[count] || "";
    }
  });

  function isDryRunEnabled() {
    if (getEnvironment() !== "local") {
      return false;
    }

    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get("takara_dry_run") === "1";
    } catch (error) {
      return false;
    }
  }

  function persistDryRunPayload(payload) {
    const inspectionPayload = createDryRunInspectionPayload(payload);
    const json = JSON.stringify(inspectionPayload, null, 2);

    try {
      window.sessionStorage.setItem("TAKARA_PEDIDO_DRY_RUN_PAYLOAD", json);
    } catch (error) {
      // sessionStorage puede estar bloqueado; el archivo descargado sigue siendo suficiente.
    }

    downloadDryRunPayload(json, inspectionPayload.pedido_web_id);

    if (window.console && typeof window.console.log === "function") {
      window.console.log("[Takara pedido dry-run inspeccion]", inspectionPayload);
      window.console.log("[Takara pedido dry-run payload completo]", payload);
    }
  }

  function createDryRunInspectionPayload(payload) {
    return createPhotoBase64SafeCopy(payload);
  }

  function createPhotoBase64SafeCopy(value) {
    const copy = JSON.parse(JSON.stringify(value));
    stripBinaryBase64FromObject(copy);
    return copy;
  }

  function stripBinaryBase64FromObject(value) {
    if (!value || typeof value !== "object") {
      return;
    }

    replaceBase64WithInspectionMetadata(value, "foto_base64", "foto_base64");
    replaceBase64WithInspectionMetadata(
      value,
      "ficha_visual_base64",
      "ficha_visual_base64"
    );

    Object.keys(value).forEach(function (key) {
      stripBinaryBase64FromObject(value[key]);
    });
  }

  function replaceBase64WithInspectionMetadata(value, fieldName, metadataPrefix) {
    if (typeof value[fieldName] !== "string") {
      return;
    }

    const encoded = value[fieldName];
    value[metadataPrefix + "_presente"] = encoded.length > 0;
    value[metadataPrefix + "_length"] = encoded.length;
    value[metadataPrefix + "_prefix"] = encoded.slice(0, 48);
    delete value[fieldName];
  }

  function downloadDryRunPayload(json, pedidoWebId) {
    try {
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFilename(pedidoWebId || "takara-pedido-dry-run") + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(function () {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      // Si el navegador bloquea la descarga, sessionStorage y consola siguen disponibles.
    }
  }

  function safeFilename(value) {
    return String(value || "takara-pedido-dry-run")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "takara-pedido-dry-run";
  }

  function createPedidoWebId() {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      pad2(now.getMonth() + 1),
      pad2(now.getDate())
    ].join("");

    return ORDER_ID_PREFIX + "-" + datePart + "-" + randomCode(6);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function randomCode(length) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const cryptoApi = window.crypto || window.msCrypto;
    const bytes = new Uint8Array(length);

    if (cryptoApi && cryptoApi.getRandomValues) {
      cryptoApi.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    return Array.prototype.map.call(bytes, function (byte) {
      return alphabet[byte % alphabet.length];
    }).join("");
  }

  function value(form, name) {
    const node = form.querySelector('[name="' + cssEscape(name) + '"]');
    return node && typeof node.value === "string" ? node.value.trim() : "";
  }

  function checkedValue(form, name) {
    const node = form.querySelector('[name="' + cssEscape(name) + '"]:checked');
    return node && typeof node.value === "string" ? node.value.trim() : "";
  }

  function isChecked(form, name) {
    const node = form.querySelector('[name="' + cssEscape(name) + '"]');
    return !!(node && node.checked);
  }

  function normalizeFormat(value) {
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  function normalizeQuantity(raw) {
    const n = Number.parseInt(String(raw || "1"), 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, 20);
  }

  function isAllowedImage(file) {
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();

    return (
      type === "image/jpeg" ||
      type === "image/png" ||
      type === "image/webp" ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp")
    );
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();

      reader.onload = function () {
        resolve(String(reader.result || ""));
      };

      reader.onerror = function () {
        reject(new Error("No se pudo leer la foto seleccionada."));
      };

      reader.readAsDataURL(file);
    });
  }

  async function createVisualProofSafe(pedidoWebId, expectedPhotoName) {
    const fallback = {
      data_url: "",
      filename: "",
      content_type: "",
      size_bytes: 0,
      version: VISUAL_PROOF_VERSION,
      status: "no_generada",
      preview_mode: getCurrentPreviewMode()
    };

    try {
      const proof = await captureVisualProof(
        pedidoWebId,
        expectedPhotoName
      );
      return Object.assign({}, fallback, proof, { status: "generada" });
    } catch (error) {
      if (window.console && typeof window.console.warn === "function") {
        window.console.warn(
          "[Takara pedido] La ficha visual no pudo generarse; el pedido conserva todos los datos estructurados.",
          error
        );
      }
      return fallback;
    }
  }

  async function captureVisualProof(pedidoWebId, expectedPhotoName) {
    const sourceCanvas = document.querySelector("[data-takara-preview-canvas]");
    const overlay = document.querySelector("[data-takara-frame-text-overlay]");

    if (!sourceCanvas || sourceCanvas.width < 2 || sourceCanvas.height < 2) {
      throw new Error("El preview todavía no está disponible.");
    }

    await waitForPreviewPhoto(expectedPhotoName);
    await waitForStablePaint();

    const sourceWidth = sourceCanvas.width;
    const sourceHeight = sourceCanvas.height;
    const maxSourceEdge = Math.max(sourceWidth, sourceHeight);
    const outputScale = Math.min(1, VISUAL_PROOF_MAX_EDGE_PX / maxSourceEdge);
    const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));
    const output = document.createElement("canvas");
    const outputContext = output.getContext("2d", { alpha: false });

    if (!outputContext) {
      throw new Error("El navegador no permite componer la ficha visual.");
    }

    output.width = outputWidth;
    output.height = outputHeight;
    outputContext.fillStyle = "#F7EFE4";
    outputContext.fillRect(0, 0, outputWidth, outputHeight);
    outputContext.drawImage(
      sourceCanvas,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    if (overlay) {
      const overlayImage = await createOverlayImage(overlay, sourceCanvas);
      outputContext.drawImage(overlayImage, 0, 0, outputWidth, outputHeight);
    }

    const blob = await canvasToBlob(
      output,
      "image/jpeg",
      VISUAL_PROOF_JPEG_QUALITY
    );

    if (!blob || blob.size < 1) {
      throw new Error("La ficha visual se generó vacía.");
    }

    if (blob.size > VISUAL_PROOF_MAX_BYTES) {
      throw new Error("La ficha visual supera el límite de seguridad.");
    }

    return {
      data_url: await blobToDataUrl(blob),
      filename: safeFilename(pedidoWebId) + "_vista_previa.jpg",
      content_type: "image/jpeg",
      size_bytes: blob.size,
      version: VISUAL_PROOF_VERSION,
      preview_mode: getCurrentPreviewMode()
    };
  }

  function waitForStablePaint() {
    return new Promise(function (resolve) {
      const schedule = typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : function (callback) { return window.setTimeout(callback, 0); };

      schedule(function () {
        schedule(resolve);
      });
    });
  }

  async function waitForPreviewPhoto(expectedPhotoName) {
    const expected = String(expectedPhotoName || "").trim();
    if (!expected) return;

    const deadline = Date.now() + VISUAL_PROOF_READY_TIMEOUT_MS;

    while (Date.now() <= deadline) {
      const fileNameNode = document.querySelector("[data-takara-file-name]");
      const renderedName = fileNameNode
        ? String(fileNameNode.title || fileNameNode.textContent || "").trim()
        : "";

      if (renderedName === expected) {
        return;
      }

      await new Promise(function (resolve) {
        window.setTimeout(resolve, 25);
      });
    }

    throw new Error("El preview todavía no ha terminado de cargar la fotografía.");
  }

  function createOverlayImage(sourceOverlay, sourceCanvas) {
    const canvasRect = sourceCanvas.getBoundingClientRect();
    const cssWidth = Number.parseFloat(sourceCanvas.style.width) || canvasRect.width;
    const cssHeight = Number.parseFloat(sourceCanvas.style.height) || canvasRect.height;

    if (cssWidth < 2 || cssHeight < 2) {
      return Promise.reject(new Error("La capa de textos no tiene dimensiones válidas."));
    }

    const clone = sourceOverlay.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", cssWidth);
    clone.setAttribute("height", cssHeight);
    clone.setAttribute("viewBox", "0 0 " + cssWidth + " " + cssHeight);
    clone.setAttribute("preserveAspectRatio", "none");
    clone.removeAttribute("class");
    clone.removeAttribute("style");

    const measurement = clone.querySelector("[data-takara-frame-text-measure]");
    if (measurement) measurement.remove();

    const sourceTextNodes = sourceOverlay.querySelectorAll(
      "[data-takara-frame-text-render]"
    );
    const cloneTextNodes = clone.querySelectorAll(
      "[data-takara-frame-text-render]"
    );

    sourceTextNodes.forEach(function (sourceNode, index) {
      const cloneNode = cloneTextNodes[index];
      if (!cloneNode) return;

      const computed = window.getComputedStyle(sourceNode);
      copyComputedSvgTextStyle(computed, cloneNode);
      cloneNode.removeAttribute("class");
      cloneNode.removeAttribute("style");
    });

    const serialized = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8"
    });
    const objectUrl = window.URL.createObjectURL(svgBlob);

    return loadImageFromUrl(objectUrl).finally(function () {
      window.URL.revokeObjectURL(objectUrl);
    });
  }

  function copyComputedSvgTextStyle(computed, node) {
    [
      ["fill", computed.fill],
      ["stroke", computed.stroke],
      ["stroke-width", computed.strokeWidth],
      ["paint-order", computed.paintOrder],
      ["font-family", computed.fontFamily],
      ["font-weight", computed.fontWeight],
      ["letter-spacing", computed.letterSpacing],
      ["text-rendering", computed.textRendering]
    ].forEach(function (entry) {
      if (entry[1]) node.setAttribute(entry[0], entry[1]);
    });
  }

  function loadImageFromUrl(url) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () {
        resolve(image);
      };
      image.onerror = function () {
        reject(new Error("No se pudo incorporar la capa de textos a la ficha visual."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, contentType, quality) {
    return new Promise(function (resolve, reject) {
      if (typeof canvas.toBlob !== "function") {
        reject(new Error("El navegador no admite la exportación segura del preview."));
        return;
      }

      canvas.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("El navegador no pudo codificar la ficha visual."));
        }
      }, contentType, quality);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(new Error("No se pudo preparar la ficha visual para el envío."));
      };
      reader.readAsDataURL(blob);
    });
  }

  function getCurrentPreviewMode() {
    const activeMode = document.querySelector(
      "[data-takara-litho-mode].is-active"
    );
    return activeMode && activeMode.getAttribute("data-takara-litho-mode") === "off"
      ? "apagada"
      : "encendida";
  }

  window.TAKARA_ORDER_VISUAL_PROOF_V1 = Object.freeze({
    version: VISUAL_PROOF_VERSION,
    maxBytes: VISUAL_PROOF_MAX_BYTES,
    capture: function (pedidoWebId, expectedPhotoName) {
      return createVisualProofSafe(
        pedidoWebId || "TK-WEB-PREVIEW",
        expectedPhotoName
      );
    }
  });



  function setStatus(node, message, state) {
    const safeState = state || "info";

    if (node) {
      if (safeState === "error" || safeState === "success") {
        node.hidden = true;
        node.textContent = "";
        node.removeAttribute("data-state");
      } else {
        node.hidden = false;
        node.textContent = message;
        node.setAttribute("data-state", safeState);
      }
    }

    if (safeState === "error" || safeState === "success") {
      showPedidoToast(message, safeState);
    }
  }




  function showPedidoToast(message, state) {
    const safeState = state === "success" ? "success" : "error";
    const previousNotices = document.querySelectorAll("[data-takara-pedido-toast], [data-takara-pedido-modal]");

    previousNotices.forEach(function (node) {
      node.remove();
    });

    const overlay = document.createElement("div");
    const card = document.createElement("div");
    const eyebrow = document.createElement("div");
    const title = document.createElement("strong");
    const body = document.createElement("p");
    const close = document.createElement("button");

    overlay.setAttribute("data-takara-pedido-modal", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-live", safeState === "error" ? "assertive" : "polite");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:rgba(24,13,7,.42)",
      "backdrop-filter:blur(2px)"
    ].join(";");

    card.setAttribute("data-state", safeState);
    card.style.cssText = [
      "box-sizing:border-box",
      "width:min(92vw,460px)",
      "border-radius:24px",
      "padding:24px 24px 22px",
      "border:2px solid " + (safeState === "success" ? "rgba(62,132,77,.55)" : "rgba(176,54,34,.62)"),
      "background:" + (safeState === "success" ? "#effaf1" : "#fff1ec"),
      "color:" + (safeState === "success" ? "#173f24" : "#722415"),
      "box-shadow:0 28px 90px rgba(23,13,7,.34)",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "transform:translateY(0)",
      "animation:takaraPedidoModalIn .16s ease-out both"
    ].join(";");

    eyebrow.textContent = safeState === "success" ? "TAKARA 3D" : "REVISA EL FORMULARIO";
    eyebrow.style.cssText = [
      "margin:0 0 8px",
      "font-size:12px",
      "font-weight:900",
      "letter-spacing:.08em",
      "text-transform:uppercase",
      "opacity:.74"
    ].join(";");

    title.textContent = safeState === "success" ? (message.indexOf("Modo prueba local:") === 0 ? "Prueba local completada" : "Solicitud transmitida") : "Falta completar algo";
    title.style.cssText = [
      "display:block",
      "margin:0 0 10px",
      "font-size:22px",
      "line-height:1.2",
      "font-weight:950"
    ].join(";");

    body.textContent = message;
    body.style.cssText = [
      "margin:0",
      "font-size:16px",
      "line-height:1.55",
      "font-weight:650"
    ].join(";");

    close.type = "button";
    close.textContent = safeState === "success" ? "Entendido" : "Corregir";
    close.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "margin-top:20px",
      "min-height:44px",
      "padding:0 20px",
      "border:0",
      "border-radius:999px",
      "background:" + (safeState === "success" ? "#2f7d43" : "#9e321f"),
      "color:#fff",
      "font:inherit",
      "font-weight:900",
      "cursor:pointer"
    ].join(";");

    function closeModal() {
      overlay.remove();
      document.removeEventListener("keydown", onKeyDown);
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    close.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) {
        closeModal();
      }
    });

    document.addEventListener("keydown", onKeyDown);

    card.appendChild(eyebrow);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(close);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    close.focus({ preventScroll: true });

    if (safeState === "success") {
      window.clearTimeout(showPedidoToast.timer);
      showPedidoToast.timer = window.setTimeout(closeModal, 10000);
    }
  }

  /* TAKARA PEDIDO SUBMIT FEEDBACK V1 START */
  function setBusy(button, busy) {
    const buttons = Array.from(
      document.querySelectorAll("[data-takara-pedido-submit], [data-takara-submit-proxy]")
    );

    if (button && buttons.indexOf(button) === -1) {
      buttons.push(button);
    }

    buttons.forEach(function (currentButton) {
      currentButton.disabled = !!busy;
      currentButton.setAttribute("aria-busy", busy ? "true" : "false");
      currentButton.textContent = busy ? "Enviando pedido..." : "Enviar solicitud de pedido";
    });
  }
  /* TAKARA PEDIDO SUBMIT FEEDBACK V1 END */

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return String(value).replace(/"/g, '\\"');
  }
}());
