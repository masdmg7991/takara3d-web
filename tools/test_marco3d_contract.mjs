/**
 * Pruebas deterministas del contrato 3D sin WebGL ni servicios externos.
 * No se consideran sustituto de la prueba visual en Chrome.
 */
import assert from "node:assert/strict";
import {MARCO} from "../assets/js/3d/marco.js";
import {ProductViewer} from "../assets/js/3d/product-viewer.js";
import {MARCO_PRODUCT} from "../assets/js/3d/marco-product.js";
import {captureModelJpeg} from "../assets/js/3d/capture.js";

let checks = 0;
function check(test, detail) {
  test();
  checks++;
  console.log("[PASS] " + detail);
}

check(() => assert.equal(MARCO.productCode, "MARCO_LITOFANIA_144X108"),
  "Contrato con el código de producto comercial");
check(() => assert.deepEqual(Object.keys(MARCO.models).sort(), ["horizontal","vertical"]),
  "Solo dos GLB aprobados; ninguna variante experimental");
check(() => assert.deepEqual(MARCO.models,{
  vertical:"assets/models/marco/vertical.glb?v=back-normals-1",
  horizontal:"assets/models/marco/horizontal.glb"
}), "Ruta final única para cada formato");
check(() => assert.deepEqual(Object.keys(MARCO.colors), [
  "actual","rosewood","ebano","negro","blanco-mate"
]),"Cinco colores aprobados");
check(() => assert.deepEqual(MARCO.colors.actual,
  [0.637596874,0.456411023,0.181164244,1]),"Poplar v20 exacto");
check(() => assert.deepEqual(MARCO.colors.rosewood,
  [0.116970668,0.025186860,0.017641954,1]),"Rosewood aprobado");
check(() => assert.deepEqual(MARCO.colors.ebano,
  [0.024157632,0.015208514,0.010960094,1]),"Ébano original GitHub");
check(() => assert.deepEqual(MARCO.colors.negro,
  [0.007499032,0.007499032,0.007499032,1]),"Negro original GitHub");
check(() => assert.deepEqual(MARCO.colors["blanco-mate"],
  [0.854992608,0.814846572,0.745404210,1]),"Blanco mate original GitHub");
check(() => assert.deepEqual(MARCO.roughness,{
  actual:0.94,rosewood:0.94,ebano:0.95,negro:0.96,"blanco-mate":1.0
}),"Rugosidades iguales a v20");

const oldHTMLElement=globalThis.HTMLElement;
const oldDocument=globalThis.document;
class FakeHtmlElement {
  constructor(){this.listeners=new Map();this.attributes=new Map();this.style={};this.children=[];this.removed=false;}
  addEventListener(name,callback){this.listeners.set(name,callback);}
  removeEventListener(name){this.listeners.delete(name);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)||null;}
  appendChild(child){this.children.push(child);}
  remove(){this.removed=true;}
}
globalThis.HTMLElement=FakeHtmlElement;
globalThis.document={createElement:()=>new FakeHtmlElement()};
try {
  const notifications=[];
  const stage=new FakeHtmlElement();
  const app=new ProductViewer(stage,MARCO_PRODUCT,state=>notifications.push(state));
  check(()=>assert.equal(stage.children[0],app.viewer),"Único elemento 3D adjuntado");
  check(()=>assert.equal(app.getSnapshot().ready,false),"No declara listo sin GLB cargado");
  check(()=>assert.equal(app.viewer.style.opacity,"0"),"Oculta GLB todavía no validado");
  check(()=>assert.equal(app.getSnapshot().model,MARCO.models.vertical),"Carga el vertical inicial");
  app.update({variant:"horizontal"});
  check(()=>assert.equal(app.getSnapshot().model,MARCO.models.horizontal),"Cambio de formato sin 2D");
  check(()=>assert.equal(app.getSnapshot().ready,false),"No simula que el nuevo GLB está listo");
  app.update({color:"ebano"});
  check(()=>assert.equal(app.getSnapshot().state.color,"ebano"),"Estado de color único");
  app.update({light:"off"});
  check(()=>assert.equal(app.getSnapshot().state.light,"off"),"Modo de luz único");
  app.update({text:{enabled:true,selected_sides:["top"],texts:{top:"TAKARA"},letter_color:"negro"}});
  check(()=>assert.equal(app.state.variant,"horizontal"),"Estado de letras vinculado a orientación");
  check(()=>assert.equal(app.state.text.texts.top,"TAKARA"),"Contenido de texto retenido al cargar");
  check(()=>assert.throws(()=>app.update({variant:"other"}),RangeError),"Formato inválido rechazado");
  check(()=>assert.throws(()=>app.update({color:"azul"}),RangeError),"Color no comercial rechazado");
  check(()=>assert.throws(()=>app.update({light:"invalid"}),RangeError),"Modo de luz inválido rechazado");
  check(()=>assert.ok(notifications.length>=5),"Eventos de estado observables");
  const removedViewer=app.viewer;
  app.dispose();
  check(()=>assert.equal(removedViewer.removed,true),"Recurso visual retirado al cerrar");
  check(()=>assert.throws(()=>app.update({color:"actual"}),/cerrado/),"No se aceptan mutaciones tras cerrar");
} finally {
  globalThis.HTMLElement=oldHTMLElement;
  globalThis.document=oldDocument;
}

const oldBitmap=globalThis.createImageBitmap;
globalThis.createImageBitmap=async ()=>({width:300,height:160,close(){}});
globalThis.document={
  createElement:()=>({
    width:0,height:0,
    getContext:()=>({
      fillStyle:"",
      fillRect(){},
      drawImage(){}
    }),
    toBlob(callback,mime){
      callback(new Blob([new Uint8Array(512).fill(255)],{type:mime}));
    }
  })
};
try {
  await assert.rejects(captureModelJpeg(null),/modelo 3D todavía/);
  checks++;
  console.log("[PASS] Captura no acepta visor inexistente");
  const viewer={
    loaded:true,model:{},
    toBlob:async ({mimeType})=>new Blob([new Uint8Array(1024).fill(5)],{type:mimeType})
  };
  const result=await captureModelJpeg(viewer);
  check(()=>assert.deepEqual([result.width,result.height],[300,160]),"Relación de aspecto conservada");
  check(()=>assert.equal(result.blob.type,"image/jpeg"),"Resultado tipificado como JPG");
  await assert.rejects(captureModelJpeg(viewer,{background:"not-css"}),/Parámetros/);
  checks++;
  console.log("[PASS] Fondo no validado rechazado");
  globalThis.document={
    createElement:()=>({
      getContext:()=>({fillRect(){},drawImage(){}}),
      toBlob(callback,mime){callback(new Blob([new Uint8Array(1500)],{type:mime}));}
    })
  };
  await assert.rejects(captureModelJpeg(viewer,{maxBytes:1024}),/límite de tamaño/);
  checks++;
  console.log("[PASS] Ficha mayor que límite de correo rechazada sin entregar blob");
} finally {
  globalThis.createImageBitmap=oldBitmap;
  globalThis.document=oldDocument;
}
console.log("TAKARA_MARCO3D_CONTRACT_OK "+checks+" comprobaciones (sin WebGL)");
