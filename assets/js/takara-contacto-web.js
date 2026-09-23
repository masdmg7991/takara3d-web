/* TAKARA CONTACTO WEB V5 - ACK CAUSAL */
(function () {
  "use strict";

  const CONTACT_BROWSER_TRANSPORT_VERSION =
    "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1";
  const CONTACT_BROWSER_RESPONSE_MODE = "contact_postmessage_v1";
  const CONTACT_BROWSER_ACK_TIMEOUT_MS = 120000;
  const CONTACT_NONCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CONTACT_ID_PATTERN =
    /^TK-CONTACTO-\d{8}-\d{6}-[A-F0-9]{8}$/;
  const CONTACT_REQUEST_ID_PATTERN =
    /^TK-CONTACT-REQ-[A-HJ-NP-Z2-9]{32}$/;

  function init() {
    const form = document.querySelector(
      "[data-takara-contact-form][data-takara-contact-web-v2]"
    );
    if (!form) return;

    form.addEventListener("submit", handleSubmit, true);
  }

  function resolveEndpoint(form) {
    const getEndpoint = window.TAKARA_GET_APPS_SCRIPT_ENDPOINT;
    const configured =
      typeof getEndpoint === "function" ? getEndpoint() : "";
    return configured || form.getAttribute("action") || "";
  }

  function createContactNonce() {
    if (
      !window.crypto ||
      typeof window.crypto.getRandomValues !== "function"
    ) {
      throw new Error(
        "Este navegador no permite preparar una confirmacion segura."
      );
    }

    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);

    return Array.from(bytes)
      .map(function (byte) {
        return CONTACT_NONCE_ALPHABET.charAt(
          byte % CONTACT_NONCE_ALPHABET.length
        );
      })
      .join("");
  }

  function getOrCreateContactRequestId(form) {
    const current = String(
      form.getAttribute("data-takara-contact-request-id") || ""
    ).trim().toUpperCase();

    if (CONTACT_REQUEST_ID_PATTERN.test(current)) {
      return current;
    }

    const requestId = "TK-CONTACT-REQ-" + createContactNonce();
    form.setAttribute("data-takara-contact-request-id", requestId);
    return requestId;
  }

  function isAllowedContactBrowserAckOrigin(origin) {
    try {
      const parsed = new URL(String(origin || ""));
      const host = parsed.hostname.toLowerCase();

      if (parsed.protocol !== "https:") {
        return false;
      }

      return (
        host === "script.google.com" ||
        host === "script.googleusercontent.com" ||
        host.endsWith(".googleusercontent.com")
      );
    } catch (error) {
      return false;
    }
  }

  function appendHiddenContactField(form, name, fieldValue) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(
      fieldValue === undefined || fieldValue === null ? "" : fieldValue
    );
    form.appendChild(input);
  }

  function submitContactWithBrowserAck(endpoint, payload, requestId) {
    return new Promise(function (resolve, reject) {
      const nonce = createContactNonce();
      const responseOrigin = String(
        (window.location && window.location.origin) || ""
      ).trim();
      const normalizedRequestId = String(requestId || "")
        .trim()
        .toUpperCase();

      if (!CONTACT_REQUEST_ID_PATTERN.test(normalizedRequestId)) {
        reject(new Error("No se ha podido preparar una referencia segura para la consulta."));
        return;
      }

      if (
        responseOrigin !== "https://takara3d.es" &&
        responseOrigin !== "https://www.takara3d.es"
      ) {
        reject(
          new Error(
            "El origen actual no esta autorizado para confirmar consultas."
          )
        );
        return;
      }

      const frame = document.createElement("iframe");
      const postForm = document.createElement("form");
      const frameName = "takara_contact_ack_" + nonce;
      let completed = false;
      let timer = null;

      frame.name = frameName;
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.display = "none";

      postForm.method = "POST";
      postForm.action = endpoint;
      postForm.target = frameName;
      postForm.acceptCharset = "UTF-8";
      postForm.style.display = "none";

      payload.forEach(function (fieldValue, fieldName) {
        if (typeof fieldValue === "string") {
          appendHiddenContactField(
            postForm,
            fieldName,
            fieldValue
          );
        }
      });

      appendHiddenContactField(
        postForm,
        "takara_contact_response_mode",
        CONTACT_BROWSER_RESPONSE_MODE
      );
      appendHiddenContactField(
        postForm,
        "takara_contact_response_origin",
        responseOrigin
      );
      appendHiddenContactField(
        postForm,
        "takara_contact_response_nonce",
        nonce
      );
      appendHiddenContactField(
        postForm,
        "contact_request_id",
        normalizedRequestId
      );

      function cleanup() {
        window.removeEventListener("message", onMessage);

        if (timer !== null) {
          window.clearTimeout(timer);
        }

        if (postForm.parentNode) {
          postForm.parentNode.removeChild(postForm);
        }

        if (frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }
      }

      function finishError(message) {
        if (completed) return;
        completed = true;
        cleanup();
        reject(new Error(message));
      }

      function onMessage(event) {
        if (completed) {
          return;
        }

        // Apps Script HtmlService executes inside a Google-managed sandbox iframe.
        // The ACK may therefore come from a descendant browsing context rather
        // than frame.contentWindow itself. Authentication remains bound to the
        // trusted Google origin plus protocol version, nonce and request ID.
        if (!isAllowedContactBrowserAckOrigin(event.origin)) {
          return;
        }

        const data = event.data;

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data)
        ) {
          return;
        }

        if (
          data.version !== CONTACT_BROWSER_TRANSPORT_VERSION ||
          data.nonce !== nonce ||
          data.request_id !== normalizedRequestId
        ) {
          return;
        }

        if (
          data.ok === true &&
          CONTACT_ID_PATTERN.test(
            String(data.id_contacto_web || "").toUpperCase()
          ) &&
          data.estado === "recibido"
        ) {
          completed = true;
          cleanup();

          resolve(
            Object.freeze({
              version: CONTACT_BROWSER_TRANSPORT_VERSION,
              request_id: normalizedRequestId,
              id_contacto_web: String(
                data.id_contacto_web
              ).toUpperCase(),
              estado: "recibido"
            })
          );
          return;
        }

        finishError(
          typeof data.message === "string" && data.message
            ? data.message
            : "El servidor no ha confirmado la recepcion de la consulta."
        );
      }

      window.addEventListener("message", onMessage);

      timer = window.setTimeout(function () {
        finishError(
          "No se ha podido confirmar la recepcion de la consulta. " +
            "No la damos por recibida; conserva los datos del formulario " +
            "y revisa tu correo antes de volver a intentarlo."
        );
      }, CONTACT_BROWSER_ACK_TIMEOUT_MS);

      document.body.appendChild(frame);
      document.body.appendChild(postForm);

      try {
        postForm.submit();
      } catch (error) {
        finishError(
          "No se ha podido enviar la consulta al servidor."
        );
      }
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const submitButton = form.querySelector(
      "[data-takara-contact-submit]"
    );
    const statusNode = form.querySelector(
      "[data-takara-contact-status]"
    );
    const endpoint = resolveEndpoint(form);

    try {
      setBusy(submitButton, true);
      setStatus(statusNode, "Preparando consulta...", "info");

      if (
        !endpoint ||
        endpoint.indexOf("https://script.google.com/macros/s/") !== 0
      ) {
        throw new Error(
          "No esta configurado el envio de contacto."
        );
      }

      const nombre = value(form, "nombre");
      const email = value(form, "email");
      const asunto = value(form, "asunto");
      const mensaje = value(form, "mensaje");

      if (!nombre) {
        throw new Error(
          "Indica tu nombre para poder responderte correctamente."
        );
      }

      if (!email || !isValidEmail(email)) {
        throw new Error(
          "Indica un email valido para poder responderte."
        );
      }

      if (!asunto) {
        throw new Error("Indica el asunto de tu consulta.");
      }

      if (!mensaje) {
        throw new Error(
          "Escribe tu mensaje antes de enviarlo."
        );
      }

      const requestId = getOrCreateContactRequestId(form);
      const payload = new FormData();
      payload.append("tipo_solicitud", "CONTACTO_WEB");
      payload.append("contact_request_id", requestId);
      payload.append("origen", "contacto.html");
      payload.append(
        "fecha_cliente",
        new Date().toISOString()
      );
      payload.append(
        "website",
        value(form, "website")
      );
      payload.append("nombre", nombre);
      payload.append("email", email);
      payload.append("telefono", "");
      payload.append("whatsapp", "");
      payload.append("asunto", asunto);
      payload.append("mensaje", mensaje);
      payload.append("producto", "CONTACTO_WEB");
      payload.append("formato", "consulta");
      payload.append("color_marco", "no_aplica");
      payload.append("cantidad", "0");
      payload.append("acepta_contacto", "si");
      payload.append("acepta_revision", "no_aplica");
      payload.append(
        "notas",
        [
          "CONTACTO WEB",
          "",
          "Nombre: " + nombre,
          "Email: " + email,
          "Asunto: " + asunto,
          "",
          "Mensaje:",
          mensaje
        ].join("\n")
      );

      setStatus(
        statusNode,
        "Enviando consulta a Takara 3D...",
        "info"
      );

      const ack = await submitContactWithBrowserAck(
        endpoint,
        payload,
        requestId
      );
      form.removeAttribute("data-takara-contact-request-id");

      setStatus(
        statusNode,
        "Consulta recibida correctamente. Referencia: " +
          ack.id_contacto_web +
          ". Revisa tu correo para conservar la confirmacion.",
        "success"
      );
    } catch (error) {
      setStatus(
        statusNode,
        error && error.message
          ? error.message
          : "No se pudo enviar la consulta.",
        "error"
      );
    } finally {
      setBusy(submitButton, false);
    }
  }

  function value(form, name) {
    const field = form.querySelector(
      '[name="' + name + '"]'
    );
    return field && typeof field.value === "string"
      ? field.value.trim()
      : "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setBusy(button, busy) {
    if (!button) return;

    button.disabled = !!busy;
    button.setAttribute(
      "aria-busy",
      busy ? "true" : "false"
    );
    button.textContent = busy
      ? "Enviando consulta..."
      : "Enviar consulta";
  }

  function setStatus(node, message, state) {
    if (!node) return;

    node.hidden = false;
    node.textContent = message;
    node.setAttribute(
      "data-state",
      state || "info"
    );
  }

  window.TAKARA_CONTACT_BROWSER_TRANSPORT_V1 =
    Object.freeze({
      version: CONTACT_BROWSER_TRANSPORT_VERSION,
      timeout_ms: CONTACT_BROWSER_ACK_TIMEOUT_MS,
      isAllowedResponseOrigin:
        isAllowedContactBrowserAckOrigin,
      submit: submitContactWithBrowserAck
    });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();
