// TAKARA 3D · CORE CATALOGO V1
// Carga y validación defensiva del catálogo.
// No contiene precios hardcodeados.

(function () {
  "use strict";

  const CATALOG_URL = "assets/data/catalogo.json";
  const API_NAME = "TAKARA_CATALOGO_CORE_V1";

  let cache = null;
  let loadingPromise = null;

  function fail(message, details) {
    const error = new Error("[Takara Catalogo] " + message);
    error.details = details || null;
    throw error;
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asMoneyText(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      fail("Precio inválido", value);
    }

    return number.toFixed(2);
  }

  function validateCatalog(catalog) {
    if (!isObject(catalog)) fail("El catálogo no es un objeto");
    if (catalog.version !== "TAKARA_CATALOGO_V1") fail("Versión de catálogo no soportada", catalog.version);
    if (catalog.moneda !== "EUR") fail("Moneda no soportada", catalog.moneda);
    if (!Array.isArray(catalog.productos) || catalog.productos.length === 0) fail("Catálogo sin productos");

    const productCodes = new Set();

    catalog.productos.forEach(function (product) {
      if (!isObject(product)) fail("Producto inválido");
      if (!product.codigo) fail("Producto sin código");
      if (productCodes.has(product.codigo)) fail("Código de producto duplicado", product.codigo);
      productCodes.add(product.codigo);

      if (product.moneda !== "EUR") fail("Moneda de producto no soportada", product.codigo);
      asMoneyText(product.precio_base_eur);

      if (!Array.isArray(product.variantes) || product.variantes.length === 0) {
        fail("Producto sin variantes", product.codigo);
      }

      const variantCodes = new Set();

      product.variantes.forEach(function (variant) {
        if (!isObject(variant)) fail("Variante inválida", product.codigo);
        if (!variant.codigo) fail("Variante sin código", product.codigo);
        if (variantCodes.has(variant.codigo)) fail("Variante duplicada", variant.codigo);
        variantCodes.add(variant.codigo);
        asMoneyText(variant.precio_extra_eur || 0);
      });

      const extraCodes = new Set();

      (product.extras || []).forEach(function (extra) {
        if (!isObject(extra)) fail("Extra inválido", product.codigo);
        if (!extra.codigo) fail("Extra sin código", product.codigo);
        if (extraCodes.has(extra.codigo)) fail("Extra duplicado", extra.codigo);
        extraCodes.add(extra.codigo);
        asMoneyText(extra.precio_extra_eur || 0);
      });
    });

    return catalog;
  }

  async function loadCatalog() {
    if (cache) return cache;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(CATALOG_URL, {
      method: "GET",
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) {
          fail("No se pudo cargar el catálogo", response.status);
        }

        return response.json();
      })
      .then(function (catalog) {
        cache = validateCatalog(catalog);
        return cache;
      })
      .catch(function (error) {
        cache = null;
        loadingPromise = null;
        throw error;
      });

    return loadingPromise;
  }

  function getCachedCatalog() {
    return cache;
  }

  function getProduct(catalog, productCode) {
    const source = catalog || cache;

    if (!source || !Array.isArray(source.productos)) {
      fail("Catálogo no cargado");
    }

    return source.productos.find(function (product) {
      return product.codigo === productCode;
    }) || null;
  }

  window.TAKARA_CATALOGO_CORE_V1 = Object.freeze({
    name: API_NAME,
    url: CATALOG_URL,
    loadCatalog: loadCatalog,
    validateCatalog: validateCatalog,
    getCachedCatalog: getCachedCatalog,
    getProduct: getProduct
  });
})();
