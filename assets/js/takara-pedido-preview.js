/* TAKARA PEDIDO PREVIEW LITHO REAL V16B-1 */
(function () {
  "use strict";

  const FRAME_SRC = {
    vertical: {
      actual: "assets/img/pedido/marco-preview-vertical-actual.png",
      rosewood: "assets/img/pedido/marco-preview-vertical-rosewood.png",
      ebano: "assets/img/pedido/marco-preview-vertical-ebano.png",
      negro: "assets/img/pedido/marco-preview-vertical-negro.png",
      "blanco-mate": "assets/img/pedido/marco-preview-vertical-blanco-mate.png"
    },
    horizontal: {
      actual: "assets/img/pedido/marco-preview-horizontal-actual.png",
      rosewood: "assets/img/pedido/marco-preview-horizontal-rosewood.png",
      ebano: "assets/img/pedido/marco-preview-horizontal-ebano.png",
      negro: "assets/img/pedido/marco-preview-horizontal-negro.png",
      "blanco-mate": "assets/img/pedido/marco-preview-horizontal-blanco-mate.png"
    }
  };

  const COLOR_LABELS = {
    actual: "Madera clara",
    rosewood: "Rosewood",
    ebano: "Ébano",
    negro: "Negro",
    "blanco-mate": "Blanco mate"
  };

  const COLOR_DOT_CLASSES = {
    actual: "pedido-stl-summary-dot--actual",
    rosewood: "pedido-stl-summary-dot--rosewood",
    ebano: "pedido-stl-summary-dot--ebano",
    negro: "pedido-stl-summary-dot--negro",
    "blanco-mate": "pedido-stl-summary-dot--blanco-mate"
  };

  const FORMAT_META = {
    vertical: {
      title: "Marco vertical",
      summary: "Marco vertical · 108 × 144 mm",
      label: "Vertical",
      fallback: {
        imageSize: { w: 1151, h: 1400 },
        window: { x: 0.1746, y: 0.1436, w: 0.6499, h: 0.7129 }
      }
    },
    horizontal: {
      title: "Marco horizontal",
      summary: "Marco horizontal · 144 × 108 mm",
      label: "Horizontal",
      fallback: {
        imageSize: { w: 1400, h: 1151 },
        window: { x: 0.1436, y: 0.1746, w: 0.7129, h: 0.6499 }
      }
    }
  };

  const state = {
    format: "vertical",
    color: "actual",
    mode: "on",
    image: null,
    fileName: "",
    objectUrl: "",
    frameConfig: {
      vertical: FORMAT_META.vertical.fallback,
      horizontal: FORMAT_META.horizontal.fallback
    },
    frameCache: new Map(),
    previewCache: new Map()
  };

  let canvas = null;
  let ctx = null;
  let stage = null;
  let photoInput = null;
  let controls = null;
  let fileBox = null;
  let fileNameNode = null;
  let fileFormatNode = null;
  let previewTitle = null;
  let summaryFormat = null;
  let summaryColor = null;
  let summaryPhoto = null;
  let summaryDot = null;
  let formatValue = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    canvas = document.querySelector("[data-takara-preview-canvas]");
    photoInput = document.querySelector("[data-takara-photo-input]") || document.querySelector('input[type="file"]');

    if (!canvas) {
      const fallbackImg = document.querySelector('img[src*="marco-preview-"]');
      const fallbackStage = fallbackImg ? fallbackImg.parentElement : document.querySelector(".pedido-stl-stage, .pedido-stl-preview");
      if (fallbackStage) {
        canvas = document.createElement("canvas");
        canvas.setAttribute("data-takara-preview-canvas", "");
        fallbackStage.insertBefore(canvas, fallbackStage.firstChild);
      }
    }

    if (!canvas || !photoInput) {
      console.warn("[Takara preview] No encuentro canvas o input de foto.");
      return;
    }

    ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
    stage = canvas.parentElement;

    if (stage) stage.classList.add("takara-preview-v16-stage");
    canvas.classList.add("takara-preview-v16-canvas");

    fileBox = document.querySelector("[data-takara-file-box]");
    fileNameNode = document.querySelector("[data-takara-file-name]");
    fileFormatNode = document.querySelector("[data-takara-file-format]");
    previewTitle = document.querySelector("[data-takara-preview-title]");
    summaryFormat = document.querySelector("[data-takara-summary-format]");
    summaryColor = document.querySelector("[data-takara-summary-color]");
    summaryPhoto = document.querySelector("[data-takara-summary-photo]");
    summaryDot = document.querySelector("[data-takara-summary-dot]");
    formatValue = document.querySelector("[data-takara-format-value]");

    createModeControls();
    bindEvents();

    loadConfig()
      .then(preloadAllFrames)
      .then(function () {
        updateUi();
        renderPreview();
      })
      .catch(function () {
        updateUi();
        renderPreview();
      });
  }

  function bindEvents() {
    photoInput.addEventListener("change", handlePhotoChange);

    document.querySelectorAll('input[name="color_marco"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if (input.checked) {
          state.color = input.value || "actual";
          state.previewCache.clear();
          updateUi();
          renderPreview();
        }
      });
    });

    document.querySelectorAll("[data-takara-format-card]").forEach(function (card) {
      card.addEventListener("click", function () {
        state.format = card.getAttribute("data-takara-format-card") === "horizontal" ? "horizontal" : "vertical";
        state.previewCache.clear();
        updateUi();
        renderPreview();
      });
    });

    window.addEventListener("resize", debounce(renderPreview, 80), { passive: true });

    if (window.ResizeObserver && stage) {
      const observer = new ResizeObserver(debounce(renderPreview, 80));
      observer.observe(stage);
    }
  }

  function createModeControls() {
    if (!stage || !stage.parentElement) return;

    stage.parentElement.querySelectorAll(".takara-litofania-controls, .takara-preview-v10-controls, .takara-preview-v11-controls, .takara-preview-v12-controls, .takara-preview-v13-controls, .takara-preview-v14-controls, .takara-preview-v15-controls, .takara-preview-v16-controls").forEach(function (node) {
      node.remove();
    });

    controls = document.createElement("div");
    controls.className = "takara-preview-v16-controls";
    controls.innerHTML = [
      '<button type="button" class="takara-preview-v16-mode is-active" data-takara-litho-mode="on">Encendida</button>',
      '<button type="button" class="takara-preview-v16-mode" data-takara-litho-mode="off">Apagada</button>'
    ].join("");

    stage.insertAdjacentElement("afterend", controls);

    controls.querySelectorAll("[data-takara-litho-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.mode = button.getAttribute("data-takara-litho-mode") === "off" ? "off" : "on";
        state.previewCache.clear();
        updateUi();
        renderPreview();
      });
    });
  }

  function updateControls() {
    if (!controls) return;
    controls.querySelectorAll("[data-takara-litho-mode]").forEach(function (button) {
      button.classList.toggle("is-active", button.getAttribute("data-takara-litho-mode") === state.mode);
    });
  }

  function handlePhotoChange() {
    const file = photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;

    if (!file) {
      clearImage();
      updateUi();
      renderPreview();
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";

    img.onload = function () {
      if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);

      state.objectUrl = url;
      state.image = img;
      state.fileName = file.name;
      state.previewCache.clear();
      state.format = (img.naturalWidth || img.width || 1) >= (img.naturalHeight || img.height || 1) ? "horizontal" : "vertical";

      updateUi();
      renderPreview();
    };

    img.onerror = function () {
      clearImage();
      updateUi();
      renderPreview();
    };

    img.src = url;
  }

  function clearImage() {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = "";
    state.image = null;
    state.fileName = "";
    state.previewCache.clear();
  }

  function updateUi() {
    const meta = FORMAT_META[state.format];

    if (stage) stage.setAttribute("data-format", state.format);
    if (formatValue) formatValue.value = state.format;
    if (previewTitle) previewTitle.textContent = meta.title;
    if (summaryFormat) summaryFormat.textContent = meta.summary;
    if (summaryColor) summaryColor.textContent = COLOR_LABELS[state.color] || "Actual";

    if (summaryPhoto) {
      summaryPhoto.textContent = state.fileName ? smartFileName(state.fileName, 36) : "Sin foto subida";
      summaryPhoto.title = state.fileName || "Sin foto subida";
    }

    if (fileBox) fileBox.hidden = !state.fileName;

    if (fileNameNode) {
      fileNameNode.textContent = state.fileName ? smartFileName(state.fileName, 42) : "Sin foto subida";
      fileNameNode.title = state.fileName || "Sin foto subida";
    }

    if (fileFormatNode) fileFormatNode.textContent = meta.label;

    if (summaryDot) {
      summaryDot.className = "pedido-stl-summary-dot " + (COLOR_DOT_CLASSES[state.color] || COLOR_DOT_CLASSES.actual);
    }

    document.querySelectorAll("[data-takara-format-card]").forEach(function (card) {
      card.classList.toggle("is-active", card.getAttribute("data-takara-format-card") === state.format);
    });

    document.querySelectorAll('input[name="color_marco"]').forEach(function (input) {
      input.checked = input.value === state.color;
    });

    updateControls();
  }

  function loadConfig() {
    return fetch("assets/img/pedido/marco-preview-real-config.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function (data) {
        if (data && data.vertical && data.horizontal) state.frameConfig = data;
      })
      .catch(function () {
        state.frameConfig = {
          vertical: FORMAT_META.vertical.fallback,
          horizontal: FORMAT_META.horizontal.fallback
        };
      });
  }

  function preloadAllFrames() {
    const tasks = [];
    Object.keys(FRAME_SRC).forEach(function (format) {
      Object.keys(FRAME_SRC[format]).forEach(function (color) {
        tasks.push(loadFrame(FRAME_SRC[format][color]));
      });
    });
    return Promise.allSettled(tasks);
  }

  function loadFrame(src) {
    if (state.frameCache.has(src)) return Promise.resolve(state.frameCache.get(src));

    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.decoding = "async";
      img.onload = function () {
        state.frameCache.set(src, img);
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("No se pudo cargar " + src));
      };
      img.src = src;
    });
  }

  async function renderPreview() {
    if (!canvas || !ctx || !stage) return;

    updateUi();

    const bounds = stage.getBoundingClientRect();
    const cssWidth = Math.max(320, Math.round(bounds.width || 790));
    const cssHeight = Math.max(320, Math.round(bounds.height || 690));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const config = state.frameConfig[state.format] || FORMAT_META[state.format].fallback;
    const frameRect = fitFrameToStage(config, cssWidth, cssHeight);
    const photoRect = getPhotoRect(frameRect, config);

    drawStageBackground(ctx, cssWidth, cssHeight);
    drawFrameShadow(ctx, frameRect);
    drawLithophaneWindow(ctx, photoRect);

    const frameSrc = FRAME_SRC[state.format][state.color] || FRAME_SRC[state.format].actual;
    try {
      const frameImg = await loadFrame(frameSrc);
      ctx.drawImage(frameImg, frameRect.x, frameRect.y, frameRect.w, frameRect.h);
} catch (error) {
      console.error(error);
    }
  }

  function fitFrameToStage(config, stageW, stageH) {
    const imageW = config.imageSize && config.imageSize.w ? config.imageSize.w : FORMAT_META[state.format].fallback.imageSize.w;
    const imageH = config.imageSize && config.imageSize.h ? config.imageSize.h : FORMAT_META[state.format].fallback.imageSize.h;
    const scale = Math.min((stageW * 0.92) / imageW, (stageH * 0.88) / imageH);
    const w = imageW * scale;
    const h = imageH * scale;
    return { x: (stageW - w) / 2, y: (stageH - h) / 2, w: w, h: h };
  }

  function getPhotoRect(frameRect, config) {
    const win = config.window || FORMAT_META[state.format].fallback.window;
    return {
      x: frameRect.x + frameRect.w * win.x,
      y: frameRect.y + frameRect.h * win.y,
      w: frameRect.w * win.w,
      h: frameRect.h * win.h
    };
  }

  function drawStageBackground(ctx, width, height) {
    ctx.save();

    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0.00, "#21150d");
    base.addColorStop(0.32, "#302013");
    base.addColorStop(0.68, "#24160d");
    base.addColorStop(1.00, "#140d08");

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const centerGlow = ctx.createRadialGradient(
      width * 0.50,
      height * 0.42,
      Math.min(width, height) * 0.10,
      width * 0.50,
      height * 0.42,
      Math.max(width, height) * 0.72
    );

    centerGlow.addColorStop(0.00, "rgba(122, 82, 43, 0.42)");
    centerGlow.addColorStop(0.34, "rgba(84, 54, 29, 0.28)");
    centerGlow.addColorStop(0.68, "rgba(39, 24, 14, 0.16)");
    centerGlow.addColorStop(1.00, "rgba(0, 0, 0, 0.00)");

    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);

    const floorShade = ctx.createLinearGradient(0, height * 0.38, 0, height);
    floorShade.addColorStop(0.00, "rgba(255, 224, 165, 0.02)");
    floorShade.addColorStop(0.62, "rgba(0, 0, 0, 0.10)");
    floorShade.addColorStop(1.00, "rgba(0, 0, 0, 0.26)");

    ctx.fillStyle = floorShade;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function drawFrameShadow(context, box) {
    context.save();
    context.shadowColor = state.mode === "on" ? "rgba(0,0,0,0.74)" : "rgba(44,24,9,0.20)";
    context.shadowBlur = state.mode === "on" ? 44 : 30;
    context.shadowOffsetY = state.mode === "on" ? 24 : 20;
    context.fillStyle = state.mode === "on" ? "rgba(0,0,0,0.57)" : "rgba(44,24,9,0.15)";
    roundedRect(context, box.x + box.w * 0.09, box.y + box.h * 0.08, box.w * 0.82, box.h * 0.82, 34);
    context.fill();
    context.restore();
  }

  function drawLithophaneWindow(context, rect) {
    context.save();
    roundedRect(context, rect.x, rect.y, rect.w, rect.h, Math.max(8, Math.min(rect.w, rect.h) * 0.018));
    context.clip();

    drawPanelBase(context, rect);

    if (state.mode === "on") {
      drawLedBacklight(context, rect);
    }

    if (state.image) {
      const processed = buildLithophaneBitmap(Math.max(260, Math.round(rect.w * 1.30)), Math.max(260, Math.round(rect.h * 1.30)));
      context.drawImage(processed, rect.x, rect.y, rect.w, rect.h);
    } else {
      drawEmptyPanel(context, rect);
    }

    if (state.mode === "on") {
      drawLitOverlay(context, rect);
    } else {
      drawReliefOverlay(context, rect);
    }

    context.restore();
    drawPanelEdge(context, rect);
  }

  function drawPanelBase(context, rect) {
    const g = context.createRadialGradient(rect.x + rect.w * 0.5, rect.y + rect.h * 0.48, 6, rect.x + rect.w * 0.5, rect.y + rect.h * 0.52, Math.max(rect.w, rect.h) * 0.88);

    if (state.mode === "on") {
      g.addColorStop(0, "rgba(255,236,188,1)");
      g.addColorStop(0.55, "rgba(211,176,116,0.97)");
      g.addColorStop(1, "rgba(116,86,52,0.94)");
    } else {
      g.addColorStop(0, "rgba(229,221,205,1)");
      g.addColorStop(0.55, "rgba(204,191,170,0.98)");
      g.addColorStop(1, "rgba(160,143,117,0.98)");
    }

    context.fillStyle = g;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  function drawLedBacklight(context, rect) {
    context.save();
    context.globalCompositeOperation = "screen";

    const rowCount = state.format === "horizontal" ? 11 : 8;

    for (let i = 0; i < rowCount; i += 1) {
      const t = rowCount === 1 ? 0.5 : i / (rowCount - 1);
      const x = rect.x + rect.w * (0.055 + t * 0.89);
      drawLedGlow(context, x, rect.y + rect.h * 0.045, rect.w * 0.105, rect.h * 0.068, 0.40);
    }

    const inner = context.createRadialGradient(rect.x + rect.w * 0.5, rect.y + rect.h * 0.48, rect.w * 0.04, rect.x + rect.w * 0.5, rect.y + rect.h * 0.52, Math.max(rect.w, rect.h) * 0.74);
    inner.addColorStop(0, "rgba(255,236,196,0.19)");
    inner.addColorStop(0.54, "rgba(255,214,142,0.075)");
    inner.addColorStop(1, "rgba(255,214,142,0)");
    context.fillStyle = inner;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);

    context.restore();
  }

  function drawLedGlow(context, x, y, rx, ry, alpha) {
    const g = context.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
    g.addColorStop(0, "rgba(255,255,235," + alpha + ")");
    g.addColorStop(0.35, "rgba(255,224,162," + alpha * 0.34 + ")");
    g.addColorStop(1, "rgba(255,224,162,0)");
    context.fillStyle = g;
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawEmptyPanel(context, rect) {
    context.fillStyle = state.mode === "on" ? "#d69d50" : "#cec0a8";
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  function drawLitOverlay(context, rect) {
    context.save();
    context.globalCompositeOperation = "screen";

    const top = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h * 0.10);
    top.addColorStop(0, "rgba(255,249,224,0.11)");
    top.addColorStop(1, "rgba(255,249,224,0)");
    context.fillStyle = top;
    context.fillRect(rect.x, rect.y, rect.w, rect.h * 0.10);

    context.strokeStyle = "rgba(255,232,180,0.42)";
    context.lineWidth = Math.max(1.5, rect.w * 0.0055);
    roundedRect(context, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 8);
    context.stroke();

    context.restore();
  }

  function drawReliefOverlay(context, rect) {
    context.save();
    context.globalCompositeOperation = "multiply";
    const g = context.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(84,62,38,0.12)");
    context.fillStyle = g;
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
    context.restore();
  }

  function drawPanelEdge(context, rect) {
    if (state.mode === "on") {
      context.save();
      context.shadowColor = "rgba(255,219,158,0.48)";
      context.shadowBlur = 11;
      context.strokeStyle = "rgba(255,238,196,0.58)";
      context.lineWidth = 1.6;
      roundedRect(context, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 9);
      context.stroke();
      context.restore();
    }

    for (let i = 0; i < 3; i += 1) {
      context.strokeStyle = state.mode === "on" ? "rgba(38,26,14," + (0.22 - i * 0.045) + ")" : "rgba(82,56,31," + (0.13 - i * 0.03) + ")";
      context.lineWidth = 1;
      roundedRect(context, rect.x + i, rect.y + i, rect.w - i * 2, rect.h - i * 2, 8);
      context.stroke();
    }
  }

  function buildLithophaneBitmap(targetW, targetH) {
    const key = [state.fileName || "none", state.format, state.mode, targetW, targetH].join("|");
    if (state.previewCache.has(key)) return state.previewCache.get(key);

    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = targetH;
    const outCtx = out.getContext("2d", { willReadFrequently: true });

    drawPhotoCover(outCtx, state.image, targetW, targetH);

    const imgData = outCtx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const pixels = targetW * targetH;
    const gray = new Float32Array(pixels);
    const sample = [];

    let p = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      gray[p] = lum;
      if (p % 4 === 0) sample.push(lum);
      p += 1;
    }

    sample.sort(function (a, b) { return a - b; });

    const low = sample[Math.max(0, Math.floor(sample.length * 0.004))] || 0;
    const high = sample[Math.max(0, Math.floor(sample.length * 0.996))] || 255;
    const spread = Math.max(14, high - low);

    const norm = new Float32Array(pixels);
    const heightMap = new Float32Array(pixels);

    for (let i = 0; i < pixels; i += 1) {
      let n = clamp01((gray[i] - low) / spread);
      n = softReferenceCurve(n);
      norm[i] = n;
      heightMap[i] = Math.pow(1 - n, 1.08);
    }

    const normSoft = boxBlurGray(norm, targetW, targetH, 1);
    const normWide = boxBlurGray(norm, targetW, targetH, 7);

    let idx = 0;
    for (let y = 0; y < targetH; y += 1) {
      for (let x = 0; x < targetW; x += 1) {
        const di = idx * 4;

        const xL = Math.max(0, x - 1);
        const xR = Math.min(targetW - 1, x + 1);
        const yU = Math.max(0, y - 1);
        const yD = Math.min(targetH - 1, y + 1);

        const left = heightMap[y * targetW + xL];
        const right = heightMap[y * targetW + xR];
        const up = heightMap[yU * targetW + x];
        const down = heightMap[yD * targetW + x];

        const gx = right - left;
        const gy = down - up;

        const detail = clamp(norm[idx] - normSoft[idx], -0.22, 0.22);
        const broad = clamp(norm[idx] - normWide[idx], -0.18, 0.18);
        const layerLine = 1 + Math.sin(y * Math.PI * 2 / 5.4) * 0.008;

        if (state.mode === "on") {
          const led = buildLedProfile(x / targetW, y / targetH, state.format === "horizontal");
          const n = norm[idx];
          const density = heightMap[idx];

          let tone = 0.14 + n * 0.76;
          tone += detail * 0.34;
          tone += broad * 0.16;
          tone -= Math.pow(density, 1.05) * 0.09;
          tone += clamp((-gx * 0.22 - gy * 0.16), -0.07, 0.07);
          tone *= 0.90 + led * 0.14;
          tone = clamp(tone * layerLine, 0, 1);
          tone = Math.pow(tone, 0.95);

          const c = sepiaReferenceColor(tone);

          data[di] = c.r;
          data[di + 1] = c.g;
          data[di + 2] = c.b;
          data[di + 3] = 255;
        } else {
          const nx = -gx * 3.0;
          const ny = -gy * 2.5;
          const nz = 1.0;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          const normalX = nx / len;
          const normalY = ny / len;
          const normalZ = nz / len;

          const shade = clamp01(0.40 + normalX * -0.38 + normalY * -0.52 + normalZ * 0.64 + detail * 1.38);
          const plate = clamp01(0.42 + shade * 0.56 - heightMap[idx] * 0.08);

          data[di] = Math.round(clamp(148 + plate * 82, 0, 255));
          data[di + 1] = Math.round(clamp(141 + plate * 76, 0, 255));
          data[di + 2] = Math.round(clamp(126 + plate * 66, 0, 255));
          data[di + 3] = 255;
        }

        idx += 1;
      }
    }

    outCtx.putImageData(imgData, 0, 0);

    if (state.mode === "on") applyLitFinishing(outCtx, targetW, targetH);
    else applyReliefFinishing(outCtx, targetW, targetH);

    state.previewCache.set(key, out);
    return out;
  }

  function softReferenceCurve(v) {
    const s = contrastCurve(v, 0.025, 0.985);
    const lifted = Math.pow(s, 0.64);
    return clamp01(0.10 + lifted * 0.86);
  }

  function sepiaReferenceColor(t) {
    const shadow = { r: 96, g: 71, b: 42 };
    const mid = { r: 190, g: 151, b: 91 };
    const light = { r: 255, g: 238, b: 190 };

    if (t < 0.55) {
      const u = smoothstep(t / 0.55);
      return {
        r: Math.round(lerp(shadow.r, mid.r, u)),
        g: Math.round(lerp(shadow.g, mid.g, u)),
        b: Math.round(lerp(shadow.b, mid.b, u))
      };
    }

    const u = smoothstep((t - 0.55) / 0.45);
    return {
      r: Math.round(lerp(mid.r, light.r, u)),
      g: Math.round(lerp(mid.g, light.g, u)),
      b: Math.round(lerp(mid.b, light.b, u))
    };
  }

  function drawPhotoCover(context, img, targetW, targetH) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const scale = Math.max(targetW / sw, targetH / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    context.drawImage(img, dx, dy, dw, dh);
  }

  function buildLedProfile(nx, ny, isHorizontal) {
    const center = radialFalloff(nx, ny, 0.50, 0.48, 0.90);
    const topBand = Math.exp(-Math.pow((ny - 0.045) / 0.112, 2));
    const dotsTop = ledDots(nx, ny, 0.045, isHorizontal ? 11 : 8);
    const edgeSoft = 1 - clamp01(Math.abs(nx - 0.5) * 1.30);

    let value = 0.76 + center * 0.18 + topBand * 0.08 + dotsTop * 0.09 + edgeSoft * 0.035;
    return clamp(value, 0.72, 1.18);
  }

  function ledDots(nx, ny, rowY, count) {
    let sum = 0;
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const cx = 0.055 + t * 0.89;
      const dx = (nx - cx) / 0.052;
      const dy = (ny - rowY) / 0.043;
      sum += Math.exp(-(dx * dx + dy * dy));
    }
    return clamp01(sum);
  }

  function radialFalloff(nx, ny, cx, cy, radius) {
    const dx = nx - cx;
    const dy = ny - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    return clamp01(1 - d / radius);
  }

  function applyLitFinishing(outCtx, width, height) {
    outCtx.save();
    outCtx.globalCompositeOperation = "screen";

    const top = outCtx.createLinearGradient(0, 0, 0, height * 0.13);
    top.addColorStop(0, "rgba(255,244,208,0.075)");
    top.addColorStop(1, "rgba(255,244,208,0)");
    outCtx.fillStyle = top;
    outCtx.fillRect(0, 0, width, height * 0.13);

    outCtx.restore();

    outCtx.save();
    outCtx.globalCompositeOperation = "multiply";

    const vignette = outCtx.createRadialGradient(width * 0.5, height * 0.5, width * 0.28, width * 0.5, height * 0.52, Math.max(width, height) * 0.82);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.76, "rgba(61,43,25,0.018)");
    vignette.addColorStop(1, "rgba(61,43,25,0.075)");
    outCtx.fillStyle = vignette;
    outCtx.fillRect(0, 0, width, height);

    outCtx.restore();
  }

  function applyReliefFinishing(outCtx, width, height) {
    outCtx.save();
    outCtx.globalCompositeOperation = "multiply";
    const g = outCtx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(70,52,32,0.12)");
    outCtx.fillStyle = g;
    outCtx.fillRect(0, 0, width, height);
    outCtx.restore();
  }

  function boxBlurGray(src, width, height, radius) {
    const out = new Float32Array(src.length);
    const tmp = new Float32Array(src.length);
    const size = radius * 2 + 1;

    for (let y = 0; y < height; y += 1) {
      let acc = 0;
      for (let x = -radius; x <= radius; x += 1) {
        const xx = Math.max(0, Math.min(width - 1, x));
        acc += src[y * width + xx];
      }
      for (let x = 0; x < width; x += 1) {
        tmp[y * width + x] = acc / size;
        const removeX = Math.max(0, x - radius);
        const addX = Math.min(width - 1, x + radius + 1);
        acc += src[y * width + addX] - src[y * width + removeX];
      }
    }

    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let y = -radius; y <= radius; y += 1) {
        const yy = Math.max(0, Math.min(height - 1, y));
        acc += tmp[yy * width + x];
      }
      for (let y = 0; y < height; y += 1) {
        out[y * width + x] = acc / size;
        const removeY = Math.max(0, y - radius);
        const addY = Math.min(height - 1, y + radius + 1);
        acc += tmp[addY * width + x] - tmp[removeY * width + x];
      }
    }

    return out;
  }

  function contrastCurve(v, low, high) {
    const t = clamp01((v - low) / Math.max(0.0001, high - low));
    return t * t * (3 - 2 * t);
  }

  function smoothstep(v) {
    const t = clamp01(v);
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smartFileName(name, maxLen) {
    if (!name) return "Sin foto subida";
    if (name.length <= maxLen) return name;
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot) : "";
    const base = dot > 0 ? name.slice(0, dot) : name;
    const keep = Math.max(10, maxLen - ext.length - 1);
    return base.slice(0, keep) + "…" + ext;
  }

  function roundedRect(context, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function debounce(fn, wait) {
    let timeout = null;
    return function () {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(fn, wait);
    };
  }
}());
