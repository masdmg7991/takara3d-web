# Takara 3D Web

Sitio web público de **Takara 3D**, servido desde GitHub Pages y conectado a un
backend ligero en Google Apps Script para pedidos, contacto y el sistema Store.

El repositorio se mantiene con una regla simple: **cada cambio debe conservar el
comportamiento contractual y terminar con el Quality Gate en verde**.

## Arquitectura actual

- **Frontend público:** HTML, CSS y JavaScript sin framework obligatorio.
- **Datos públicos:** catálogo y mapa postal versionados bajo `assets/data/`.
- **Pedido:** motor de navegador + contratos de precio, entrega, preview y transporte.
- **Store:** QR público, identidad, Store Admin, branding, Registry y atribución.
- **Backend ligero:** Google Apps Script bajo `apps-script/takara-pedidos-web/`.
- **Calidad:** validadores, pruebas funcionales y un Quality Gate único en `tools/`.

## Estructura

```text
takara3d-web/
├── index.html
├── productos.html
├── pedido.html
├── contacto.html
├── 404.html
├── qr/                         # Guía QR de producto
├── tienda/                     # Entrada pública Store
├── assets/
│   ├── css/                    # Estilos públicos
│   ├── data/                   # Catálogo y datos públicos versionados
│   ├── img/                    # Imágenes públicas
│   └── js/                     # Motores frontend y configuración
├── apps-script/
│   └── takara-pedidos-web/     # Backend Apps Script modular
├── docs/                       # Contratos y documentación técnica estable
├── tools/                      # Quality Gate, validadores y tests
└── .github/workflows/          # Integración continua
```

## Fuentes de verdad

| Área | Autoridad |
|---|---|
| Catálogo público | `assets/data/catalogo.json` |
| Endpoint público Apps Script | `assets/js/takara-config.js` |
| Pedido | `docs/ORDER_ENGINE_CONTRACT.md` |
| Store | `docs/STORE_SYSTEM_CONTRACT.md` |
| Store Admin | `docs/STORE_ADMIN_CONTRACT.md` |
| Preview | `docs/PREVIEW_ENGINE_CONTRACT.md` |
| Diseño visual | `docs/DESIGN_SYSTEM.md` |
| Despliegue | `docs/DEPLOYMENT.md` |
| Política del repo público | `docs/PUBLIC_REPO_POLICY.md` |
| Quality Gate | `tools/takara_quality_gate.ps1` + `docs/QUALITY_GATE.md` |

El backend **no confía en precios, atribución Store ni datos derivados enviados
por el navegador** cuando puede recalcularlos o resolverlos de forma autoritativa.

## Calidad

La validación completa se ejecuta con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\takara_quality_gate.ps1 -Mode precommit
```

Antes de publicar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\takara_quality_gate.ps1 -Mode prepush
```

El mismo Quality Gate se ejecuta automáticamente en GitHub Actions para `push`,
`pull_request` y ejecución manual.

Un cambio no se considera terminado si el Quality Gate tiene errores.

## Flujo de trabajo

1. Partir de un árbol Git limpio.
2. Hacer un cambio acotado y entendible.
3. Ejecutar las pruebas específicas de la zona modificada.
4. Ejecutar el Quality Gate completo.
5. Revisar `git diff --check` y el diff final.
6. Crear un commit con una responsabilidad clara.
7. Publicar sólo después de la revisión correspondiente.

Las reglas detalladas están en `CONTRIBUTING.md` y `docs/CLEANUP_POLICY.md`.

## Seguridad y repositorio público

Este repositorio puede ser público. No deben almacenarse aquí:

- secretos, tokens o credenciales;
- datos reales de clientes;
- fotografías o adjuntos privados;
- backups locales;
- documentación operativa privada;
- rutas personales o artefactos temporales.

La comprobación mecánica vive en `tools/takara_public_repo_audit.ps1`.

## Documentación

`docs/README.md` define el mapa de autoridad documental y distingue entre
contratos vigentes y evidencia histórica.
