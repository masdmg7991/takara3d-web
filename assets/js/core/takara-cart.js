/** In-memory configured articles. Originals remain private in this browser tab. */
(function () {
  "use strict";
  const MAX_BYTES = 20 * 1024 * 1024;
  function quantity(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new Error("La cantidad debe ser un entero de 1 a 20.");
    return n;
  }
  function quote(items, catalog) {
    let base = 0, extras = 0, units = 0, bytes = 0;
    const lines = items.map(item => {
      const p = item.producto, text = p.personalizacion_marco;
      const pricing = window.TAKARA_PRICING_V1.calculate({ catalog, product_code: p.codigo_producto,
        variant_code: p.variante_codigo, quantity: quantity(p.cantidad),
        extra_codes: text ? [window.TAKARA_FRAME_TEXT_ORDER_V1.extraCodeForSideCount(text.numero_lados)] : [] });
      base += Math.round((Number(pricing.precio_base_eur) + Number(pricing.precio_variante_eur)) * 100) * pricing.cantidad;
      extras += Math.round(Number(pricing.precio_extras_eur) * 100) * pricing.cantidad;
      units += pricing.cantidad;
      bytes += item.archivos.fotos.reduce((sum, f) => sum + f.size_bytes, 0) + Number(item.archivos.ficha_visual_size_bytes || 0) * 2;
      return { ...item, producto: { ...p, cantidad: pricing.cantidad, precio_base_eur: pricing.precio_base_eur,
        precio_variante_eur: pricing.precio_variante_eur, precio_extras_eur: pricing.precio_extras_eur,
        precio_unitario_final_eur: pricing.precio_unitario_final_eur, precio_total_eur: pricing.precio_total_eur,
        catalog_version: pricing.catalog_version, pricing_version: pricing.pricing_version } };
    });
    if (units > 20) throw new Error("El pedido admite hasta 20 unidades en total.");
    if (bytes > MAX_BYTES) throw new Error("Las imágenes del pedido superan 20 MB en total. Usa versiones de menor tamaño.");
    return { items: lines, quantity: units, baseSubtotal: base / 100, supplementSubtotal: extras / 100,
      productSubtotal: (base + extras) / 100, bytes };
  }
  class Cart {
    constructor() { this.items = []; this.revision = 0; }
    nextId() {
      for (let n = 1; n <= 20; n++) { const id = "A" + String(n).padStart(2, "0"); if (!this.items.some(item => item.id === id)) return id; }
      throw new Error("El pedido ya contiene 20 artículos.");
    }
    save(item, catalog) {
      const next = this.items.filter(line => line.id !== item.id);
      const index = this.items.findIndex(line => line.id === item.id);
      next.splice(index < 0 ? next.length : index, 0, item);
      this.items = quote(next, catalog).items; this.revision++;
    }
    remove(id) { this.items = this.items.filter(item => item.id !== id); this.revision++; }
    setQuantity(id, value, catalog) {
      const next = this.items.map(item => item.id === id ? { ...item, producto: { ...item.producto, cantidad: quantity(value) } } : item);
      this.items = quote(next, catalog).items; this.revision++;
    }
    clear() { this.items = []; this.revision++; }
  }
  window.TAKARA_CART_CORE_V1 = Object.freeze({ Cart, quote });
}());
