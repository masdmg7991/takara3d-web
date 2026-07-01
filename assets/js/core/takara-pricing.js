// TAKARA 3D · CORE PRICING V1
// Una única función de cálculo de precio para producto, variante, extras y cantidad.
// No accede al DOM. No envía pedidos. Solo calcula y valida.

(function () {
  "use strict";

  function fail(message, details) {
    const error = new Error("[Takara Pricing] " + message);
    error.details = details || null;
    throw error;
  }

  function cents(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      fail("Importe inválido", value);
    }

    return Math.round(number * 100);
  }

  function money(centsValue) {
    if (!Number.isInteger(centsValue) || centsValue < 0) {
      fail("Céntimos inválidos", centsValue);
    }

    return (centsValue / 100).toFixed(2);
  }

  function findByCode(items, code, label) {
    const found = (items || []).find(function (item) {
      return item.codigo === code;
    });

    if (!found) {
      fail(label + " no existe", code);
    }

    return found;
  }

  function normalizeQuantity(value, product) {
    const quantity = Number.parseInt(value, 10);
    const min = Number(product.cantidad_minima || 1);
    const max = Number(product.cantidad_maxima || 20);

    if (!Number.isInteger(quantity) || quantity < min || quantity > max) {
      fail("Cantidad fuera de rango", {
        cantidad: value,
        minimo: min,
        maximo: max
      });
    }

    return quantity;
  }

  function calculate(input) {
    if (!input || !input.catalog) fail("Falta catálogo para calcular precio");
    if (!input.product_code) fail("Falta código de producto");
    if (!input.variant_code) fail("Falta variante");

    const catalog = input.catalog;
    const product = findByCode(catalog.productos, input.product_code, "Producto");

    if (product.estado !== "activo") {
      fail("Producto no activo", product.codigo);
    }

    const variant = findByCode(product.variantes, input.variant_code, "Variante");

    if (variant.estado !== "activo") {
      fail("Variante no activa", variant.codigo);
    }

    const quantity = normalizeQuantity(input.quantity || 1, product);
    const selectedExtraCodes = Array.isArray(input.extra_codes) ? input.extra_codes : [];

    const selectedExtras = selectedExtraCodes.map(function (extraCode) {
      const extra = findByCode(product.extras || [], extraCode, "Extra");

      if (extra.estado !== "activo") {
        fail("Extra no activo", extra.codigo);
      }

      return extra;
    });

    const baseCents = cents(product.precio_base_eur);
    const variantCents = cents(variant.precio_extra_eur || 0);
    const extrasCents = selectedExtras.reduce(function (sum, extra) {
      return sum + cents(extra.precio_extra_eur || 0);
    }, 0);

    const unitCents = baseCents + variantCents + extrasCents;
    const totalCents = unitCents * quantity;

    return Object.freeze({
      ok: true,
      pricing_version: "TAKARA_PRICING_V1",
      catalog_version: catalog.version,
      moneda: product.moneda || catalog.moneda,
      producto_codigo: product.codigo,
      producto_nombre: product.nombre,
      variante_codigo: variant.codigo,
      variante_nombre: variant.nombre,
      orientacion: variant.orientacion,
      medida: variant.medida,
      extras: selectedExtras.map(function (extra) {
        return Object.freeze({
          codigo: extra.codigo,
          nombre: extra.nombre,
          precio_extra_eur: money(cents(extra.precio_extra_eur || 0))
        });
      }),
      cantidad: quantity,
      precio_base_eur: money(baseCents),
      precio_variante_eur: money(variantCents),
      precio_extras_eur: money(extrasCents),
      precio_unitario_final_eur: money(unitCents),
      precio_total_eur: money(totalCents),
      precio_visible: money(unitCents).replace(".", ",") + " €"
    });
  }

  window.TAKARA_PRICING_V1 = Object.freeze({
    calculate: calculate
  });
})();
