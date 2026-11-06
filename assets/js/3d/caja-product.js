/** Four independent lithophanes; shared renderer and surface implementation. */
import { FINISHES, FINISH_ROUGHNESS, LITHOPHANE_APPEARANCE } from "./finishes.js";
import { LithophaneSurface, MARCO_SURFACE_PROFILE } from "./surface.js";

export const CAJA_FACES = Object.freeze(["frontal", "derecha", "trasera", "izquierda"]);
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

class CajaController {
  constructor(viewer) {
    this.viewer = viewer;
    this.disposed = false;
    this.photos = {};
    this.sizes = {};
    this.surfaces = [];
    try {
      for (let i = 0; i < CAJA_FACES.length; i++) {
        const surface = new LithophaneSurface(viewer, { ...MARCO_SURFACE_PROFILE,
          id: "caja-100x100", materialName: `BOX_PHOTO_${i + 1}`, width: 512, height: 512 });
        this.surfaces.push(surface);
        surface.setOptions(LITHOPHANE_APPEARANCE);
        const channels = surface.initialize();
        if (!channels.base || !channels.normal || !channels.emission) throw new Error("Falta una superficie fotográfica de la caja.");
      }
    } catch (error) { this.dispose(); throw error; }
  }

  async apply(state, current) {
    const body = this.viewer.model.materials.find(material => material.name === "BOX_BODY");
    if (!body) throw new Error("No se ha podido preparar el acabado de la caja.");
    body.pbrMetallicRoughness.setBaseColorFactor(FINISHES[state.color]);
    body.pbrMetallicRoughness.setRoughnessFactor(FINISH_ROUGHNESS[state.color]);
    const base = this.viewer.model.materials.find(material => material.name === "BOX_BASE");
    if (!base) throw new Error("No se ha podido preparar el acabado de la peana.");
    base.pbrMetallicRoughness.setBaseColorFactor(FINISHES[state.baseColor]);
    base.pbrMetallicRoughness.setRoughnessFactor(FINISH_ROUGHNESS[state.baseColor]);
    for (let i = 0; i < CAJA_FACES.length; i++) {
      const face = CAJA_FACES[i], photo = state.photos[face] || null, surface = this.surfaces[i];
      surface.setMode(state.light);
      if (this.photos[face] === photo) continue;
      let bitmap;
      try {
        if (photo) {
          bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
          if (bitmap.width * bitmap.height > 40_000_000) throw new Error("La foto supera los 40 megapíxeles.");
        }
        if (!current() || this.disposed) return;
        surface.setImage(bitmap);
        this.photos[face] = photo;
        this.sizes[face] = bitmap ? { width: bitmap.width, height: bitmap.height } : null;
      } catch (cause) {
        const error = new Error(`Revisa la foto de la cara ${face}. ${cause.message.includes("megapíxeles") ? cause.message : "No se ha podido leer la imagen; prueba otra foto JPG, PNG o WEBP."}`);
        error.code = "INVALID_PHOTO";
        throw error;
      } finally { bitmap?.close(); }
    }
  }

  getSnapshot() {
    return { photos: Object.fromEntries(CAJA_FACES.map(face => [face, { hasPhoto: !!this.photos[face], size: this.sizes[face] || null }])) };
  }

  dispose() {
    this.disposed = true;
    this.surfaces.forEach(surface => surface.dispose());
    this.surfaces = [];
    this.photos = {};
    this.viewer = null;
  }
}

export const CAJA_PRODUCT = Object.freeze({
  id: "CAJA_LITOFANIA_4_FOTOS_100X100",
  defaults: Object.freeze({ variant: "cuatro_fotos", color: "negro", baseColor: "negro", light: "on", photos: Object.freeze({}) }),
  variants: Object.freeze({ cuatro_fotos: Object.freeze({ src: "assets/models/caja/cuatro-fotos.glb?v=hardware-3",
    camera: "45deg 72deg auto", alt: "Caja de cuatro fotos de 100 × 100 mm, vista 3D" }) }),
  validate(state) {
    if (!Object.hasOwn(FINISHES, state.color)) throw new RangeError("Color de la caja no reconocido.");
    if (!Object.hasOwn(FINISHES, state.baseColor)) throw new RangeError("Color de la peana no reconocido.");
    if (!["on", "off"].includes(state.light)) throw new RangeError("Modo de luz desconocido.");
    if (!state.photos || Object.keys(state.photos).some(face => !CAJA_FACES.includes(face))) throw new Error("Cara de la caja desconocida.");
    for (const photo of Object.values(state.photos)) {
      if (photo && (!TYPES.has(photo.type) || photo.size > 20 * 1024 * 1024)) throw new Error("Usa fotos JPG, PNG o WEBP de hasta 20 MB cada una.");
    }
    if (Object.values(state.photos).reduce((total, photo) => total + (photo?.size || 0), 0) > 20 * 1024 * 1024) {
      throw new Error("Las cuatro fotos superan 20 MB en total. Usa versiones de menor tamaño.");
    }
  },
  validateCapture(state) {
    if (CAJA_FACES.some(face => !state.photos[face])) throw new Error("Añade una foto a cada una de las cuatro caras.");
  },
  createController: viewer => new CajaController(viewer)
});
