# Contrato de personalización del marco 3D

El marco usa `lettering.js` para dibujar las letras sobre materiales del propio
GLB; no existe capa SVG superpuesta. Las letras mantienen el tamaño de referencia
3D aprobado de 6,6 mm, sin reducirse para admitir frases más largas.
El editor conserva el límite comercial anterior, más conservador que el espacio
total de las bandas del modelo, y el porcentaje de ocupación de esa zona segura.

| Formato | Superior/inferior | Izquierdo/derecho |
|---|---|---|
| Vertical | 100 × 10 mm | 8 × 122 mm |
| Horizontal | 122 × 8 mm | 10 × 100 mm |

Los cuatro lados mantienen textos independientes. Solo se muestra el campo del
lado activo. Pulsar un lado seleccionado lo abre; pulsarlo de nuevo mientras
está activo lo elimina. El editor conserva espacios al escribir y normaliza el
texto para el contrato comercial. Un lado seleccionado sin texto bloquea el pedido.
La validación comercial mantiene `TAKARA_FRAME_TEXT_V1_4` y los identificadores
`FRAME_TEXT_GEOMETRY_VERTICAL_V1` y `FRAME_TEXT_GEOMETRY_HORIZONTAL_V1` por
compatibilidad con el backend; esos identificadores no implican un render 2D.

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

La posición transversal está definida por las bandas UV de los GLB aprobados.
Las letras usan texturas a 12 px/mm, sin comprimir horizontalmente la tipografía.
Todos los lados utilizan un tamaño común que cabe en sus medidas físicas.

Los límites del editor se calculan en las unidades normalizadas de la referencia:
tamaño tipográfico 60,3, margen horizontal/vertical de 30/34 en vertical y 34/30
en horizontal, interlineado lateral 1,08 y espaciado horizontal 0,035 em.
La comparación con el editor anterior comprueba letras anchas, estrechas,
frases y laterales en ambos formatos. La selección y la edición de un lado
se distinguen con sus marcas; los avisos muestran ocupación, poco espacio y límite.

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
