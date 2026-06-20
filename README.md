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
│   ├── js/main.js
│   ├── js/productos.js
│   ├── js/pedido.js
│   └── img/
└── data/productos.json
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

### 1. WhatsApp

Editar `assets/js/main.js`:

```js
whatsappNumber: "34600000000"
```

Sustituir por el número real en formato internacional sin `+`.

### 2. Fotos reales

Las imágenes actuales son placeholders SVG coherentes con la marca. Antes de producción conviene sustituir:

- `assets/img/productos/*.svg`
- `assets/img/ui/*.svg`
- `assets/img/ejemplos/*.svg`

por fotografías reales optimizadas en `.webp` o `.jpg`.

### 3. Precios

Editar `data/productos.json` para ajustar precios, nombres y características.

### 4. Envíos y tiempos

Revisar textos de tiempos de fabricación, envío y recogida local antes de dejarlo público.

## Limitación técnica de GitHub Pages

GitHub Pages no tiene backend. La subida de foto es local para previsualización. La foto no se almacena ni se envía automáticamente al servidor. El cliente debe adjuntarla en WhatsApp tras abrir el chat.

Esto es intencionado para una primera fase segura, simple y sin costes de backend.
