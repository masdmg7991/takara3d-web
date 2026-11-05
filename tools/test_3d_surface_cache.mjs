/** Photo/light cache regressions. Browser acceptance covers actual WebGL uploads. */
import assert from "node:assert/strict";
import { LithophaneSurface, MARCO_SURFACE_PROFILE, renderLithophaneMaps } from "../assets/js/3d/surface.js";

const previous={ document:globalThis.document, HTMLCanvasElement:globalThis.HTMLCanvasElement, ImageData:globalThis.ImageData };
let currentPixels;
class Canvas {
  getContext(){return {
    fillRect(){}, translate(){}, scale(){}, drawImage(){},
    getImageData(){return {data:currentPixels};},
    putImageData(image){this.data=image.data;}
  };}
}
globalThis.HTMLCanvasElement=Canvas;
globalThis.document={createElement:()=>new Canvas()};
globalThis.ImageData=class {constructor(data){this.data=data;}};
const slot=()=>({setTexture(){}});
const material={
  name:MARCO_SURFACE_PROFILE.materialName,
  pbrMetallicRoughness:{baseColorTexture:slot(),setMetallicFactor(){},setRoughnessFactor(){}},
  normalTexture:slot(),emissiveTexture:slot(),setDoubleSided(){},setEmissiveFactor(){}
};
const viewer={model:{materials:[material]},createCanvasTexture:()=>({source:{element:new Canvas(),update(){}}})};
const surface=new LithophaneSurface(viewer,{...MARCO_SURFACE_PROFILE,width:8,height:10});
const photo={width:8,height:10};
currentPixels=new Uint8ClampedArray(8*10*4);
for(let i=0;i<currentPixels.length;i++)currentPixels[i]=(i*17)%256;
try {
  surface.initialize();
  surface.setImage(photo);
  const on=surface.lastResult;
  assert.deepEqual(on,renderLithophaneMaps(surface.prepared,"on",surface.options,surface.profile));
  surface.setMode("off");
  const off=surface.lastResult;
  assert.deepEqual(off,renderLithophaneMaps(surface.prepared,"off",surface.options,surface.profile));
  for(let i=0;i<20;i++){
    surface.setMode("on");assert.equal(surface.lastResult,on,"Reuse the exact ON maps");
    surface.setMode("off");assert.equal(surface.lastResult,off,"Reuse the exact OFF maps");
  }
  assert.equal(surface.renderCache.size,2,"Memory is bounded to the current two modes");
  surface.setOptions({...surface.options});
  assert.equal(surface.lastResult,off,"Unchanged options retain their cached maps");
  surface.setOptions({relief:0.25});
  assert.notEqual(surface.lastResult,off);
  assert.deepEqual(surface.lastResult,renderLithophaneMaps(surface.prepared,"off",surface.options,surface.profile));
  assert.equal(surface.renderCache.size,1,"Option changes discard both old modes");
  surface.setMode("on");
  const oldPhoto=surface.lastResult;
  currentPixels=currentPixels.map(v=>255-v);
  surface.setImage(photo);
  assert.notEqual(surface.lastResult,oldPhoto,"New photos cannot reuse old maps");
  assert.notDeepEqual(surface.lastResult.base,oldPhoto.base);
  assert.equal(surface.renderCache.size,1);
  surface.setImage(null);
  assert.equal(surface.renderCache.size,0,"Removing a photo releases its maps");
  assert.equal(surface.lastResult.placeholder,true);
  surface.setImage(photo);
  surface.dispose();
  assert.equal(surface.renderCache.size,0,"Disposal releases all photo maps");
  assert.equal(surface.lastResult,null);
  console.log("TAKARA_3D_SURFACE_CACHE_OK: identical pixels, repeated light changes, invalidation, bounded memory and cleanup");
} finally {
  surface.dispose();
  for(const [key,value] of Object.entries(previous)){
    if(value===undefined)delete globalThis[key];else globalThis[key]=value;
  }
}
