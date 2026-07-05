# 08 — Reglas de no romper

## Pedido

- No cambiar a pedido ligero si el completo funciona.
- No eliminar foto del pedido.
- No usar `mailto` como solución profesional.
- No duplicar foto base64 en snapshots anidados.
- No bajar límite de 20 MB sin decisión explícita.
- No volver a precio 27,50 €.
- Precio actual del marco/litofanía: 35 €.

## Apps Script

- No tocar endpoint sin backup.
- No olvidar desplegar nueva versión.
- Guardar siempre `Code.gs` en repo.
- Verificar con GET que `script` devuelve la versión correcta.
- No asumir que guardar en editor equivale a publicar.

## Preview

- No tocar V16B-1 directamente.
- No sustituir sin benchmark.
- No mezclar motor preview con UI.
- No borrar marcadores ni hashes protegidos.

## Web

- No rehacer toda la UI para arreglar un problema de backend.
- No reabrir home si está cerrada, salvo decisión explícita.
- No meter Vue como SPA total.
- No meter Tailwind/Bootstrap sin decisión.
- No acumular CSS temporal.
- No dejar scripts experimentales.

## Git

- No `git add .`.
- No commit sin diff.
- No push sin aprobación.
- No subir temporales.
- No mezclar temas.

## backend de produccion futuro

- No automatizar fabricación antes de controlar pedidos.
- No perder originales.
- No crear expedientes duplicados.
- No omitir hash/custodia.
- No hacer supuestos si faltan datos del pedido.
