# P26 · Contador agregado de visitas

## Alcance

- Servicio Apps Script nuevo y aislado `Takara 3D Visitas`; Cloudflare y PostHog no intervienen en las nuevas visitas.
- Cinco páginas Takara: inicio, productos, contacto, pedido directo y QR.
- Una apertura por tienda ACTIVE y carga, usando la referencia pública de la tienda.
- La URL del nuevo contador muestra total, web, tiendas y cada tienda; el panel antiguo de PostHog conserva solo sus datos históricos.
- Son aperturas, no personas únicas ni pedidos recibidos. Una recarga suma otra apertura.
- No se envían fotos, formularios, importes, datos de contacto, URL completa ni ubicación. El servidor guarda solo sumas y nombres públicos de tienda.

## Seguridad del flujo

- La petición de estadísticas es independiente, asíncrona y sus errores se ignoran. No afecta a la preparación o envío del pedido.
- El pedido embebido no se cuenta como apertura web; la tienda se cuenta solo tras el estado ACTIVE.
- No usa SDK externo, cookies, localStorage ni sessionStorage; no hay identificador de visitante.
- Los scripts de pedidos, su Apps Script y los correos permanecen sin cambios.

## Verificación

1. Probar en navegador las cargas de web, tienda ACTIVE, tienda inválida e iframe con la red del contador interceptada; comprobar la ausencia de datos de pedido en cada petición.
2. Publicar web de forma reversible desde la versión remota verificada. Comprobar la recepción de una apertura real de web y una de tienda sin realizar pedidos de prueba en producción.
3. El contador Google público empieza a contar desde esta publicación. Sus cifras no se suman a los eventos históricos de PostHog.

## Reversión

Desactivar `enabled` o revertir el commit web mediante un nuevo commit. El servicio de visitas puede quedar sin uso; no cambiar Apps Script de pedidos.
