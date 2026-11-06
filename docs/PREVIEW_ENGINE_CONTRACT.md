# TAKARA 3D Viewer — contrato visual

## Responsabilidades

Existe un solo motor visual: `assets/js/3d/product-viewer.js`. Carga el modelo,
coordina actualizaciones, controla cámara y errores y captura el JPG del pedido.
No conoce productos concretos, fotos, letras, formularios, precios ni correo.
El catálogo y el sistema comercial siguen siendo la autoridad de venta.

## Perfil de producto

Un perfil contiene `id`, `defaults`, `variants` y `createController(viewer, variant)`.
Cada variante define `src`, `camera` y `alt`. Puede añadir `attributes`,
`validate(state)` y `validateCapture(state)` cuando el producto los necesite.
El controlador expone `apply(state, isCurrent)`, `dispose()` y opcionalmente
`getSnapshot()`. Una operación asíncrona solo aplica resultados si `isCurrent()`.
Las configuraciones son objetos inmutables. La revisión vigente es la única
que puede declararse lista o aparecer en una ficha.

`marco-product.js` contiene litofanía, materiales y textos del marco.
`marco.js` conserva modelos, factores PBR, cámaras y opciones aprobados.
Un segundo perfil con GLB generado en las pruebas demuestra la reutilización:
no hace falta editar el núcleo para cargarlo, colorearlo y capturarlo.
Esto no convierte cualquier geometría en paramétrica: un producto con piezas
móviles o medidas variables necesita su propio modelo y sus propias reglas.

## Estado y carga

`order-preview.js` toma formato, foto, colores y textos de los controles y
entrega un único estado al visor. La foto se conserva como File; los bitmaps
se cierran tras preparar sus texturas. Los cambios rápidos invalidan trabajos
anteriores. Un cambio de variante retira el visor anterior antes de cargar el
siguiente. Solo se descarga el modelo inicial al entrar; no los diez acabados.
Los colores modifican materiales, sin nuevos GLB ni imágenes prerenderizadas.

El formato se detecta a partir de la foto y puede cambiarse manualmente.
El modelo vertical conserva su geometría aprobada: se corrige en la textura
la inversión horizontal de sus UV para respetar la foto original.

## Captura de pedido

La captura usa el mismo modelo, foto, materiales, texto y luz visibles.
Espera la revisión aplicada; congela temporalmente los controles; usa cámara
canónica por variante y viewport 960 × 760; restaura la vista del cliente.
Para que la exportación no lea un fotograma anterior cuando el visor queda
fuera de pantalla, el mismo elemento se coloca temporalmente en un contenedor
invisible situado en el viewport. Se espera `modelIsVisible`, se prepara la cámara
y se captura; después se restauran contenedor, tamaño y cámara originales.
No se crea otro visor ni se desplaza la página. Este recorrido está protegido
por una comparación de captura visible/fuera de pantalla y por la identidad del
elemento y la posición de scroll. La API de visibilidad se documenta en
[model-viewer](https://modelviewer.dev/docs/).

La salida es un JPEG opaco, máximo 960 px y 900 KiB. Solo se emplea canvas
para texturas o codificación de imagen; no hay un segundo renderizador visual.
El pedido verifica que los campos y la revisión no hayan cambiado durante
su preparación. La fotografía original viaja separada de la ficha.

## Experiencia y fallos

El escenario conserva dimensiones durante la carga y oculta resultados obsoletos.
Hay estado de carga accesible, botones táctiles, scroll vertical, giro y zoom,
restablecimiento de vista y reintento. Tras 45 segundos sin modelo se muestra
un error explícito. Nunca se presenta una representación antigua como respaldo.
Una foto ilegible o un texto incompleto bloquean la solicitud. Un fallo visual
conserva la foto original y los datos estructurados; la ficha es complementaria.
El cliente siempre ve que la imagen es orientativa y se revisa antes de fabricar.

## Validación y límites

### Extensión local de varios productos

`products.js` registra capacidades y borradores independientes por familia.
`ProductViewer` permanece independiente del producto. `finishes.js` comparte
los acabados aprobados sin alterar la apariencia del marco. Cambiar de producto
libera el controlador anterior y conserva los File y opciones en memoria durante
la visita; no guarda fotografías en almacenamiento persistente.

La caja utiliza `caja-product.js`: cuatro superficies de 100 × 100 mm, una foto
por cara (frontal, derecha, trasera e izquierda), color y luz. No tiene formato
vertical/horizontal ni texto. El texto del marco se conserva al cambiar, pero
se desactiva y queda excluido de la validación, el suplemento y el payload de la caja.
Las fotos tienen un recorte cuadrado centrado; la interfaz lo explica. El límite
conjunto de las cuatro es 20 MiB para contener memoria y tamaño de transporte.

El pedido local contiene `archivos.fotos[]`, cada entrada con `cara`, original,
nombre, MIME y tamaño; no reutiliza la primera foto como si representara las cuatro.
La captura y los originales permanecen separados. El snapshot de inspección omite
base64 recursivamente. El precio de 75 EUR procede del catálogo.

Esta extensión requiere aceptación local antes de publicación. El catálogo público
conserva WhatsApp y `configurador_disponible: false`; el cliente bloquea envíos reales
de la caja. El backend actualmente publicado solo acepta el marco. Activar la caja
en producción requiere adaptar y probar validación de las cuatro imágenes, archivos,
idempotencia, persistencia y correos antes de quitar esa restricción.

El GLB local se obtiene con `tools/export_caja_glb.py` de las piezas de SolidWorks
abiertas en modo de solo lectura. No contiene CAD originales ni fotografías privadas.
Respeta la teselación y las normales de CAD; comparte vértices con normales idénticas.
El cuerpo ya contiene la parte superior: no se superpone `Tapa_Cuerpo`.
Las posiciones de USB e interruptor son provisionales para revisión: el ensamblaje
anterior referencia componentes ausentes y no determina el montaje V2 actual.
No representa una simulación mecánica del rodamiento; el cliente puede girar el visor
360°. La procedencia y las traslaciones están explícitas en el exportador.

`test_caja_browser.cjs` cubre las cuatro caras, cambios de producto con borradores,
aislamiento del texto, colores, luz, captura, fotos inválidas y pedido local en
escritorio y móvil emulado. Bloquea todas las conexiones externas.

`takara_validar_3d.py` protege la identidad de los GLB y la separación del núcleo.
Las pruebas de ciclo de vida cubren revisiones obsoletas, retry y liberación.
`test_3d_browser.cjs` comprueba con WebGL real los recorridos de escritorio y
móvil emulado, captura y correos simulados, sin conexiones externas.
El QA de navegador no certifica un teléfono físico, Safari/iOS ni una red lenta.
Las mediciones locales de carga y heap no son un presupuesto de producción.
La aceptación final y la publicación siguen sujetas a revisión y autorización.
