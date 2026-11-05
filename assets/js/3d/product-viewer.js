/** Shared GLB lifecycle and capture. Product rules belong to the supplied profile. */
import { captureModelJpeg } from "./capture.js";

const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

export class ProductViewer {
  constructor(stage, profile, onChange = () => {}) {
    if (!stage?.appendChild || !profile?.variants || typeof profile.createController !== "function") {
      throw new TypeError("El visor necesita un escenario y un perfil de producto.");
    }
    this.stage = stage;
    this.profile = profile;
    this.onChange = onChange;
    this.state = Object.freeze({ ...profile.defaults });
    this.revision = 0;
    this.appliedRevision = -1;
    this.presentedRevision = -1;
    this.error = "";
    this.errorCode = "";
    this.disposed = false;
    this.capturing = false;
    this.pending = Promise.resolve();
    this.update({});
  }

  get ready() {
    return !this.disposed && !this.error && this.appliedRevision === this.revision;
  }

  getSnapshot() {
    return Object.freeze({ ready: this.ready, error: this.error, errorCode: this.errorCode, revision: this.revision,
      capturing: this.capturing, state: this.state, model: this.variant?.src || null,
      product: this.profile.id, details: this.controller?.getSnapshot?.() || null });
  }

  notify() {
    if (this.viewer) {
      const presentable = !this.error && (this.ready || this.presentedRevision === this.revision);
      this.viewer.style.opacity = presentable && !this.capturing ? "1" : "0";
      this.viewer.style.pointerEvents = this.ready && !this.capturing ? "auto" : "none";
    }
    this.onChange(this.getSnapshot());
  }

  update(patch) {
    if (this.disposed) throw new Error("Visor cerrado");
    if (this.capturing) throw new Error("Espera a que termine la ficha del producto.");
    const state = Object.freeze({ ...this.state, ...patch });
    this.profile.validate?.(state);
    const variant = Object.hasOwn(this.profile.variants, state.variant) ? this.profile.variants[state.variant] : null;
    if (!variant) throw new RangeError("Variante de producto desconocida.");
    const load = variant !== this.variant || !this.viewer;
    const keepLoadError = !!this.error && !this.controller && !load;
    this.state = state;
    this.revision++;
    if (!keepLoadError) { this.error = ""; this.errorCode = ""; }
    if (load) this.loadVariant(variant);
    this.notify();
    this.schedule();
  }

  loadVariant(variant, retry = false) {
    this.releaseModel();
    this.variant = variant;
    const viewer = document.createElement("model-viewer");
    this.viewer = viewer;
    for (const [key, value] of Object.entries({
      "camera-controls": "", "touch-action": "pan-y", "interaction-prompt": "none",
      "shadow-intensity": "0.6", exposure: "0.92", loading: "eager",
      "camera-orbit": variant.camera, alt: variant.alt,
      ...this.profile.attributes
    })) viewer.setAttribute(key, value);
    viewer.style.cssText = "display:block;width:100%;height:100%;";
    viewer.addEventListener("load", () => {
      if (viewer !== this.viewer || this.disposed) return;
      clearTimeout(this.loadTimer);
      try {
        this.controller = this.profile.createController(viewer, this.state.variant);
        this.schedule();
      } catch (error) { this.fail(error); }
    }, { once: true });
    viewer.addEventListener("error", () => {
      if (viewer === this.viewer) this.fail(new Error("No se ha podido mostrar el producto en 3D. Reintenta la carga."));
    });
    this.loadTimer = setTimeout(() => {
      if (viewer === this.viewer) this.fail(new Error("La vista 3D tarda demasiado en cargar. Comprueba tu conexión y reintenta."));
    }, 45000);
    this.stage.appendChild(viewer);
    let source = variant.src;
    if (retry) {
      // A failed URL remains cached by model-viewer. Explicit retries need a
      // fresh fetch key; do not touch its private cache or the user's browser.
      const url = new URL(source, document.baseURI);
      if (["http:", "https:"].includes(url.protocol)) {
        url.searchParams.set("takara_retry", String(this.revision));
        source = url.href;
      }
    }
    viewer.setAttribute("src", source);
  }

  schedule() {
    // Coalesce rapid changes. Only the current revision may become visible.
    this.pending = this.pending.then(async () => {
      if (this.disposed || !this.controller || this.error || this.appliedRevision === this.revision) return;
      const revision = this.revision;
      const controller = this.controller;
      const current = () => !this.disposed && controller === this.controller && revision === this.revision;
      try {
        await controller.apply(this.state, current);
        if (!current()) return;
        // Show synchronous material/text updates before the next paint, avoiding
        // a blank frame on every keystroke. Capture still waits for rendering.
        this.presentedRevision = revision;
        this.notify();
        await paint();
        if (current()) this.appliedRevision = revision;
      } catch (error) {
        if (current()) this.fail(error);
      } finally { if (!this.disposed) this.notify(); }
    });
  }

  fail(error) {
    if (this.disposed) return;
    clearTimeout(this.loadTimer);
    this.error = error?.message || "No se pudo preparar la vista 3D.";
    this.errorCode = error?.code || "VIEWER_UNAVAILABLE";
    this.notify();
  }

  retry() {
    if (this.disposed || this.capturing) return;
    this.error = "";
    this.errorCode = "";
    this.revision++;
    this.loadVariant(this.variant, true);
    this.notify();
  }

  async capture() {
    if (this.capturing) throw new Error("Ya se está preparando la ficha.");
    await this.pending;
    if (this.capturing) throw new Error("Ya se está preparando la ficha.");
    if (!this.ready) throw new Error(this.error || "Espera a que termine de cargar la vista 3D.");
    this.profile.validateCapture?.(this.state);
    this.capturing = true;
    const viewer = this.viewer;
    const revision = this.revision;
    const orbit = { ...viewer.getCameraOrbit() };
    const target = { ...viewer.getCameraTarget() };
    const fov = viewer.getFieldOfView();
    const style = viewer.style.cssText;
    const parent = viewer.parentNode;
    const sibling = viewer.nextSibling;
    const bounds = viewer.getBoundingClientRect();
    const renderer = viewer.constructor;
    // v4.4.0 exposes the setter but its getter can return undefined.
    // In that case restore its documented default floor of 0.5.
    const minimumScale = renderer.minimumRenderScale ?? 0.5;
    const captureHost = document.createElement("div");
    captureHost.setAttribute("aria-hidden", "true");
    captureHost.style.cssText = "position:fixed;inset:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;";
    this.notify();
    try {
      // Adaptive rendering may halve resolution on slower GPUs. Export at
      // native resolution, then restore the interactive performance policy.
      renderer.minimumRenderScale = 1;
      // A fixed viewport and camera make the order image independent of the
      // customer's rotation, zoom and screen size. Restore their view afterwards.
      // Move the SAME viewer into the viewport temporarily: model-viewer pauses
      // rendering offscreen, and toBlob would otherwise read an obsolete frame.
      document.body.appendChild(captureHost);
      captureHost.appendChild(viewer);
      viewer.style.width = "960px";
      viewer.style.height = "760px";
      viewer.style.position = "absolute";
      viewer.style.left = "0";
      viewer.style.top = "0";
      viewer.setAttribute("camera-orbit", this.variant.camera);
      viewer.setAttribute("camera-target", "auto auto auto");
      viewer.setAttribute("field-of-view", "auto");
      await viewer.updateComplete;
      await paint();
      const deadline = performance.now() + 3000;
      while (!viewer.modelIsVisible) {
        if (this.disposed || performance.now() > deadline) throw new Error("No se pudo preparar la escena para capturar.");
        await paint();
      }
      await viewer.updateFraming();
      viewer.jumpCameraToGoal();
      await paint();
      const result = await captureModelJpeg(viewer);
      if (this.disposed || revision !== this.revision) throw new Error("La configuración cambió durante la captura.");
      return result;
    } finally {
      try {
        if (!this.disposed) {
          // Restore framing while rendering is still active, then put the
          // element back. No second scene, page scroll or model reload.
          viewer.style.width = `${bounds.width}px`;
          viewer.style.height = `${bounds.height}px`;
          await viewer.updateComplete;
          await paint();
          await viewer.updateFraming();
          viewer.setAttribute("camera-orbit", `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`);
          viewer.setAttribute("camera-target", `${target.x}m ${target.y}m ${target.z}m`);
          viewer.setAttribute("field-of-view", `${fov}deg`);
          await viewer.updateComplete;
          viewer.jumpCameraToGoal();
          await paint();
        }
      } finally {
        if (!this.disposed) {
          viewer.style.cssText = style;
          viewer.style.opacity = "0";
          parent.insertBefore(viewer, sibling);
        }
        renderer.minimumRenderScale = minimumScale;
        captureHost.remove();
        this.capturing = false;
        if (!this.disposed) this.notify();
      }
    }
  }

  releaseModel() {
    clearTimeout(this.loadTimer);
    this.controller?.dispose();
    this.controller = null;
    this.appliedRevision = -1;
    this.presentedRevision = -1;
    this.viewer?.remove();
    this.viewer = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.revision++;
    this.releaseModel();
  }
}
