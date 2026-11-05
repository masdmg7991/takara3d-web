# TAKARA WEB — visor 3D del pedido

## Estado actual

El visor está publicado en https://takara3d.es/pedido.html desde el 2026-11-05.
La integración se aprobó en la PR #10 y se publicó mediante GitHub Pages.
El usuario confirmó el funcionamiento del pedido y del correo real con su imagen.
La publicación del visor no desplegó Apps Script.

Este documento describe el resultado vigente. Las iteraciones de diseño y los
informes de candidatos anteriores se conservan en el historial Git. Los contratos
del visor, pedido, texto y Quality Gate siguen siendo la autoridad técnica.

## Organización

- `product-viewer.js`: carga de GLB, estado por revisiones, cámara, errores,
  reintento, cierre y captura. Independiente del producto y de los precios.
- `marco.js` y `marco-product.js`: parámetros aprobados y adaptación del marco.
- `surface.js`: fotografía y mapas de litofanía. Conserva como máximo las dos
  versiones de luz de la foto actual; invalida la memoria al cambiar foto o ajustes.
- `lettering.js`: letras en los materiales del modelo y medidas físicas.
- `text-editor.js` y `text-order.js`: edición, límites y contrato comercial;
  suplementos obtenidos del catálogo.
- `capture.js`: JPG opaco de la misma escena 3D, dentro del límite del correo.
- `order-preview.js`: integración del visor con el formulario.
- `takara-pedido-web.js`: payload V2, entrega, transporte y estabilidad del pedido.

Se retiraron el renderizador 2D, la capa SVG, el controlador preliminar y las
imágenes de marcos prerenderizadas. No se publican laboratorios, capturas de
trabajo, fotos privadas ni datos de los pedidos de prueba.

## Comportamiento aprobado

El editor conserva el límite anterior, tamaño de letra fijo, porcentaje de
ocupación y marcas de selección. La interfaz ofrece fondo chocolate o crema,
Encendida/Apagada, indicación para girar y Restablecer vista.
En móvil, el visor aparece después de la foto y antes de colores y texto;
abrir el editor no lo desplaza. En escritorio acompaña a la personalización
cuando cabe completo. Existe una sola estructura de controles y escena.

La ficha usa cámara y dimensiones fijas, fondo crema opaco y resolución nativa
durante la exportación. La captura funciona con el visor fuera de pantalla y
restaura cámara, contenedor, scroll y política de rendimiento. La fotografía
original viaja separada. El JPG coincide con el adjunto y las imágenes inline
de los correos simulados; la recepción real fue confirmada por el usuario.

## Modelos y dependencia

Se conserva la geometría CAD aprobada. La tapa vertical tiene una reparación de
normales de sombreado, reproducible desde su exportación original:

- Vertical: `b9924227d15439f2d6f863226036bdfaf4ddafa701619a07d14da3e82f92eb9b`.
- Horizontal: `3bd9650529315713deb88b0aa9998c6ad52a0348fcee503f978e88cc97c6fba8`.

La exportación vertical original mezclaba normales entre la cara plana, los
bordes y las ranuras de ventilación, formando un sombreado diagonal falso.
`tools/takara_repair_vertical_normals.py` separa los vértices compartidos de esa
tapa y usa normales por cara, como la tapa horizontal. La auditoría compara con
el original conservado en Git: mismos 1132 triángulos, posiciones y orientación;
las otras mallas, materiales y texturas quedan iguales. El horizontal conserva
su SHA-256 original. La vista frontal de comparación no cambia píxeles.
El modelo y sus módulos de carga llevan una versión de URL para renovar la caché.

Los parámetros de apariencia son los aprobados. La textura corrige la orientación
horizontal de la fotografía del GLB vertical sin cambiar su geometría.
Model-viewer 4.4.0 se sirve localmente, con licencia Apache-2.0 y comprobación de
bytes/SHA-256 en `assets/vendor/model-viewer/INTEGRITY.json`. Los archivos del
proveedor se conservan byte por byte al descargar el repositorio.

## Verificación

El Quality Gate prepush ejecuta contratos de perfil, ciclo de vida, editor,
traducción comercial, memoria de mapas y aceptación Chromium/WebGL.
El navegador comprueba escritorio y móvil emulado, cambios de foto/formato/color,
texto, captura, restauración, payload V2 y correos simulados, además de fallos y
recuperación de modelo/catálogo. Un segundo perfil GLB generado en el test
comprueba la independencia del núcleo. La red externa queda bloqueada y todos
los datos de aceptación son sintéticos.

Las pruebas de memoria comprueban igualdad de píxeles con el cálculo original,
reutilización de ambos modos, invalidación y liberación de recursos. Los informes
y evidencias se generan fuera del árbol público. CI ejecuta las mismas pruebas.

## Rendimiento y límites de verificación

Se descarga una orientación inicial. El GLB vertical ocupa unos 8,2 MB sin comprimir tras la reparación de normales.
GitHub Pages lo entrega con gzip; la medición previa a esta reparación fue de
aproximadamente 2,35 MB el 2026-11-05. La biblioteca se entrega en unos 293 KB comprimidos. Son mediciones
de esa respuesta, no un presupuesto garantizado para todas las conexiones.

La memoria de luz evita recalcular mapas ya disponibles; no conserva fotos
anteriores. Como máximo añade un segundo juego de mapas, unos 3,75 MiB por
visor de marco. El giro conserva la calidad adaptativa del proveedor.

La emulación no certifica GPU, batería o memoria de un teléfono físico.
Safari/iOS, dispositivos modestos y conexiones móviles lentas siguen requiriendo
comprobación específica. No se cambian geometría ni calidad visual para afirmar
una mejora de rendimiento sin compararlas.

## Publicación y siguientes productos

Los cambios pasan por PR y Quality Gate antes de integrarse en main.
GitHub Pages publica la web; Apps Script conserva su procedimiento separado,
descrito en `DEPLOYMENT.md`. Una reversión se prepara como un commit de Git
revisable, conservando el historial.

La caja de cuatro caras es el siguiente producto previsto. Esta revisión deja
ordenado el visor del marco y no incorpora todavía su perfil ni reglas comerciales.
