/*
 * TAKARA ORDER FULFILLMENT V1
 *
 * Store-only fulfillment policy. Postal delivery remains in OrderDelivery.gs.
 */

const TAKARA_FULFILLMENT_METHOD = Object.freeze({
  DELIVERY: "DELIVERY",
  STORE_PICKUP: "STORE_PICKUP",
});
const TAKARA_DELIVERY_MODE_STORE_PICKUP = "recogida_tienda";
const TAKARA_DELIVERY_DECISION_STORE_PICKUP = "store_pickup";

function normalizarFulfillmentMethod_(value) {
  const normalized = texto_(value).toUpperCase();
  if (!normalized || normalized === TAKARA_FULFILLMENT_METHOD.DELIVERY) {
    return TAKARA_FULFILLMENT_METHOD.DELIVERY;
  }
  if (normalized === TAKARA_FULFILLMENT_METHOD.STORE_PICKUP) {
    return TAKARA_FULFILLMENT_METHOD.STORE_PICKUP;
  }
  throw new Error("El método de entrega no es válido.");
}

function construirRecogidaTienda_(deliverySource, totalsSource, productTotal) {
  const declaredDelivery = deliverySource || {};
  const declaredTotals = totalsSource || {};
  return {
    entrega: {
      contrato_activo: true,
      version: CFG.DELIVERY_VERSION,
      fulfillment_method: TAKARA_FULFILLMENT_METHOD.STORE_PICKUP,
      valida: true,
      codigo: "store_pickup",
      modalidad_solicitada: TAKARA_DELIVERY_MODE_STORE_PICKUP,
      modalidad: TAKARA_DELIVERY_MODE_STORE_PICKUP,
      codigo_postal: "",
      zona_codigo: "",
      zona_nombre: "",
      area_codigo: "",
      fuente_decision: TAKARA_DELIVERY_DECISION_STORE_PICKUP,
      ubicacion_requerida: false,
      ubicacion_codigo: "",
      ubicacion_nombre: "",
      localidad_informativa: "",
      municipio_codigo: "",
      municipio_nombre: "",
      provincia_nombre: "",
      municipio_fuente: "",
      precio_eur: "0.00",
      moneda: CFG.MONEDA,
      estado_precio: "confirmado",
      direccion_completa_solicitada: false,
      texto_cliente: "Recogida en tienda sin coste. Te avisaremos cuando el pedido esté preparado.",
      declarada: {
        fulfillment_method: normalizarFulfillmentMethod_(declaredDelivery.fulfillment_method),
        version: texto_(declaredDelivery.version),
        modalidad_solicitada: texto_(declaredDelivery.modalidad_solicitada),
        modalidad: texto_(declaredDelivery.modalidad_resuelta || declaredDelivery.modalidad),
        codigo_postal: texto_(declaredDelivery.codigo_postal),
        zona_codigo: texto_(declaredDelivery.zona_codigo),
        zona_nombre: texto_(declaredDelivery.zona_nombre),
        area_codigo: texto_(declaredDelivery.area_codigo),
        fuente_decision: texto_(declaredDelivery.fuente_decision),
        ubicacion_requerida: declaredDelivery.ubicacion_requerida === true,
        ubicacion_codigo: texto_(declaredDelivery.ubicacion_codigo),
        ubicacion_nombre: texto_(declaredDelivery.ubicacion_nombre),
        localidad_informativa: texto_(declaredDelivery.localidad_informativa),
        municipio_codigo: texto_(declaredDelivery.municipio_codigo),
        municipio_nombre: texto_(declaredDelivery.municipio_nombre),
        provincia_nombre: texto_(declaredDelivery.provincia_nombre),
        municipio_fuente: texto_(declaredDelivery.municipio_fuente),
        precio_eur: normalizarImporteOpcional_(declaredDelivery.precio_eur),
        moneda: texto_(declaredDelivery.moneda),
        estado_precio: texto_(declaredDelivery.estado_precio),
        direccion_completa_solicitada: declaredDelivery.direccion_completa_solicitada === true,
        texto_cliente: texto_(declaredDelivery.texto_cliente)
      }
    },
    totales: {
      version: CFG.DELIVERY_VERSION,
      producto_eur: productTotal,
      entrega_eur: "0.00",
      total_estimado_eur: productTotal,
      moneda: CFG.MONEDA,
      estado_total: "confirmado",
      declarado: {
        version: texto_(declaredTotals.version),
        producto_eur: normalizarImporteOpcional_(
          declaredTotals.subtotal_productos_eur ||
          declaredTotals.product_eur ||
          declaredTotals.producto_eur
        ),
        entrega_eur: normalizarImporteOpcional_(
          declaredTotals.precio_entrega_eur ||
          declaredTotals.delivery_eur ||
          declaredTotals.entrega_eur
        ),
        total_estimado_eur: normalizarImporteOpcional_(
          declaredTotals.total_estimado_eur ||
          declaredTotals.estimated_total_eur
        ),
        moneda: texto_(declaredTotals.moneda || declaredTotals.currency),
        estado_total: texto_(declaredTotals.estado_total || declaredTotals.total_status)
      }
    }
  };
}

function validarRecogidaTienda_(entrega, attribution, fulfillmentMethod) {
  if (fulfillmentMethod !== TAKARA_FULFILLMENT_METHOD.STORE_PICKUP) {
    return;
  }

  const pickup = attribution && attribution.pickup;
  if (
    !attribution ||
    attribution.source_type !== "STORE" ||
    !pickup ||
    pickup.version !== TAKARA_STORE_PICKUP_CONTEXT_VERSION ||
    pickup.available !== true
  ) {
    throw new Error("La recogida en tienda no está disponible para este pedido.");
  }

  if (
    entrega.modalidad !== TAKARA_DELIVERY_MODE_STORE_PICKUP ||
    entrega.modalidad_solicitada !== TAKARA_DELIVERY_MODE_STORE_PICKUP ||
    entrega.precio_eur !== "0.00" ||
    entrega.estado_precio !== "confirmado"
  ) {
    throw new Error("La recogida en tienda no coincide con la política de entrega.");
  }
}
