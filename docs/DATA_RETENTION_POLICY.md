# Política de retención de datos

Estado: desplegado en PUBLIC V1.18.0.

## Objetivo

Takara no debe conservar datos indefinidamente por accidente ni eliminar
evidencia o material de cliente de forma silenciosa.

La política distingue entre datos técnicos que pueden expirar de forma segura y
datos de negocio que requieren una decisión explícita.

## Principios

1. Ningún informe o dry-run crea, borra o mueve datos.
2. La purga destructiva de snapshots requiere acceso Store Admin y confirmación explícita.
3. Un dato ambiguo o pendiente de revisión nunca se elimina automáticamente.
4. Las fotos de pedidos no se borran automáticamente.
5. Los logos históricos no se borran automáticamente mientras puedan formar parte de evidencia de recuperación.
6. LIVE no cambia por commit ni push.

## Matriz de retención

| Dato | Política | Retención | Borrado automático |
| --- | --- | ---: | --- |
| Ledger idempotencia pedido | AUTO_COMPLETED_ONLY | 30 días | Sí, sólo COMPLETED |
| Ledger idempotencia contacto | AUTO_COMPLETED_ONLY | 30 días | Sí, sólo COMPLETED |
| Casos ambiguos W7/W9 | KEEP_FOR_REVIEW | Sin caducidad automática | No |
| Estado anti-abuso W8 | ROLLING_COMPACT_STATE | Ventanas móviles | Sobrescritura controlada |
| Snapshots Store Registry gestionados | ADMIN_EXPLICIT_PURGE | mínimo 180 días + conservar 20 últimos | Sólo con confirmación admin |
| Snapshots previos a W10 | MANUAL_REVIEW_NO_AUTO_DELETE | sin purga automática | No |
| Logos históricos Store | REPORT_ONLY | decisión manual | No |
| Fotos de pedidos | REPORT_ONLY | decisión de negocio pendiente | No |

## Snapshots Store Registry

Los snapshots nuevos se mueven a:

Takara3D / Store Registry Snapshots

Un snapshot sólo es candidato a purga cuando cumple simultáneamente:

- tiene al menos 180 días;
- no está entre los 20 snapshots gestionados más recientes;
- no es el snapshot marcado como último en Script Properties.

La vista previa no borra nada. Para aplicar la purga se exige:

- requireStoreAdminAccess_();
- apply: true;
- confirmación exacta PURGE_STORE_REGISTRY_SNAPSHOTS.

Los snapshots creados antes de W10 pueden seguir fuera de la carpeta gestionada.
W10 no los enumera globalmente ni los borra a ciegas.

## Fotos de pedidos

Las fotos son material aportado por el cliente y pueden tener valor operativo o
de atención posterior. W10 no inventa una retención temporal para ellas.

El sistema sólo informa REPORT_ONLY. Cualquier futura política de borrado debe
definir previamente la necesidad real del negocio y validarse por separado.

## Logos históricos

Los logos reemplazados pueden aparecer en snapshots históricos del Registry.
Por esa razón W10 no ejecuta setTrashed() sobre logos históricos.

El estado queda explícitamente en REPORT_ONLY hasta que exista una relación
segura entre snapshots retenidos y ficheros históricos.

## Ledgers técnicos

OrderIdempotency.gs y ContactIdempotency.gs conservan 30 días los registros
COMPLETED y purgan únicamente esos estados.

Las fases ambiguas (*_IN_FLIGHT, revisión requerida, etc.) se conservan para
investigación y recuperación.

## Estado anti-abuso

PublicAbuseProtection.gs usa un único estado compacto, sin PII, con ventanas
móviles y poda de actores. No es un histórico de clientes.

## Operación

buildTakaraDataRetentionReport_() genera el estado de retención sin borrar ni
crear carpetas.

purgeStoreRegistrySnapshots_({apply:false}) produce sólo el plan.

La aplicación destructiva debe ser una acción administrativa explícita y nunca
forma parte del procesamiento normal de pedidos, contacto o Store público.

## Versiones

LIVE está en
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1.

El backend productivo W10 es
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_18_0_DATA_RETENTION_V1.
