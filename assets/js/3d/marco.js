/**
 * Contrato visual del marco aprobado (v20).
 * Sólo parámetros de representación: nunca precios, transporte ni pedidos.
 * Geometría CAD inmovilizada; la auditoría verifica la reparación de normales traseras.
 */
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
  colors: Object.freeze({
    // PBR linear RGB. "actual" is the user-approved Poplar from v20.
    actual: Object.freeze([0.637596874,0.456411023,0.181164244,1]),
    rosewood: Object.freeze([0.116970668,0.025186860,0.017641954,1]),
    ebano: Object.freeze([0.024157632,0.015208514,0.010960094,1]),
    negro: Object.freeze([0.007499032,0.007499032,0.007499032,1]),
    "blanco-mate": Object.freeze([0.854992608,0.814846572,0.745404210,1])
  }),
  roughness: Object.freeze({
    actual:0.94, rosewood:0.94, ebano:0.95, negro:0.96, "blanco-mate":1.0
  }),
  surfaceOptions: Object.freeze({
    intensity:0.79,brightness:0.45,contrast:0.75,shadowDepth:1,
    presence:0.55,relief:1,temperature:"natural",lightingProfile:"refined"
  })
});
