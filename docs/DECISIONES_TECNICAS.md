# Decisiones técnicas Takara 3D Web

## Plataforma

- Web estática.
- Compatible con GitHub Pages.
- Sin compilación.
- Sin backend.
- Sin dependencias obligatorias.

## Rutas

Se usan rutas relativas (`assets/...`) para funcionar tanto en:

- `https://takara3d.es`
- `https://masdmg7991.github.io/takara3d-web/`

## Pedido

El pedido no se guarda en servidor. Se genera un mensaje de WhatsApp con los datos del formulario.

Motivo:
- GitHub Pages no procesa formularios.
- No se almacenan fotos ni datos personales.
- Permite revisar la foto antes de fabricar.
- Reduce fricción y riesgo en fase inicial.

## Imágenes

Los SVG actuales son placeholders de diseño. La versión de producción debe usar fotografías reales optimizadas.

## Mantenibilidad

- CSS centralizado en `assets/css/styles.css`.
- JS común en `assets/js/main.js`.
- Catálogo en `data/productos.json`.
- Lógica específica de catálogo en `productos.js`.
- Lógica específica de pedido en `pedido.js`.
