/* TAKARA FRAME TEXT PREVIEW V1.4 */
/* TAKARA_FRAME_TEXT_V1_4_1_RENDER_ISOLATION */
/* TAKARA_FRAME_TEXT_V1_4_2_CANVAS_ANCHOR */
/* TAKARA_FRAME_TEXT_V1_4_4_STABLE_EDITOR */
/* TAKARA_FRAME_TEXT_V1_4_9_RENDER_SPACE_LOCK */
(function () {
  "use strict";

  const VERSION = "TAKARA_FRAME_TEXT_V1_4";
  const SIDES = ["top", "right", "bottom", "left"];
  const SIDE_LABELS = {
    top: "Superior",
    right: "Derecho",
    bottom: "Inferior",
    left: "Izquierdo"
  };
  const PRICE_BY_SIDE_COUNT = Object.freeze({
    0: 0,
    1: 4,
    2: 6,
    3: 8,
    4: 8
  });
  const LETTER_COLORS = Object.freeze({
    actual: Object.freeze({ label: "Madera clara", hex: "#C6A664" }),
    rosewood: Object.freeze({ label: "Rosewood", hex: "#602C24" }),
    ebano: Object.freeze({ label: "Ébano", hex: "#2B211B" }),
    negro: Object.freeze({ label: "Negro", hex: "#151515" }),
    "blanco-mate": Object.freeze({ label: "Blanco mate", hex: "#EEE9E0" })
  });

  /*
   * Los contratos son deliberadamente independientes. Aunque las medidas se
   * parezcan al rotar el marco, cada formato conserva sus propios ejes y
   * márgenes. Los límites longitudinales parten de los planos de la ventana
   * interior; nunca del borde exterior del PNG.
   */
  const GEOMETRY = Object.freeze({
    vertical: Object.freeze({
      contract: "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
      imageSize: Object.freeze({ w: 1151, h: 1400 }),
      window: Object.freeze({ x: 201, y: 201, w: 748, h: 998 }),
      safety: Object.freeze({ horizontal: 30, vertical: 34 }),
      fontRatio: 0.30,
      faceAxisRatio: 0.68,
      verticalLineHeight: 1.08
    }),
    horizontal: Object.freeze({
      contract: "FRAME_TEXT_GEOMETRY_HORIZONTAL_V1",
      imageSize: Object.freeze({ w: 1400, h: 1151 }),
      window: Object.freeze({ x: 201, y: 201, w: 998, h: 748 }),
      safety: Object.freeze({ horizontal: 34, vertical: 30 }),
      fontRatio: 0.30,
      faceAxisRatio: 0.68,
      verticalLineHeight: 1.08
    })
  });

  const state = {
    enabled: false,
    format: "vertical",
    letterColor: "negro",
    selected: new Set(),
    activeSide: null,
    text: {
      top: "",
      right: "",
      bottom: "",
      left: ""
    }
  };

  let stage;
  let canvas;
  let overlay;
  let editor;
  let enabledInput;
  let payloadInput;
  let resizeObserver;
  let previewObserver;
  let renderFrame = 0;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    canvas = document.querySelector("[data-takara-preview-canvas]");
    stage = canvas ? canvas.parentElement : null;
    editor = document.querySelector("[data-takara-frame-text-editor]");
    enabledInput = document.querySelector("[data-takara-frame-text-enabled]");
    payloadInput = document.querySelector("[data-takara-frame-text-payload]");

    if (!stage || !editor || !enabledInput || !payloadInput) {
      console.warn("[Takara frame text] No se ha encontrado la estructura requerida.");
      return;
    }

    overlay = createOverlay();
    stage.appendChild(overlay);
    bindEvents();
    syncFormat();
    render();

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(scheduleRender);
      resizeObserver.observe(canvas);
    }

    if (window.MutationObserver) {
      previewObserver = new MutationObserver(scheduleRender);
      previewObserver.observe(canvas, {
        attributes: true,
        attributeFilter: ["width", "height", "style"]
      });
    }

    window.addEventListener("resize", scheduleRender, { passive: true });
    window.addEventListener("orientationchange", scheduleRender, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleRender).catch(function () {});
    }
  }

  function createOverlay() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("takara-frame-text-overlay");
    svg.setAttribute("data-takara-frame-text-overlay", "");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("preserveAspectRatio", "none");

    SIDES.forEach(function (side) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("data-takara-frame-text-render", side);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("aria-label", "");
      svg.appendChild(text);
    });

    const measurement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    measurement.setAttribute("data-takara-frame-text-measure", "");
    measurement.setAttribute("aria-hidden", "true");
    measurement.setAttribute("x", "-10000");
    measurement.setAttribute("y", "-10000");
    measurement.style.visibility = "hidden";
    measurement.style.pointerEvents = "none";
    svg.appendChild(measurement);

    return svg;
  }

  function bindEvents() {
    enabledInput.addEventListener("change", function () {
      state.enabled = enabledInput.checked;
      editor.hidden = !state.enabled;

      if (!state.enabled) {
        state.selected.clear();
        state.activeSide = null;
        SIDES.forEach(function (side) {
          state.text[side] = "";
          const input = inputFor(side);
          if (input) input.value = "";
        });
      }

      render();
    });

    document.querySelectorAll("[data-takara-frame-side-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        const side = button.getAttribute("data-takara-frame-side-toggle");
        if (!SIDES.includes(side)) return;

        if (state.selected.has(side) && state.activeSide === side) {
          state.selected.delete(side);
          state.text[side] = "";
          const input = inputFor(side);
          if (input) input.value = "";
          state.activeSide = firstSelectedSide();
        } else if (state.selected.has(side)) {
          state.activeSide = side;
        } else {
          state.selected.add(side);
          state.activeSide = side;
        }

        render();

        if (state.activeSide) {
          const input = inputFor(state.activeSide);
          if (input) input.focus();
        }
      });
    });

    document.querySelectorAll("[data-takara-frame-text-input]").forEach(function (input) {
      input.addEventListener("input", function () {
        const side = input.getAttribute("data-takara-frame-text-input");
        const candidate = normalizeText(input.value);
        const accepted = fitTextToSafeArea(side, candidate);
        state.text[side] = accepted;
        if (input.value !== accepted) {
          input.value = accepted;
          input.dataset.limitReached = "true";
        } else {
          delete input.dataset.limitReached;
        }
        render();
      });
    });

    document.querySelectorAll('input[name="color_texto_marco"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked || !Object.prototype.hasOwnProperty.call(LETTER_COLORS, input.value)) return;
        state.letterColor = input.value;
        render();
      });
    });

    if (window.MutationObserver) {
      const observer = new MutationObserver(function () {
        syncFormat();
        scheduleRender();
      });
      observer.observe(stage, { attributes: true, attributeFilter: ["data-format"] });
    }

    document.querySelectorAll('input[name="color_marco"]').forEach(function (input) {
      input.addEventListener("change", render);
    });
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .replace(/\s+/g, " ")
      .replace(/^\s+/, "");
  }

  function syncFormat() {
    state.format = stage.getAttribute("data-format") === "horizontal" ? "horizontal" : "vertical";
  }

  function scheduleRender() {
    if (renderFrame) return;

    renderFrame = window.requestAnimationFrame(function () {
      renderFrame = 0;
      render();
    });
  }

  function render() {
    if (!overlay || !stage || !canvas) return;

    syncFormat();
    const renderSpace = syncOverlayToPreview();
    const width = renderSpace.width;
    const height = renderSpace.height;
    overlay.setAttribute("viewBox", "0 0 " + width + " " + height);

    const geometry = calculateGeometry(width, height);
    applyLetterColor();

    SIDES.forEach(function (side) {
      const accepted = fitTextToSafeArea(side, state.text[side]);
      if (accepted !== state.text[side]) {
        state.text[side] = accepted;
        const input = inputFor(side);
        if (input) {
          input.value = accepted;
          input.dataset.limitReached = "true";
        }
      }
      renderSide(side, geometry);
      syncField(side);
    });

    syncPrice();
    syncPayload();
  }

  /*
   * V16B-2 dibuja en un espacio logico entero y despues presenta el canvas al
   * 100 % del escenario. La capa SVG usa exactamente ese mismo espacio logico
   * y la misma caja CSS. No vuelve a calcular una geometria paralela a partir
   * de getBoundingClientRect(), que puede contener fracciones distintas segun
   * el zoom y puede conservar momentaneamente la proporcion del formato previo.
   */
  function syncOverlayToPreview() {
    const renderSpace = getPreviewRenderSpace();

    overlay.style.inset = "0";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";

    return renderSpace;
  }

  function getPreviewRenderSpace() {
    const canvasRect = canvas.getBoundingClientRect();
    const declaredWidth = Number.parseFloat(canvas.style.width);
    const declaredHeight = Number.parseFloat(canvas.style.height);
    const hasDeclaredSpace =
      Number.isFinite(declaredWidth) &&
      Number.isFinite(declaredHeight) &&
      declaredWidth >= 2 &&
      declaredHeight >= 2;

    return {
      width: hasDeclaredSpace ? declaredWidth : Math.max(1, canvasRect.width),
      height: hasDeclaredSpace ? declaredHeight : Math.max(1, canvasRect.height)
    };
  }

  function calculateGeometry(stageWidth, stageHeight) {
    const contract = GEOMETRY[state.format];
    const scale = Math.min(
      (stageWidth * 0.92) / contract.imageSize.w,
      (stageHeight * 0.88) / contract.imageSize.h
    );

    const frame = {
      x: (stageWidth - contract.imageSize.w * scale) / 2,
      y: (stageHeight - contract.imageSize.h * scale) / 2,
      w: contract.imageSize.w * scale,
      h: contract.imageSize.h * scale
    };

    const windowRect = {
      x: frame.x + contract.window.x * scale,
      y: frame.y + contract.window.y * scale,
      w: contract.window.w * scale,
      h: contract.window.h * scale
    };

    const horizontalMargin = contract.safety.horizontal * scale;
    const verticalMargin = contract.safety.vertical * scale;
    const horizontalThickness = windowRect.y - frame.y;
    const verticalThickness = windowRect.x - frame.x;

    return {
      contract: contract,
      top: {
        x: windowRect.x + windowRect.w / 2,
        y: frame.y + horizontalThickness * contract.faceAxisRatio,
        angle: 0,
        maxLength: windowRect.w - horizontalMargin * 2,
        fontSize: horizontalThickness * contract.fontRatio
      },
      bottom: {
        x: windowRect.x + windowRect.w / 2,
        y: frame.y + frame.h -
          (frame.y + frame.h - windowRect.y - windowRect.h) * contract.faceAxisRatio,
        angle: 0,
        maxLength: windowRect.w - horizontalMargin * 2,
        fontSize: horizontalThickness * contract.fontRatio
      },
      left: {
        x: frame.x + verticalThickness * contract.faceAxisRatio,
        y: windowRect.y + windowRect.h / 2,
        angle: 0,
        maxLength: windowRect.h - verticalMargin * 2,
        fontSize: verticalThickness * contract.fontRatio
      },
      right: {
        x: frame.x + frame.w -
          (frame.x + frame.w - windowRect.x - windowRect.w) * contract.faceAxisRatio,
        y: windowRect.y + windowRect.h / 2,
        angle: 0,
        maxLength: windowRect.h - verticalMargin * 2,
        fontSize: verticalThickness * contract.fontRatio
      }
    };
  }

  function renderSide(side, geometry) {
    const node = overlay.querySelector('[data-takara-frame-text-render="' + side + '"]');
    const active = state.enabled && state.selected.has(side);
    const value = active ? state.text[side] : "";
    const axis = geometry[side];

    clearNode(node);
    node.setAttribute("x", axis.x.toFixed(2));
    node.setAttribute("y", axis.y.toFixed(2));
    node.setAttribute("font-size", Math.max(11, axis.fontSize).toFixed(2));
    node.removeAttribute("transform");
    node.setAttribute("aria-label", value);
    node.style.display = value ? "" : "none";

    const vertical = side === "left" || side === "right";
    const measured = vertical
      ? renderVerticalText(node, value, axis, geometry.contract.verticalLineHeight)
      : renderHorizontalText(node, value);
    const fits = !value || measured <= axis.maxLength;
    node.classList.toggle("is-invalid", !fits);
    setValidity(side, fits, axis.maxLength, measured);
  }

  function fitTextToSafeArea(side, candidate) {
    if (!candidate || !stage || !canvas || !overlay) return candidate;

    const renderSpace = getPreviewRenderSpace();
    const geometry = calculateGeometry(renderSpace.width, renderSpace.height);

    if (measureValue(side, candidate, geometry) <= geometry[side].maxLength) {
      return candidate;
    }

    const glyphs = Array.from(candidate.normalize("NFC"));
    while (glyphs.length > 0) {
      glyphs.pop();
      const shortened = glyphs.join("").replace(/\s+$/, "");
      if (measureValue(side, shortened, geometry) <= geometry[side].maxLength) {
        return shortened;
      }
    }

    return "";
  }

  function measureValue(side, value, geometry) {
    const axis = geometry[side];
    if (side === "left" || side === "right") {
      const glyphCount = Array.from(value.normalize("NFC")).length;
      const fontSize = Math.max(11, axis.fontSize);
      return glyphCount === 0
        ? 0
        : fontSize + Math.max(0, glyphCount - 1) * fontSize * geometry.contract.verticalLineHeight;
    }

    const node = overlay.querySelector("[data-takara-frame-text-measure]");
    node.setAttribute("font-size", Math.max(11, axis.fontSize).toFixed(2));
    node.textContent = value;
    const measured = measureText(node);
    node.textContent = "";
    return measured;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderHorizontalText(node, value) {
    node.textContent = value;
    return measureText(node);
  }

  function renderVerticalText(node, value, axis, lineHeight) {
    if (!value) return 0;

    const glyphs = Array.from(value.normalize("NFC"));
    const fontSize = Math.max(11, axis.fontSize);
    const advance = fontSize * lineHeight;
    const firstY = axis.y - ((glyphs.length - 1) * advance) / 2;

    glyphs.forEach(function (glyph, index) {
      const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspan.setAttribute("x", axis.x.toFixed(2));
      tspan.setAttribute("y", (firstY + index * advance).toFixed(2));
      tspan.textContent = glyph === " " ? "\u00A0" : glyph;
      node.appendChild(tspan);
    });

    return fontSize + Math.max(0, glyphs.length - 1) * advance;
  }

  function measureText(node) {
    if (!node || !node.textContent) return 0;
    try {
      return node.getComputedTextLength();
    } catch (error) {
      return node.textContent.length * Number(node.getAttribute("font-size") || 12) * 0.58;
    }
  }

  function setValidity(side, fits, maximum, current) {
    const input = inputFor(side);
    const status = document.querySelector('[data-takara-frame-text-status="' + side + '"]');
    if (!input || !status) return;

    if (!state.selected.has(side)) {
      input.setCustomValidity("");
      return;
    }

    if (!state.text[side]) {
      input.setCustomValidity("Escribe el texto para el lado " + SIDE_LABELS[side].toLowerCase() + ".");
      status.textContent = "Escribe el texto para este lado.";
      status.dataset.state = "error";
      return;
    }

    if (input.dataset.limitReached === "true") {
      input.setCustomValidity("");
      status.textContent = "Has alcanzado el límite seguro de este lado.";
      status.dataset.state = "limit";
      return;
    }

    if (!fits) {
      input.setCustomValidity("La frase no cabe dentro del tramo recto del marco.");
      status.textContent = "La frase es demasiado larga y alcanzaría las esquinas.";
      status.dataset.state = "error";
      return;
    }

    input.setCustomValidity("");
    const occupancy = maximum > 0 ? Math.round((current / maximum) * 100) : 0;
    if (occupancy >= 99) {
      status.textContent = "Límite seguro alcanzado. No admite más texto.";
      status.dataset.state = "limit";
    } else if (occupancy >= 85) {
      status.textContent = "Ocupa el " + occupancy + "% de la zona segura. Queda poco espacio.";
      status.dataset.state = "warning";
    } else {
      status.textContent = "Ocupa el " + occupancy + "% de la zona segura.";
      status.dataset.state = "ok";
    }
  }

  function syncField(side) {
    const selected = state.enabled && state.selected.has(side);
    const editing = selected && state.activeSide === side;
    const button = document.querySelector('[data-takara-frame-side-toggle="' + side + '"]');
    const field = document.querySelector('[data-takara-frame-text-field="' + side + '"]');
    const input = inputFor(side);

    if (button) {
      button.classList.toggle("is-active", selected);
      button.classList.toggle("is-editing", editing);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.setAttribute(
        "aria-label",
        selected
          ? SIDE_LABELS[side] + (editing ? ": en edición; pulsa para quitar" : ": incluido; pulsa para editar")
          : SIDE_LABELS[side] + ": pulsa para añadir"
      );
    }

    if (field) field.hidden = !editing;
    if (input) input.required = selected;
  }

  function firstSelectedSide() {
    return SIDES.find(function (side) {
      return state.selected.has(side);
    }) || null;
  }

  function syncPrice() {
    const count = state.enabled ? state.selected.size : 0;
    const price = PRICE_BY_SIDE_COUNT[count] || 0;
    const selection = document.querySelector("[data-takara-frame-text-selection]");
    const priceNode = document.querySelector("[data-takara-frame-text-price]");

    if (selection) {
      selection.textContent = count === 0
        ? "Selecciona los lados"
        : count + (count === 1 ? " lado seleccionado" : " lados seleccionados");
    }

    if (priceNode) priceNode.textContent = "+" + price + " €";
  }

  function syncPayload() {
    const sides = {};
    SIDES.forEach(function (side) {
      if (state.enabled && state.selected.has(side)) sides[side] = state.text[side];
    });

    const count = Object.keys(sides).length;
    payloadInput.value = count === 0 ? "" : JSON.stringify({
      version: VERSION,
      geometry_contract: GEOMETRY[state.format].contract,
      orientacion: state.format,
      numero_lados: count,
      suplemento_unitario_eur: (PRICE_BY_SIDE_COUNT[count] || 0).toFixed(2),
      color_texto: state.letterColor,
      color_texto_nombre: LETTER_COLORS[state.letterColor].label,
      lados: sides
    });

    window.dispatchEvent(new CustomEvent("takara:frame-text-change", {
      detail: getPublicState()
    }));
  }

  function applyLetterColor() {
    overlay.setAttribute("data-letter-color", state.letterColor);
    overlay.style.setProperty("--takara-letter-color", LETTER_COLORS[state.letterColor].hex);

    const frameColor = document.querySelector('input[name="color_marco"]:checked');
    const contrast = document.querySelector("[data-takara-frame-text-contrast]");
    if (!contrast) return;

    const sameColor = frameColor && frameColor.value === state.letterColor;
    contrast.hidden = !sameColor;
    contrast.textContent = sameColor
      ? "Marco y letras tienen el mismo color; el texto tendrá un contraste muy discreto."
      : "";
  }

  function inputFor(side) {
    return document.querySelector('[data-takara-frame-text-input="' + side + '"]');
  }

  function getPublicState() {
    const count = state.enabled ? state.selected.size : 0;
    return Object.freeze({
      version: VERSION,
      enabled: state.enabled,
      format: state.format,
      geometry_contract: GEOMETRY[state.format].contract,
      selected_sides: Object.freeze(Array.from(state.selected)),
      texts: Object.freeze(Object.assign({}, state.text)),
      letter_color: state.letterColor,
      letter_color_name: LETTER_COLORS[state.letterColor].label,
      side_count: count,
      supplement_eur: (PRICE_BY_SIDE_COUNT[count] || 0).toFixed(2)
    });
  }

  window.TAKARA_FRAME_TEXT_V1 = Object.freeze({
    getState: getPublicState,
    prices: PRICE_BY_SIDE_COUNT,
    letterColors: LETTER_COLORS
  });
})();
