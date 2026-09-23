/*
 * TAKARA ORDER MEDIA V1
 *
 * Photo/visual-proof preparation and order media persistence.
 */

function prepararFotoOriginal_(idPedidoWeb, archivos) {
  const parsed = parseFotoBase64_(archivos.foto_base64, archivos.content_type);

  if (!parsed.base64) {
    throw new Error("Falta la foto del pedido.");
  }

  if (parsed.base64.length > CFG.MAX_FOTO_BASE64_CHARS) {
    throw new Error("La foto supera el m\u00E1ximo permitido de 20 MB.");
  }

  let bytes;

  try {
    bytes = Utilities.base64Decode(parsed.base64);
  } catch (error) {
    throw new Error("La foto no contiene datos base64 v\u00E1lidos.");
  }

  if (bytes.length < 1) {
    throw new Error("La foto est\u00E1 vac\u00EDa.");
  }

  if (bytes.length > CFG.MAX_FOTO_BYTES) {
    throw new Error("La foto supera el m\u00E1ximo permitido de 20 MB.");
  }

  if (
    archivos.size_bytes !== "" &&
    archivos.size_bytes !== bytes.length
  ) {
    throw new Error("El tama\u00F1o real de la foto no coincide con el declarado.");
  }

  const contentType = detectarContentTypeImagen_(bytes);

  if (!contentType) {
    throw new Error("La foto no es una imagen JPG, PNG o WEBP v\u00E1lida.");
  }

  const extension = extensionDesdeContentType_(contentType, "");
  const filename = idPedidoWeb + "_original." + extension;
  const blob = Utilities.newBlob(bytes, contentType, filename);

  return {
    blob: blob,
    nombre_archivo: filename,
    content_type: contentType,
    size_bytes: bytes.length
  };
}

function guardarFoto_(fotoPreparada, folder) {
  const file = folder.createFile(fotoPreparada.blob);

  return {
    foto_recibida: true,
    enlace_drive: file.getUrl(),
    id_archivo_drive: file.getId(),
    nombre_archivo_foto: fotoPreparada.nombre_archivo,
    tipo_archivo_foto: fotoPreparada.content_type,
    tamano_archivo_foto_bytes: fotoPreparada.size_bytes,
    estado_archivo: CFG.ESTADO_ARCHIVO_INICIAL,
    nota_archivo: "Foto recibida y guardada en Drive."
  };
}

function byteSinSigno_(value) {
  const n = Number(value);
  return ((n % 256) + 256) % 256;
}

function bytesCoinciden_(bytes, offset, expected) {
  if (!bytes || bytes.length < offset + expected.length) {
    return false;
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (byteSinSigno_(bytes[offset + index]) !== expected[index]) {
      return false;
    }
  }

  return true;
}

function detectarContentTypeImagen_(bytes) {
  if (bytesCoinciden_(bytes, 0, [0xFF, 0xD8, 0xFF])) {
    return "image/jpeg";
  }

  if (
    bytesCoinciden_(bytes, 0, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  ) {
    return "image/png";
  }

  if (
    bytesCoinciden_(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    bytesCoinciden_(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }

  return "";
}

function esJpegCompletoPorFirma_(bytes) {
  return !!bytes &&
    bytes.length >= 16 &&
    bytesCoinciden_(bytes, 0, [0xFF, 0xD8, 0xFF]) &&
    bytesCoinciden_(bytes, bytes.length - 2, [0xFF, 0xD9]);
}

function prepararFichaVisual_(idPedidoWeb, archivos) {
  const vacio = {
    ficha_visual_recibida: false,
    nombre_archivo: "",
    content_type: "",
    tamano_bytes: 0,
    modo: archivos.ficha_visual_modo || "encendida",
    blob: null,
    estado: "no_generada",
    nota: "El navegador no adjunt\u00F3 una ficha visual; el pedido conserva los datos estructurados."
  };

  if (!archivos.ficha_visual_base64) {
    return vacio;
  }

  const parsed = parseFotoBase64_(
    archivos.ficha_visual_base64,
    archivos.ficha_visual_content_type
  );
  const contentType = parsed.contentType || archivos.ficha_visual_content_type;

  if (contentType !== "image/jpeg") {
    throw new Error("La ficha visual recibida no es un JPEG v\u00E1lido.");
  }

  if (!parsed.base64) {
    throw new Error("La ficha visual no contiene datos base64.");
  }

  if (parsed.base64.length > CFG.MAX_VISUAL_PROOF_BASE64_CHARS) {
    throw new Error("La ficha visual supera el l\u00EDmite de seguridad.");
  }

  let bytes;

  try {
    bytes = Utilities.base64Decode(parsed.base64);
  } catch (error) {
    throw new Error("La ficha visual no contiene datos base64 v\u00E1lidos.");
  }

  if (bytes.length < 1 || bytes.length > CFG.MAX_VISUAL_PROOF_BYTES) {
    throw new Error("La ficha visual supera el l\u00EDmite de seguridad.");
  }

  if (
    archivos.ficha_visual_size_bytes !== "" &&
    bytes.length !== archivos.ficha_visual_size_bytes
  ) {
    throw new Error("El tama\u00F1o real de la ficha visual no coincide con el declarado.");
  }

  if (
    detectarContentTypeImagen_(bytes) !== "image/jpeg" ||
    !esJpegCompletoPorFirma_(bytes)
  ) {
    throw new Error("La ficha visual no tiene una firma JPEG v\u00E1lida.");
  }

  const filename = idPedidoWeb + "_vista_previa.jpg";
  const blob = Utilities.newBlob(bytes, "image/jpeg", filename);

  return {
    ficha_visual_recibida: true,
    nombre_archivo: filename,
    content_type: "image/jpeg",
    tamano_bytes: bytes.length,
    modo: archivos.ficha_visual_modo || "encendida",
    blob: blob,
    estado: "preparada",
    nota: "Ficha visual validada para los correos y no almacenada en Drive."
  };
}

function prepararFichaVisualSegura_(idPedidoWeb, archivos) {
  try {
    validarFichaVisual_(archivos);
    return prepararFichaVisual_(idPedidoWeb, archivos);
  } catch (error) {
    return {
      ficha_visual_recibida: false,
      nombre_archivo: "",
      content_type: "",
      tamano_bytes: 0,
      modo: archivos.ficha_visual_modo || "encendida",
      blob: null,
      estado: "descartada",
      nota: "Ficha visual descartada sin bloquear el pedido: " +
        texto_(error && error.message ? error.message : error)
    };
  }
}

function parseFotoBase64_(value, fallbackContentType) {
  const text = texto_(value);

  if (!text) {
    return {
      base64: "",
      contentType: fallbackContentType || ""
    };
  }

  const match = text.match(/^data:([^;]+);base64,(.+)$/);

  if (match) {
    return {
      contentType: match[1],
      base64: match[2]
    };
  }

  return {
    contentType: fallbackContentType || "",
    base64: text
  };
}

function asegurarCarpetaPedido_(idPedidoWeb, now) {
  const root = getOrCreateRootFolder_();
  const pedidos = getOrCreateChildFolder_(root, CFG.PEDIDOS_FOLDER);
  const year = Utilities.formatDate(now, CFG.TZ, "yyyy");
  const yearFolder = getOrCreateChildFolder_(pedidos, year);
  return getOrCreateChildFolder_(yearFolder, idPedidoWeb);
}
