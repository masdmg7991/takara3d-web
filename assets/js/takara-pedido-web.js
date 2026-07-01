/* TAKARA PEDIDOS GMAIL V1 */
(function () {
  "use strict";

  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const PRODUCT_CODE = "MARCO_LITOFANIA_144X108";
  const DISPLAY_PRICE_EUR = "";

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

      const payload = await buildPayload(form);

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
        "Solicitud enviada correctamente. Hemos recibido tu solicitud. Revisa tu correo si has indicado email; te contactaremos para confirmar viabilidad, plazo y entrega.",
        "success"
      );
    } catch (error) {
      setStatus(statusNode, error && error.message ? error.message : "No se pudo enviar la solicitud.", "error");
    } finally {
      setBusy(submitButton, false);
    }
  }


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

      const snapshot = snapshotApi.build({
        catalog: catalog,
        selection: {
          product_code: PRODUCT_CODE,
          variant_code: normalizeVariantCode(producto.orientacion),
          extra_codes: [],
          quantity: producto.cantidad || 1
        },
        cliente: cliente,
        archivos: payload.archivos || {},
        mensaje_cliente: payload.mensaje_cliente || "",
        meta: payload.meta || {}
      });

      payload.snapshot_pedido = snapshot;

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
        pricing_version: snapshot.pricing_version
      });

      return enrichPayloadWithCatalogSnapshot(payload);
    });
  }

  async function buildPayload(form) {
    const photoInput = form.querySelector("[data-takara-photo-input]");
    const file = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;

    const nombre = value(form, "nombre");
    const email = value(form, "email");
    const telefono = value(form, "whatsapp");
    const contactoPreferido = "";
    const cantidad = normalizeQuantity(value(form, "cantidad"));
    const formatoKey = normalizeFormat(value(form, "formato"));
    const formatoMeta = FORMAT_META[formatoKey];
    const paginaOrigen = getPageOrigin();
    const entorno = getEnvironment();
    const colorKey = checkedValue(form, "color_marco") || "actual";
    const colorMarco = COLOR_LABELS[colorKey] || COLOR_LABELS.actual;
    const notas = value(form, "notas");
    const aceptaContacto = isChecked(form, "acepta_contacto");
    const aceptaRevision = isChecked(form, "acepta_revision");

    if (!nombre) {
      throw new Error("Falta tu nombre. Completa el campo Nombre para poder enviar la solicitud.");
    }

    if (!email && !telefono) {
      throw new Error("Falta un dato de contacto. Indica email o teléfono para poder contactar contigo.");
    }

    if (!file) {
      throw new Error("Falta la foto. Sube una imagen para que podamos revisar la litofanía.");
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error("La foto supera el máximo permitido de 10 MB.");
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

    return {
      modo_prueba: false,
      cliente: {
        nombre: nombre,
        email: email,
        telefono: telefono,
        contacto_preferido: contactoPreferido
      },
      meta: {
        pagina_origen: paginaOrigen,
        entorno: entorno
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
        precio_mostrado_eur: DISPLAY_PRICE_EUR
      },
      archivos: {
        foto_base64: photoBase64,
        nombre_archivo: file.name || "foto_original.jpg",
        content_type: file.type || "image/jpeg",
        size_bytes: file.size || 0
      },
      mensaje_cliente: notas,
      control: {
        acepta_contacto: true,
        acepta_revision: true,
        acepta_politica_privacidad: ""
      }
    };
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

    title.textContent = safeState === "success" ? "Solicitud enviada correctamente" : "Falta completar algo";
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

  function setBusy(button, busy) {
    if (!button) return;

    button.disabled = !!busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.textContent = busy ? "Enviando solicitud..." : "Enviar solicitud de pedido";
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }

    return String(value).replace(/"/g, '\\"');
  }
}());
