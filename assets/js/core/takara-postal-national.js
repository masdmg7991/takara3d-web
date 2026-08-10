/* TAKARA POSTAL NATIONAL CORE V1 */
(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.TAKARA_POSTAL_NATIONAL_CORE_V1 = api;
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "TAKARA_POSTAL_NATIONAL_V1_2026_08_03";
  const DEFAULT_URL = "assets/data/takara-postal-national-v1.json?v=postal-nacional-v1";
  const EXPECTED_STATS = Object.freeze({
    postal_codes: 10851,
    automatic: 7282,
    selection: 3422,
    review: 147,
    municipalities: 8085
  });
  const STATUS_AUTOMATIC = "automatic";
  const STATUS_SELECTION = "selection";
  const STATUS_MANUAL = "manual";
  const STATUS_INVALID = "invalid";
  let cachedMap = null;
  let loadingPromise = null;

  function normalizePostalCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 5);
  }

  function assertMap(map) {
    if (!map || typeof map !== "object") {
      throw new Error("Mapa postal nacional no disponible");
    }
    if (map.version !== VERSION) {
      throw new Error("Versión inesperada del mapa postal nacional");
    }
    if (!map.municipalities || typeof map.municipalities !== "object") {
      throw new Error("Diccionario nacional de municipios no disponible");
    }
    if (!map.postal_codes || typeof map.postal_codes !== "object") {
      throw new Error("Índice nacional de códigos postales no disponible");
    }

    Object.keys(EXPECTED_STATS).forEach(function (key) {
      if (!map.stats || Number(map.stats[key]) !== EXPECTED_STATS[key]) {
        throw new Error("Estadística postal nacional incoherente: " + key);
      }
    });

    return map;
  }

  function municipalityOption(map, code) {
    const normalizedCode = String(code || "");
    const record = map.municipalities[normalizedCode];
    if (!Array.isArray(record) || record.length !== 2) return null;
    return Object.freeze({
      code: normalizedCode,
      municipality: String(record[0] || ""),
      province: String(record[1] || ""),
      label: String(record[0] || "") + " · " + String(record[1] || "")
    });
  }

  function resolve(map, postalCode) {
    assertMap(map);
    const normalized = normalizePostalCode(postalCode);
    if (normalized.length !== 5) {
      return Object.freeze({
        status: STATUS_INVALID,
        postal_code: normalized,
        options: Object.freeze([]),
        reason: "postal_invalido"
      });
    }

    const record = map.postal_codes[normalized];
    if (!Array.isArray(record) || record.length < 1) {
      return Object.freeze({
        status: STATUS_MANUAL,
        postal_code: normalized,
        options: Object.freeze([]),
        reason: "sin_cobertura"
      });
    }

    const kind = record[0];
    if (kind === "r") {
      return Object.freeze({
        status: STATUS_MANUAL,
        postal_code: normalized,
        options: Object.freeze([]),
        reason: "revision_interprovincial"
      });
    }

    const options = record.slice(1).map(function (code) {
      return municipalityOption(map, code);
    }).filter(Boolean);

    if (kind === "a" && options.length === 1) {
      return Object.freeze({
        status: STATUS_AUTOMATIC,
        postal_code: normalized,
        options: Object.freeze(options),
        selected: options[0],
        reason: "cartociudad_automatico"
      });
    }

    if (kind === "s" && options.length >= 2) {
      return Object.freeze({
        status: STATUS_SELECTION,
        postal_code: normalized,
        options: Object.freeze(options),
        selected: null,
        reason: "cartociudad_seleccion"
      });
    }

    return Object.freeze({
      status: STATUS_MANUAL,
      postal_code: normalized,
      options: Object.freeze([]),
      reason: "registro_incompleto"
    });
  }

  function loadMap(url) {
    if (cachedMap) return Promise.resolve(cachedMap);
    if (loadingPromise) return loadingPromise;
    if (typeof fetch !== "function") {
      return Promise.reject(new Error("Fetch no disponible para cargar el mapa postal"));
    }

    loadingPromise = fetch(url || DEFAULT_URL, { cache: "force-cache" })
      .then(function (response) {
        if (!response || !response.ok) {
          throw new Error("No se pudo cargar el mapa postal nacional");
        }
        return response.json();
      })
      .then(function (map) {
        cachedMap = assertMap(map);
        return cachedMap;
      })
      .catch(function (error) {
        loadingPromise = null;
        throw error;
      });

    return loadingPromise;
  }

  function setMapForTests(map) {
    cachedMap = assertMap(map);
    loadingPromise = Promise.resolve(cachedMap);
    return cachedMap;
  }

  return Object.freeze({
    version: VERSION,
    mapUrl: DEFAULT_URL,
    expectedStats: EXPECTED_STATS,
    statusAutomatic: STATUS_AUTOMATIC,
    statusSelection: STATUS_SELECTION,
    statusManual: STATUS_MANUAL,
    statusInvalid: STATUS_INVALID,
    normalizePostalCode: normalizePostalCode,
    assertMap: assertMap,
    municipalityOption: municipalityOption,
    resolve: resolve,
    loadMap: loadMap,
    setMapForTests: setMapForTests
  });
}));
