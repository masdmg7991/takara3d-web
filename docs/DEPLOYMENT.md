# Despliegue Takara3D Web

## Estado actual

La web actual funciona como sitio estático publicado mediante GitHub Pages.

Repositorio local:

```text
C:\Users\Miky\Desktop\takara3d-web
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

Versión esperada:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

La comprobación GET debe validar el campo JSON `script` y no comparar la respuesta completa como texto plano.

## Commit y push

Commit recomendado para documentación:

```text
Documentar continuidad y despliegue Takara Web
```

No hacer push hasta revisar en local y confirmar que el diff solo contiene documentación.
