# Contrato de idempotencia de pedidos

Estado: desplegado en PUBLIC V1.18.0.

## Objetivo

Un mismo `pedido_web_id` no puede repetir automáticamente efectos externos si
el navegador reintenta porque el ACK se perdió o la ejecución se interrumpió.

## Identidad

El pedido usa `pedido_web_id` como clave idempotente y un fingerprint SHA-256
del contenido normalizado.

El fingerprint conserva la atribución autoritativa DIRECT/STORE y sustituye los
payloads grandes de foto y ficha visual por sus hashes SHA-256. Sólo excluye el
timestamp de recepción creado por Apps Script.

El mismo ID con contenido diferente falla cerrado.

Los pedidos reales deben aportar un `pedido_web_id` estable. El backend no
puede generar una referencia nueva para una ruta real y seguir llamándola
idempotente. El dry-run conserva su comportamiento anterior.

## Fases

`RESERVED -> PHOTO_IN_FLIGHT -> PHOTO_SAVED -> INTERNAL_EMAIL_IN_FLIGHT ->
INTERNAL_EMAIL_SENT -> CLIENT_EMAIL_IN_FLIGHT -> CLIENT_EMAIL_SENT ->
COMPLETED`.

Las fases `*_IN_FLIGHT` son deliberadamente ambiguas. El estado se persiste
**antes** de llamar a Drive o MailApp. Si el proceso muere durante el efecto, un
retry no puede saber de forma segura si ocurrió y por eso no lo repite
automáticamente: queda en revisión manual.

## Concurrencia

Cada ejecución obtiene un lease corto bajo `LockService`. El lock sólo protege
lecturas y transiciones del ledger; nunca se mantiene mientras Drive o MailApp
realizan efectos externos.

Un segundo request concurrente recibe `ORDER_IDEMPOTENCY_BUSY`.

## Retry completado

`COMPLETED` conserva el ACK técnico. Si el navegador perdió la respuesta y
repite exactamente el mismo pedido, el backend devuelve el ACK persistido sin
crear otra foto ni reenviar correos.

## Conflicto

El mismo ID con contenido diferente produce `ORDER_IDEMPOTENCY_CONFLICT` y
cero efectos nuevos.

## Recuperación

Las fases seguras pueden reanudarse cuando el lease queda libre o expira.

Las fases ambiguas exigen `resolveOrderIdempotencyReview_` desde una operación
manual controlada. Antes de resolverlas se debe comprobar qué efecto ocurrió.

En `PHOTO_IN_FLIGHT`, la recuperación automática a `PHOTO_SAVED` no está
permitida porque el ledger todavía no dispone de metadata fiable del archivo.
Tras revisar Drive se elimina el artefacto huérfano si procede y se retorna a
`RESERVED`, o se mantiene el caso para tratamiento manual.

## Retención

El ledger no guarda el payload ni PII del cliente. Conserva identificador,
fingerprint, fase, metadata técnica de Drive, resumen de ficha visual y ACK.

Los registros `COMPLETED` de más de 30 dias se purgan periódicamente. Los
registros ambiguos se preservan para revisión.

## Alcance

La idempotencia cubre el pedido real. `CONTACTO_WEB` mantiene su ruta actual y
no crea este ledger. El dry-run tampoco crea persistencia idempotente.

## Regla de despliegue

La versión LIVE actual es
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1`.

W7 se introdujo en
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_15_0_ORDER_IDEMPOTENCY_V1`.

El backend LIVE actual conserva W7 dentro del superset V1.18.0
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1`.

Este contrato no convierte un commit ni un push en autorización de despliegue.
La autoridad LIVE sólo cambia tras promoción explícita y verificación GET.
