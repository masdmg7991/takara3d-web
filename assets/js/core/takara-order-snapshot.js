// TAKARA 3D · CORE ORDER SNAPSHOT V1
// Construye un snapshot cerrado del pedido.
// El backend debe copiar/validar este snapshot, no inventar precios.

(function () {
  "use strict";

  function fail(message, details) {
    const error = new Error("[Takara Snapshot] " + message);
    error.details = details || null;
    throw error;
  }

  function text(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function build(input) {
    if (!window.TAKARA_PRICING_V1) {
      fail("No está cargado TAKARA_PRICING_V1");
    }

    if (!input || !input.catalog || !input.selection) {
      fail("Faltan datos para construir snapshot");
    }

    const pricing = window.TAKARA_PRICING_V1.calculate({
      catalog: input.catalog,
      product_code: input.selection.product_code,
      variant_code: input.selection.variant_code,
      extra_codes: input.selection.extra_codes || [],
      quantity: input.selection.quantity || 1
    });

    const now = new Date();

    return Object.freeze({
      snapshot_version: "TAKARA_ORDER_SNAPSHOT_V1",
      creado_en_iso: now.toISOString(),
      catalog_version: pricing.catalog_version,
      pricing_version: pricing.pricing_version,
      origen_precio: "web_catalogo",
      cliente: Object.freeze({
        nombre: text(input.cliente && input.cliente.nombre),
        email: text(input.cliente && input.cliente.email),
        telefono: text(input.cliente && input.cliente.telefono)
      }),
      producto: Object.freeze({
        codigo_producto: pricing.producto_codigo,
        producto: pricing.producto_nombre,
        variante_codigo: pricing.variante_codigo,
        formato: pricing.variante_nombre,
        orientacion: pricing.orientacion,
        medida: pricing.medida,
        extras: pricing.extras,
        cantidad: pricing.cantidad,
        moneda: pricing.moneda,
        precio_base_eur: pricing.precio_base_eur,
        precio_variante_eur: pricing.precio_variante_eur,
        precio_extras_eur: pricing.precio_extras_eur,
        precio_unitario_final_eur: pricing.precio_unitario_final_eur,
        precio_total_eur: pricing.precio_total_eur,
        precio_visible: pricing.precio_visible
      }),
      archivos: Object.freeze(input.archivos || {}),
      mensaje_cliente: text(input.mensaje_cliente),
      meta: Object.freeze(input.meta || {})
    });
  }

  window.TAKARA_ORDER_SNAPSHOT_V1 = Object.freeze({
    build: build
  });
})();
