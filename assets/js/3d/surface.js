/**
 * Material fotolitofanía del visor 3D.
 * Los parámetros reproducen el acabado visual v20 aprobado; no representan
 * una calibración óptica física de filamento/LED.
 * Sin red, persistencia, modificaciones CAD ni dependencias comerciales.
 */
const clamp = (v, lo=0, hi=1) => Math.max(lo, Math.min(hi, v));
const lerp = (a,b,t) => a + (b-a)*t;

export const MARCO_SURFACE_PROFILE = Object.freeze({
  id: "marco-litofania-v20",
  materialName: "PHOTO_FRONT_LAB",
  width: 512,
  height: 640,
  // Illustrative optical coefficients only; not measurements of Takara PLA.
  opticalDepthLow: 0.75,
  opticalDepthHigh: 2.75,
  attenuation: 0.73,
  ambientOff: [231,227,216],
  palettes: {
    warm: { shadow: [104,77,50], mid: [190,156,105], light: [255,240,204], glow: [255,222,165] },
    neutral: { shadow: [100,93,80], mid: [183,178,160], light: [249,247,236], glow: [249,246,230] }
  }
});

function blurred(source, width, height, radius) {
  if (radius < 1) return source;
  const temp=new Float32Array(source.length), result=new Float32Array(source.length);
  const denom=radius*2+1;
  for(let y=0;y<height;y++){
    let total=0,base=y*width;
    for(let i=-radius;i<=radius;i++)total+=source[base+clamp(i,0,width-1)];
    for(let x=0;x<width;x++){
      temp[base+x]=total/denom;
      total+=source[base+clamp(x+radius+1,0,width-1)]-source[base+clamp(x-radius,0,width-1)];
    }
  }
  for(let x=0;x<width;x++){
    let total=0;
    for(let i=-radius;i<=radius;i++)total+=temp[clamp(i,0,height-1)*width+x];
    for(let y=0;y<height;y++){
      result[y*width+x]=total/denom;
      total+=temp[clamp(y+radius+1,0,height-1)*width+x]-temp[clamp(y-radius,0,height-1)*width+x];
    }
  }
  return result;
}

/** Returns deterministic photo-derived arrays; no browser rendering here. */
export function prepareLithophaneImage(rgba, width, height) {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    !rgba || rgba.length!==width*height*4)throw new Error("ImageData inválido");
  const pixels=width*height, histogram=new Uint32Array(256);
  const gray=new Float32Array(pixels);
  for(let i=0;i<pixels;i++){
    const k=i*4;
    const v=0.2126*rgba[k]+0.7152*rgba[k+1]+0.0722*rgba[k+2];
    gray[i]=v;histogram[Math.max(0,Math.min(255,Math.round(v)))]+=1;
  }
  const percentile=(fraction)=>{
    const threshold=Math.max(1,Math.round(pixels*fraction));
    let sum=0;
    for(let i=0;i<256;i++){sum+=histogram[i];if(sum>=threshold)return i;}
    return 255;
  };
  const low=percentile(0.004),high=percentile(0.996);
  const spread=Math.max(18,high-low);
  const lightness=new Float32Array(pixels),density=new Float32Array(pixels);
  for(let i=0;i<pixels;i++){
    const n=clamp((gray[i]-low)/spread);
    const curve=n*n*(3-2*n); // same family of soft contrast, independent module
    const v=clamp(0.06+0.92*Math.pow(curve,0.72));
    lightness[i]=v;
    density[i]=Math.pow(1-v,1.08);
  }
  return {width,height,lightness,density,soft:blurred(lightness,width,height,1),
    wide:blurred(lightness,width,height,6)};
}

function lerpColor(a,b,t) {
  return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
}
function sepia(palette,t) {
  if(t<0.55)return lerpColor(palette.shadow,palette.mid,clamp(t/0.55));
  return lerpColor(palette.mid,palette.light,clamp((t-0.55)/0.45));
}

function normalAt(density,w,h,x,y,relief) {
  const idx=y*w+x;
  const left=density[y*w+Math.max(0,x-1)];
  const right=density[y*w+Math.min(w-1,x+1)];
  const up=density[Math.max(0,y-1)*w+x];
  const down=density[Math.min(h-1,y+1)*w+x];
  const nx=(right-left)*relief*2.5,ny=(down-up)*relief*2.5,nz=1;
  const d=Math.hypot(nx,ny,nz)||1;
  return [nx/d,ny/d,nz/d];
}

/**
 * Produces three Uint8ClampedArray RGBA maps.
 * base map is the matte appearance; normal map conveys fake surface relief;
 * emission map simulates radiance from inside the panel for mode ON.
 */
export function renderLithophaneMaps(prepared, mode, options={}, profile=MARCO_SURFACE_PROFILE) {
  if(!prepared || !prepared.lightness) throw new Error("Falta imagen preparada");
  if(mode!=="on"&&mode!=="off")throw new Error("Modo de iluminación inválido");
  const w=prepared.width,h=prepared.height,pixels=w*h;
  const base=new Uint8ClampedArray(pixels*4);
  const normal=new Uint8ClampedArray(pixels*4);
  const emission=new Uint8ClampedArray(pixels*4);
  const palettes=profile.palettes;
  // Natural warm: exact midpoint between the existing warm and neutral palettes.
  // Existing palettes stay unchanged for reliable A/B comparison.
  const palette=options.temperature==="neutral"?palettes.neutral:
    options.temperature==="natural"?{
      shadow:lerpColor(palettes.warm.shadow,palettes.neutral.shadow,0.5),
      mid:lerpColor(palettes.warm.mid,palettes.neutral.mid,0.5),
      light:lerpColor(palettes.warm.light,palettes.neutral.light,0.5),
      glow:lerpColor(palettes.warm.glow,palettes.neutral.glow,0.5)
    }:palettes.warm;
  const strength=clamp(Number(options.intensity??0.64),0,1);
  const relief=clamp(Number(options.relief??0.62),0,1);
  const contrast=clamp(Number(options.contrast??1.0),0.6,1.6);
  // Photographic brightness is separate from LED intensity: 50% = exact legacy.
  // Applied to normalized source luminance before contrast and transmission.
  // This also reduces glow in overly white regions without changing the OFF material.
  const requestedBrightness=Number(options.brightness??0.5);
  const brightness=Number.isFinite(requestedBrightness)?clamp(requestedBrightness,0,1):0.5;
  const brightnessShift=(brightness-0.5)*1.2;
  // Experimental shadow retention: zero reproduces the original v0.1 map exactly.
  // This is a visual calibration control, NOT a measured absorption coefficient.
  const requestedShadowDepth=Number(options.shadowDepth??0);
  const shadowDepth=Number.isFinite(requestedShadowDepth)?clamp(requestedShadowDepth,0,1):0;
  // Local-contrast experiment. Zero preserves v0.2 exactly; this is not an optical calibration.
  const requestedPresence=Number(options.presence??0);
  const presence=Number.isFinite(requestedPresence)?clamp(requestedPresence,0,1):0;
  // The previous appearance remains pixel-identical without this explicit flag.
  const refined=options.lightingProfile==="refined";
  const l=prepared.lightness,d=prepared.density,soft=prepared.soft,wide=prepared.wide;
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i=y*w+x,k=i*4;
      const normalVector=normalAt(d,w,h,x,y,relief);
      for(let j=0;j<3;j++)normal[k+j]=Math.round((normalVector[j]*0.5+0.5)*255);
      normal[k+3]=255;
      const detail=clamp(l[i]-soft[i],-0.24,0.24);
      const broad=clamp(l[i]-wide[i],-0.18,0.18);
      const contrastLight=clamp(0.5+(clamp(l[i]+brightnessShift)-0.5)*contrast);
      const layer=1+Math.sin(y*Math.PI*2/5.4)*0.003;
      // Distinct reflective OFF material; relief at 0 yields nearly uniform ivory.
      const reliefSignal=normalVector[0]*-0.36+normalVector[1]*-0.51+
        detail*2.15+broad*0.60-d[i]*0.075;
      const offShade=clamp(reliefSignal,-0.45,0.32)*relief*94;
      const offColor=profile.ambientOff.map(v=>clamp(v+offShade,0,255));
      if(mode==="off"){
        for(let c=0;c<3;c++)base[k+c]=offColor[c]*layer;
        for(let c=0;c<3;c++)emission[k+c]=0;
      }else{
        // Qualitative, Beer–Lambert-inspired transmittance from nominal optical depth.
        const opticalDepth=lerp(profile.opticalDepthLow,profile.opticalDepthHigh,
          Math.pow(1-contrastLight,1.08));
        const transmittance=Math.exp(-profile.attenuation*opticalDepth);
        const relative=(transmittance-Math.exp(-profile.attenuation*profile.opticalDepthHigh))/
          (Math.exp(-profile.attenuation*profile.opticalDepthLow)-Math.exp(-profile.attenuation*profile.opticalDepthHigh));
        const ux=x/(w-1||1),uy=y/(h-1||1);
        const edge=Math.min(ux,uy,1-ux,1-uy);
        // Soft LED-like perimeter field on the provisional photo panel.
        const rim=refined?Math.exp(-Math.pow(edge/0.024,2)):0;
        const radial=refined?Math.min(1,Math.pow((ux-0.52)/0.78,2)+Math.pow((uy-0.44)/0.78,2)):0;
        const border=clamp((0.075-edge)/0.075);
        const topLight=Math.exp(-Math.pow(uy/0.12,2))*0.09;
        const lampField=clamp(0.89 + border*0.11 + topLight,0,1.06);
        const lightTone=clamp(0.10+Math.pow(clamp(relative),0.88)*0.84+detail*0.27+
          broad*0.12,0,1);
        const darkness=1-clamp(relative);
        // Protect highlights while increasing separation in the densest regions.
        // Applies to the transmitted appearance only, never the OFF relief.
        // Reuse the existing multi-scale luminance differences: controlled local clarity,
        // tapering toward highlights and deep blacks to avoid halos and clipping.
        // Crucially, no new global contrast or extra warm tint is introduced.
        const localSignal=clamp(detail*1.65+broad*0.85,-0.16,0.16);
        const midGuard=0.22+0.78*(1-Math.pow(Math.abs(2*lightTone-1),2));
        const clarity=presence*localSignal*1.70*midGuard;
        const color=sepia(palette,clamp(lightTone+clarity-
          0.24*shadowDepth*Math.pow(darkness,0.85)));
        // At zero light intensity the panel returns to reflective OFF color.
        // The texture and emission cross-fade together; no sudden poster effect.
        const illuminationMix=clamp(strength*1.25);
        const rimLift=refined?0.11*rim*strength:0;
        const rimColor=palette.light;
        for(let c=0;c<3;c++){
          const transmitted=refined?lerp(color[c],rimColor[c],rimLift):color[c];
          base[k+c]=clamp(lerp(offColor[c],transmitted,illuminationMix)*layer,0,255);
        }
        const glowAmount=clamp((0.11+transmittance*1.15+border*0.24)*lampField*strength,0,1)*
          (1-0.70*shadowDepth*Math.pow(darkness,0.85));
        // Keep emitted light consistent with restored local detail, without
        // changing the global light intensity or tint selected by the customer.
        const emissionClarity=1+presence*localSignal*0.85*midGuard;
        // Modest perimeter diffusion and spatial attenuation of backlighting.
        // All contributions vanish for intensity=0; the original profile is kept.
        const field=refined?1.02-0.09*radial:1;
        const rimEmission=refined?0.23*rim*strength:0;
        const finalGlow=refined?
          clamp(glowAmount*emissionClarity*field+rimEmission,0,1):
          glowAmount*emissionClarity;
        for(let c=0;c<3;c++)emission[k+c]=Math.round(palette.glow[c]*finalGlow);
      }
      base[k+3]=255;emission[k+3]=255;
    }
  }
  return {width:w,height:h,base,normal,emission,mode};
}

function drawIntoCanvas(texture,bytes,width,height){
  const canvas=texture.source.element;
  if(!(canvas instanceof HTMLCanvasElement))throw new Error("CanvasTexture no disponible");
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext("2d");
  ctx.putImageData(new ImageData(bytes,width,height),0,0);
  texture.source.update();
}

/** One instance per customizable panel. No dependency on the order form. */
export class LithophaneSurface {
  constructor(viewer,profile=MARCO_SURFACE_PROFILE){
    this.viewer=viewer;
    this.profile=profile;
    this.material=null;
    this.textures=null;
    this.prepared=null;
    this.mode="on";
    // El controlador aplica explícitamente los valores visuales del producto.
    this.options={intensity:0.64,brightness:0.5,relief:0.62,contrast:1,temperature:"warm",shadowDepth:0.45,presence:0,lightingProfile:"classic"};
    this.disposed=false;
    this.lastResult=null;
    // At most two map sets for the current photo/options. No photo history.
    this.renderCache=new Map();
  }
  initialize(){
    if(this.disposed)throw new Error("La superficie está cerrada");
    const model=this.viewer.model;
    const material=model?.materials?.find(m=>m.name===this.profile.materialName);
    if(!material?.pbrMetallicRoughness?.baseColorTexture)
      throw new Error("Material o UV fotográfica no encontrados: "+this.profile.materialName);
    this.material=material;
    const textures={
      base:this.viewer.createCanvasTexture(),
      normal:this.viewer.createCanvasTexture(),
      emission:this.viewer.createCanvasTexture()
    };
    if(!textures.base?.source?.element)throw new Error("API CanvasTexture no disponible");
    material.pbrMetallicRoughness.baseColorTexture.setTexture(textures.base);
    // These channels are available as TextureInfo in model-viewer 4.4; keep
    // a supported base-color fallback if a future renderer changes its API.
    if(material.normalTexture?.setTexture)material.normalTexture.setTexture(textures.normal);
    if(material.emissiveTexture?.setTexture)material.emissiveTexture.setTexture(textures.emission);
    material.pbrMetallicRoughness.setMetallicFactor(0);
    material.pbrMetallicRoughness.setRoughnessFactor(0.93);
    material.setDoubleSided(true);
    this.textures=textures;
    this.render();
    return {
      base:!!material.pbrMetallicRoughness.baseColorTexture,
      normal:!!material.normalTexture?.setTexture,
      emission:!!material.emissiveTexture?.setTexture
    };
  }
  setImage(image){
    if(!this.material)throw new Error("Falta inicializar el material");
    this.renderCache.clear();
    if(!image){this.prepared=null;this.render();return;}
    const w=this.profile.width,h=this.profile.height;
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    ctx.fillStyle="#f7f6f3";ctx.fillRect(0,0,w,h);
    if(this.profile.mirrorX){ctx.translate(w,0);ctx.scale(-1,1);}
    const scale=Math.max(w/image.width,h/image.height);
    ctx.drawImage(image,(w-image.width*scale)/2,(h-image.height*scale)/2,
      image.width*scale,image.height*scale);
    this.prepared=prepareLithophaneImage(ctx.getImageData(0,0,w,h).data,w,h);
    this.render();
  }
  setMode(mode){
    if(mode!=="on"&&mode!=="off")throw new Error("Modo inválido");
    if(mode===this.mode)return;
    this.mode=mode;this.render();
  }
  setOptions(partial){
    let changed=false;
    for(const key of ["intensity","brightness","relief","contrast","temperature","shadowDepth","presence","lightingProfile"]){
      if(Object.prototype.hasOwnProperty.call(partial,key)&&!Object.is(this.options[key],partial[key])){
        this.options[key]=partial[key];changed=true;
      }
    }
    if(!changed)return;
    this.renderCache.clear();
    this.render();
  }
  render(){
    if(!this.material||!this.textures)return;
    const w=this.profile.width,h=this.profile.height;
    if(this.prepared){
      let result=this.renderCache.get(this.mode);
      if(!result){
        result=renderLithophaneMaps(this.prepared,this.mode,this.options,this.profile);
        this.renderCache.set(this.mode,result);
      }
      drawIntoCanvas(this.textures.base,result.base,w,h);
      if(this.material.normalTexture?.setTexture)drawIntoCanvas(this.textures.normal,result.normal,w,h);
      if(this.material.emissiveTexture?.setTexture)drawIntoCanvas(this.textures.emission,result.emission,w,h);
      this.lastResult=result;
    }else{
      // Deliberately neutral placeholder. User images never leave the browser.
      const base=new Uint8ClampedArray(w*h*4);
      const normal=new Uint8ClampedArray(w*h*4);
      const emission=new Uint8ClampedArray(w*h*4);
      for(let i=0;i<w*h;i++){
        const k=i*4;
        [232,228,215,255].forEach((v,c)=>base[k+c]=v);
        [128,128,255,255].forEach((v,c)=>normal[k+c]=v);
        [0,0,0,255].forEach((v,c)=>emission[k+c]=v);
      }
      drawIntoCanvas(this.textures.base,base,w,h);
      if(this.material.normalTexture?.setTexture)drawIntoCanvas(this.textures.normal,normal,w,h);
      if(this.material.emissiveTexture?.setTexture)drawIntoCanvas(this.textures.emission,emission,w,h);
      this.lastResult={width:w,height:h,base,normal,emission,mode:this.mode,placeholder:true};
    }
    // Emission is absent when off, regardless of image; no visible light leaks.
    const intensity=clamp(Number(this.options.intensity),0,1);
    this.material.setEmissiveFactor(this.mode==="on"&&this.prepared?
      [0.42*intensity,0.36*intensity,0.29*intensity]:[0,0,0]);
  }
  getState(){
    return {mode:this.mode,hasPhoto:!!this.prepared,options:{...this.options},
      material:this.profile.materialName,normalSupported:!!this.material?.normalTexture?.setTexture,
      emissiveSupported:!!this.material?.emissiveTexture?.setTexture};
  }
  dispose(){
    if(this.disposed)return;
    if(this.material){
      this.material.pbrMetallicRoughness.baseColorTexture.setTexture(null);
      this.material.normalTexture?.setTexture?.(null);
      this.material.emissiveTexture?.setTexture?.(null);
    }
    for(const texture of Object.values(this.textures||{})){
      texture.source.element.width=1;
      texture.source.element.height=1;
      texture.source.update();
    }
    this.renderCache.clear();
    this.prepared=null;this.lastResult=null;this.material=null;
    this.textures=null;this.viewer=null;this.disposed=true;
  }
}
