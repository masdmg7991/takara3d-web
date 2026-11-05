/** Page adapter. The form owns the order; the viewer receives its configuration. */
import { ProductViewer } from "./product-viewer.js";
import { MARCO_PRODUCT } from "./marco-product.js";
import { FrameTextEditor } from "./text-editor.js";

const form = document.querySelector("[data-takara-pedido-form]");
const stage = document.querySelector("[data-takara-product-stage]");
const status = document.querySelector("[data-takara-product-status]");
const retry = document.querySelector("[data-takara-product-retry]");
let engine;
let editor;
let invalidPhoto = "";
let detectedPhoto = null;
let loadingStatusTimer;
let initializationError = "";

function showState(snapshot) {
  if(initializationError)snapshot={...snapshot,ready:false,error:initializationError};
  stage.setAttribute("aria-busy", String(!snapshot.ready || snapshot.capturing));
  clearTimeout(loadingStatusTimer);
  if(snapshot.error||snapshot.capturing||!snapshot.details)status.hidden=false;
  else if(snapshot.ready)status.hidden=true;
  else loadingStatusTimer=setTimeout(()=>{if(!engine.ready)status.hidden=false;},200);
  status.textContent = snapshot.error
    ? snapshot.errorCode === "INVALID_PHOTO" ? snapshot.error
    : `${snapshot.error} Conservaremos tu foto original; la vista 3D no está disponible.`
    : snapshot.capturing ? "Preparando la imagen de tu pedido…"
    : !snapshot.ready ? "Preparando tu producto en 3D…"
    : "Gira el marco para ver los detalles. Puedes ampliar con dos dedos.";
  status.dataset.state = snapshot.error ? "error" : "info";
  retry.hidden = !snapshot.error;
  if (snapshot.ready && engine?.state.photo && detectedPhoto !== engine.state.photo && snapshot.details?.photoSize) {
    detectedPhoto = engine.state.photo;
    const { width, height } = snapshot.details.photoSize;
    setFormat(width >= height ? "horizontal" : "vertical");
  }
}

function photo() { return form.querySelector("[data-takara-photo-input]").files[0] || null; }

function assertOrderReady(file) {
  if (!editor || !engine) throw new Error("El personalizador todavía no está preparado. Recarga la página.");
  if (invalidPhoto) throw new Error(invalidPhoto);
  if (engine.getSnapshot().errorCode === "INVALID_PHOTO") throw new Error(engine.error);
  if (!editor.valid) throw new Error(editor.error || "Revisa los textos del marco.");
  if (file !== engine.state.photo) throw new Error("La fotografía ha cambiado. Espera a que se actualice.");
}

async function initialize() {
  if (!form || !stage) return;
  try {
    // Dynamic import makes a dependency failure visible and recoverable.
    await import("../../vendor/model-viewer/model-viewer.min.js");
    engine = new ProductViewer(stage, MARCO_PRODUCT, showState);
    editor = new FrameTextEditor(document.querySelector("[data-takara-frame-text-config]"), form, text => {
      engine.update({ text: Object.freeze({ ...text, texts: Object.freeze({ ...text.texts }),
        selected_sides: Object.freeze([...text.selected_sides]) }) });
    });
    await editor.loadCatalog();
    bindControls();
    const color = form.querySelector('input[name="color_marco"]:checked')?.value || "actual";
    engine.update({ color });
    for (const choice of document.querySelectorAll("[data-takara-color-proxy]")) choice.checked = choice.value === color;
    window.TAKARA_PRODUCT_PREVIEW = Object.freeze({
      getSnapshot: () => engine.getSnapshot(),
      assertOrderReady,
      async capture(file) {
        assertOrderReady(file);
        if (engine.error) throw new Error(engine.error);
        // Freeze visible configuration while the fixed order camera is active.
        const controls = [...document.querySelectorAll(".takara-preview-config-panel input, .takara-preview-config-panel button, [data-takara-litho-mode], [data-takara-product-reset]")];
        const disabled = controls.map(node => node.disabled);
        controls.forEach(node => { node.disabled = true; });
        try { return await engine.capture(); }
        catch (error) {
          status.hidden=false;
          status.textContent = "No se ha podido preparar la ficha 3D. Conservamos tu fotografía y los datos del pedido.";
          status.dataset.state = "error";
          throw error;
        }
        finally { controls.forEach((node, i) => { node.disabled = disabled[i]; }); }
      }
    });
    const initial = form.querySelector('[name="formato"]').value;
    setFormat(initial);
    if (photo()) await changePhoto();
  } catch (error) {
    initializationError="No se ha podido iniciar el personalizador. Comprueba tu conexión y reintenta la carga.";
    showState({ ready: false, error: initializationError });
    retry.hidden = false;
  }
}

function setFormat(variant) {
  if (!["vertical", "horizontal"].includes(variant)) return;
  form.querySelector('[name="formato"]').value = variant;
  engine.update({ variant });
  editor.setFormat(variant);
  stage.dataset.format = variant;
  form.querySelector("[data-takara-file-format]").textContent = variant === "horizontal" ? "Horizontal" : "Vertical";
  for (const card of document.querySelectorAll("[data-takara-format-card], [data-takara-format-proxy]")) {
    const active = (card.dataset.takaraFormatCard || card.dataset.takaraFormatProxy) === variant;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", String(active));
  }
  document.querySelector("[data-takara-preview-title]").textContent = `Marco ${variant}`;
  form.querySelector('[name="formato"]').dispatchEvent(new Event("change", { bubbles: true }));
}

async function changePhoto() {
  invalidPhoto = "";
  stage.dataset.invalidPhoto = "false";
  try { engine.update({ photo: photo() }); }
  catch (error) {
    invalidPhoto = error.message;
    status.hidden=false;
    stage.dataset.invalidPhoto = "true";
    status.textContent = error.message;
    status.dataset.state = "error";
  }
  const name = form.querySelector("[data-takara-file-name]");
  name.textContent = photo()?.name || "Sin foto subida";
  name.title = photo()?.name || "";
  form.querySelector("[data-takara-file-box]").hidden = !photo();
}

function bindControls() {
  // View-only preference: it does not change the product, price or order image.
  const backgrounds=[...document.querySelectorAll("[data-takara-background]")];
  for(const button of backgrounds){
    button.addEventListener("click",()=>{
      stage.dataset.background=button.dataset.takaraBackground;
      for(const option of backgrounds)option.setAttribute("aria-pressed",String(option===button));
    });
  }
  for (const card of document.querySelectorAll("[data-takara-format-card]")) {
    card.addEventListener("click", () => setFormat(card.dataset.takaraFormatCard));
  }
  form.querySelector("[data-takara-photo-input]").addEventListener("change", changePhoto);
  for (const color of form.querySelectorAll('input[name="color_marco"]')) {
    color.addEventListener("change", () => {
      if (color.checked) engine.update({ color: color.value });
      editor.refresh();
    });
  }
  for (const button of document.querySelectorAll("[data-takara-litho-mode]")) {
    button.addEventListener("click", () => {
      engine.update({ light: button.dataset.takaraLithoMode });
      for (const item of document.querySelectorAll("[data-takara-litho-mode]")) {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      }
    });
  }
  retry.addEventListener("click", () => engine.retry());
  document.querySelector("[data-takara-product-reset]").addEventListener("click", async () => {
    engine.viewer.setAttribute("camera-orbit", engine.variant.camera);
    engine.viewer.setAttribute("camera-target", "auto auto auto");
    engine.viewer.setAttribute("field-of-view", "auto");
    await engine.viewer.updateComplete;
    engine.viewer.jumpCameraToGoal();
  });
  window.addEventListener("pagehide", event => { if (!event.persisted) engine.dispose(); });
}

retry?.addEventListener("click", () => { if (!window.TAKARA_PRODUCT_PREVIEW) location.reload(); });
initialize();
