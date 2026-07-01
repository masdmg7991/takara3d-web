// TAKARA 3D · CONFIGURACION CENTRAL V1
// Fuente unica para catalogo, precios visibles y precios tecnicos.
// Para cambiar un precio base: tocar solo este archivo.

(function () {
  "use strict";

  const config = Object.freeze({
    version: "TAKARA_CONFIG_V1",
    moneda: "EUR",
    productos: Object.freeze({
      marco_litofania_144x108: Object.freeze({
        codigo: "MARCO_LITOFANIA_144X108",
        nombre: "Marco litofanía personalizado",
        precio_unitario_eur: 35,
        precio_unitario_eur_texto: "35.00",
        precio_visible: "35 €",
        moneda: "EUR",
        variantes: Object.freeze({
          vertical: Object.freeze({
            codigo: "vertical",
            nombre: "Marco vertical",
            orientacion: "vertical",
            medida: "108 x 144 mm"
          }),
          horizontal: Object.freeze({
            codigo: "horizontal",
            nombre: "Marco horizontal",
            orientacion: "horizontal",
            medida: "144 x 108 mm"
          })
        }),
        extras: Object.freeze({})
      })
    })
  });

  window.TAKARA_CONFIG = config;

  window.TAKARA_GET_PRODUCTO = function TAKARA_GET_PRODUCTO(codigo) {
    if (codigo === "MARCO_LITOFANIA_144X108") {
      return config.productos.marco_litofania_144x108;
    }

    return null;
  };

  window.TAKARA_GET_PRECIO_UNITARIO_EUR = function TAKARA_GET_PRECIO_UNITARIO_EUR(codigo) {
    const producto = window.TAKARA_GET_PRODUCTO(codigo);
    return producto ? producto.precio_unitario_eur_texto : "";
  };

  window.TAKARA_GET_PRECIO_VISIBLE = function TAKARA_GET_PRECIO_VISIBLE(codigo) {
    const producto = window.TAKARA_GET_PRODUCTO(codigo);
    return producto ? producto.precio_visible : "";
  };

  window.TAKARA_GET_MONEDA = function TAKARA_GET_MONEDA(codigo) {
    const producto = window.TAKARA_GET_PRODUCTO(codigo);
    return producto ? producto.moneda : config.moneda;
  };

  function actualizarTextoPrecios(root) {
    const producto = config.productos.marco_litofania_144x108;
    const container = root || document.body;

    if (!container || !container.querySelectorAll) return;

    const marked = container.querySelectorAll(
      "[data-takara-price='marco'], " +
      "[data-takara-price='marco_litofania_144x108'], " +
      "[data-takara-product-price='MARCO_LITOFANIA_144X108']"
    );

    marked.forEach(function (node) {
      node.textContent = producto.precio_visible;
    });
  }

  function iniciarRenderPrecios() {
    actualizarTextoPrecios(document.body);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            actualizarTextoPrecios(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarRenderPrecios, { once: true });
  } else {
    iniciarRenderPrecios();
  }
})();
