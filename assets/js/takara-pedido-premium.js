/* TAKARA_PEDIDO_PREMIUM_JS_V5 */
(function () {
  "use strict";

  function pick(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var found = document.querySelector(selectors[i]);
      if (found) return found;
    }
    return null;
  }

  function detectarCamposReales() {
    return {
      form: document.querySelector("[data-takara-pedido-form]") || document.getElementById("takara-pedido-form-premium"),
      nombre: pick(["[name=\"nombre\"]", "[name=\"name\"]", "input[autocomplete=\"name\"]"]),
      telefono: pick(["[name=\"telefono\"]", "[name=\"telefono_whatsapp\"]", "[name=\"whatsapp\"]", "input[autocomplete=\"tel\"]"]),
      email: pick(["[name=\"email\"]", "[name=\"correo\"]", "input[type=\"email\"]"]),
      cantidad: pick(["[name=\"cantidad\"]", "[name=\"unidades\"]", "input[type=\"number\"]"]),
      observaciones: pick(["[name=\"observaciones\"]", "[name=\"notas\"]", "[name=\"mensaje\"]", "textarea"]),
      acepta_contacto: pick(["[name=\"acepta_contacto\"]"]),
      acepta_revision: pick(["[name=\"acepta_revision\"]"]),
      autoriza_publicacion_resultado: pick(["[name=\"autoriza_publicacion_resultado\"]"])
    };
  }

  function syncUploadName() {
    var fileInput = document.querySelector("input[type=\"file\"]");
    var uploadName = document.querySelector("[data-takara-upload-proxy-name]");
    var fileName = fileInput && fileInput.files && fileInput.files.length ? fileInput.files[0].name : "Ningún archivo seleccionado";
    if (uploadName) uploadName.textContent = fileName;
  }

  /* TAKARA PEDIDO FORMAT BRIDGE V1 START */
  function normalizarFormatoPremium(value) {
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  function sincronizarFormatoPremium(value) {
    var format = normalizarFormatoPremium(value);

    document.querySelectorAll("[data-takara-format-proxy]").forEach(function (item) {
      var active = item.getAttribute("data-takara-format-proxy") === format;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function activarFormatoPremium(value) {
    var format = normalizarFormatoPremium(value);
    var realCard = document.querySelector("[data-takara-format-card=\"" + format + "\"]");

    if (!realCard) {
      console.warn("[Takara premium] No se encontró el formato real: " + format);
      return;
    }

    realCard.click();
    sincronizarFormatoPremium(format);
  }

  function initFormatBridge() {
    var canvas = document.querySelector("[data-takara-preview-canvas]");
    var stage = canvas ? canvas.parentElement : null;
    var formatValue = document.querySelector("[data-takara-format-value]");

    function sincronizarDesdeMotor() {
      var value = stage && stage.getAttribute("data-format");
      if (!value && formatValue) value = formatValue.value;
      sincronizarFormatoPremium(value);
    }

    document.querySelectorAll("[data-takara-format-card]").forEach(function (card) {
      card.addEventListener("click", sincronizarDesdeMotor);
    });

    if (stage && window.MutationObserver) {
      var observer = new MutationObserver(sincronizarDesdeMotor);
      observer.observe(stage, {
        attributes: true,
        attributeFilter: ["data-format"]
      });
    }

    sincronizarDesdeMotor();
  }
  /* TAKARA PEDIDO FORMAT BRIDGE V1 END */

  function initConfigPanel() {
    document.addEventListener("click", function (event) {
      var uploadButton = event.target.closest && event.target.closest("[data-takara-upload-proxy]");
      if (uploadButton) {
        var fileInput = document.querySelector("input[type=\"file\"]");
        if (fileInput) fileInput.click();
        return;
      }

      var formatButton = event.target.closest && event.target.closest("[data-takara-format-proxy]");
      if (formatButton) {
        activarFormatoPremium(formatButton.getAttribute("data-takara-format-proxy"));
        return;
      }

      var submitButton = event.target.closest && event.target.closest("[data-takara-submit-proxy]");
      if (submitButton) {
        var reales = detectarCamposReales();
        if (!validarContactoPedido(reales, true)) return;
        if (reales.form && typeof reales.form.requestSubmit === "function") {
          reales.form.requestSubmit();
        } else if (reales.form) {
          reales.form.submit();
        }
      }
    });

    document.addEventListener("change", function (event) {
      var value = event.target && event.target.getAttribute("data-takara-color-proxy");
      if (value) {
        var real = document.querySelector("input[name=\"color_marco\"][value=\"" + value + "\"]");
        if (real) {
          real.checked = true;
          real.dispatchEvent(new Event("input", { bubbles: true }));
          real.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      var acceptName = event.target && event.target.getAttribute("data-takara-accept-proxy");
      if (acceptName) {
        var acceptReal = document.querySelector("input[name=\"" + acceptName + "\"]");
        if (acceptReal) {
          acceptReal.checked = event.target.checked;
          acceptReal.dispatchEvent(new Event("input", { bubbles: true }));
          acceptReal.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      syncUploadName();
    });

    syncUploadName();
  }

  /* TAKARA PEDIDO CONTACT VALIDATION V1 START */
  function limpiarContacto(value) {
    return String(value || "").trim();
  }

  function telefonoValido(value) {
    var digits = value.replace(/\D/g, "");
    return /^\+?[\d\s().-]+$/.test(value) && digits.length >= 9 && digits.length <= 15;
  }

  function emailValido(value) {
    if (!value || value.length > 254) return false;

    var partes = value.split("@");
    if (partes.length !== 2) return false;

    var local = partes[0];
    var dominio = partes[1];

    if (!local || local.length > 64) return false;
    if (local.charAt(0) === "." || local.charAt(local.length - 1) === ".") return false;
    if (local.indexOf("..") !== -1) return false;
    if (!/^[a-z0-9!#$%&*+/=?^_{}|~.-]+$/i.test(local)) return false;

    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(dominio);
  }

  function proxyContacto(clave) {
    return document.querySelector("[data-takara-contact-proxy=\"" + clave + "\"]");
  }

  function aplicarValidezContacto(real, proxy, message) {
    [real, proxy].forEach(function (field) {
      if (!field || typeof field.setCustomValidity !== "function") return;

      field.setCustomValidity(message);

      if (message) {
        field.setAttribute("aria-invalid", "true");
      } else {
        field.removeAttribute("aria-invalid");
      }
    });
  }

  function validarCampoContacto(clave, reales) {
    var real = reales[clave];
    var proxy = proxyContacto(clave);
    var field = proxy || real;
    var value = limpiarContacto(field && field.value);
    var message = "";

    if (real && real.value !== value) real.value = value;
    if (proxy && proxy.value !== value) proxy.value = value;

    if (clave === "telefono") {
      if (!value) {
        message = "Indica un número de teléfono para poder confirmar el pedido.";
      } else if (!telefonoValido(value)) {
        message = "Introduce un teléfono válido de entre 9 y 15 cifras.";
      }
    }

    if (clave === "email") {
      if (!value) {
        message = "Indica un correo electrónico para poder confirmar el pedido.";
      } else if (!emailValido(value)) {
        message = "Introduce un correo válido, por ejemplo nombre@gmail.com.";
      }
    }

    aplicarValidezContacto(real, proxy, message);

    return {
      valido: message === "",
      campo: field
    };
  }

  function mostrarCampoInvalido(resultado) {
    if (!resultado || !resultado.campo) return;

    if (typeof resultado.campo.focus === "function") {
      resultado.campo.focus();
    }

    if (typeof resultado.campo.reportValidity === "function") {
      resultado.campo.reportValidity();
    }
  }

  function validarContactoPedido(reales, mostrarMensaje) {
    var telefono = validarCampoContacto("telefono", reales);
    var email = validarCampoContacto("email", reales);

    if (mostrarMensaje && !telefono.valido) {
      mostrarCampoInvalido(telefono);
    } else if (mostrarMensaje && !email.valido) {
      mostrarCampoInvalido(email);
    }

    return telefono.valido && email.valido;
  }
  /* TAKARA PEDIDO CONTACT VALIDATION V1 END */

  function initContactPanel() {
    var reales = detectarCamposReales();
    var proxies = Array.prototype.slice.call(document.querySelectorAll("[data-takara-contact-proxy]"));

    proxies.forEach(function (proxy) {
      var clave = proxy.getAttribute("data-takara-contact-proxy");
      var real = reales[clave];
      if (!real) return;

      proxy.value = real.value || "";

      proxy.addEventListener("input", function () {
        real.value = proxy.value;
        real.dispatchEvent(new Event("input", { bubbles: true }));
        real.dispatchEvent(new Event("change", { bubbles: true }));

        if (clave === "telefono" || clave === "email") {
          validarCampoContacto(clave, reales);
        }
      });

      real.addEventListener("input", function () {
        proxy.value = real.value || "";
      });
    });

    ["acepta_contacto", "acepta_revision", "autoriza_publicacion_resultado"].forEach(function (name) {
      var real = document.querySelector("input[name=\"" + name + "\"]");
      var proxy = document.querySelector("[data-takara-accept-proxy=\"" + name + "\"]");
      if (real && proxy) proxy.checked = real.checked;
    });

    if (reales.form) {
      reales.form.addEventListener("submit", function (event) {
        if (!validarContactoPedido(reales, true)) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
    }

    if (reales.nombre && reales.telefono && reales.email) {
      document.body.classList.add("takara-contact-proxy-ready");
    }
  }

  function initPremiumPedido() {
    initConfigPanel();
    initFormatBridge();
    initContactPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPremiumPedido);
  } else {
    initPremiumPedido();
  }
}());
