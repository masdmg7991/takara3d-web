# Marco 3D: modelos compactos

Los GLB originales `vertical.glb` y `horizontal.glb` son las fuentes aprobadas y permanecen intactos. El pedido carga `vertical-compact.glb` y `horizontal-compact.glb`, que conservan los mismos materiales, nombres de nodos, mallas, cantidades de vértices e índices. La conversión utiliza `KHR_mesh_quantization` para almacenar posiciones y normales con menos bytes; no modifica el motor del pedido ni la captura.

Los derivados se generaron con glTF Transform CLI 4.5.1:

```sh
gltf-transform quantize assets/models/marco/vertical.glb assets/models/marco/vertical-compact.glb --quantize-position 16 --quantize-normal 12
gltf-transform quantize assets/models/marco/horizontal.glb assets/models/marco/horizontal-compact.glb --quantize-position 16 --quantize-normal 12
```

| Formato | Fuente GLB | Derivado GLB | Fuente gzip | Derivado gzip |
| --- | ---: | ---: | ---: | ---: |
| Vertical | 8.17 MB | 5.85 MB | 2.35 MB | 1.70 MB |
| Horizontal | 8.36 MB | 5.96 MB | 2.35 MB | 1.70 MB |

Los tamaños gzip son estimaciones reproducibles con Python `gzip.compress(..., compresslevel=9)`; el tamaño transferido en GitHub Pages puede variar por cabeceras y compresión del servidor.

`tools/takara_validar_3d.py` fija las huellas SHA-256 de ambas fuentes y derivados, exige la extensión y compara materiales, mallas, nodos y topología. `tools/test_marco3d_contract.mjs` fija las rutas utilizadas. La prueba de navegador de pedido mixto comprobó marcos vertical y horizontal, Caja, colores, texto, fotos sintéticas, capturas, correos simulados y vista móvil; no envió pedidos. Frente a la fuente, la captura JPEG de cada marco cambió menos de 0,02 niveles de color por canal de media en la comparación realizada.

Para volver al modelo original, restaurar las dos rutas anteriores en `assets/js/3d/marco.js` y actualizar los parámetros de caché en la cadena de módulos hasta `pedido.html`. Las fuentes permanecen en el repositorio.
