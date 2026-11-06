/** Compile one configuration, then build a shared V3 checkout for all saved articles. */
(function () {
  "use strict";
  const BOX = "CAJA_LITOFANIA_4_FOTOS_100X100";
  let cachedKey = "", cachedPayload = null;
  async function compile(id) {
    const form = document.querySelector("[data-takara-pedido-form]"), preview = window.TAKARA_PRODUCT_PREVIEW;
    if (!preview) throw new Error("Espera a que se prepare el personalizador.");
    const bridge = window.TAKARA_ORDER_BUILD_BRIDGE_V1, selection = preview.getSelection();
    const expected = selection.key === "caja" ? selection.files : selection.files[0];
    preview.assertOrderReady(expected);
    const revision = preview.getSnapshot().revision, count = form.querySelector('[name="cantidad"]').value;
    const deadline = Date.now() + 48000;
    while (!preview.getSnapshot().ready && !preview.getSnapshot().error) {
      if (Date.now() > deadline) throw new Error("El producto tarda en prepararse. Reintenta en unos segundos.");
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    preview.assertOrderReady(expected);
    const box = selection.code === BOX;
    const text = box ? null : window.TAKARA_FRAME_TEXT_ORDER_V1.parse(form.querySelector('[name="personalizacion_marco"]').value, selection.variant);
    const photos = [];
    for (const [i, file] of selection.files.entries()) photos.push({ cara: selection.faces[i], nombre_archivo: file.name,
      foto_base64: await bridge.readFile(file), content_type: file.type, size_bytes: file.size });
    const proof = box ? null : await bridge.capture(id, expected);
    preview.assertOrderReady(expected);
    if (preview.getSnapshot().revision !== revision || form.querySelector('[name="cantidad"]').value !== count) throw new Error("Has cambiado el producto mientras se preparaba. Revísalo y vuelve a añadirlo.");
    const item = { id, producto: { codigo_producto: selection.code, variante_codigo: selection.variant,
      formato: box ? "Caja de luz · 4 fotos" : "Marco " + selection.variant,
      medida: box ? "100 x 100 mm" : selection.variant === "vertical" ? "108 x 144 mm" : "144 x 108 mm",
      cantidad: Number(count), color_marco: bridge.colorName(selection.bodyColor),
      ...(box ? { color_cuerpo: bridge.colorName(selection.bodyColor), color_peana: bridge.colorName(selection.baseColor) } : {}),
      atributos: box ? { color_cuerpo_codigo: selection.bodyColor, color_peana_codigo: selection.baseColor } : {},
      personalizacion_marco: text }, archivos: { fotos: photos } };
    if (proof) Object.assign(item.archivos, { ficha_visual_base64: proof.data_url,
      ficha_visual_nombre_archivo: proof.filename, ficha_visual_content_type: proof.content_type,
      ficha_visual_size_bytes: proof.size_bytes, ficha_visual_version: proof.version,
      ficha_visual_estado: proof.status, ficha_visual_modo: proof.preview_mode });
    const catalog = await window.TAKARA_CATALOGO_CORE_V1.loadCatalog();
    const priced = window.TAKARA_CART_CORE_V1.quote([item], catalog).items[0];
    return { item: priced, configuration: preview.getConfiguration() };
  }
  async function build(cart) {
    if (cart.editing()) throw new Error("Guarda o cancela la edición del artículo antes de enviar el pedido.");
    const form = document.querySelector("[data-takara-pedido-form]");
    const catalog = await window.TAKARA_CATALOGO_CORE_V1.loadCatalog();
    const items = cart.getItems().length ? cart.getItems() : [(await compile("A01")).item];
    const pricing = window.TAKARA_CART_CORE_V1.quote(items, catalog);
    const context = window.TAKARA_ORDER_BUILD_BRIDGE_V1.context(form, pricing.quantity, pricing.productSubtotal);
    const currentKey = JSON.stringify({ revision: cart.getRevision(), draft: cart.hasItems() ? null : window.TAKARA_PRODUCT_PREVIEW.getSnapshot().revision,
      items: pricing.items.map(item => ({ id: item.id, producto: item.producto })), cliente: context.cliente, entrega: context.entrega,
      control: context.control, mensaje: context.mensaje_cliente, store: context.meta.store_context || null });
    if (currentKey === cachedKey && cachedPayload) return cachedPayload;
    cachedPayload = { ...context, payload_version: "TAKARA_WEB_ORDER_PAYLOAD_V3", articulos: pricing.items };
    cachedKey = currentKey;
    return cachedPayload;
  }
  window.TAKARA_ORDER_ITEMS_V3 = Object.freeze({ compile, build });
}());
