/**
 * Captura la escena 3D real, incluidos los textos sobre el propio modelo.
 * No usa el antiguo motor de preview 2D ni envía datos por red.
 * El llamador debe congelar el estado, esperar a que termine de renderizar
 * y seleccionar la cámara de ficha antes de ejecutar la captura.
 */
export async function captureModelJpeg(
  viewer,
  { background = "#F4EBDD", maxDimension = 960, quality = 0.90, maxBytes = 900 * 1024 } = {}
) {
  if (!viewer?.loaded || !viewer.model || typeof viewer.toBlob !== "function") {
    throw new Error("El modelo 3D todavía no está preparado para capturar la ficha.");
  }
  if (!Number.isInteger(maxDimension) || maxDimension < 128 || maxDimension > 2048 ||
      typeof quality !== "number" || quality < 0.4 || quality > 1 ||
      !Number.isInteger(maxBytes) || maxBytes < 1024 || maxBytes > 2*1024*1024 ||
      !/^#[0-9a-fA-F]{6}$/.test(background)) {
    throw new TypeError("Parámetros de captura 3D no válidos.");
  }

  // model-viewer devuelve transparencia fuera de la pieza. Su JPG directo
  // convierte esa transparencia en negro. Componer sobre fondo opaco evita
  // ese error sin incorporar un segundo motor de representación.
  const png = await viewer.toBlob({ mimeType: "image/png" });
  if (!png || png.type !== "image/png" || png.size < 100) {
    throw new Error("El visor no ha generado una captura PNG válida.");
  }

  const bitmap = await createImageBitmap(png);
  try {
    if (!bitmap.width || !bitmap.height) {
      throw new Error("La captura del visor está vacía.");
    }
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("No se pudo componer la ficha JPG.");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    // El backend admite hasta 900 KiB. Variar únicamente la compresión
    // JPEG (sin alterar la imagen o la cámara) evita fichas descartadas.
    const qualities=[quality,...[0.82,0.70].filter(q=>q<quality)];
    for (const q of qualities) {
      const jpeg = await new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Error al codificar JPG 3D.")),
          "image/jpeg", q
        );
      });
      if (jpeg.type!=="image/jpeg" || jpeg.size<100) {
        throw new Error("La ficha generada no es JPG válido.");
      }
      if (jpeg.size<=maxBytes) return { blob:jpeg, width, height };
    }
    throw new Error("La ficha 3D supera el límite de tamaño del correo.");
  } finally {
    bitmap.close?.();
  }
}
