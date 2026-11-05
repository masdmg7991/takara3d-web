/**
 * Traducción del estado de letras 3D al contrato de pedido V2.
 * El precio y los colores comerciales proceden del catálogo, no del visor.
 * La validación definitiva del pedido sigue en el servidor.
 */
const SIDES = Object.freeze(["top","right","bottom","left"]);
const CONTRACTS = Object.freeze({
  vertical:"FRAME_TEXT_GEOMETRY_VERTICAL_V1",
  horizontal:"FRAME_TEXT_GEOMETRY_HORIZONTAL_V1"
});
const EXTRA_CODES = Object.freeze({
  1:"personalizacion_texto_1_lado",
  2:"personalizacion_texto_2_lados",
  3:"personalizacion_texto_3_lados",
  4:"personalizacion_texto_4_lados"
});

export function normalizeFrameText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g," ")
    .trim()
    .normalize("NFC");
}

export function quoteFrameTextSupplement(catalog, sideCount) {
  if (!Number.isInteger(sideCount) || sideCount<0 || sideCount>4) {
    throw new RangeError("Número de lados no permitido.");
  }
  if (sideCount===0) return "0.00";
  const product=catalog?.productos?.find(p=>
    p.codigo==="MARCO_LITOFANIA_144X108" && p.estado==="activo");
  if (!product) throw new Error("El catálogo del marco no está disponible.");
  const extra=product.extras?.find(e=>
    e.codigo===EXTRA_CODES[sideCount] && e.estado==="activo");
  const price=Number(extra?.precio_extra_eur);
  if (!Number.isFinite(price)||price<0||!Number.isSafeInteger(Math.round(price*100)) ||
      Math.abs(price*100-Math.round(price*100))>1e-8) {
    throw new Error("El precio de personalización no está disponible.");
  }
  return price.toFixed(2);
}

export function buildFrameTextOrder(state, catalog) {
  if (!state || typeof state!=="object") throw new TypeError("Estado de textos no válido");
  if (state.enabled!==true) return null;

  const format=state.format;
  if (!Object.hasOwn(CONTRACTS,format)) throw new Error("Formato de marco no válido");
  const selected=state.selected_sides;
  if (!Array.isArray(selected) || !selected.length || selected.length>4 ||
      new Set(selected).size!==selected.length || selected.some(s=>!SIDES.includes(s))) {
    throw new Error("Selecciona entre uno y cuatro lados distintos.");
  }

  const product=catalog?.productos?.find(p=>
    p.codigo==="MARCO_LITOFANIA_144X108" && p.estado==="activo");
  if (!product) throw new Error("El catálogo del marco no está disponible.");
  const color=product.colores_marco?.find(c=>
    c.codigo===state.letter_color && c.estado==="activo");
  if (!color) throw new Error("Color de letra no permitido por el catálogo.");

  const price=Number(quoteFrameTextSupplement(catalog,selected.length));
  const texts={};
  for (const side of SIDES) {
    if (!selected.includes(side)) continue;
    const value=state.texts?.[side];
    if (typeof value!=="string") throw new Error("Texto inválido en el lado "+side);
    const text=normalizeFrameText(value);
    if (!text || Array.from(text).length>40) {
      throw new Error("Escribe un texto válido de hasta 40 caracteres en "+side+".");
    }
    texts[side]=text;
  }

  return {
    version:"TAKARA_FRAME_TEXT_V1_4",
    geometry_contract:CONTRACTS[format],
    orientacion:format,
    numero_lados:selected.length,
    suplemento_unitario_eur:price.toFixed(2),
    color_texto:color.codigo,
    color_texto_nombre:color.nombre,
    lados:texts
  };
}
