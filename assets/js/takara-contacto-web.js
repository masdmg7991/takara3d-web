/* TAKARA CONTACTO WEB V2 - SIN FORM NATIVO */
(function () {
  "use strict";

  function init() {
    const box = document.querySelector("[data-takara-contact-form][data-takara-contact-web-v1]");
    if (!box) return;

    const submitButton = box.querySelector("[data-takara-contact-submit]");
    if (!submitButton) return;

    submitButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      handleSubmit(box);
    });

    box.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && event.target && event.target.tagName !== "TEXTAREA") {
        event.preventDefault();
        handleSubmit(box);
      }
    });
  }

  async function handleSubmit(box) {
    const submitButton = box.querySelector("[data-takara-contact-submit]");
    const statusNode = box.querySelector("[data-takara-contact-status]");
    const endpoint = box.getAttribute("data-takara-endpoint") || "";

    try {
      setBusy(submitButton, true);
      setStatus(statusNode, "Preparando consulta...", "info");

      if (!endpoint || endpoint.indexOf("https://script.google.com/macros/s/") !== 0) {
        throw new Error("No está configurado el endpoint de contacto.");
      }

      const nombre = value(box, "Nombre");
      const email = value(box, "Email");
      const asunto = value(box, "Asunto");
      const mensaje = value(box, "Mensaje");

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

      resetFields(box);

      setStatus(
        statusNode,
        "Consulta enviada correctamente. Te responderemos por correo lo antes posible.",
        "success"
      );
    } catch (error) {
      setStatus(statusNode, error && error.message ? error.message : "No se pudo enviar la consulta.", "error");
    } finally {
      setBusy(submitButton, false);
    }
  }

  function value(box, name) {
    const field = box.querySelector('[name="' + name + '"]');
    return field && typeof field.value === "string" ? field.value.trim() : "";
  }

  function resetFields(box) {
    const fields = box.querySelectorAll("input, textarea");
    fields.forEach(function (field) {
      field.value = "";
    });
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