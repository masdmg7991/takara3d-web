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
  let rows = construirCabeceraEmailPremium_("Solicitud recibida", internal ? "Nuevo pedido" : "Tu pedido Takara 3D",
    internal ? "Un nuevo recuerdo por preparar" : "Hemos recibido tu solicitud",
    "Cada producto y sus fotografías quedan identificados para revisarlos contigo antes de fabricar.");
  rows += '<tr><td style="padding:24px 32px;">' + construirReferenciaEmailPremium_("Referencia", id);
  rows += '<p style="font:15px Arial;color:#432c23;">' + escapeHtml_(pedido.cliente.nombre) + " · " + escapeHtml_(pedido.cliente.email) + '</p>';
  pedido.articulos.forEach(function (item, i) {
    const p = item.producto, saved = manifest.articulos[i], box = p.codigo_producto === ORDER_ITEMS_BOX;
    rows += construirTituloSeccionEmailPremium_(item.id + " · " + p.formato);
    rows += '<table role="presentation" width="100%" style="border-collapse:collapse;">';
    rows += construirFilaResumenEmailPremium_("Cantidad", String(p.cantidad), false);
    rows += construirFilaResumenEmailPremium_("Medida", escapeHtml_(p.medida), false);
    if (box) {
      rows += construirFilaResumenEmailPremium_("Color del cuerpo", escapeHtml_(p.color_cuerpo), false);
      rows += construirFilaResumenEmailPremium_("Color de la peana", escapeHtml_(p.color_peana), false);
    } else {
      rows += construirFilaResumenEmailPremium_("Color del marco", escapeHtml_(p.color_marco), false);
      if (p.personalizacion_marco.activa) rows += construirFilasPersonalizacionEmailPremium_(p.personalizacion_marco);
    }
    rows += construirFilaResumenEmailPremium_("Precio unitario", escapeHtml_(formatearEuros_(p.precio_unitario_mostrado_eur)), false);
    rows += construirFilaResumenEmailPremium_("Subtotal", escapeHtml_(formatearEuros_(p.precio_total_eur)), true, true) + '</table>';
    if (box && !internal) {
      rows += '<table role="presentation" width="100%" style="table-layout:fixed;border-collapse:collapse;">';
      saved.fotos.forEach(function (photo, n) {
        if (n % 2 === 0) rows += '<tr>';
        rows += '<td width="50%" valign="top" style="padding:8px;overflow-wrap:anywhere;word-break:break-word;">' +
          '<p style="font:13px Arial;color:#614936;">Foto ' + escapeHtml_(photo.cara) + '</p>' +
          '<img src="cid:' + item.id + '_foto_' + n + '" alt="Foto ' + escapeHtml_(photo.cara) + '" width="220" style="width:220px;max-width:100%;height:auto;">' +
          '<p style="font:11px/1.5 Arial;color:#614936;overflow-wrap:anywhere;word-break:break-word;">' + escapeHtml_(photo.nombre) + '</p></td>';
        if (n % 2 === 1) rows += '</tr>';
      });
      rows += '</table>';
    } else saved.fotos.forEach(function (photo) {
      rows += '<p style="font:13px Arial;color:#614936;overflow-wrap:anywhere;word-break:break-word;">Foto ' + escapeHtml_(photo.cara) + " · " + escapeHtml_(photo.nombre);
      if (internal) rows += ' · <a href="' + escapeHtml_(photo.url) + '">Abrir original en Drive</a>';
      rows += '</p>';
    });
    if (saved.ficha) rows += '<p style="font:13px Arial;color:#614936;">Vista orientativa del marco</p><img src="cid:' + item.id + '_vista" alt="Vista 3D de ' + escapeHtml_(item.id) + '" width="480" style="width:100%;max-width:480px;height:auto;">';
  });
  rows += construirTituloSeccionEmailPremium_("Entrega y total");
  rows += '<table role="presentation" width="100%" style="border-collapse:collapse;">' + construirFilasEntregaEmailPremium_(pedido);
  rows += construirFilaResumenEmailPremium_("Subtotal de productos", escapeHtml_(formatearEuros_(pedido.totales.producto_eur)), false);
  rows += construirFilaResumenEmailPremium_("Total estimado", escapeHtml_(textoTotalEstimado_(pedido.totales)), true, true) + '</table>';
  rows += '<p style="font:14px/1.6 Arial;color:#614936;">Observaciones: ' + escapeHtml_(pedido.mensaje_cliente || "Sin observaciones") + '</p>';
  rows += '<p style="font:13px/1.6 Arial;color:#614936;">Publicación del resultado: ' +
    (pedido.control.autoriza_publicacion_resultado ? "autorizada, excepto imágenes de menores." : "no autorizada.") + '</p>';
  rows += '<p style="font:13px/1.6 Arial;color:#614936;">Revisaremos las fotos, los acabados y la entrega contigo. Esta confirmación no implica todavía la aceptación definitiva ni el inicio de la fabricación.</p></td></tr>';
  rows += construirPieEmailPremium_("Takara 3D", "Convertimos tus recuerdos en luz", "Solicitud pendiente de revisión y confirmación.");
  return envolverEmailPremium_(rows);
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
