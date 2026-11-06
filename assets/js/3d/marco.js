/**
 * Contrato visual del marco aprobado (v20).
 * Sólo parámetros de representación: nunca precios, transporte ni pedidos.
 * Geometría CAD inmovilizada; la auditoría verifica la reparación de normales traseras.
 */
import { FINISHES, FINISH_ROUGHNESS, LITHOPHANE_APPEARANCE } from "./finishes.js?v=pedidos-v3-1";

export const MARCO = Object.freeze({
  productCode: "MARCO_LITOFANIA_144X108",
  material: "FRAME_BODY",
  models: Object.freeze({
    vertical: "assets/models/marco/vertical.glb?v=back-normals-1",
    horizontal: "assets/models/marco/horizontal.glb"
  }),
  camera: Object.freeze({
    vertical: "180deg 75deg auto",
    horizontal: "0deg 86deg auto"
  }),
  photoResolution: Object.freeze({
    vertical: Object.freeze([512, 640]),
    horizontal: Object.freeze([640, 512])
  }),
  colors: FINISHES,
  roughness: FINISH_ROUGHNESS,
  surfaceOptions: LITHOPHANE_APPEARANCE
});
