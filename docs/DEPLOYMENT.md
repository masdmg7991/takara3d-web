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
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1
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

El candidato `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1`
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

## F5B Store Admin route candidate

El backend publicado sigue siendo
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2`
hasta que F5 ejecute y verifique un despliegue real.

El candidato local certificado para routing Admin es
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1`.

Ruta candidata:

`?route=store-admin`

La ruta reutiliza el único `Code.gs::doGet` y delega en
`getStoreAdminUiDeploymentOutput_()`. No hay un segundo router.

Este candidato todavía no está desplegado. La autoridad sobre la versión
realmente publicada sigue siendo la respuesta GET del endpoint productivo.

## F5C deployment candidate parity + deploy preflight

F5C freezes the deployment topology before any remote mutation.

The Store channel continues to use the same Apps Script project, the same code
authority and the same Store Runtime / Registry / Sheets authorities. F5C does
not create a second Apps Script project, backend or persistence authority.

The project may expose separate deployment resources with different web-app
execution/access policies:

- PUBLIC deployment
  - remains the current production authority until a later F5 gate performs and
    verifies a real deployment;
  - F5C does not mutate it;
  - Store Public and order traffic remain bound to the existing production URL.

- ADMIN deployment
  - is a separate deployment resource of the same Apps Script project;
  - target `executeAs` is `USER_ACCESSING`;
  - target `access` is `MYSELF`;
  - the deployer must equal the configured Store Admin owner;
  - `USER_DEPLOYING is forbidden for Admin` because F4A authorizes through
    `Session.getActiveUser()` and must evaluate the accessing identity;
  - `ANYONE_ANONYMOUS is forbidden for Admin`;
  - a failed Admin authorization must never downgrade to Store Public.

The deployment actor must be reconciled against
`TAKARA_STORE_ADMIN_OWNER_EMAIL` before creating or updating the ADMIN
deployment.

F5C certifies candidate parity only:

- local `Code.gs` SHA is the certified F5B candidate;
- local VERSION is
  `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1`;
- single `doGet` and `doPost` authorities remain;
- Admin route and Store Public fallback remain together;
- F4A/F4B/F4C/F4D/F4E/F4F/F4G remain GREEN;
- PUBLIC deployment remains untouched.

F5C performs no push and no deployment.

Forward preparation, not yet certified:

- F5D remote deployment topology:
  inspect the real Apps Script project/deployments, prove the PUBLIC deployment
  remains authoritative, prove the ADMIN deployment uses the same script
  project, and verify deployer/owner identity before mutation.
- F5E Store Public production E2E:
  verify health, Store QR, ACTIVE resolution, INACTIVE fail-closed and endpoint
  continuity after deployment.
- F5F Store Admin production E2E:
  verify owner access, non-owner denial, list/create/edit/activate/deactivate
  and no Admin-to-Public downgrade.
- F5G Store-attributed order production E2E:
  verify StoreContext resolution, authoritative STORE attribution and DIRECT
  preservation on the deployed backend.

## F5D verified remote Apps Script topology

- Apps Script project scriptId: `1xIQrv30KKlx0ODyO9S3TUU0Zn_a4FNjmUTntchd18EsfcK63NMoQwPij`
- Public deployment ID: `AKfycbzdrgKXZ0NbRWgx4huEi80K5MIEu3ytX217yEf6H5mQXK03-KN5W1NlMPD7W614tZ03-Q`
- Endpoint authority: `assets/js/takara-config.js`
- Verification source: authenticated Google Apps Script editor -> `Deploy > Manage deployments`.
- Human gate: exact deployment ID match between the Google editor and the public endpoint authority.
- Public backend live: `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2`.
- Candidate identity was additionally corroborated by local multi-artifact browser evidence before the human gate.
- F5D is topology/identity verification only. No push and no deployment were performed by F5D.
- ADMIN remains a separate deployment candidate under the same Apps Script project; this ticket does not create or publish it.


## F5E Store Public production E2E

- Production public backend is `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_2_STORE_ADMIN_ROUTE_V1`.
- Endpoint authority remains `assets/js/takara-config.js` and `/tienda/` loads configuration before the Store Public client.
- Canonical Store QR remains `https://takara3d.es/tienda/?s=<store_public_code>`.
- The controlled QA witness resolved `TAKARA_STORE_CONTEXT_V1` as `ACTIVE` without exposing `store_id` before deactivation (evidence suffix `ee9ba27a40`, observed `2026-08-30T14:17:22.1761640Z`).
- The same Store was then deactivated through the canonical Admin authority and fails closed in production with `STORE_INACTIVE`.
- Malformed Store references fail closed with `STORE_PUBLIC_CODE_INVALID`; a well-formed unknown Store returns `STORE_NOT_FOUND` and is not treated as INACTIVE.
- The QA fixture remains `INACTIVE`; no DELETE was performed.
- Apps Script version topology remained `29 -> 29` during the ACTIVE/INACTIVE fixture transition.
- F5E certification itself performs no production data mutation, no source push, no deployment and no Git push; the prior R94H fixture mutation was explicitly authorized and is preserved as evidence.


## F5F Store Admin production E2E

- Owner access was verified on the dedicated ADMIN deployment using the configured Store Admin owner.
- Non-owner access was denied and did not downgrade to Store Public.
- The production Admin list/detail flow identified the existing controlled QA Store by immutable `store_id`.
- CREATE evidence is preserved from R94H, which created the same QA Store through the canonical Admin authority.
- The same Store was edited through `Guardar cambios`, activated through the authorized lifecycle operation, observed as `ACTIVE` through `TAKARA_STORE_CONTEXT_V1`, restored to its original display name and deactivated again.
- The final production state is `INACTIVE` and the public resolver fails closed with `STORE_INACTIVE`.
- No DELETE was performed and the immutable `store_id` / `store_public_code` identity was preserved.
- Apps Script version topology remained `29 -> 29`; F5F performed no source push, no deployment and no Git push.
