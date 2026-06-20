"use strict";

const productMap = {
  "marco-vertical": {
    label: "Marco vertical",
    subtitle: "Ideal para retratos",
    img: "assets/img/productos/marco-vertical.svg"
  },
  "marco-horizontal": {
    label: "Marco horizontal",
    subtitle: "Ideal para paisajes",
    img: "assets/img/productos/marco-horizontal.svg"
  },
  "caja-lampara": {
    label: "Caja / Lámpara",
    subtitle: "Ilumina en 4 caras",
    img: "assets/img/productos/caja-lampara.svg"
  }
};

const finishMap = {
  ebony: "Ebony · Negro profundo",
  rosewood: "Rosewood · Madera cálida",
  polar: "Polar · Blanco mate"
};

function getCheckedValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setRadioValue(name, value) {
  const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  if (radio) radio.checked = true;
}

function updateSummary() {
  const productId = getCheckedValue("producto") || "marco-vertical";
  const acabado = getCheckedValue("acabado") || "ebony";
  const orientacion = getCheckedValue("orientacion") || "vertical";
  const product = productMap[productId] || productMap["marco-vertical"];
  const finish = finishMap[acabado] || finishMap.ebony;

  document.querySelectorAll("[data-summary-product]").forEach((el) => { el.textContent = product.label; });
  document.querySelectorAll("[data-summary-finish]").forEach((el) => { el.textContent = finish; });
  document.querySelectorAll("[data-summary-orientation]").forEach((el) => { el.textContent = orientacion === "vertical" ? "Vertical (retrato)" : "Horizontal (paisaje)"; });

  const summaryImg = document.querySelector("[data-summary-img]");
  if (summaryImg) {
    summaryImg.src = product.img;
    summaryImg.alt = product.label;
  }

  const previewImg = document.querySelector("[data-product-preview]");
  if (previewImg) {
    previewImg.src = product.img;
    previewImg.alt = `Vista previa de ${product.label}`;
  }
}

function initQueryProduct() {
  const params = new URLSearchParams(window.location.search);
  const product = params.get("producto");
  if (product && productMap[product]) {
    setRadioValue("producto", product);
  }
}

function initFilePreview() {
  const input = document.querySelector("[data-photo-input]");
  const dropArea = document.querySelector("[data-drop-area]");
  const fileName = document.querySelector("[data-file-name]");
  const fileSize = document.querySelector("[data-file-size]");
  const preview = document.querySelector("[data-photo-preview]");

  if (!input || !dropArea) return;

  function setFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("La imagen supera 20 MB. Reduce el tamaño o envíala directamente por WhatsApp.");
      return;
    }

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onload = () => {
      if (preview) {
        preview.src = String(reader.result);
        preview.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
  }

  dropArea.addEventListener("click", () => input.click());

  input.addEventListener("change", () => setFile(input.files?.[0]));

  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove("is-dragover");
    });
  });

  dropArea.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) setFile(file);
  });
}

function initOrderEvents() {
  document.querySelectorAll('input[name="producto"], input[name="acabado"], input[name="orientacion"]').forEach((input) => {
    input.addEventListener("change", updateSummary);
  });

  const form = document.querySelector("[data-order-form]");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const productId = getCheckedValue("producto") || "marco-vertical";
    const acabado = getCheckedValue("acabado") || "ebony";
    const orientacion = getCheckedValue("orientacion") || "vertical";
    const product = productMap[productId] || productMap["marco-vertical"];
    const finish = finishMap[acabado] || finishMap.ebony;
    const formData = new FormData(form);

    const nombre = String(formData.get("nombre") || "").trim();
    const telefono = String(formData.get("telefono") || "").trim();
    const observaciones = String(formData.get("observaciones") || "").trim();
    const fileInput = document.querySelector("[data-photo-input]");
    const file = fileInput?.files?.[0];

    if (!nombre || !telefono) {
      alert("Indica nombre y WhatsApp antes de enviar el pedido.");
      return;
    }

    const fileLine = file
      ? `Foto seleccionada en la web: ${file.name}. La adjunto por WhatsApp en este chat.`
      : "Foto: la enviaré por WhatsApp después de abrir el chat.";

    window.openTakaraWhatsApp(`
Hola Takara 3D.

Quiero hacer un pedido personalizado.

Producto: ${product.label}
Acabado: ${finish}
Orientación: ${orientacion === "vertical" ? "Vertical (retrato)" : "Horizontal (paisaje)"}
${fileLine}

Nombre: ${nombre}
WhatsApp: ${telefono}

Observaciones:
${observaciones || "Sin observaciones."}

Por favor, revisad si la foto es válida antes de fabricar.
    `);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initQueryProduct();
  initFilePreview();
  initOrderEvents();
  updateSummary();
});
