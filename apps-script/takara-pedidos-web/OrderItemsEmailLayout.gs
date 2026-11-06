/* V3 presentation only. Originals, CIDs, prices and delivery remain authoritative. */
function emailV3Table_(rows, style) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse;' + (style || '') + '">' + rows + '</table>';
}

function emailV3Paragraph_(text, style) {
  return '<p style="margin:0;font:14px/1.65 Arial;color:#695447;word-break:break-word;' + (style || '') + '">' + escapeHtml_(text) + '</p>';
}

function emailV3Heading_(title) {
  return '<h2 style="margin:0 0 16px;font:24px/1.25 Georgia,serif;color:#2d2018;">' + escapeHtml_(title) + '</h2>';
}

function emailV3Row_(label, value) {
  return '<tr><td width="44%" valign="top" style="padding:9px 12px 9px 0;border-bottom:1px solid #eee5d9;font:13px/1.5 Arial;color:#806b5a;word-break:break-word;">' + escapeHtml_(label) +
    '</td><td width="56%" valign="top" align="right" style="padding:9px 0;border-bottom:1px solid #eee5d9;font:600 14px/1.5 Arial;color:#34241b;word-break:break-word;">' + escapeHtml_(value) + '</td></tr>';
}

function emailV3Card_(content) {
  return '<tr><td class="tk-gutter" style="padding:0 24px 22px;">' + emailV3Table_('<tr><td class="tk-card" style="padding:24px;">' + content + '</td></tr>',
    'background:#fffdf9;border:1px solid #e7dac9;border-radius:14px;border-collapse:separate;') + '</td></tr>';
}

function emailV3Contact_(pedido, internal) {
  const c = pedido.cliente;
  const email = '<a href="mailto:' + encodeURIComponent(c.email) + '" style="color:#735125;text-decoration:underline;word-break:break-all;">' + escapeHtml_(c.email) + '</a>';
  const phone = '<a href="tel:' + escapeHtml_(c.telefono) + '" style="color:#735125;text-decoration:underline;">' + escapeHtml_(c.telefono) + '</a>';
  let html = emailV3Heading_(internal ? 'Contacto del cliente' : 'Tus datos de contacto');
  html += emailV3Paragraph_(c.nombre, 'color:#34241b;font-weight:700;font-size:16px;margin-bottom:8px;');
  html += '<p style="margin:0 0 8px;font:14px/1.6 Arial;word-break:break-all;">' + email + '</p>';
  html += '<p style="margin:0;font:14px/1.6 Arial;">' + phone + '</p>';
  if (internal) html += emailV3Paragraph_('Origen: ' + construirOrigenVisiblePedido_(pedido), 'font-size:12px;margin-top:14px;');
  return emailV3Card_(html);
}

function emailV3Photos_(item, saved, internal) {
  if (internal) {
    let links = '<p style="margin:20px 0 8px;font:700 11px Arial;letter-spacing:1.4px;color:#9b7437;">ORIGINALES PARA PRODUCCIÓN</p>';
    saved.fotos.forEach(function (photo) {
      links += '<p style="margin:0 0 10px;font:12px/1.5 Arial;word-break:break-all;"><a href="' + escapeHtml_(photo.url) + '" style="color:#735125;text-decoration:underline;">' +
        escapeHtml_('Foto ' + photo.cara) + '</a><br><span style="color:#806b5a;">' + escapeHtml_(photo.nombre) + '</span></p>';
    });
    return links;
  }
  if (item.producto.codigo_producto !== ORDER_ITEMS_BOX) return '';
  let rows = '';
  for (let n = 0; n < saved.fotos.length; n += 2) {
    const pair = saved.fotos.slice(n, n + 2);
    if (n) rows += '<tr><td colspan="3" height="12" style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>';
    rows += '<tr>';
    pair.forEach(function (photo, side) {
      if (side) rows += '<td width="4%" rowspan="2"></td>';
      const face = photo.cara.charAt(0).toUpperCase() + photo.cara.slice(1);
      rows += '<td width="48%" style="background:#f5efe5;padding:12px 10px 0;border-radius:8px 8px 0 0;font:700 11px Arial;letter-spacing:.7px;color:#806b5a;">' + escapeHtml_(face) + '</td>';
    });
    rows += '</tr><tr>';
    pair.forEach(function (photo, side) {
      rows += '<td class="tk-photo-stage" height="172" align="center" valign="middle" style="height:172px;padding:8px;background:#f5efe5;border-radius:0 0 8px 8px;">' +
        '<img class="tk-photo-image" src="cid:' + item.id + '_foto_' + (n + side) + '" alt="Foto ' + escapeHtml_(photo.cara) + '" width="220" style="width:auto;max-width:100%;max-height:152px;"></td>';
    });
    rows += '</tr>';
  }
  return '<p style="margin:20px 0 8px;font:700 11px Arial;letter-spacing:1.4px;color:#9b7437;">TUS CUATRO FOTOGRAFÍAS</p>' + emailV3Table_(rows);
}

function emailV3Article_(item, saved, internal) {
  const p = item.producto, box = p.codigo_producto === ORDER_ITEMS_BOX, text = p.personalizacion_marco;
  let html = emailV3Paragraph_('PIEZA ' + item.id, 'font-size:11px;font-weight:700;letter-spacing:1.8px;color:#a17939;margin-bottom:6px;');
  html += '<h2 style="margin:0 0 6px;font:24px/1.25 Georgia,serif;color:#2d2018;">' + escapeHtml_(p.formato) + '</h2>';
  html += emailV3Paragraph_(p.cantidad + (p.cantidad === 1 ? ' unidad' : ' unidades') + ' · ' + p.medida.replace(/ x /g, ' × '), 'font-size:12px;margin-bottom:20px;');
  if (saved.ficha) {
    html += emailV3Table_('<tr><td align="center" style="padding:10px;background:#f3ebdc;border-radius:8px;"><img src="cid:' + item.id +
      '_vista" alt="Vista 3D de ' + escapeHtml_(item.id) + '" width="420" style="display:block;width:100%;max-width:420px;height:auto;border:0;"></td></tr>');
    html += emailV3Paragraph_('Vista orientativa de tu marco personalizado.', 'font-size:11px;margin:8px 0 16px;color:#927d67;');
  }
  let rows = box ? emailV3Row_('Color del cuerpo', p.color_cuerpo) + emailV3Row_('Color de la peana', p.color_peana) : emailV3Row_('Color del marco', p.color_marco);
  if (text && text.activa) {
    rows += emailV3Row_('Lados personalizados', String(text.numero_lados));
    rows += emailV3Row_('Color del texto', text.color_texto_nombre);
    const labels = {top:'Superior', right:'Derecho', bottom:'Inferior', left:'Izquierdo'};
    Object.keys(labels).forEach(function (side) { if (text.lados[side]) rows += emailV3Row_(labels[side], text.lados[side]); });
  }
  html += emailV3Table_(rows);
  html += emailV3Photos_(item, saved, internal);
  html += emailV3Table_('<tr><td width="55%" valign="bottom" style="padding-top:20px;font:12px/1.6 Arial;color:#695447;">' +
    escapeHtml_(formatearEuros_(p.precio_unitario_mostrado_eur) + ' por unidad') +
    '</td><td width="45%" align="right" style="padding-top:20px;font:11px/1.6 Arial;color:#695447;">Subtotal<br><strong style="font-size:22px;color:#34241b;">' +
    escapeHtml_(formatearEuros_(p.precio_total_eur)) + '</strong></td></tr>');
  return emailV3Card_(html);
}

function emailV3Delivery_(pedido) {
  const e = pedido.entrega;
  let rows = emailV3Row_('Modalidad', nombreModalidadEntrega_(e));
  if (e.fulfillment_method === 'STORE_PICKUP') {
    const pickup = pedido.attribution && pedido.attribution.pickup || {};
    const point = [pickup.address_line, [pickup.postal_code, pickup.city].filter(Boolean).join(' '), pickup.province].filter(Boolean).join(', ');
    rows += emailV3Row_('Punto de recogida', point || 'Tienda pendiente de confirmar');
  } else {
    rows += emailV3Row_('Código postal', e.codigo_postal || 'Pendiente');
    rows += emailV3Row_('Zona', e.zona_nombre || 'Pendiente de confirmar');
    if (e.ubicacion_requerida && e.ubicacion_nombre) rows += emailV3Row_('Localidad o distrito', e.ubicacion_nombre);
    else if (e.municipio_nombre) rows += emailV3Row_('Municipio', e.municipio_nombre + (e.provincia_nombre ? ' (' + e.provincia_nombre + ')' : ''));
    else if (e.localidad_informativa) rows += emailV3Row_('Localidad indicada', e.localidad_informativa);
  }
  rows += emailV3Row_('Coste de entrega', textoPrecioEntrega_(e));
  let html = emailV3Heading_('Entrega') + emailV3Table_(rows);
  if (e.fulfillment_method !== 'STORE_PICKUP') html += emailV3Paragraph_('Te pediremos la dirección completa después de revisar las fotos y confirmar el pedido contigo.', 'font-size:12px;margin-top:16px;');
  if (e.nota) html += emailV3Paragraph_(e.nota, 'font-size:12px;margin-top:10px;');
  return emailV3Card_(html);
}

function renderPedidoV3Premium_(id, pedido, manifest, internal) {
  const units = pedido.articulos.reduce(function (sum, item) { return sum + item.producto.cantidad; }, 0);
  const count = pedido.articulos.length;
  let rows = '<tr><td class="tk-header" bgcolor="#2b1d14" style="padding:30px 36px;background:#2b1d14;border-top:4px solid #c99d50;">';
  rows += emailV3Table_('<tr><td width="56" valign="middle"><img src="https://takara3d.es/assets/brand/takara-logo-principal-header.png" alt="" width="44" height="44" style="display:block;width:44px;height:44px;border:0;"></td>' +
    '<td valign="middle" style="font:23px Georgia,serif;letter-spacing:1.5px;color:#fff7e9;">TAKARA <span style="color:#d6ae68;">3D</span></td></tr>');
  rows += emailV3Paragraph_(internal ? 'NUEVO PEDIDO · REVISIÓN PENDIENTE' : 'SOLICITUD RECIBIDA', 'color:#d6ae68;font-size:10px;font-weight:700;letter-spacing:1.6px;margin:26px 0 12px;');
  rows += '<h1 class="tk-title" style="margin:0 0 16px;font:34px/1.15 Georgia,serif;color:#fff7e9;">' +
    (internal ? 'Nuevo pedido para revisar' : 'Hemos recibido tu solicitud') + '</h1>';
  rows += emailV3Paragraph_(internal ? 'Fotos, acabados y entrega reunidos para preparar la revisión del pedido.' :
    'Gracias, ' + pedido.cliente.nombre + '. Ya tenemos tus fotos y los detalles de cada pieza. Revisaremos todo contigo antes de fabricar.', 'color:#dfd0bc;');
  rows += '<p style="margin:24px 0 5px;font:10px Arial;letter-spacing:1.6px;color:#d6ae68;">REFERENCIA DE TU PEDIDO</p>' +
    '<p style="margin:0;font:700 15px/1.5 Arial;color:#fff7e9;word-break:break-all;">' + escapeHtml_(id) + '</p></td></tr>';
  rows += '<tr><td class="tk-gutter" style="padding:24px;">' + emailV3Paragraph_(count + (count === 1 ? ' artículo' : ' artículos') + ' · ' + units + (units === 1 ? ' unidad' : ' unidades'), 'font-size:12px;font-weight:700;color:#927047;letter-spacing:.5px;') + '</td></tr>';
  if (internal) rows += emailV3Contact_(pedido, true);
  pedido.articulos.forEach(function (item, n) { rows += emailV3Article_(item, manifest.articulos[n], internal); });
  rows += emailV3Delivery_(pedido);
  let totals = emailV3Heading_('Resumen del pedido') + emailV3Table_(emailV3Row_('Productos', formatearEuros_(pedido.totales.producto_eur)) + emailV3Row_('Entrega', textoPrecioEntrega_(pedido.entrega)));
  totals += emailV3Table_('<tr><td style="padding:18px 16px;">' + emailV3Paragraph_('Total estimado', 'font-size:12px;color:#5e4528;') +
    emailV3Paragraph_(textoTotalEstimado_(pedido.totales), 'font-size:28px;font-weight:700;color:#352313;') + '</td></tr>', 'background:#f2e4cc;margin-top:18px;border-radius:8px;');
  totals += emailV3Paragraph_('Solicitud pendiente de revisión y confirmación. La fabricación aún no ha comenzado.', 'font-size:12px;margin-top:14px;');
  rows += emailV3Card_(totals);
  if (!internal) {
    rows += emailV3Contact_(pedido, false);
    rows += emailV3Card_(emailV3Heading_('¿Qué pasa ahora?') + emailV3Paragraph_('01 · Revisamos las fotos y el encuadre.', 'margin-bottom:8px;color:#34241b;') +
      emailV3Paragraph_('02 · Confirmamos contigo acabados, plazo y entrega.', 'margin-bottom:8px;color:#34241b;') +
      emailV3Paragraph_('03 · Con tu confirmación, preparamos la fabricación.', 'color:#34241b;'));
  }
  let notes = '';
  if (pedido.mensaje_cliente) notes += emailV3Heading_('Tus observaciones') + emailV3Paragraph_(pedido.mensaje_cliente, 'margin-bottom:16px;white-space:pre-line;');
  notes += emailV3Paragraph_('Publicación del resultado: ' + (pedido.control.autoriza_publicacion_resultado ? 'autorizada, excepto imágenes de menores de edad.' : 'no autorizada.'), 'font-size:12px;');
  rows += emailV3Card_(notes);
  rows += '<tr><td align="center" class="tk-gutter" style="padding:12px 24px 30px;">' + emailV3Paragraph_(internal ? 'Originales adjuntos y accesos a Drive dentro de cada pieza.' : '¿Quieres añadir algún detalle? Responde a este correo.', 'font-size:12px;margin-bottom:20px;') +
    '<p style="margin:0 0 7px;font:23px Georgia,serif;color:#3c2b1d;">Takara 3D</p>' + emailV3Paragraph_('Convertimos tus recuerdos en luz.', 'font-size:12px;') +
    '<p style="margin:12px 0 0;font:12px Arial;"><a href="https://takara3d.es" style="color:#96703a;text-decoration:none;">takara3d.es</a></p></td></tr>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    '@media screen and (max-width:480px){.tk-header{padding:24px 20px!important}.tk-gutter{padding-left:12px!important;padding-right:12px!important}.tk-card{padding:18px!important}.tk-title{font-size:28px!important}.tk-photo-stage{height:132px!important}.tk-photo-image{max-height:116px!important}}' +
    '</style></head><body style="margin:0;padding:0;background:#f4eee5;-webkit-text-size-adjust:100%;">' +
    emailV3Table_('<tr><td align="center" style="padding:20px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;table-layout:fixed;background:#f9f4ec;border:1px solid #e3d5c3;border-collapse:separate;border-spacing:0;">' + rows + '</table></td></tr>') + '</body></html>';
}
