# Decisiones técnicas Takara 3D Web

## Plataforma

- Web estática.
- Compatible con GitHub Pages.
- Sin compilación.
- Backend de pedidos mediante Google Apps Script.
- Sin dependencias obligatorias.

## Rutas

Se usan rutas relativas (`assets/...`) para funcionar tanto en:

- `https://takara3d.es`
- `https://masdmg7991.github.io/takara3d-web/`

## Pedido

GitHub Pages sirve la interfaz estática. El pedido se valida en cliente y se
entrega al endpoint versionado de Google Apps Script. La fotografía, los datos
de contacto, la configuración, el desglose de precio y la ficha visual forman
parte del contrato de pedido. WhatsApp se reserva para consultas y seguimiento.

## Imágenes

Los SVG actuales son placeholders de diseño. La versión de producción debe usar fotografías reales optimizadas.

## Mantenibilidad

- CSS centralizado en `assets/css/styles.css`.
- JS común en `assets/js/main.js`.
- Fuente operativa de catálogo en `assets/data/catalogo.json`.
- Configuración comercial compartida en `assets/js/takara-config.js`.
- Lógica de catálogo en `assets/js/core/takara-catalogo.js`.
- Lógica de pedido en `assets/js/takara-pedido-web.js`.
