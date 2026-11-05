/** Marco adapter: all lithophane and lettering knowledge stays outside the core. */
import { MARCO } from "./marco.js?v=back-normals-1";
import { LithophaneSurface, MARCO_SURFACE_PROFILE } from "./surface.js";
import { FrameText3D } from "./lettering.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EMPTY_TEXT = Object.freeze({ enabled: false, selected_sides: Object.freeze([]), texts: Object.freeze({}), letter_color: "negro" });

class MarcoController {
  constructor(viewer, format) {
    this.viewer = viewer;
    this.format = format;
    const [width, height] = MARCO.photoResolution[format];
    // The approved vertical GLB's photo UV faces the opposite horizontal axis.
    // Correct the texture input without changing any approved geometry.
    this.surface = new LithophaneSurface(viewer, { ...MARCO_SURFACE_PROFILE, width, height, mirrorX: format === "vertical" });
    this.lettering = new FrameText3D(viewer);
    this.photo = undefined;
    this.disposed = false;
    try {
      this.surface.setOptions(MARCO.surfaceOptions);
      const support = this.surface.initialize();
      if (!support.base || !support.normal || !support.emission) throw new Error("El modelo no contiene los canales de fotografía necesarios.");
      this.lettering.initialize();
    } catch (error) { this.dispose(); throw error; }
  }

  async apply(state, current) {
    const material = this.viewer.model.materials.find(m => m.name === MARCO.material);
    const pbr = material?.pbrMetallicRoughness;
    if (!pbr) throw new Error("El material del marco no está disponible.");
    pbr.setBaseColorFactor(MARCO.colors[state.color]);
    pbr.setMetallicFactor(0);
    pbr.setRoughnessFactor(MARCO.roughness[state.color]);
    this.lettering.setState({ ...state.text, format: this.format });
    this.surface.setMode(state.light);
    if (this.photo === state.photo) return;
    let bitmap = null;
    try {
      if (state.photo) {
        try {
          bitmap = await createImageBitmap(state.photo, { imageOrientation: "from-image" });
          if (bitmap.width * bitmap.height > 40_000_000) throw new Error("La foto supera los 40 megapíxeles. Usa una imagen más pequeña.");
        } catch (cause) {
          const error = new Error(cause.message.includes("megapíxeles") ? cause.message : "No se ha podido leer la foto. Selecciona otra imagen JPG, PNG o WEBP.");
          error.code = "INVALID_PHOTO";
          throw error;
        }
      }
      if (!current() || this.disposed) return;
      this.surface.setImage(bitmap);
      this.photoSize = bitmap ? { width: bitmap.width, height: bitmap.height } : null;
      this.photo = state.photo;
    } finally { bitmap?.close(); }
  }

  getSnapshot() { return { hasPhoto: !!this.photo, photoSize: this.photoSize, lettering: this.lettering.getSnapshot() }; }

  dispose() {
    this.disposed = true;
    this.surface.dispose();
    this.lettering.dispose();
    this.photo = null;
  }
}

export const MARCO_PRODUCT = Object.freeze({
  id: MARCO.productCode,
  defaults: Object.freeze({ variant: "vertical", color: "actual", light: "on", photo: null, text: EMPTY_TEXT }),
  variants: Object.freeze(Object.fromEntries(Object.keys(MARCO.models).map(format => [format, Object.freeze({
    src: MARCO.models[format], camera: MARCO.camera[format], alt: `Marco ${format} de litofanía, vista 3D`
  })]))),
  validate(state) {
    if (!Object.hasOwn(MARCO.colors, state.color)) throw new RangeError("Color del marco no reconocido.");
    if (!["on", "off"].includes(state.light)) throw new RangeError("Modo de luz desconocido.");
    if (state.photo && (!IMAGE_TYPES.has(state.photo.type) || state.photo.size > 20 * 1024 * 1024)) {
      throw new Error("Usa una foto JPG, PNG o WEBP de hasta 20 MB.");
    }
  },
  validateCapture(state) {
    if (!state.photo) throw new Error("Sube una foto antes de preparar la ficha.");
  },
  createController: (viewer, format) => new MarcoController(viewer, format)
});
