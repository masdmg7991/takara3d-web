# Despliegue Takara3D Web

## Estado actual

La web actual funciona como sitio estático publicado mediante GitHub Pages.

Repositorio local:

```text
<REPO_LOCAL>
```

Repositorio remoto:

```text
https://github.com/masdmg7991/takara3d-web.git
```

Web pública:

```text
https://takara3d.es/
```

## Regla de despliegue

No se hace push sin validación previa y aprobación explícita.

Antes de publicar:

- Revisar `git status --short`.
- Revisar `git diff --check`.
- Ejecutar quality gate si procede.
- Revisar diff de archivos concretos.
- No usar `git add .`.
- No subir temporales, backups, `.bak`, `.old` ni scripts experimentales.

## Archivos productivos protegidos

No modificar en fases documentales:

```text
index.html
productos.html
pedido.html
contacto.html
assets/css/styles.css
assets/js/takara-pedido-web.js
assets/js/takara-pedido-preview.js
```

## Apps Script

El backend ligero de pedidos/contacto está publicado en Google Apps Script.

Versión publicada verificada mediante GET del endpoint usado por `pedido.html`
el 2026-08-29:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2
```

Versión declarada por el `Code.gs` local en este baseline:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2
```

La implementación V1.14.1 mantiene como contratos vigentes:

```text
TAKARA_WEB_ORDER_PAYLOAD_V2
TAKARA_ORDER_SNAPSHOT_V2
TAKARA_PEDIDO_WEB_V2
TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC
```

El backend activo conserva compatibilidad V1/V2 durante la transición. El V2 es
la ruta primaria y un payload que declare V2 pero esté incompleto se rechaza:
nunca degrada silenciosamente a V1.

La autoridad sobre la versión realmente publicada es la respuesta GET del
endpoint productivo, no una etiqueta histórica conservada en documentación.
La comprobación GET debe validar el campo JSON `script` y no comparar la respuesta completa como texto plano.

## Store Channel V1

STORE-F0 congela la siguiente topologia:

```text
Store Public:
https://takara3d.es/tienda/?s=<store_public_code>

Frontend:
GitHub Pages existente

Backend:
Google Apps Script existente

Store Registry:
Google Spreadsheet dedicado

Admin:
Google Apps Script Web App con acceso restringido
```

No se migra DNS para Store V1.

No se introduce Cloudflare Worker, D1 ni servidor propio.

El detalle contractual vive en `docs/STORE_SYSTEM_CONTRACT.md`.

El Store QR y el Product QR (`/qr`) son flujos independientes.
## Commit y push

Commit recomendado para documentación:

```text
Documentar continuidad y despliegue Takara Web
```

No hacer push hasta revisar en local y confirmar que el diff solo contiene documentación.


## Puente de despliegue V1/V2

El candidato `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2`
acepta de forma temporal dos contratos de pedido: el V2 es la ruta primaria y
el V1 publicado se mantiene únicamente como compatibilidad de transición. Un
payload que declare V2 pero esté incompleto se rechaza y nunca se degrada a V1.

Esto permite el orden de despliegue seguro: primero actualizar la implementación
Apps Script activa conservando la misma URL; validar GET y un POST V2 en
`modo_prueba` sin Drive ni correo; después publicar la web V2. Durante esa ventana
el formulario público V1 continúa operativo. Tras confirmar la web V2 y la
ingesta real de MicroFactory, la compatibilidad V1 podrá retirarse en una fase
posterior explícita.
## Autoridad compartida del endpoint Apps Script

Desde `STORE-F2B`, la única autoridad web para la URL publicada del Apps Script es
`assets/js/takara-config.js`, contrato `TAKARA_APPS_SCRIPT_ENDPOINT_V1`.

`pedido.html` y `tienda/index.html` no conservan copias literales de esa URL.
Los clientes la resuelven mediante `TAKARA_GET_APPS_SCRIPT_ENDPOINT`.

Esta regla supersede cualquier referencia anterior que tratase `pedido.html`
como autoridad física del endpoint. El despliegue sigue conservando la misma URL
Apps Script hasta una migración explícita y certificada.