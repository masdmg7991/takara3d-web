/** Basket UI: configure, save, edit or remove. One shared contact and delivery block. */
(function () {
  "use strict";
  function initialize() {
    const root = document.querySelector(".takara-order-cart");
    if (!root) return;
    const cart = new window.TAKARA_CART_CORE_V1.Cart(), configurations = new Map();
    const save = root.querySelector("[data-takara-cart-save]"), cancel = root.querySelector("[data-takara-cart-cancel]");
    const list = root.querySelector("[data-takara-cart-list]"), status = root.querySelector("[data-takara-cart-status]");
    let catalog, editingId = null, beforeEdit = null, busy = false;
    const quantityField = document.querySelector('[data-takara-contact-proxy="cantidad"]').closest("label");
    quantityField.querySelector("span").textContent = "Copias de este producto";
    root.querySelector("[data-takara-item-quantity]").append(quantityField);
    function message(text, error = false) { status.textContent = text; status.dataset.state = error ? "error" : "info"; }
    function quote() { return cart.items.length && catalog ? window.TAKARA_CART_CORE_V1.quote(cart.items, catalog) : null; }
    function refreshSummary() {
      const pricing = quote();
      if (pricing) {
        document.querySelector("[data-takara-summary-product-name]").textContent = "Artículos de tu pedido";
        document.querySelector("[data-takara-summary-text-row]").hidden = pricing.supplementSubtotal === 0;
        document.querySelector("[data-takara-review-images-copy]").textContent = "Confirmo que puedo utilizar todas las imágenes de los artículos de este pedido y autorizo su revisión durante la preparación.";
      } else if (window.TAKARA_PRODUCT_PREVIEW) {
        const selected = window.TAKARA_PRODUCT_PREVIEW.getSelection(), box = selected.key === "caja";
        document.querySelector("[data-takara-summary-product-name]").textContent = box ? "Caja de luz · 4 fotos" : "Marco con litofanía";
        document.querySelector("[data-takara-summary-text-row]").hidden = box;
        document.querySelector("[data-takara-review-images-copy]").textContent = box
          ? "Confirmo que puedo utilizar estas cuatro imágenes para crear mi pedido y autorizo su revisión durante la preparación."
          : "Confirmo que puedo utilizar esta imagen para crear mi pedido y autorizo su revisión durante la preparación.";
      }
      window.TAKARA_DELIVERY_UI_V2?.refresh();
    }
    function element(tag, text, className) {
      const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
      if (className) node.className = className; return node;
    }
    function render() {
      list.replaceChildren();
      for (const item of cart.items) {
        const p = item.producto, row = element("article", undefined, "takara-order-cart__item"); row.dataset.takaraCartItem = item.id;
        const description = element("div"); description.append(element("h3", item.id + " · " + p.formato));
        description.append(element("p", p.color_peana ? "Cuerpo: " + p.color_cuerpo + " · Peana: " + p.color_peana : "Color: " + p.color_marco));
        if (p.personalizacion_marco) description.append(element("p", "Texto: " + Object.values(p.personalizacion_marco.lados).join(" · ")));
        description.append(element("p", item.archivos.fotos.map(photo => photo.cara + ": " + photo.nombre_archivo).join(" · ")));
        description.append(element("p", "Precio unitario: " + Number(p.precio_unitario_final_eur).toFixed(2).replace(".", ",") + " € · Subtotal: " + Number(p.precio_total_eur).toFixed(2).replace(".", ",") + " €"));
        const controls = element("div", undefined, "takara-order-cart__item-controls"), label = element("label", "Cantidad");
        const quantity = document.createElement("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = "20"; quantity.step = "1";
        quantity.value = p.cantidad; quantity.setAttribute("aria-label", "Cantidad de " + item.id); label.append(quantity);
        quantity.addEventListener("change", () => {
          try { cart.setQuantity(item.id, quantity.value, catalog); configurations.get(item.id).quantity = String(quantity.value); render(); }
          catch (error) { quantity.value = p.cantidad; message(error.message, true); }
        });
        const edit = element("button", "Editar", "btn btn--ghost"); edit.type = "button"; edit.setAttribute("aria-label", "Editar " + item.id);
        edit.addEventListener("click", () => {
          if (busy) return;
          if (!editingId) beforeEdit = window.TAKARA_PRODUCT_PREVIEW.getConfiguration();
          editingId = item.id; window.TAKARA_PRODUCT_PREVIEW.restoreConfiguration(configurations.get(item.id));
          save.textContent = "Guardar cambios de " + item.id; cancel.hidden = false;
          message("Estás editando " + item.id + ". Guarda los cambios antes de enviar.");
          render();
          document.querySelector(".takara-product-choice").scrollIntoView({ block: "start", behavior: "smooth" });
        });
        const remove = element("button", "Quitar", "btn btn--ghost"); remove.type = "button"; remove.setAttribute("aria-label", "Quitar " + item.id);
        remove.addEventListener("click", () => { if (busy) return; if (editingId === item.id) cancel.click(); cart.remove(item.id); configurations.delete(item.id); render(); });
        quantity.disabled = busy || !!editingId; edit.disabled = busy || !!editingId; remove.disabled = busy || !!editingId;
        controls.append(label, edit, remove); row.append(description, controls); list.append(row);
      }
      refreshSummary();
      if (!editingId) message(cart.items.length ? "El envío incluirá los artículos de esta lista. Añade el producto actual si también quieres incluirlo."
        : "Puedes enviar un solo producto directamente o añadir varios a tu pedido.");
    }
    save.addEventListener("click", async () => {
      if (busy) return;
      busy = true; list.inert = true; save.disabled = true; cancel.disabled = true;
      let saved = false; message("Preparando las fotos y los datos de este artículo…");
      try {
        const id = editingId || cart.nextId(), result = await window.TAKARA_ORDER_ITEMS_V3.compile(id);
        catalog = await window.TAKARA_CATALOGO_CORE_V1.loadCatalog(); cart.save(result.item, catalog); configurations.set(id, result.configuration);
        editingId = null; beforeEdit = null; cancel.hidden = true; save.textContent = "+ Añadir este producto al pedido";
        saved = true;
      } catch (error) { message(error.message, true); }
      finally { busy = false; list.inert = false; save.disabled = false; cancel.disabled = false; if (saved) render(); }
    });
    cancel.addEventListener("click", () => {
      if (busy) return;
      editingId = null; cancel.hidden = true; save.textContent = "+ Añadir este producto al pedido";
      if (beforeEdit) window.TAKARA_PRODUCT_PREVIEW.restoreConfiguration(beforeEdit);
      beforeEdit = null; render();
    });
    window.TAKARA_ORDER_CART = Object.freeze({ hasItems: () => cart.items.length > 0, getItems: () => cart.items.slice(),
      getQuote: quote, editing: () => !!editingId || busy, getRevision: () => cart.revision,
      complete() { cart.clear(); configurations.clear(); render(); } });
    window.addEventListener("takara:product-change", refreshSummary);
    window.addEventListener("takara:preview-ready", () => { save.disabled = false; });
    if (window.TAKARA_PRODUCT_PREVIEW) save.disabled = false;
    window.addEventListener("beforeunload", event => { if (cart.items.length) { event.preventDefault(); event.returnValue = ""; } });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
}());
