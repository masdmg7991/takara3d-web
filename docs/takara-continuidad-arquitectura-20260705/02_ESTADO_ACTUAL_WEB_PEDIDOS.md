# 02 — Estado actual Web/Pedidos

## Repo y rutas

Repositorio local Windows:

```text
<REPO_LOCAL>
```

Backups:

```text
<BACKUPS_LOCAL>
```

Remoto:

```text
masdmg7991/takara3d-web
```

Web pública:

```text
https://takara3d.es/
```

Base local conocida:

```text
bf32ff5 Validar dry-run y fotos de 20MB
```

## Archivos clave actuales

```text
pedido.html
assets/js/takara-pedido-web.js
assets/js/takara-pedido-preview.js
assets/js/pedido.js
assets/js/core/takara-order-snapshot.js
assets/data/catalogo.json
tools/takara_quality_gate.ps1
```

## Preview protegido

Archivo:

```text
assets/js/takara-pedido-preview.js
```

Marcador:

```text
TAKARA PEDIDO PREVIEW LITHO REAL V16B-1
```

Hash protegido conocido:

```text
1DE7F09D5CCC6A8C5E3990B4AC1B59499B5160887F317A3D4DBABE91F32BA4F6
```

Reglas:

- No tocar directamente.
- No reemplazar sin benchmark visual y técnico.
- No mezclar con UI.
- No editar sin backup.
- Cualquier motor nuevo debe superar a V16B-1 antes de sustituirlo.

## Estado del pedido

El pedido completo con foto funciona.

Flujo actual:

```text
cliente rellena pedido
→ JS valida datos y foto
→ JS construye payload
→ JS manda payload completo con foto_base64
→ Apps Script V1_8 recibe
→ Apps Script valida
→ Apps Script guarda foto si procede
→ Apps Script envía correo interno a Takara
→ Apps Script envía confirmación al cliente
```

## Decisión sobre pedido ligero

Se probó la idea de pedido ligero para evitar enviar `foto_base64`, pero se descarta como flujo principal porque el pedido completo funciona.

Decisión:

```text
NO aplicar pedido ligero ahora.
Mantener pedido completo con foto.
Pedido ligero queda como plan B técnico.
```

Motivo:

- La calidad no debe depender de un paso manual posterior.
- El pedido completo ya funciona desde local y desde web pública.
- Lo prioritario es que el pedido llegue con toda la información y la foto.

## Apps Script

Estado publicado:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

Mejoras V1_8:

- Precio a 35 €.
- Límite a 20 MB.
- Endpoint publicado correctamente.
- Contacto funciona.
- Pedido funciona.
- Flujo pedido/contacto separado.

Pendiente importante:

```text
Guardar Code.gs V1_8 dentro del repo.
```

Ruta recomendada:

```text
apps-script/takara-pedidos-web/Code.gs
apps-script/takara-pedidos-web/README.md
```

## Qué debe comprobarse antes de push

1. `git status --short`
2. Confirmar si `bf32ff5` está en GitHub.
3. Confirmar que Apps Script V1_8 está documentado/versionado.
4. Confirmar que pedido público sigue llegando.
5. Confirmar que contacto público sigue llegando.
6. Quality Gate.
7. Diff controlado.
8. Commit/push solo bajo aprobación.
