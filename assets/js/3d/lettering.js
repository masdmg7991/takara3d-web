/**
 * Texto personalizado pintado en texturas transparentes del modelo GLB.
 * El texto y su geometría giran con la pieza; no existe overlay SVG.
 * Los controles comerciales validan los datos antes de enviarlos.
 * Referencia visual: acabado de letras aprobado en v20.
 */
const SIDES=["top","right","bottom","left"];
const COLORS=Object.freeze({
  actual:"#C6A664",rosewood:"#602C24",ebano:"#2B211B",
  negro:"#151515","blanco-mate":"#EEE9E0"
});
function canonicalState(value){
  const state=value&&typeof value==="object"?value:{};
  const enabled=state.enabled===true;
  const selected=new Set(Array.isArray(state.selected_sides)?state.selected_sides:[]);
  const source=state.texts&&typeof state.texts==="object"?state.texts:{};
  const color=Object.hasOwn(COLORS,state.letter_color)?state.letter_color:"negro";
  const texts={};
  for(const side of SIDES){
    const value=enabled&&selected.has(side)?String(source[side]||""):"";
    texts[side]=Array.from(value.replace(/[\u0000-\u001F\u007F]/g,"").normalize("NFC")).slice(0,80).join("");
  }
  return {texts,color,enabled,format:state.format||"vertical"};
}

/*
 * Text is painted in true physical units. Each texture uses the same
 * 12 px/mm in both axes as the associated UV-mapped plane. This eliminates
 * horizontal / vertical glyph stretching without scaling the CAD mesh.
 * Los precios sólo proceden del catálogo; esta función mide geometría.
 */
const PX_PER_MM=12;
const FONT_FACE='Georgia, "Times New Roman", serif';
const FACE_WEIGHT=600;
const GEOMETRY_MM=Object.freeze({
  vertical:Object.freeze({
    top:[100,10],bottom:[100,10],left:[8,122],right:[8,122]
  }),
  horizontal:Object.freeze({
    top:[122,8],bottom:[122,8],left:[10,100],right:[10,100]
  })
});
function getPhysicalPlane(format,side){
  return (GEOMETRY_MM[format]||GEOMETRY_MM.vertical)[side];
}
function letterFont(ctx,pointPx){
  ctx.font=FACE_WEIGHT+" "+pointPx+"px "+FONT_FACE;
}
// Preserve the former editor's fixed-size safe-area contract. These are
// normalized measurements, not a second visual renderer. Long text stops at
// the boundary; it never earns more space by making the letters smaller.
export const FRAME_LETTER_SIZE_MM=6.6;
const EDITOR_FONT_PX=201*0.30;
const EDITOR_GEOMETRY=Object.freeze({
  vertical:{horizontal:748-2*30,vertical:998-2*34},
  horizontal:{horizontal:998-2*34,vertical:748-2*30}
});
export function frameTextMetrics(state,side){
  if(!SIDES.includes(side))throw new RangeError("Lado de texto desconocido");
  const value=String(state.texts?.[side]||"");
  const glyphs=Array.from(value);
  const vertical=side==="left"||side==="right";
  const geometry=EDITOR_GEOMETRY[state.format]||EDITOR_GEOMETRY.vertical;
  const maximum=geometry[vertical?"vertical":"horizontal"];
  let used=0;
  if(glyphs.length){
    if(vertical)used=EDITOR_FONT_PX+(glyphs.length-1)*EDITOR_FONT_PX*1.08;
    else{
      const ctx=document.createElement("canvas").getContext("2d");
      if(!ctx)throw new Error("No se ha podido medir el texto del marco.");
      ctx.font="700 "+EDITOR_FONT_PX+"px "+FONT_FACE;
      used=ctx.measureText(value).width+glyphs.length*EDITOR_FONT_PX*0.035;
    }
  }
  return {fits:used<=maximum,used,maximum,occupancy:Math.round(used/maximum*100)};
}
export function fitsFrameText(state){
  const normalized=canonicalState(state);
  return SIDES.every(side=>frameTextMetrics({...state,texts:normalized.texts},side).fits);
}
export function textPreviewPixels(state,side,canvas){
  if(!SIDES.includes(side))throw Error("Unknown text side: "+side);
  const normalized=canonicalState(state);
  const [wMm,hMm]=getPhysicalPlane(normalized.format,side);
  const width=wMm*PX_PER_MM,height=hMm*PX_PER_MM;
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("2D text canvas unavailable");
  ctx.clearRect(0,0,width,height);
  const value=normalized.texts[side];
  if(!value)return {side,drawn:false,width,height,planeMm:[wMm,hMm]};
  const fontMm=FRAME_LETTER_SIZE_MM;
  if(!frameTextMetrics({...state,texts:normalized.texts},side).fits)return {side,drawn:false,overfull:true,width,height,planeMm:[wMm,hMm]};
  const fontPx=Math.round(fontMm*PX_PER_MM);
  letterFont(ctx,fontPx);
  ctx.fillStyle=COLORS[normalized.color];
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  if(side==="left"||side==="right"){
    const letters=Array.from(value);
    const step=fontMm*PX_PER_MM*1.16;
    const first=height/2-(letters.length-1)*step/2;
    letters.forEach((ch,i)=>{
      if(ch!==" ")ctx.fillText(ch,width/2,first+i*step);
    });
  }else{
    // No maxWidth argument: browser must not compress the type horizontally.
    ctx.fillText(value,width/2,height/2);
  }
  return {side,drawn:true,width,height,text:value,color:normalized.color,
    fontMm,planeMm:[wMm,hMm],pixelsPerMm:PX_PER_MM};
}

export class FrameText3D {
  constructor(viewer){
    this.viewer=viewer;
    this.textures={};
    this.slots=[];
    this.lastKey="";
    this.lastResults={};
    this.initialized=false;
  }
  initialize(){
    const materials=this.viewer.model?.materials;
    if(!Array.isArray(materials))throw Error("GLB materials not loaded");
    for(const side of SIDES){
      const material=materials.find(m=>m.name==="FRAME_TEXT_"+side.toUpperCase());
      const slot=material?.pbrMetallicRoughness?.baseColorTexture;
      if(!slot?.setTexture)throw Error("Text band unavailable: "+side);
      if(material.getAlphaMode && material.getAlphaMode()!=="BLEND")
        throw Error("GLB text material must be alpha blended: "+side);
      const texture=this.viewer.createCanvasTexture();
      if(!texture?.source?.element||!(texture.source.element instanceof HTMLCanvasElement))
        throw Error("CanvasTexture not supported for text "+side);
      slot.setTexture(texture);
      this.slots.push(slot);
      material.pbrMetallicRoughness.setMetallicFactor(0);
      material.pbrMetallicRoughness.setRoughnessFactor(.90);
      this.textures[side]=texture;
    }
    this.initialized=true;
    this.setState({enabled:false,selected_sides:[],texts:{},letter_color:"negro",format:"vertical"});
  }
  setState(state){
    if(!this.initialized)return false;
    const canonical=canonicalState(state);
    const key=JSON.stringify(canonical);
    if(key===this.lastKey)return false;
    for(const side of SIDES){
      const texture=this.textures[side];
      this.lastResults[side]=textPreviewPixels(state,side,texture.source.element);
      texture.source.update();
    }
    this.lastKey=key;
    return true;
  }
  getSnapshot(){
    return {ready:this.initialized,...this.lastResults,
      activeSides:SIDES.filter(s=>this.lastResults[s]?.drawn)};
  }
  dispose(){
    for(const slot of this.slots)slot.setTexture(null);
    for(const texture of Object.values(this.textures)){
      texture.source.element.width=1;texture.source.element.height=1;
      texture.source.update();
    }
    this.slots=[];
    this.initialized=false;this.textures={};this.lastResults={};this.lastKey="";
  }
}
