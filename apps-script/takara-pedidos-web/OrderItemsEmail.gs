/* Two matching confirmations, with media grouped by stable article ID. */
function textoArticuloV3_(item) {
  const p = item.producto, box = p.codigo_producto === ORDER_ITEMS_BOX;
  const lines = [item.id + " · " + p.formato, "Cantidad: " + p.cantidad, "Medida: " + p.medida];
  if (box) lines.push("Color cuerpo: " + p.color_cuerpo, "Color peana: " + p.color_peana);
  else {
    lines.push("Color marco: " + p.color_marco);
    if (p.personalizacion_marco.activa) lines.push(construirBloquePersonalizacionClienteTexto_(p.personalizacion_marco));
  }
  lines.push("Precio unitario: " + formatearEuros_(p.precio_unitario_mostrado_eur), "Subtotal: " + formatearEuros_(p.precio_total_eur));
  return lines.join("\n");
}

function cuerpoPedidoV3_(id, pedido, manifest, internal) {
  const lines = [internal ? "[TAKARA_PEDIDO_WEB_V3]" : "TAKARA 3D · SOLICITUD RECIBIDA", "Referencia: " + id,
    internal ? "Origen: " + construirOrigenVisiblePedido_(pedido) : "Hola, " + pedido.cliente.nombre + ":",
    "Cliente: " + pedido.cliente.nombre, "Email: " + pedido.cliente.email, "Teléfono: " + pedido.cliente.telefono,
    "", "ARTÍCULOS"];
  pedido.articulos.forEach(function (item, i) {
    lines.push("", "[ARTICULO_" + item.id + "]", textoArticuloV3_(item));
    manifest.articulos[i].fotos.forEach(function (photo) {
      lines.push("Foto " + photo.cara + ": " + photo.nombre + (internal ? " · " + photo.url : ""));
    });
    if (manifest.articulos[i].ficha) lines.push("Vista 3D del marco: " + manifest.articulos[i].ficha.nombre);
  });
  lines.push("", "ENTREGA", construirBloqueEntregaClienteTexto_(pedido), "", "RESUMEN",
    "Subtotal productos: " + formatearEuros_(pedido.totales.producto_eur),
    "Entrega: " + textoPrecioEntrega_(pedido.entrega), "Total estimado: " + textoTotalEstimado_(pedido.totales),
    "", "Observaciones: " + (pedido.mensaje_cliente || "Sin observaciones"),
    "Publicación del resultado: " + (pedido.control.autoriza_publicacion_resultado ? "Autorizada, excepto imágenes de menores" : "No autorizada"),
    "", "Revisaremos las fotografías y confirmaremos contigo los detalles antes de fabricar.",
    "Esta confirmación acredita la recepción de la solicitud, sin iniciar todavía la fabricación.");
  return lines.join("\n");
}

function htmlPedidoV3_(id, pedido, manifest, internal) {
  return renderPedidoV3Premium_(id, pedido, manifest, internal);
}

function enviarPedidoV3_(id, pedido, record, internal) {
  const manifest = cargarArchivosPedidoV3_(record, pedido), inline = {}, attachments = [];
  pedido.articulos.forEach(function (item, i) {
    const saved = manifest.articulos[i], box = item.producto.codigo_producto === ORDER_ITEMS_BOX;
    saved.fotos.forEach(function (photo, n) {
      const blob = DriveApp.getFileById(photo.id).getBlob().setName(photo.nombre);
      if (internal) attachments.push(blob);
      else if (box) inline[item.id + "_foto_" + n] = blob;
    });
    if (saved.ficha) {
      const proof = DriveApp.getFileById(saved.ficha.id).getBlob().setName(saved.ficha.nombre);
      inline[item.id + "_vista"] = proof;
      if (internal) attachments.push(proof);
    }
  });
  const options = { to: internal ? CFG.DESTINO_PEDIDOS : pedido.cliente.email,
    subject: internal ? "[TAKARA PEDIDO WEB] " + id + " · " + pedido.articulos.length + " artículos · " + pedido.cliente.nombre
      : "Tu pedido ha llegado a Takara 3D · " + id,
    body: cuerpoPedidoV3_(id, pedido, manifest, internal), htmlBody: htmlPedidoV3_(id, pedido, manifest, internal),
    name: "Takara 3D", replyTo: internal ? pedido.cliente.email : CFG.DESTINO_PEDIDOS };
  if (Object.keys(inline).length) options.inlineImages = inline;
  if (attachments.length) options.attachments = attachments;
  MailApp.sendEmail(options);
}
