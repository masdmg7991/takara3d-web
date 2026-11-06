/* Validate every original before Drive effects; keep the execution ledger compact. */
function prepararArchivosPedidoV3_(orderId, archivos) {
  let budget = 0;
  const items = archivos.articulos.map(function (item) {
    const photos = item.fotos.map(function (photo) {
      const prepared = prepararFotoOriginal_(orderId + "_" + item.articulo_id + "_" + photo.cara, photo);
      budget += prepared.size_bytes;
      return { cara: photo.cara, archivo: prepared };
    });
    const proof = item.ficha_visual_base64 ? prepararFichaVisualSegura_(orderId + "_" + item.articulo_id, item) : null;
    if (proof && proof.ficha_visual_recibida) budget += proof.tamano_bytes * 2;
    // Internal proofs are inline AND attached; count both against the mail budget.
    if (budget > ORDER_ITEMS_MAX_BYTES) throw new Error("Las imágenes del pedido superan el límite conjunto de 20 MB.");
    return { id: item.articulo_id, fotos: photos, ficha: proof };
  });
  return { tipo: "articulos_v3", articulos: items };
}

function guardarArchivosPedidoV3_(prepared, folder) {
  const manifest = { version: "TAKARA_ORDER_MEDIA_V3", articulos: [] };
  prepared.articulos.forEach(function (item) {
    const itemFolder = folder.createFolder(item.id);
    const saved = { id: item.id, fotos: [], ficha: null };
    item.fotos.forEach(function (photo) {
      const record = guardarFoto_(photo.archivo, itemFolder);
      saved.fotos.push({ cara: photo.cara, id: record.id_archivo_drive, url: record.enlace_drive,
        nombre: record.nombre_archivo_foto, content_type: record.tipo_archivo_foto, bytes: record.tamano_archivo_foto_bytes });
    });
    if (item.ficha && item.ficha.ficha_visual_recibida) {
      const file = itemFolder.createFile(item.ficha.blob);
      saved.ficha = { id: file.getId(), nombre: item.ficha.nombre_archivo, url: file.getUrl(), bytes: item.ficha.tamano_bytes };
    }
    manifest.articulos.push(saved);
  });
  const file = folder.createFile(Utilities.newBlob(JSON.stringify(manifest), "application/json", "articulos.json"));
  // 20 boxes can contain 80 originals: metadata belongs in Drive, not a 9 KB property.
  return { foto_recibida: true, id_manifiesto_articulos: file.getId(), enlace_drive: folder.getUrl(),
    numero_articulos: manifest.articulos.length, estado_archivo: CFG.ESTADO_ARCHIVO_INICIAL };
}

function cargarArchivosPedidoV3_(record, pedido) {
  if (!record || !record.id_manifiesto_articulos) throw new Error("Falta el índice de archivos del pedido.");
  const manifest = JSON.parse(DriveApp.getFileById(record.id_manifiesto_articulos).getBlob().getDataAsString());
  if (manifest.version !== "TAKARA_ORDER_MEDIA_V3" || !Array.isArray(manifest.articulos) || manifest.articulos.length !== pedido.articulos.length) {
    throw new Error("El índice de archivos no corresponde al pedido.");
  }
  manifest.articulos.forEach(function (entry, i) {
    const item = pedido.articulos[i], expected = item.producto.codigo_producto === ORDER_ITEMS_BOX ? ORDER_ITEMS_FACES : ["frontal"];
    if (entry.id !== item.id || entry.fotos.length !== expected.length || entry.fotos.some(function (photo, n) { return photo.cara !== expected[n] || !photo.id; })) {
      throw new Error("Los archivos no corresponden a las caras del artículo.");
    }
  });
  return manifest;
}
