import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FrameTextEditor} from "../assets/js/3d/text-editor.js";

const catalog=JSON.parse(readFileSync(new URL("../assets/data/catalogo.json",import.meta.url),"utf8"));
class Element {
  constructor(){this.handlers={};this.attributes={};this.dataset={};
    this.checked=false;this.value="";this.textContent="";this.hidden=false;
    this.focused=false;this.style={};
    const classes=new Set();
    this.classList={toggle(name,on){on?classes.add(name):classes.delete(name);},contains(name){return classes.has(name);}};
  }
  addEventListener(name,callback){(this.handlers[name]??=[]).push(callback);}
  trigger(name,payload={}){
    const event={target:this,preventDefault(){this.prevented=true;},
      stopImmediatePropagation(){this.stopped=true;},...payload};
    for (const handler of this.handlers[name]||[]) handler(event);
    return event;
  }
  setAttribute(name,value){this.attributes[name]=value;}
  getAttribute(name){return this.attributes[name]||"";}
  removeAttribute(name){delete this.attributes[name];}
  focus(){this.focused=true;}
}
const enabled=new Element(),editorEl=new Element(),hidden=new Element();
const help=new Element(),selection=new Element(),price=new Element(),contrast=new Element();
help.textContent="Escribe una frase corta que quepa en el marco.";
const input=Object.fromEntries(["top","right","bottom","left"].map(x=>[x,new Element()]));
const wraps=Object.fromEntries(Object.keys(input).map(x=>[x,new Element()]));
const buttons=Object.fromEntries(Object.keys(input).map(x=>[x,new Element()]));
for (const side of Object.keys(input)){
  input[side].attributes["data-takara-frame-text-input"]=side;
  buttons[side].attributes["data-takara-frame-side-toggle"]=side;
}
const colors=Object.fromEntries(["actual","rosewood","ebano","negro","blanco-mate"].map(x=>[x,new Element()]));
for (const [name,element] of Object.entries(colors))element.value=name;
const root={
 querySelector(selector){
  if (selector==="[data-takara-frame-text-enabled]")return enabled;
  if (selector==="[data-takara-frame-text-editor]")return editorEl;
  if (selector===".takara-frame-text-help")return help;
  if (selector==="[data-takara-frame-text-selection]")return selection;
  if (selector==="[data-takara-frame-text-price]")return price;
  if (selector==="[data-takara-frame-text-contrast]")return contrast;
  let m=selector.match(/data-takara-frame-text-(input|field)="(\w+)"/);
  return m?.[1]==="input"?input[m[2]]:m?.[1]==="field"?wraps[m[2]]:null;
 },
 querySelectorAll(selector){
  if (selector==="[data-takara-frame-side-toggle]")return Object.values(buttons);
  if (selector==="[data-takara-frame-text-input]")return Object.values(input);
  if (selector==='input[name="color_texto_marco"]')return Object.values(colors);
  return [];
 }
};
const form={
 handlers:{},addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);},
 querySelector(s){
  if(s==='[name="personalizacion_marco"]')return hidden;
  if(s==='input[name="color_marco"]:checked')return {value:"actual"};
  return null;
 }
};
const originalDocument=globalThis.document,originalWindow=globalThis.window,originalCustom=globalThis.CustomEvent;
globalThis.document={createElement:()=>({getContext:()=>({
  font:"",measureText:text=>({width:String(text).length*30})
})})};
globalThis.window={dispatchEvent(){}};
globalThis.CustomEvent=class {constructor(name,opts){this.type=name;this.detail=opts.detail;}};
const messages=[];
try {
 const text=new FrameTextEditor(root,form,s=>messages.push(s));
 assert.equal(hidden.value,"");
 await text.loadCatalog({loadCatalog:async()=>catalog});
 enabled.checked=true;enabled.trigger("change");
 assert.equal(text.valid,true,"Activar el editor sin elegir lados conserva el pedido sin texto");
 buttons.top.trigger("click");
 assert.equal(text.valid,false,"Una selección incompleta no debe poder enviarse");
 const blocked={prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
 form.handlers.submit[0](blocked);
 assert.equal(blocked.prevented,true);
 assert.equal(blocked.stopped,true);
 input.top.value="TAKARA";input.top.trigger("input");
 assert.equal(text.valid,true);
 let payload=JSON.parse(hidden.value);
 assert.equal(payload.numero_lados,1);
 assert.equal(payload.suplemento_unitario_eur,"4.00");
 assert.equal(payload.lados.top,"TAKARA");
 assert.equal(price.textContent,"+4 €");
 assert.equal(help.textContent,"Escribe una frase corta que quepa en el marco.");
 text.setFormat("horizontal");
 payload=JSON.parse(hidden.value);
 assert.equal(payload.geometry_contract,"FRAME_TEXT_GEOMETRY_HORIZONTAL_V1");
 buttons.right.trigger("click");
 input.right.value="2026";input.right.trigger("input");
 payload=JSON.parse(hidden.value);
 assert.equal(payload.numero_lados,2);
 assert.equal(payload.suplemento_unitario_eur,"6.00");
 assert.equal(payload.lados.right,"2026");
 colors.rosewood.checked=true;colors.rosewood.trigger("change");
 payload=JSON.parse(hidden.value);
 assert.equal(payload.color_texto,"rosewood");
 assert.ok(messages.some(m=>m.selected_sides.length===2 && m.format==="horizontal"));
 enabled.checked=false;enabled.trigger("change");
 assert.equal(hidden.value,"");
 assert.equal(text.getState().enabled,false);
 assert.equal(text.getState().selected_sides.length,0);
 console.log("TAKARA_3D_EDITOR_CONTRACT_OK (DOM simulado, sin verificación visual)");
} finally {
 globalThis.document=originalDocument;
 globalThis.window=originalWindow;
 globalThis.CustomEvent=originalCustom;
}
