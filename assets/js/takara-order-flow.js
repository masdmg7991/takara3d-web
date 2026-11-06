/** Progressive order flow. Product data stays in the existing cart and preview. */
(function () {
  "use strict";
  function initialize() {
    const root = document.querySelector(".pedido-stl-preview"), cart = document.querySelector(".takara-order-cart");
    if (!root || !cart || !window.TAKARA_ORDER_CART) return;
    const customizer = root.querySelector(".takara-product-customizer"), steps = root.querySelector(".takara-order-steps");
    const checkout = [...root.querySelectorAll(".takara-preview-contact-panel, .takara-preview-delivery-panel, .takara-preview-submit-panel")];
    const saved = cart.querySelector("[data-takara-cart-saved]");
    const review = cart.querySelector("[data-takara-order-review]");
    const form = document.querySelector("[data-takara-pedido-form]"), draftPrice = cart.querySelector("[data-takara-draft-price]");
    let catalog;
    async function refreshDraftPrice() {
      try {
        if (!window.TAKARA_PRODUCT_PREVIEW) return;
        catalog = catalog || await window.TAKARA_CATALOGO_CORE_V1.loadCatalog();
        const selected = window.TAKARA_PRODUCT_PREVIEW.getSelection();
        const text = selected.hasText ? window.TAKARA_FRAME_TEXT_ORDER_V1.parse(form.querySelector('[name="personalizacion_marco"]').value, selected.variant) : null;
        const price = window.TAKARA_PRICING_V1.calculate({ catalog, product_code: selected.code, variant_code: selected.variant,
          quantity: form.querySelector('[name="cantidad"]').value,
          extra_codes: text ? [window.TAKARA_FRAME_TEXT_ORDER_V1.extraCodeForSideCount(text.numero_lados)] : [] });
        draftPrice.textContent = price.precio_total_eur.replace(".", ",") + " €";
      } catch { draftPrice.textContent = "Por revisar"; }
    }
    let current = "customize";
    function syncNavigation() {
      steps.querySelectorAll("[data-takara-step]").forEach(button => {
        const needsItem = button.dataset.takaraStep !== "customize" && !window.TAKARA_ORDER_CART.hasItems();
        button.disabled = window.TAKARA_ORDER_CART.isBusy() || needsItem;
        button.title = needsItem ? "Añade un producto para continuar" : "";
      });
      cart.querySelector("[data-takara-order-another]").textContent = window.TAKARA_ORDER_CART.editing() ? "Continuar edición" : "Añadir otro producto";
    }
    function show(step, moveFocus = true) {
      if (window.TAKARA_ORDER_CART.isBusy()) return;
      if (step === "review" && !window.TAKARA_ORDER_CART.hasItems()) step = "customize";
      current = step; root.dataset.orderStep = step;
      customizer.hidden = step !== "customize";
      checkout.forEach(panel => { panel.hidden = step !== "checkout"; });
      cart.querySelector(".takara-order-cart__actions").hidden = step !== "customize";
      cart.querySelector(".takara-order-cart__next").hidden = step !== "review";
      cart.querySelector("[data-takara-order-back]").hidden = step !== "checkout";
      saved.open = step === "review";
      cart.querySelector("h2").textContent = step === "customize" ? "Tu producto" : "Tu pedido";
      draftPrice.hidden = step !== "customize";
      cart.querySelector("[data-takara-cart-total]").hidden = step === "customize";
      review.hidden = !window.TAKARA_ORDER_CART.hasItems() || window.TAKARA_ORDER_CART.editing();
      if (step === "customize" && window.TAKARA_ORDER_CART.editing()) {
        cart.querySelector("[data-takara-cart-status]").textContent = "Tu edición sigue aquí. Guarda los cambios o cancela para recuperar la configuración anterior.";
      } else if (step === "customize" && window.TAKARA_ORDER_CART.hasItems()) {
        cart.querySelector("[data-takara-cart-status]").textContent = "Este producto aún no está añadido. Cuando esté listo, añádelo al pedido.";
      } else if (step !== "customize") {
        cart.querySelector("[data-takara-cart-status]").dataset.state = "info";
        cart.querySelector("[data-takara-cart-status]").textContent = step === "review"
          ? "Estos productos ya están añadidos. Puedes continuar o preparar otro."
          : "Tus productos están guardados. Completa los datos para enviar la solicitud.";
        if (window.TAKARA_ORDER_CART.editing()) cart.querySelector("[data-takara-cart-status]").textContent = "Tienes una edición pendiente. Puedes recorrer los pasos sin perderla; vuelve a Personaliza para guardar o cancelar antes de enviar.";
      }
      steps.querySelectorAll("[data-takara-step]").forEach(item => {
        if (item.dataset.takaraStep === step) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
      });
      syncNavigation();
      if (moveFocus) {
        const target = step === "customize" ? customizer.querySelector("legend")
          : step === "checkout" ? checkout[0].querySelector("h2") : cart.querySelector("h2");
        target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
    }
    cart.querySelector("[data-takara-order-another]").addEventListener("click", () => show("customize"));
    cart.querySelector("[data-takara-order-continue]").addEventListener("click", () => show("checkout"));
    cart.querySelector("[data-takara-order-back]").addEventListener("click", () => show("review"));
    review.addEventListener("click", () => show("review"));
    steps.querySelectorAll("[data-takara-step]").forEach(button => button.addEventListener("click", () => show(button.dataset.takaraStep)));
    window.addEventListener("takara:cart-saved", () => show("review"));
    window.addEventListener("takara:cart-edit", () => show("customize"));
    window.addEventListener("takara:cart-cancel", () => show("review"));
    window.addEventListener("takara:cart-change", () => {
      syncNavigation();
      review.hidden = !window.TAKARA_ORDER_CART.hasItems() || window.TAKARA_ORDER_CART.editing();
      if (!window.TAKARA_ORDER_CART.hasItems() && current !== "customize") show("customize");
    });
    window.TAKARA_ORDER_FLOW = Object.freeze({ show });
    for (const event of ["takara:preview-ready", "takara:product-change", "takara:frame-text-change"]) window.addEventListener(event, refreshDraftPrice);
    root.addEventListener("input", refreshDraftPrice); root.addEventListener("change", refreshDraftPrice);
    form.addEventListener("change", refreshDraftPrice);
    refreshDraftPrice();
    steps.hidden = false; show("customize", false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
}());
