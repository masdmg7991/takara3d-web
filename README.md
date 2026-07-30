# Takara 3D Web

Web estática premium para `takara3d.es`, preparada para GitHub Pages.

## Estructura

```text
takara3d-web/
├── index.html
├── productos.html
├── pedido.html
├── contacto.html
├── 404.html
├── CNAME
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/styles.css
│   ├── data/catalogo.json
│   ├── js/takara-config.js
│   ├── js/takara-pedido-web.js
│   └── img/
├── apps-script/takara-pedidos-web/Code.gs
└── tools/takara_quality_gate.ps1
```

## Publicación en GitHub Pages

1. Subir todos los archivos a la raíz del repositorio.
2. En GitHub: `Settings` → `Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main` / root.
5. Verificar que el archivo `CNAME` contiene:
   ```text
   takara3d.es
   ```

## Ajustes obligatorios antes de producción real

### 1. Catálogo y precios

La fuente operativa del catálogo es `assets/data/catalogo.json`. El precio visible
común también se publica mediante `assets/js/takara-config.js`; cualquier cambio
comercial debe actualizarse de forma coordinada y superar el Quality Gate.

### 2. Envíos y tiempos

Revisar textos de tiempos de fabricación, envío y recogida local antes de dejarlo público.

## Limitación técnica de GitHub Pages

GitHub Pages sirve el frontend estático. El pedido se entrega al endpoint
versionado de Google Apps Script definido en `assets/js/takara-pedido-web.js`.
La fotografía, los datos del pedido y la ficha visual se procesan mediante ese
contrato; WhatsApp queda como canal de consulta y seguimiento.
