# Despliegue Takara 3D Web

Este documento define el **estado y el procedimiento de despliegue vigentes**.
La historia de promociones anteriores vive en Git y no actúa como autoridad actual.

## Autoridad de estado

La autoridad mecánica del repositorio es `config/deployment-state.json`.

La autoridad sobre la versión realmente publicada es la respuesta GET del
endpoint productivo. Antes de cualquier promoción debe verificarse mediante GET
del endpoint canónico y comprobar específicamente el campo JSON `script`.

La documentación describe el estado; nunca sustituye esa comprobación live.

## Estado actual

- Web pública: GitHub Pages.
- Dominio público: `https://takara3d.es/`.
- Endpoint authority: `assets/js/takara-config.js`.
- Servicio backend: `Takara Pedidos Web`.
- Servicio: `TAKARA_PEDIDO_WEB_V2`.
- Script LIVE: `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_19_0_STORE_URL_V2`.
- Script local: `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_19_0_STORE_URL_V2` (desplegado y sincronizado).
- Deployment PUBLIC: versión inmutable 35.
- Estado observado por GET: `online`.
- Última verificación live registrada: `2026-09-25`.

Producción PUBLIC está en V1.19.0. El deployment PUBLIC existente fue actualizado a la versión 35; el deployment ADMIN permanece separado e intacto. La autoridad mecánica del estado sigue siendo `config/deployment-state.json` y la autoridad LIVE se confirma mediante GET del endpoint canónico.

## Contratos activos

- `TAKARA_WEB_ORDER_PAYLOAD_V2`
- `TAKARA_ORDER_SNAPSHOT_V2`
- `TAKARA_PEDIDO_WEB_V2`
- `TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC`
- `TAKARA_ORDER_BROWSER_POSTMESSAGE_V1`
- `TAKARA_ORDER_IDEMPOTENCY_V1` (desplegado en PUBLIC)
- `TAKARA_PUBLIC_ABUSE_GUARD_V1` (desplegado en PUBLIC)
- `TAKARA_STORE_CONTEXT_V1`

El backend mantiene la compatibilidad V1 deliberada que todavía tenga consumidor
conocido, pero V2 es la ruta primaria. Un payload que declara V2 y es inválido
falla cerrado; nunca degrada silenciosamente a V1.

## Topología Apps Script

Store, pedido y contacto reutilizan el mismo proyecto Apps Script y las mismas
autoridades de dominio. No existe un segundo backend, Registry ni repositorio
Sheets paralelo.

Puede haber recursos de despliegue distintos dentro del mismo proyecto:

- **PUBLIC deployment**: atiende pedido, contacto y Store Public.
- **ADMIN deployment**: expone Store Admin con política de acceso restringida.

Para Admin:

- `executeAs` debe ser `USER_ACCESSING`;
- `access` debe ser `MYSELF`;
- `USER_DEPLOYING` is forbidden for Admin;
- `ANYONE_ANONYMOUS` is forbidden for Admin;
- the deployer must equal the configured Store Admin owner;
- una denegación Admin nunca puede degradar a Store Public.

## Store

QR canónico nuevo:

https://takara3d.es/tienda/<store_slug>

La entrada V1 https://takara3d.es/tienda/?s=<store_public_code> permanece operativa
para no romper enlaces o QR emitidos.

GitHub Pages no ofrece rewrites dinámicos. 404.html actúa únicamente para paths
/tienda/<store_slug> canónicos y los lleva al bootstrap interno por slug; el cliente
restaura la URL bonita después de resolver. No se crea HTML ni deploy por Store.

Store Public usa el endpoint de assets/js/takara-config.js. Backend resuelve slug o
store_public_code legacy contra el mismo Registry y devuelve el store_ref canónico.
store_id nunca forma parte del QR.

## Regla de promoción

Repositorio y despliegue son operaciones independientes.

Antes de un push:

1. `git status --short`.
2. `git diff --check`.
3. Quality Gate `prepush` sin errores.
4. revisión del diff exacto.
5. aprobación explícita de la operación de push.

Antes de un despliegue Apps Script:

1. certificar el candidato local;
2. verificar por GET la versión LIVE actual;
3. comprobar que el actor y la política del deployment son los esperados;
4. desplegar sólo con autorización explícita;
5. repetir GET y E2E después de la promoción.

Un commit o un push **no constituyen un despliegue del backend**.

## Verificación posterior

Tras una promoción deben comprobarse como mínimo:

- GET de salud y `script` publicado;
- ACK navegador de pedido;
- Store Public ACTIVE/INACTIVE fail-closed;
- autorización Store Admin;
- atribución autoritativa DIRECT/STORE;
- ausencia de cambio inesperado del endpoint público.

## Informes y evidencia

Los informes del Quality Gate se guardan fuera del repositorio.

Las evidencias históricas de fases F5 anteriores se conservan en el historial Git.
No deben copiarse al documento de estado actual si contradicen una promoción
posterior.

## Regla de seguridad

El repositorio público no almacena credenciales, tokens, datos de clientes ni
identificadores operativos privados que no sean necesarios para ejecutar la web.
Las políticas detalladas viven en `docs/PUBLIC_REPO_POLICY.md`.
