# 01 — Método de trabajo Takara3D

Este método es obligatorio para evitar romper una web que ya funciona.

## Filosofía

Trabajar como proyecto profesional, no como parches rápidos.

Antes de tocar código:

- Entender el estado real.
- Verificar Git.
- Verificar archivos afectados.
- Definir alcance exacto.
- Crear backup.
- Validar después.
- Revisar diff.
- No hacer commit/push hasta validar.

## Preferencia de Miguel

Miguel prefiere un único bloque completo por fase:

```text
acción + backup + validación + diff + estado git
```

No quiere recibir tres bloques separados para acción, validación y revisión.

## Reglas de ejecución

### Antes de cambiar

1. `git status --short`
2. Confirmar commit esperado.
3. Confirmar archivos objetivo.
4. Confirmar que no hay cambios sucios.
5. Backup de los archivos que se van a tocar.
6. Explicar brevemente objetivo, alcance y validaciones.

### Durante el cambio

- Cambios pequeños y acotados.
- No tocar UI si el problema es backend.
- No tocar CSS global salvo que la fase sea visual.
- No mezclar limpieza, rediseño, motor y deploy en el mismo commit.
- No usar regex frágiles sobre HTML complejo.
- No hacer reemplazos parciales que puedan dejar duplicados.
- No crear archivos experimentales que luego queden vivos.

### Después del cambio

1. Validación textual.
2. Validación funcional.
3. `git diff --check`
4. Quality Gate.
5. Diff controlado.
6. `git status --short`
7. Confirmar archivos exactos modificados.
8. Decidir: descartar, seguir o commit.

## Reglas Git

- No usar `git add .`.
- Añadir archivos concretos.
- No commit sin diff revisado.
- No push sin aprobación explícita.
- No mezclar commits de temas distintos.
- No subir temporales.
- No subir scripts `_takara_*.ps1`.
- No subir backups.
- No subir archivos `.tmp`, `.bak`, `.old`.

## Reglas de fallos

Se considera fallo aunque el script diga algo bonito después si aparece cualquiera de estos elementos:

```text
[ERROR]
Exception
NativeCommandError
TAKARA_QUALITY_GATE_FAIL
exit code distinto de 0
fallo en git diff --check
hash preview inesperado
estado git inesperado
```

Si un bloque falla y continúa, no se aprueba.

## Regla del pager Git

Si PowerShell/Git se queda mostrando `(END)`, pulsar `q`.

## Reglas de arquitectura

- No meter Vue por ansiedad.
- No convertir la web actual en SPA completa.
- No romper pedido completo con foto.
- No sustituir preview V16B-1 sin benchmark.
- No cambiar a pedido ligero si el completo funciona.
- No usar WhatsApp como entrada oficial de pedidos.
- WhatsApp queda para dudas, trato humano y seguimiento.
- Gmail es la entrada oficial de pedidos.
- backend de produccion futuro será el backend real de producción.

## Regla de documentación

Cada decisión importante debe acabar documentada en `docs/`.

Documentos mínimos:

```text
docs/ARCHITECTURE.md
docs/ORDER_ENGINE_CONTRACT.md
docs/PREVIEW_ENGINE_CONTRACT.md
docs/CLEANUP_POLICY.md
docs/DEPLOYMENT.md
```
