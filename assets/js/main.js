"use strict";

const TAKARA = {
  whatsappNumber: "34600000000", // TODO: sustituir por el número real en formato internacional sin '+'.
  instagramUrl: "https://www.instagram.com/3d.takara/",
  siteUrl: "https://takara3d.es"
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function encodeWhatsAppMessage(message) {
  return encodeURIComponent(message.trim().replace(/\n{3,}/g, "\n\n"));
}

function openWhatsApp(message) {
  const url = `https://wa.me/${TAKARA.whatsappNumber}?text=${encodeWhatsAppMessage(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function setCurrentYear() {
  qsa("[data-current-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

function initMobileMenu() {
  const toggle = qs("[data-menu-toggle]");
  const nav = qs("[data-nav]");

  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) {
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initGenericWhatsAppButtons() {
  qsa("[data-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => {
      const customMessage = button.getAttribute("data-whatsapp-message");
      openWhatsApp(customMessage || "Hola, quiero información sobre una litofanía personalizada de Takara 3D.");
    });
  });
}

function initContactForm() {
  const form = qs("[data-contact-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const nombre = String(formData.get("nombre") || "").trim();
    const contacto = String(formData.get("contacto") || "").trim();
    const asunto = String(formData.get("asunto") || "").trim();
    const mensaje = String(formData.get("mensaje") || "").trim();

    if (!nombre || !contacto || !mensaje) {
      alert("Revisa nombre, contacto y mensaje antes de enviar.");
      return;
    }

    openWhatsApp(`
Hola Takara 3D.

Quiero hacer una consulta desde la web.

Nombre: ${nombre}
Contacto: ${contacto}
Asunto: ${asunto || "Consulta general"}

Mensaje:
${mensaje}
    `);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  initMobileMenu();
  initGenericWhatsAppButtons();
  initContactForm();
});

window.TAKARA = TAKARA;
window.openTakaraWhatsApp = openWhatsApp;
