/** Form adapter: product capabilities and drafts, one shared viewer. */
import { ProductViewer } from "./product-viewer.js";
import { PRODUCTS, ProductDrafts } from "./products.js";
import { FrameTextEditor } from "./text-editor.js";

const form = document.querySelector("[data-takara-pedido-form]");
const stage = document.querySelector("[data-takara-product-stage]");
const status = document.querySelector("[data-takara-product-status]");
const retry = document.querySelector("[data-takara-product-retry]");
const drafts = new ProductDrafts();
const photoErrors = new Map(), thumbnailUrls = new Map();
let engine, editor, detectedPhoto, loadingStatusTimer;
let invalidPhoto = "", initializationError = "", generation = 0;

function showState(snapshot) {
  if (initializationError || invalidPhoto) snapshot = { ...snapshot, ready: false,
    error: initializationError || invalidPhoto, errorCode: invalidPhoto ? "INVALID_PHOTO" : "INITIALIZATION" };
  stage.setAttribute("aria-busy", String(!snapshot.ready || snapshot.capturing));
  clearTimeout(loadingStatusTimer);
  if (snapshot.error || snapshot.capturing || !snapshot.details) status.hidden = false;
  else if (snapshot.ready) status.hidden = true;
  else loadingStatusTimer = setTimeout(() => { if (!engine?.ready) status.hidden = false; }, 200);
  status.textContent = snapshot.error
    ? snapshot.errorCode === "INVALID_PHOTO" ? snapshot.error
      : `${snapshot.error} Conservaremos tus fotos originales; la vista 3D no está disponible.`
    : snapshot.capturing ? "Preparando la imagen de tu pedido…"
      : !snapshot.ready ? "Preparando tu producto en 3D…"
        : "Gira el producto para ver los detalles. Puedes ampliar con dos dedos.";
  status.dataset.state = snapshot.error ? "error" : "info";
  retry.hidden = !snapshot.error || !!invalidPhoto;
  if (drafts.product.hasFormat && snapshot.ready && engine?.state.photo &&
      detectedPhoto !== engine.state.photo && snapshot.details?.photoSize) {
    detectedPhoto = engine.state.photo;
    const { width, height } = snapshot.details.photoSize;
    setFormat(width >= height ? "horizontal" : "vertical");
  }
}

function photo() { return form.querySelector("[data-takara-photo-input]").files[0] || null; }
function files() {
  return drafts.product.hasFormat ? [photo()] : drafts.product.photoFaces.map(face =>
    document.querySelector(`[data-takara-caja-photo="${face}"]`).files[0] || null);
}
function selection() {
  return Object.freeze({ key: drafts.current, code: drafts.product.code, variant: engine.state.variant,
    faces: drafts.product.photoFaces, files: files(), hasText: drafts.product.hasText,
    bodyColor: engine.state.color, baseColor: engine.state.baseColor || null });
}
function snapshot() { return { ...engine.getSnapshot(), revision: generation * 1000000 + engine.revision }; }
function update(patch) { drafts.update(patch); engine.update(patch); }

function assertOrderReady(expected) {
  if (!editor || !engine) throw new Error("El personalizador todavía no está preparado. Recarga la página.");
  if (invalidPhoto) throw new Error(invalidPhoto);
  if (engine.getSnapshot().errorCode === "INVALID_PHOTO") throw new Error(engine.error);
  if (drafts.product.hasText && !editor.valid) throw new Error(editor.error || "Revisa los textos del marco.");
  const current = files();
  if (current.some(file => !file)) throw new Error(drafts.product.hasFormat
    ? "Sube una foto antes de continuar." : "Añade una foto a cada una de las cuatro caras.");
  const reference = Array.isArray(expected) ? expected : [expected];
  if (reference.length !== current.length || reference.some((file, i) => file !== current[i])) {
    throw new Error("Las fotografías han cambiado. Espera a que se actualicen.");
  }
  const rendered = drafts.product.hasFormat ? [engine.state.photo]
    : drafts.product.photoFaces.map(face => engine.state.photos[face]);
  if (rendered.some((file, i) => file !== current[i])) throw new Error("Espera a que se actualicen las fotos del producto.");
}

function syncColors(color) {
  for (const choice of document.querySelectorAll('input[name="color_marco"], [data-takara-color-proxy]')) choice.checked = choice.value === color;
}

function selectProduct(key) {
  if (!Object.hasOwn(PRODUCTS, key) || engine?.capturing) return;
  engine?.dispose(); generation++; drafts.select(key);
  invalidPhoto = photoErrors.get(key) || "";
  const product = drafts.product;
  form.querySelector('[name="codigo_producto"]').value = product.code;
  form.querySelector('[name="formato"]').value = drafts.state.variant;
  form.querySelector("[data-takara-photo-input]").required = product.hasFormat;
  for (const option of document.querySelectorAll("[data-takara-product-option]")) option.checked = option.value === key;
  document.querySelector(".takara-product-customizer").dataset.product = key;
  document.querySelector(".takara-preview-config-section--format").hidden = !product.hasFormat;
  document.querySelector("[data-takara-single-photo]").hidden = !product.hasFormat;
  document.querySelector("[data-takara-caja-photos]").hidden = product.hasFormat;
  document.querySelector("[data-takara-caja-photo-note]").hidden = product.hasFormat;
  document.querySelector("[data-takara-frame-text-config]").hidden = !product.hasText;
  document.querySelector("[data-takara-summary-product-name]").textContent = product.hasFormat ? "Marco con litofanía" : product.title;
  document.querySelector("[data-takara-summary-text-row]").hidden = !product.hasText;
  document.querySelector("[data-takara-review-images-copy]").textContent = product.hasFormat
    ? "Confirmo que puedo utilizar esta imagen para crear mi pedido y autorizo su revisión durante la preparación."
    : "Confirmo que puedo utilizar estas cuatro imágenes para crear mi pedido y autorizo su revisión durante la preparación.";
  document.querySelector(".takara-preview-config-panel").setAttribute("aria-label", `Personalización: ${product.title}`);
  document.querySelector("[data-takara-photo-heading]").textContent = product.hasFormat ? "Tu foto" : "Tus cuatro fotos";
  document.querySelector("[data-takara-photo-description]").textContent = product.hasFormat
    ? "Sube tu foto para ver cómo queda en el marco." : "Una foto por cara. Toca su nombre para verla en el modelo.";
  document.querySelector("[data-takara-color-heading]").textContent = product.hasFormat ? "Color del marco" : "Colores de la caja";
  document.querySelector("[data-takara-body-color-label]").hidden = product.hasFormat;
  document.querySelector("[data-takara-base-colors]").hidden = product.hasFormat;
  for (const option of document.querySelectorAll("[data-takara-base-color]")) option.checked = option.value === drafts.state.baseColor;
  document.querySelector(".takara-preview-config-section--photo .takara-preview-config-step").textContent = product.hasFormat ? "2" : "1";
  document.querySelector(".takara-preview-config-section--color .takara-preview-config-step").textContent = product.hasFormat ? "3" : "2";
  document.querySelector("[data-takara-product-description]").textContent = product.hasFormat
    ? "Una foto, en formato vertical u horizontal." : "Cuatro fotos de 100 × 100 mm. Un giro de 360° para iluminar tus recuerdos.";
  document.querySelector("[data-takara-preview-title]").textContent = product.hasFormat ? `Marco ${drafts.state.variant}` : product.title;
  stage.dataset.format = drafts.state.variant; stage.dataset.product = key; stage.dataset.invalidPhoto = String(!!invalidPhoto);
  syncColors(drafts.state.color);
  for (const input of document.querySelectorAll("[data-takara-caja-photo]")) input.required = !product.hasFormat;
  syncLight();
  engine = new ProductViewer(stage, product.profile, showState);
  engine.update(drafts.state);
  editor?.setActive(product.hasText);
  if (product.hasFormat) setFormat(drafts.state.variant);
  window.TAKARA_DELIVERY_UI_V2?.refresh();
}

async function initialize() {
  if (!form || !stage) return;
  try {
    await import("../../vendor/model-viewer/model-viewer.min.js");
    buildPhotoSlots();
    buildBaseColors();
    const initial = form.querySelector('[name="formato"]').value;
    const color = form.querySelector('input[name="color_marco"]:checked')?.value || "actual";
    drafts.update({ variant: initial, color });
    editor = new FrameTextEditor(document.querySelector("[data-takara-frame-text-config]"), form, text => {
      if (drafts.product.hasText) {
        const patch = { text: Object.freeze({ ...text, texts: Object.freeze({ ...text.texts }),
          selected_sides: Object.freeze([...text.selected_sides]) }) };
        drafts.update(patch); engine?.update(patch);
      }
    });
    const params = new URLSearchParams(location.search), requested = params.get("producto");
    selectProduct(requested && Object.hasOwn(PRODUCTS, requested) ? requested : "marco");
    await editor.loadCatalog(); bindControls();
    window.TAKARA_PRODUCT_PREVIEW = Object.freeze({ getSnapshot: snapshot, getSelection: selection, assertOrderReady,
      async capture(expected) {
        assertOrderReady(expected);
        if (engine.error) throw new Error(engine.error);
        const controls = [...document.querySelectorAll(".takara-product-choice input, .takara-preview-config-panel input, .takara-preview-config-panel button, [data-takara-litho-mode], [data-takara-product-reset]")];
        const disabled = controls.map(node => node.disabled); controls.forEach(node => { node.disabled = true; });
        try { return await engine.capture(); }
        catch (error) {
          status.hidden = false;
          status.textContent = "No se ha podido preparar la ficha 3D. Conservamos tus fotos y los datos del pedido.";
          status.dataset.state = "error"; throw error;
        } finally { controls.forEach((node, i) => { node.disabled = disabled[i]; }); }
      }
    });
    if (drafts.product.hasFormat) { setFormat(params.get("formato") || initial); if (photo()) changePhoto(); }
  } catch (error) {
    initializationError = "No se ha podido iniciar el personalizador. Comprueba tu conexión y reintenta la carga.";
    showState({ ready: false, error: initializationError }); retry.hidden = false;
    console.error("[Takara personalizador]", error);
  }
}

function setFormat(variant) {
  if (!drafts.product.hasFormat || !["vertical", "horizontal"].includes(variant)) return;
  form.querySelector('[name="formato"]').value = variant;
  update({ variant }); editor?.setFormat(variant); stage.dataset.format = variant;
  form.querySelector("[data-takara-file-format]").textContent = variant === "horizontal" ? "Horizontal" : "Vertical";
  for (const card of document.querySelectorAll("[data-takara-format-card], [data-takara-format-proxy]")) {
    const active = (card.dataset.takaraFormatCard || card.dataset.takaraFormatProxy) === variant;
    card.classList.toggle("is-active", active); card.setAttribute("aria-pressed", String(active));
  }
  document.querySelector("[data-takara-preview-title]").textContent = `Marco ${variant}`;
  form.querySelector('[name="formato"]').dispatchEvent(new Event("change", { bubbles: true }));
}

function changePhoto() {
  if (!drafts.product.hasFormat) return;
  applyPhotos({ photo: photo() });
  const name = form.querySelector("[data-takara-file-name]");
  name.textContent = photo()?.name || "Sin foto subida"; name.title = photo()?.name || "";
  form.querySelector("[data-takara-file-box]").hidden = !photo();
}
function applyPhotos(patch) {
  invalidPhoto = ""; photoErrors.delete(drafts.current); stage.dataset.invalidPhoto = "false";
  try { update(patch); }
  catch (error) {
    invalidPhoto = error.message; photoErrors.set(drafts.current, invalidPhoto); stage.dataset.invalidPhoto = "true";
    showState({ ready: false, error: invalidPhoto, errorCode: "INVALID_PHOTO" });
  }
}

function viewFace(face) {
  if (drafts.current !== "caja" || !engine?.viewer || engine.capturing) return;
  const i = drafts.product.photoFaces.indexOf(face);
  engine.viewer.setAttribute("camera-orbit", `${i * 90}deg 80deg auto`);
  for (const card of document.querySelectorAll("[data-takara-caja-slot]")) {
    const active = card.dataset.takaraCajaSlot === face;
    card.classList.toggle("is-active", active); card.querySelector("button").setAttribute("aria-pressed", String(active));
  }
}

function buildPhotoSlots() {
  const root = document.querySelector("[data-takara-caja-photos]");
  for (const [i, face] of PRODUCTS.caja.photoFaces.entries()) {
    const card = document.createElement("div"); card.className = "takara-caja-photo"; card.dataset.takaraCajaSlot = face;
    const button = document.createElement("button"); button.type = "button";
    button.textContent = `${i + 1} · ${face[0].toUpperCase() + face.slice(1)}`;
    button.setAttribute("aria-label", `Ver cara ${face}`); button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => viewFace(face));
    const image = document.createElement("img"); image.alt = `Foto de la cara ${face}`; image.hidden = true; image.width = image.height = 160;
    image.addEventListener("error", () => { image.hidden = true; });
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/jpeg,image/png,image/webp";
    input.dataset.takaraCajaPhoto = face; input.name = `foto_${face}`; input.id = `takara-foto-${face}`;
    input.setAttribute("form", form.id); input.setAttribute("aria-label", `Foto ${face}`);
    const upload = document.createElement("label"); upload.htmlFor = input.id; upload.textContent = "+ Subir foto";
    const note = document.createElement("small"); note.textContent = "Sin foto · JPG, PNG o WEBP";
    input.addEventListener("change", () => {
      const previous = thumbnailUrls.get(face); if (previous) URL.revokeObjectURL(previous);
      thumbnailUrls.delete(face); image.removeAttribute("src"); image.hidden = true;
      const file = input.files[0] || null;
      if (file && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 20 * 1024 * 1024) {
        const url = URL.createObjectURL(file); thumbnailUrls.set(face, url); image.src = url; image.hidden = false;
      }
      note.textContent = file?.name || "Sin foto · JPG, PNG o WEBP";
      upload.textContent = file ? "Cambiar foto" : "+ Subir foto";
      const photos = Object.fromEntries(PRODUCTS.caja.photoFaces.map(key => [key,
        document.querySelector(`[data-takara-caja-photo="${key}"]`).files[0] || null]));
      applyPhotos({ photos: Object.freeze(photos) }); viewFace(face);
    });
    card.append(button, image, upload, input, note); root.append(card);
  }
}

function syncLight() {
  for (const item of document.querySelectorAll("[data-takara-litho-mode]")) {
    const active = item.dataset.takaraLithoMode === drafts.state.light;
    item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active));
  }
}
function buildBaseColors() {
  const root = document.querySelector("[data-takara-base-color-options]");
  for (const bodyInput of document.querySelectorAll("[data-takara-color-proxy]")) {
    const label = bodyInput.closest("label").cloneNode(true);
    const input = label.querySelector("input");
    input.name = "color_peana_preview";
    input.removeAttribute("data-takara-color-proxy");
    input.dataset.takaraBaseColor = input.value;
    input.checked = input.value === PRODUCTS.caja.profile.defaults.baseColor;
    input.addEventListener("change", () => {
      if (drafts.current === "caja" && input.checked) update({ baseColor: input.value });
    });
    root.append(label);
  }
}
function bindControls() {
  for (const option of document.querySelectorAll("[data-takara-product-option]")) {
    option.addEventListener("change", () => { if (option.checked) selectProduct(option.value); });
    option.disabled = false;
  }
  const backgrounds = [...document.querySelectorAll("[data-takara-background]")];
  for (const button of backgrounds) button.addEventListener("click", () => {
    stage.dataset.background = button.dataset.takaraBackground;
    for (const item of backgrounds) item.setAttribute("aria-pressed", String(item === button));
  });
  for (const card of document.querySelectorAll("[data-takara-format-card]")) card.addEventListener("click", () => setFormat(card.dataset.takaraFormatCard));
  form.querySelector("[data-takara-photo-input]").addEventListener("change", changePhoto);
  for (const color of form.querySelectorAll('input[name="color_marco"]')) color.addEventListener("change", () => {
    if (color.checked) update({ color: color.value });
    if (drafts.product.hasText) editor.refresh();
  });
  for (const button of document.querySelectorAll("[data-takara-litho-mode]")) button.addEventListener("click", () => {
    update({ light: button.dataset.takaraLithoMode }); syncLight();
  });
  retry.addEventListener("click", () => engine.retry());
  document.querySelector("[data-takara-product-reset]").addEventListener("click", async () => {
    engine.viewer.setAttribute("camera-orbit", engine.variant.camera);
    engine.viewer.setAttribute("camera-target", "auto auto auto"); engine.viewer.setAttribute("field-of-view", "auto");
    await engine.viewer.updateComplete; engine.viewer.jumpCameraToGoal();
    for (const card of document.querySelectorAll("[data-takara-caja-slot]")) {
      card.classList.remove("is-active"); card.querySelector("button").setAttribute("aria-pressed", "false");
    }
  });
  window.addEventListener("pagehide", event => {
    if (event.persisted) return;
    engine.dispose(); for (const url of thumbnailUrls.values()) URL.revokeObjectURL(url); thumbnailUrls.clear();
  });
}

retry?.addEventListener("click", () => { if (!window.TAKARA_PRODUCT_PREVIEW) location.reload(); });
initialize();
