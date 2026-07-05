# 09 — Checklist para la próxima sesión

## Primer mensaje recomendado

Pegar el contenido de `99_PROMPT_PROXIMA_CONVERSACION.md`.

## Comprobaciones iniciales

```powershell
cd C:\Users\Miky\Desktop\takara3d-web
git status --short
git rev-parse --short HEAD
git log --oneline -5
```

## Verificar Apps Script

```powershell
$Endpoint = "https://script.google.com/macros/s/AKfycbzdrgKXZ0NbRWgx4huEi80K5MIEu3ytX217yEf6H5mQXK03-KN5W1NlMPD7W614tZ03-Q/exec"
(Invoke-WebRequest -Uri $Endpoint -Method GET -TimeoutSec 30 -UseBasicParsing).Content
```

Debe devolver:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

## Verificar local

```powershell
cd C:\Users\Miky\Desktop\takara3d-web
py -m http.server 8080
```

Abrir:

```text
http://localhost:8080/pedido.html
```

## Próxima acción profesional

No hacer nueva funcionalidad.

Primero:

1. Crear `docs/` si falta.
2. Copiar estos documentos.
3. Guardar Apps Script V1_8 en repo.
4. Commit de documentación y backend versionado.
5. Push controlado si todo está validado.

## Commit sugerido

```text
Documentar arquitectura premium y versionar Apps Script pedidos
```

Archivos esperados:

```text
docs/*.md
apps-script/takara-pedidos-web/Code.gs
apps-script/takara-pedidos-web/README.md
```

No deben modificarse en ese commit:

```text
index.html
productos.html
pedido.html
contacto.html
assets/css/styles.css
assets/js/takara-pedido-preview.js
```

Salvo decisión explícita.
