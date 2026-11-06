# Pedido por artículos V3

Extensión local sobre el mismo servicio, Drive, transporte ACK e idempotencia.
Conserva V1/V2. Está pendiente de publicación y despliegue; el navegador impide
enviar V3 desde producción.

## Selección y compilación

La web conserva artículos configurados en memoria. Cada entrada tiene ID estable
`A01`…`A20`, producto, variante, cantidad, acabados y originales. La cantidad repite
la misma configuración; fotos distintas requieren otro artículo. Añadir, editar,
cancelar, quitar y cambiar cantidades recalculan la lista. Editar restaura File,
orientación, texto y ambos colores. Compilar rechaza cambios concurrentes.

Con lista vacía se conserva el envío directo del marco V2. Una caja sola o una
lista explícita usan `TAKARA_WEB_ORDER_PAYLOAD_V3`. Con artículos guardados, solo
se envía esa lista; el borrador actual no se añade implícitamente. Una edición
en curso bloquea el envío. El consentimiento cubre todas las imágenes de la lista.
No se persisten fotos en almacenamiento del navegador; se avisa al abandonar una
pestaña que contiene artículos sin enviar.

## Autoridades y límites

`assets/js/core/takara-cart.js` usa `catalogo.json` y el pricing existente.
`OrderItems.gs` verifica producto, variante, cantidad, colores, texto y precios
contra reglas del servidor. El marco conserva base de 35 EUR y sus suplementos;
la caja cuesta 75 EUR y no admite texto ni extras.

Hasta 20 unidades en conjunto. El límite de imágenes es 20 MiB por pedido,
contando cada captura del marco dos veces porque el correo interno la incluye
inline y adjunta. Se mantiene margen respecto al límite de adjuntos por mensaje de
[Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
No se multiplican los archivos por el número de copias.

Contacto y entrega se recogen una vez. La entrega usa el número total de unidades
y la política postal existente; el subtotal es la suma exacta en céntimos de los
artículos. No se promedian precios ni se inventan tarifas para el carrito.
La recogida sigue exigiendo atribución Store verificada por el servidor.

## Payload y fotografías

V3 contiene `articulos: [{id, producto, archivos}]`, cliente, entrega, totales y
consentimientos comunes. Cada `archivos.fotos[]` contiene `cara`, original base64,
MIME, nombre y tamaño. El marco exige una frontal; la caja exige exactamente frontal,
derecha, trasera e izquierda, sin duplicados. Las capturas corresponden solo al marco.
Fotos, texto y colores siempre quedan asociados al mismo ID.

El servidor deriva etiquetas comerciales y recalcula el total; rechaza importes,
variantes o colores incompatibles. Todos los originales se decodifican, miden y
reconocen por firma JPG/PNG/WEBP antes de crear la primera carpeta. Una foto inválida
en cualquier artículo bloquea los efectos de Drive y correo.

## Archivos e idempotencia

Una carpeta por pedido con subcarpeta por artículo. El servidor asigna nombres como
`referencia_A02_derecha_original.png`. Las capturas de marco se guardan con su
original. `articulos.json` indexa IDs, caras y archivos. No se hacen públicos ni se
cambia su visibilidad en Drive.

El ledger reutiliza las fases existentes y conserva solo la referencia al manifiesto
para no superar 9 KB por propiedad en pedidos de hasta 80 fotos. El fingerprint
incluye artículos, caras, contenidos y acabados mediante hashes; nunca conserva
base64 en Properties. Un reintento idéntico recupera el ACK sin nuevos archivos ni
correos. Una escritura o envío de resultado incierto queda en revisión manual.
El navegador conserva ID y fecha mientras la lista y los datos de envío no cambien.

## Correos

Dos correos con idénticos artículos, cantidades, acabados, texto cuando proceda,
precios, entrega y referencia. El interno adjunta originales y capturas del marco
y enlaza los originales privados de Drive por cara. El del cliente muestra las
cuatro fotos de cada caja inline y las capturas de los marcos. La caja no requiere
captura 3D adicional. Los textos se escapan en HTML y se mantiene la paleta premium.

## Verificación y promoción

`takara_test_order_items.js` ejecuta normalización, entrega, media, templates y
ledger reales con servicios Google simulados: 1, 2, 4 y 20 artículos, rechazo antes
de efectos, archivos e idempotencia. `test_order_items_browser.cjs` recorre dos cajas
distintas, marco vertical con texto y horizontal sin texto, edición, cancelación,
eliminación, cantidades y ambos correos en escritorio/móvil. Fotos sintéticas y
conexiones externas bloqueadas.

Antes de publicar debe versionarse y desplegarse el candidato completo en Apps Script,
verificarse su deployment PUBLIC y su ACK, y habilitar V3 en la web. Un consumidor
externo que solo interprete `[PRODUCTO]` V2 debe adoptar `[ARTICULO_A01]` de V3.
La revisión local no despliega ni envía correo real.
