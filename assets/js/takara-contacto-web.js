/* TAKARA CONTACTO WEB V4 - PATRON PEDIDO */
(function () {
  "use strict";

  function init() {
    const form = document.querySelector("[data-takara-contact-form][data-takara-contact-web-v2]");
    if (!form) return;

    form.addEventListener("submit", handleSubmit, true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const form = event.currentTarget;
    const submitButton = form.querySelector("[data-takara-contact-submit]");
    const statusNode = form.querySelector("[data-takara-contact-status]");
    const endpoint = form.getAttribute("data-takara-endpoint") || form.getAttribute("action") || "";

    try {
      setBusy(submitButton, true);
      setStatus(statusNode, "Preparando consulta...", "info");

      if (!endpoint || endpoint.indexOf("https://script.google.com/macros/s/") !== 0) {
        throw new Error("No está configurado el envío de contacto.");
      }

      const nombre = value(form, "nombre");
      const email = value(form, "email");
      const asunto = value(form, "asunto");
      const mensaje = value(form, "mensaje");

      if (!nombre) {
        throw new Error("Indica tu nombre para poder responderte correctamente.");
      }

      if (!email || !isValidEmail(email)) {
        throw new Error("Indica un email válido para poder responderte.");
      }

      if (!asunto) {
        throw new Error("Indica el asunto de tu consulta.");
      }

      if (!mensaje) {
        throw new Error("Escribe tu mensaje antes de enviarlo.");
      }

      const payload = new FormData();
      payload.append("tipo_solicitud", "CONTACTO_WEB");
      payload.append("origen", "contacto.html");
      payload.append("fecha_cliente", new Date().toISOString());

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

      setStatus(statusNode, "Enviando consulta a Takara 3D...", "info");

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        body: payload
      });



      setStatus(statusNode, "Consulta transmitida. La recepción quedará confirmada cuando recibas el correo automático de Takara 3D. Hemos conservado los datos del formulario por si necesitas revisarlos o volver a intentarlo.", "success");
    } catch (error) {
      setStatus(statusNode, error && error.message ? error.message : "No se pudo enviar la consulta.", "error");
    } finally {
      setBusy(submitButton, false);
    }
  }

  function value(form, name) {
    const field = form.querySelector('[name="' + name + '"]');
    return field && typeof field.value === "string" ? field.value.trim() : "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setBusy(button, busy) {
    if (!button) return;

    button.disabled = !!busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    button.textContent = busy ? "Enviando consulta..." : "Enviar consulta";
  }

  function setStatus(node, message, state) {
    if (!node) return;

    node.hidden = false;
    node.textContent = message;
    node.setAttribute("data-state", state || "info");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();