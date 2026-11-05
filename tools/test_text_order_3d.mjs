import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {buildFrameTextOrder,normalizeFrameText} from "../assets/js/3d/text-order.js";

const catalog=JSON.parse(readFileSync(new URL("../assets/data/catalogo.json",import.meta.url),"utf8"));
const orderScript=readFileSync(new URL("../assets/js/takara-pedido-web.js",import.meta.url),"utf8");
const sandbox={window:{},document:{addEventListener(){}},console};
vm.runInNewContext(orderScript,sandbox);
const parse=sandbox.window.TAKARA_FRAME_TEXT_ORDER_V1.parse;
let checks=0;
function test(name,run){run();checks++;console.log("[PASS] "+name);}
const make=(format,sides,texts,color="negro")=>({
  enabled:true,format,selected_sides:sides,texts,letter_color:color
});
test("Sin texto produce null, no un suplemento artificial",()=>{
  assert.equal(buildFrameTextOrder({enabled:false},catalog),null);
});
for (const format of ["vertical","horizontal"]) {
  for (let count=1;count<=4;count++) {
    const sides=["top","right","bottom","left"].slice(0,count);
    const texts=Object.fromEntries(sides.map(side=>[side,"RECUERDO 2026"]));
    const payload=buildFrameTextOrder(make(format,sides,texts,"rosewood"),catalog);
    const accepted=parse(JSON.stringify(payload),format);
    assert.equal(accepted.numero_lados,count);
    assert.equal(accepted.orientacion,format);
    assert.equal(accepted.suplemento_unitario_eur,payload.suplemento_unitario_eur);
    assert.equal(accepted.color_texto,"rosewood");
    assert.deepEqual(JSON.parse(JSON.stringify(accepted.lados)),texts);
    test("Backend-client acepta "+format+" con "+count+" lados",()=>{});
  }
}
test("Unicode y espacios normalizados",()=>{
  assert.equal(normalizeFrameText("  Mi   sueño\n  "),"Mi sueño");
});
test("Color desconocido rechazado",()=>{
  assert.throws(()=>buildFrameTextOrder(make("vertical",["top"],{top:"A"},"azul"),catalog),/Color/);
});
test("Precio ausente falla cerrado",()=>{
  const copy=structuredClone(catalog);
  copy.productos[0].extras=[];
  assert.throws(()=>buildFrameTextOrder(make("vertical",["top"],{top:"A"}),copy),/precio/);
});
test("Lados duplicados rechazados",()=>{
  assert.throws(()=>buildFrameTextOrder(make("vertical",["top","top"],{top:"A"}),catalog),/lado/);
});
test("Texto vacío en lado elegido rechazado",()=>{
  assert.throws(()=>buildFrameTextOrder(make("vertical",["top"],{top:""}),catalog),/Texto|texto/);
});
test("Más de 40 caracteres rechazados",()=>{
  assert.throws(()=>buildFrameTextOrder(make("vertical",["top"],{top:"X".repeat(41)}),catalog),/40/);
});
test("No se permiten geometrías no declaradas",()=>{
  assert.throws(()=>buildFrameTextOrder(make("cuadrado",["top"],{top:"A"}),catalog),/Formato/);
});
console.log("TAKARA_3D_TEXT_ORDER_OK "+checks+" comprobaciones");
