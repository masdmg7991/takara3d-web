/**
 * Editor de letras para el visor 3D. Usa los controles existentes del pedido,
 * pero NUNCA crea un overlay SVG ni depende del renderizador visual 2D.
 * El catálogo decide el suplemento y el backend valida el pedido.
 */
import {fitsFrameText,frameTextMetrics} from "./lettering.js";
import {buildFrameTextOrder,quoteFrameTextSupplement} from "./text-order.js";

const SIDES=["top","right","bottom","left"];

export class FrameTextEditor {
  constructor(root, form, onChange) {
    if (!root?.querySelector || !form?.querySelector || typeof onChange!=="function") {
      throw new TypeError("El editor necesita controles, formulario y receptor 3D.");
    }
    this.root=root;
    this.form=form;
    this.onChange=onChange;
    this.enabled=root.querySelector("[data-takara-frame-text-enabled]");
    this.editor=root.querySelector("[data-takara-frame-text-editor]");
    this.payload=form.querySelector('[name="personalizacion_marco"]');
    if (!this.enabled || !this.editor || !this.payload) {
      throw new Error("Faltan controles del editor de texto.");
    }
    let restored=null;
    try { restored=JSON.parse(this.payload.value||"null"); } catch { /* Fresh state below. */ }
    if (restored?.version!=="TAKARA_FRAME_TEXT_V1_4") restored=null;
    const selected=this.enabled.checked?SIDES.filter(side=>Object.hasOwn(restored?.lados||{},side)):[];
    this.state={
      enabled:this.enabled.checked,
      format:form.querySelector('[name="formato"]')?.value||"vertical",
      letter_color:root.querySelector('input[name="color_texto_marco"]:checked')?.value||"negro",
      selected_sides:selected,
      texts:Object.fromEntries(SIDES.map(side=>[side,this.#field(side)?.value||restored?.lados?.[side]||""]))
    };
    for (const side of SIDES) { const field=this.#field(side); if(field)field.value=this.state.texts[side]; }
    this.activeSide=selected[0]||null;
    this.catalog=null;
    this.helpText=root.querySelector(".takara-frame-text-help")?.textContent||"";
    this.valid=true;
    this.error="";
    this._onSubmit=event=>{
      if (!this.valid && this.state.enabled && this.state.selected_sides.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#showError();
      }
    };
    this.form.addEventListener("submit",this._onSubmit,true);
    this.#bind();
    this.#render();
  }
  async loadCatalog(api=window.TAKARA_CATALOGO_CORE_V1) {
    if (!api?.loadCatalog) throw new Error("Catálogo de pedidos no disponible.");
    try {
      this.catalog=await api.loadCatalog();
      this.#render();
    } catch(error) {
      this.catalog=null;
      this.error="No se ha podido comprobar el precio del texto. Reintenta la carga.";
      this.#render();
      throw error;
    }
  }
  #field(side) {
    return this.root.querySelector('[data-takara-frame-text-input="'+side+'"]');
  }
  #bind() {
    this.enabled.addEventListener("change",()=>{
      this.state.enabled=this.enabled.checked;
      if (!this.state.enabled) {
        this.state.selected_sides=[];
        this.activeSide=null;
        for (const side of SIDES) {
          this.state.texts[side]="";
          const field=this.#field(side);
          if (field) field.value="";
        }
      }
      this.#render();
    });
    for (const button of this.root.querySelectorAll("[data-takara-frame-side-toggle]")) {
      button.addEventListener("click",()=>{
        const side=button.getAttribute("data-takara-frame-side-toggle");
        if (!SIDES.includes(side)) return;
        const active=this.state.selected_sides;
        if (active.includes(side) && this.activeSide===side) {
          this.state.selected_sides=active.filter(s=>s!==side);
          this.state.texts[side]="";
          const field=this.#field(side);
          if (field) field.value="";
          this.activeSide=this.state.selected_sides[0]||null;
        } else {
          if (!active.includes(side)) active.push(side);
          this.activeSide=side;
        }
        this.#render();
        this.#field(this.activeSide)?.focus();
      });
    }
    for (const field of this.root.querySelectorAll("[data-takara-frame-text-input]")) {
      field.addEventListener("input",()=>{
        const side=field.getAttribute("data-takara-frame-text-input");
        if (!SIDES.includes(side)) return;
        // Preserve spaces while typing; the commercial serializer trims on submit.
        const characters=Array.from(field.value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g," ").replace(/^\s+/,"").normalize("NFC"));
        let text=characters.slice(0,40).join("");
        const fits=value=>fitsFrameText({...this.state,selected_sides:[side],texts:{[side]:value}});
        while (text && !fits(text)) text=Array.from(text).slice(0,-1).join("").replace(/\s+$/,"");
        const limited=text!==characters.join("");
        if (limited) {
          field.dataset.limitReached="true";
        } else delete field.dataset.limitReached;
        this.state.texts[side]=text;
        if (field.value!==text) field.value=text;
        this.#render();
      });
    }
    for (const color of this.root.querySelectorAll('input[name="color_texto_marco"]')) {
      color.addEventListener("change",()=>{
        if (!color.checked) return;
        this.state.letter_color=color.value;
        this.#render();
      });
    }
  }
  setFormat(format) {
    if (format!=="vertical" && format!=="horizontal") {
      throw new RangeError("Formato de marco desconocido.");
    }
    if (format!==this.state.format) {
      this.state.format=format;
      for (const side of SIDES) {
        let value=this.state.texts[side];
        while(value&&!frameTextMetrics(this.state,side).fits){
          value=Array.from(value).slice(0,-1).join("").replace(/\s+$/,"");
          this.state.texts[side]=value;
        }
        const input=this.#field(side);
        if(input&&input.value!==value){input.value=value;input.dataset.limitReached="true";}
      }
      this.#render();
    }
  }
  refresh() { this.#render(); }
  getState() {
    return {
      enabled:this.state.enabled,format:this.state.format,
      selected_sides:[...this.state.selected_sides],
      texts:{...this.state.texts},letter_color:this.state.letter_color
    };
  }
  #showError() {
    const note=this.root.querySelector(".takara-frame-text-help");
    if (!note) return;
    note.textContent=this.error||"Revisa el texto del marco antes de continuar.";
    note.setAttribute("role","alert");
  }
  #render() {
    const st=this.getState();
    this.editor.hidden=!st.enabled;
    for (const button of this.root.querySelectorAll("[data-takara-frame-side-toggle]")) {
      const side=button.getAttribute("data-takara-frame-side-toggle");
      const selected=st.enabled&&st.selected_sides.includes(side);
      const editing=selected&&this.activeSide===side;
      button.classList.toggle("is-active",selected);
      button.classList.toggle("is-editing",editing);
      button.setAttribute("aria-pressed",String(selected));
      const label={top:"Superior",right:"Derecho",bottom:"Inferior",left:"Izquierdo"}[side];
      button.setAttribute("aria-label",label+(selected?(editing?": en edición; pulsa para quitar":": incluido; pulsa para editar"):": pulsa para añadir"));
    }
    for (const side of SIDES) {
      const field=this.root.querySelector('[data-takara-frame-text-field="'+side+'"]');
      if (field) field.hidden=!st.enabled || this.activeSide!==side;
      this.#updateFieldStatus(side,st);
    }
    const count=st.enabled?st.selected_sides.length:0;
    let price=count===0?"0.00":null;
    let payload=null;
    let error="";
    try {
      if (count) {
        price=quoteFrameTextSupplement(this.catalog,count);
        if (!fitsFrameText(st)) throw new Error("La frase no cabe en el marco: acórtala.");
        if(st.selected_sides.some(side=>!st.texts[side].trim()))throw new Error("Escribe el texto de los lados seleccionados.");
        payload=buildFrameTextOrder(st,this.catalog);
      }
    } catch(e) {
      error=e.message;
    }
    this.valid=!error;
    this.error=error;
    this.payload.value=payload?JSON.stringify(payload):"";
    const selection=this.root.querySelector("[data-takara-frame-text-selection]");
    if (selection) selection.textContent=count===0?"Selecciona los lados":
      count+(count===1?" lado seleccionado":" lados seleccionados");
    const priceNode=this.root.querySelector("[data-takara-frame-text-price]");
    if (priceNode) priceNode.textContent=price===null?"Precio pendiente":"+"+Number(price).toFixed(0)+" €";
    const contrast=this.root.querySelector("[data-takara-frame-text-contrast]");
    if (contrast) {
      const frameColor=this.form.querySelector('input[name="color_marco"]:checked')?.value;
      contrast.hidden=frameColor!==st.letter_color;
      contrast.textContent=contrast.hidden?"":"Marco y letras comparten color: el contraste será discreto.";
    }
    if (error && st.enabled && price===null) this.#showError();
    else {
      const note=this.root.querySelector(".takara-frame-text-help");
      if (note) {
        note.textContent=this.helpText;
        note.removeAttribute("role");
      }
    }
    this.onChange(st);
    // Contract event: the delivery calculator recomputes from the hidden
    // payload; this is not an image-preview or secondary render event.
    window.dispatchEvent(new CustomEvent("takara:frame-text-change",{detail:st}));
  }
  #updateFieldStatus(side,state) {
    const input=this.#field(side);
    const status=this.root.querySelector('[data-takara-frame-text-status="'+side+'"]');
    if(!input)return;
    const selected=state.enabled&&state.selected_sides.includes(side);
    input.required=selected;
    if(!selected){input.setCustomValidity?.("");return;}
    const metrics=frameTextMetrics(state,side);
    let message="",kind="ok",validity="";
    if(!state.texts[side]){
      message="Escribe el texto para este lado.";kind="error";validity=message;
    }else if(!metrics.fits){
      message="La frase es demasiado larga y alcanzaría las esquinas.";kind="error";validity=message;
    }else if(input.dataset.limitReached==="true"){
      message="Has alcanzado el límite seguro de este lado.";kind="limit";
    }else if(metrics.occupancy>=99){
      message="Límite seguro alcanzado. No admite más texto.";kind="limit";
    }else if(metrics.occupancy>=85){
      message="Ocupa el "+metrics.occupancy+"% de la zona segura. Queda poco espacio.";kind="warning";
    }else message="Ocupa el "+metrics.occupancy+"% de la zona segura.";
    input.setCustomValidity?.(validity);
    if(status){status.textContent=message;status.dataset.state=kind;status.setAttribute("role","status");}
  }
}
