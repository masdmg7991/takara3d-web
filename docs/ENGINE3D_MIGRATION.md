# TAKARA WEB — migración al visor 3D único

Estado: candidato local validado; subida a rama de revisión autorizada. Publicación comercial pendiente.
Revisión: 2026-11-05. Base: `fab4d09c59430964e30289743c5b437c4c898c93`.
Rama de revisión: `feature/3d-engine`. El usuario autoriza commit y push del candidato; no implica desplegar Apps Script ni publicar en main.
Este documento conserva evidencia de aceptación; los contratos del visor,
pedido, letras y Quality Gate siguen siendo la autoridad técnica.

## Avance global: 80 / 100 puntos (80 %)

Los puntos corresponden a hitos completos, no a horas ni cantidad de código.

| Hito | Peso | Logrado | Evidencia o condición pendiente |
|---|---:|---:|---|
| Diseño visual vertical/horizontal aprobado | 20 | 20 | Geometría, cámaras, materiales y letras preservados; GLB con SHA-256 |
| Base aislada y contratos | 15 | 15 | Rama candidata, base remota e integración comercial conservadas |
| Motor único integrado, legado retirado | 25 | 25 | Pedido real usa ProductViewer; motor y producto separados; segundo GLB independiente probado |
| JPG del 3D integrado al pedido y correos | 20 | 20 | Foto sintética, textos y ambos formatos; payload V2; dos correos simulados con la misma imagen |
| QA integral y rendimiento | 15 | 0 | Falta cerrar dispositivos físicos, Safari/iOS y carga en red móvil; no se certifica con emulación |
| Revisión, aprobación y publicación | 5 | 0 | Pendiente de revisión visual del usuario y autorización de GitHub/publicación |
| Total | 100 | 80 | Candidato verificable; todavía no certificado para producción |

## Arquitectura resultante

- `product-viewer.js`: estado visual inmutable por revisiones, GLB, cámara, errores,
  reintento, ciclo de vida y captura. No importa código del marco ni comercial.
- `marco.js` y `marco-product.js`: perfil aprobado y reglas del marco.
- `surface.js`: procesamiento de la foto y texturas de litofanía.
- `lettering.js`: letras en materiales del GLB y medida física compartida.
- `text-editor.js` y `text-order.js`: controles, ajuste y contrato comercial;
  suplementos obtenidos del catálogo.
- `capture.js`: captura del mismo 3D, composición opaca y codificación JPEG.
- `order-preview.js`: integración con el formulario. No calcula precios ni envía.
- `takara-pedido-web.js`: conserva payload V2, catálogo, entrega, transporte y backend;
  sustituye únicamente el origen de la ficha visual y verifica estabilidad del pedido.

Se retiraron los dos módulos visuales antiguos, el controlador especializado
preliminar, las diez imágenes de marcos prerenderizados y sus reglas CSS obsoletas.
No se han incorporado páginas de laboratorio, capturas de trabajo ni otro producto
comercial. El segundo GLB se genera dentro del test y se destruye al terminar.

## Identidad visual y dependencia

Los modelos originales permanecen sin modificar:

- `assets/models/marco/vertical.glb`: `903bbd8ce6ffdc6f44eb0d248829d7a8ce83b89b8a069864f361c6dcfd350e33`.
- `assets/models/marco/horizontal.glb`: `3bd9650529315713deb88b0aa9998c6ad52a0348fcee503f978e88cc97c6fba8`.

Se conservan los parámetros de apariencia aprobados. Se corrigió la inversión
horizontal de la foto en la textura del modelo vertical, sin cambiar el GLB.
El editor conserva espacios al escribir frases y muestra cuándo alcanza el límite.
El formato vuelve a detectarse desde la foto y admite selección manual.

Model-viewer 4.4.0 se sirve localmente. La licencia del paquete es Apache-2.0;
las cabeceras BSD de componentes incluidos no sustituyen esa licencia. Se han
contrastado JS, LICENSE y package.json con el archivo oficial de npm, verificando
su integridad SHA-512. Las huellas están en `assets/vendor/model-viewer/INTEGRITY.json`.

## Evidencia reproducible

- `test_marco3d_contract.mjs`: perfil, parámetros aprobados y contrato de captura.
- `test_3d_lifecycle.mjs`: última revisión, eventos obsoletos, errores, retry y cierre.
- `test_3d_editor_contract.mjs`: editor y validación de campos incompletos.
- `test_text_order_3d.mjs`: traducción de textos aceptada por el parser comercial.
- `takara_test_ficha_visual_pedido.js`: 72 comprobaciones de imagen y correos simulados.
- `takara_test_personalizacion_pedido.js`: regresión de personalización, precios y correos.
- `test_3d_browser.cjs`: Chromium con WebGL real, escritorio y móvil emulado; foto
  sintética, frases, colores, formatos, JPG, cámara restaurada, payload V2, foto
  original separada, dos correos simulados, imagen dañada, cambios repetidos y
  segundo perfil independiente. Bloquea la red externa y cierra navegador/servidor.
- Quality Gate actualizado: identidad de GLB, arquitectura y regresiones comerciales.
  El modo prepush exige aceptación de navegador. CI prepara Playwright 1.62.1.

Las evidencias gráficas y logs se generan fuera del árbol público. La auditoría
pública incluye ahora archivos nuevos sin seguimiento, evitando omitirlos al revisar.
Las pruebas aisladas de navegador se ejecutan correctamente; no se afirma haber
establecido la causa histórica del cierre prematuro de Chrome.

Resultado de cierre local: Quality Gate prepush **298 OK, 1 aviso por cambios
pendientes y 0 errores**. La última repetición específica del visor supera
**14 escenarios**, con 0 errores JavaScript y 0 solicitudes externas. Las capturas
con cámara inicial y con giro previo del cliente tienen diferencia media de píxel
0 en las dos configuraciones de navegador ensayadas. Sintaxis, ciclo de vida,
editor e integridad de modelos/dependencia también verificados tras el último ajuste.

## Límites que siguen abiertos

Los GLB suman unos 16,5 MB y no están optimizados para una conexión móvil lenta.
Se carga una sola orientación inicial. Las mediciones de heap/carga en este equipo
no certifican GPU, batería o memoria de un teléfono físico. Antes de publicar se
requiere comprobar dispositivos reales y Safari/iOS, comparar el aspecto con la
referencia aprobada y cerrar el presupuesto de carga/rendimiento.

Los correos y adjuntos se validan con MailApp simulado: no se ha probado un envío
LIVE ni se ha modificado el backend. El fallo del visor muestra un error explícito,
no activa un motor antiguo y conserva la foto original y los datos estructurados.
Una fotografía inválida o una personalización incompleta bloquean la solicitud.

## Reversión y siguiente aceptación

La web publicada y el proyecto original quedan fuera de este cambio.
Para revertir el candidato se puede crear otra copia desde el commit base y conservar
esta rama para revisión. No ejecutar un reset destructivo sobre trabajo sin revisar.
Una vez confirmado el candidato, preparar un commit concreto y revisar su diff;
no hacer push ni desplegar sin autorización expresa del usuario.
El siguiente paso de aceptación es revisión visual y pruebas en dispositivos reales,
no desarrollar todavía la caja ni añadir una plataforma genérica de plugins.

## Revisión de experiencia solicitada por el usuario

Se restaura el punto 4 del editor: límite seguro anterior, tamaño de letra 3D
fijo (sin encogerse), porcentaje de ocupación, estados de aviso y marcas de
selección/edición. Ocho comparaciones directas con el editor anterior (letras
anchas, estrechas, frases y laterales, en ambos formatos) coinciden exactamente
en texto aceptado y aviso de límite.
El visor recupera el fondo chocolate de referencia, el selector redondeado
Encendida/Apagada en dorado y la indicación persistente para arrastrar en
escritorio o deslizar en móvil. Se conserva Restablecer vista como acción aparte.
Son ajustes del candidato local, sin nuevos hitos ni publicación; progreso 80 %.

Validación de esta revisión: Quality Gate 298 OK / 0 errores (aviso único de
cambios locales pendientes), 16 escenarios de navegador correctos y ocho
comparaciones exactas con el editor anterior. La última comprobación del editor
confirma también que activar el panel sin elegir lados conserva el pedido sin texto.

## Ajuste de distribución adaptativa

El visor se sitúa después de la foto en móvil, antes de colores y texto;
abrir el editor ya no lo desplaza hacia abajo. Se compactan el encabezado y
los controles secundarios, se usan dos columnas para los colores y se facilita
volver al resultado desde el texto. En escritorio el visor acompaña al editor
cuando cabe completo y deja de acompañarlo antes de contacto/entrega.
Se conserva una sola estructura de controles y una sola escena 3D.
La validación incluye 360, 390, 768 y 1440 px de ancho, editor abierto y cerrado,
escritorio con alturas 680/760/900 px, botón real de selección de archivos,
navegación al resultado y recorrido de pedido/correos simulados.
No añade puntos de aceptación: siguen pendientes dispositivos físicos, Safari/iOS,
rendimiento en red móvil y aprobación/publicación. Progreso global 80 %.

La prueba de reorganización detectó una lectura de fotograma obsoleto cuando
el visor quedaba fuera de pantalla. La captura se corrige usando temporalmente
el mismo elemento en el viewport, restaurando después cámara y contenedor sin
scroll ni duplicación. La regresión comprueba igualdad de imagen visible/fuera
de pantalla, identidad del visor, conservación de cámara y posición de página.
Resultado de navegador de esta revisión: 20 escenarios correctos, 0 errores JS,
0 conexiones externas y diferencia media de píxel 0 en las capturas comparadas.

## Revisión para subida autorizada

El usuario aprueba la interfaz y el recorrido de pedido y autoriza la subida a
la rama de revisión. Se conserva pendiente la aprobación visual de la ficha
con su fotografía y la aceptación de dispositivos físicos/Safari/rendimiento.
La ficha se ha regenerado localmente con la configuración del pedido de prueba;
el contenido del adjunto interno y las imágenes inline de ambos correos
simulados coinciden byte por byte con ese JPG. La evidencia con fotografía y
contactos reales se conserva fuera del repositorio público. No se ha enviado
correo real ni se ha desplegado el backend.

La revisión final endurece la validación de variantes propias del perfil y
la recuperación de errores al cargar el catálogo. Los módulos 3D declaran su
formato ESM para las pruebas Node sin cambiar los scripts comerciales.
El progreso de aceptación se mantiene en 80 % hasta cerrar QA físico y
publicación controlada; subir una rama revisable no certifica producción.

Validación previa a la subida autorizada: Quality Gate prepush 298 OK, 0 errores;
22 escenarios de navegador superados, incluidos los errores de catálogo y su
recuperación, y la validación de variantes del perfil.
