/** Shared approved PBR finishes and illustrative lithophane appearance. */
export const FINISHES = Object.freeze({
  actual: Object.freeze([0.637596874,0.456411023,0.181164244,1]),
  rosewood: Object.freeze([0.116970668,0.025186860,0.017641954,1]),
  ebano: Object.freeze([0.024157632,0.015208514,0.010960094,1]),
  negro: Object.freeze([0.007499032,0.007499032,0.007499032,1]),
  "blanco-mate": Object.freeze([0.854992608,0.814846572,0.745404210,1])
});
export const FINISH_ROUGHNESS = Object.freeze({
  actual:0.94, rosewood:0.94, ebano:0.95, negro:0.96, "blanco-mate":1.0
});
export const LITHOPHANE_APPEARANCE = Object.freeze({
  intensity:0.79,brightness:0.45,contrast:0.75,shadowDepth:1,
  presence:0.55,relief:1,temperature:"natural",lightingProfile:"refined"
});
