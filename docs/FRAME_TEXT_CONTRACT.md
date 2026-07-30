# Contrato de personalización del marco V1.4.9

## Bloqueo del espacio de render V1.4.9

- El SVG de las letras y el canvas V16B-2 ocupan exactamente el 100 % del mismo
  escenario CSS.
- El `viewBox` del SVG utiliza las dimensiones lógicas declaradas por el último
  render del canvas, no una segunda medición fraccionaria del navegador.
- Los cambios de `width`, `height` y `style` del canvas disparan una
  resincronización agrupada mediante `requestAnimationFrame`.
- El cambio de formato, el zoom, el redimensionado y la rotación de pantalla no
  pueden conservar las dimensiones del formato anterior.
- La validación de longitud usa el mismo espacio lógico que la representación;
  no existe una geometría distinta para medir y otra para dibujar.
- Se conservan sin cambios las posiciones geométricas aprobadas, incluido el
  eje transversal `0.68`, los límites seguros, la composición vertical y los
  precios.

## Estabilidad de interfaz V1.4.4

- Los cuatro lados conservan estados y textos independientes.
- Solo el lado activo muestra su campo de edición.
- Cambiar de lado no añade altura al panel ni desplaza el preview.
- Un lado incluido se distingue visualmente del lado que se está editando.
- Pulsar un lado incluido lo abre para editar; pulsarlo de nuevo mientras está activo lo elimina.
- El payload, precios, límites geométricos y colores no cambian.

## Corrección V1.4.2

- La capa SVG toma como origen, tamaño y escala el rectángulo renderizado del
  canvas V16B-1.
- El texto deja de depender del ancho estimado del contenedor exterior.
- El zoom del navegador, el cambio de anchura y los mínimos CSS escalan marco y
  letras como una sola unidad.
- Se conserva exactamente la geometría visual V1.3/V1.4.1.

## Corrección V1.4.1

- La medición del límite seguro usa un nodo SVG independiente e invisible.
- Los nodos visibles de los cuatro lados no se modifican durante la medición.
- Se conserva sin cambios la geometría V1.3, incluido el eje transversal `0.68`.
- Se conservan sin cambios la paleta unificada y el selector único de color V1.4.

## Alcance

La personalización permite representar y contratar texto independiente en los
bordes superior, derecho, inferior e izquierdo de los marcos vertical y
horizontal.

El motor protegido `takara-pedido-preview.js` V16B-2 no se modifica. El módulo
`takara-frame-text.js` calcula una capa SVG sincronizada con el mismo render STL
y situada por encima del canvas.

## Contratos geométricos

- `FRAME_TEXT_GEOMETRY_VERTICAL_V1`
  - Imagen de referencia: `1151 × 1400`.
  - Ventana interior: `x=201`, `y=201`, `w=748`, `h=998`.
- `FRAME_TEXT_GEOMETRY_HORIZONTAL_V1`
  - Imagen de referencia: `1400 × 1151`.
  - Ventana interior: `x=201`, `y=201`, `w=998`, `h=748`.

Los formatos son contratos independientes. No se obtiene uno rotando
automáticamente el otro.

## Regla de las esquinas

La longitud útil de un texto se limita al tramo recto comprendido entre los
planos que pasan por los límites de la ventana interior.

Además se descuenta un margen de seguridad en ambos extremos. La caja
tipográfica completa debe quedar dentro de esa zona. La entrada se valida
contra la medida real: si el siguiente carácter no cabe, no se incorpora. En
un pegado demasiado largo se conserva únicamente el prefijo completo que cabe.
El sistema no corta letras, comprime tipografía ni desplaza texto hacia las
esquinas.

## Orientación y composición

- Superior e inferior: frase horizontal normal.
- Izquierdo y derecho: composición vertical real, con una letra debajo de otra.
- Los laterales no rotan una palabra horizontal.
- Los espacios se conservan como una posición vacía entre palabras.

La posición transversal se centra en la cara plana visible del borde. La
calibración V1.3 sitúa el eje al 68 % del espesor medido desde el perímetro
exterior hacia la ventana interior. Este valor centra el texto en la banda
frontal útil observada en los dos renders reales, sin cargarlo sobre el bisel
exterior ni aproximarlo en exceso a la ventana interior. La misma proporción
se aplica simétricamente a los cuatro lados y se conserva como parámetro del
contrato geométrico.

En los laterales, el límite se calcula con la altura completa del bloque:
altura de las letras más el interlineado. El bloque se centra dentro del tramo
recto seguro y ninguna letra puede atravesar sus planos límite.

## Color de las letras

Una sola selección se aplica a todos los lados. La paleta se limita a los cinco
filamentos disponibles para los marcos:

- Madera clara (`actual`);
- Rosewood (`rosewood`);
- Ébano (`ebano`);
- Negro (`negro`);
- Blanco mate (`blanco-mate`).

La combinación entre marco y letras es libre. Si ambos utilizan el mismo
filamento, la interfaz advierte de que el contraste será discreto, pero no
bloquea la elección.

## Precios

| Lados seleccionados | Suplemento unitario |
|---:|---:|
| 0 | 0,00 € |
| 1 | 4,00 € |
| 2 | 6,00 € |
| 3 | 8,00 € |
| 4 | 8,00 € |

## Integración de pedido y correo

Marcador contractual: `FRAME_TEXT_EMAIL_INTEGRATION_V1`.

El campo oculto `personalizacion_marco` contiene JSON versionado con:

- versión;
- contrato geométrico;
- orientación;
- número de lados;
- suplemento unitario;
- identificador y nombre del color único de las letras;
- texto de cada lado seleccionado.

Antes de enviar, `takara-pedido-web.js` debe leer y validar ese JSON. Si está
presente, se conserva simultáneamente en:

- `producto.personalizacion_marco`;
- `snapshot_pedido.producto.personalizacion_marco`;
- el bloque técnico `[PERSONALIZACION_MARCO]` del correo interno;
- el HTML operativo recibido por Takara;
- el texto plano de confirmación al cliente;
- el HTML de confirmación al cliente.

El catálogo contiene un extra activo e independiente para cada número de lados:

| Código | Lados | Suplemento unitario |
|---|---:|---:|
| `personalizacion_texto_1_lado` | 1 | 4,00 € |
| `personalizacion_texto_2_lados` | 2 | 6,00 € |
| `personalizacion_texto_3_lados` | 3 | 8,00 € |
| `personalizacion_texto_4_lados` | 4 | 8,00 € |

El precio unitario final debe ser el precio base de 35,00 € más el suplemento
correspondiente. El servidor vuelve a validar versión, orientación, contrato
geométrico, número de lados, textos, color, suplemento y precio. Una
personalización incoherente bloquea el pedido; nunca se elimina ni se corrige
silenciosamente.

El Quality Gate ejecuta el validador
`tools/takara_validar_personalizacion_pedido.py`. Cuando Node.js está
disponible, también ejecuta la prueba funcional
`tools/takara_test_personalizacion_pedido.js`, que cubre los pedidos sin texto y
con 1, 2, 3 y 4 lados, los cuatro cuerpos de correo y manipulaciones negativas.
