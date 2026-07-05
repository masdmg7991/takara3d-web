# Prompt para continuar Takara3D Web en otra conversación

Estamos trabajando en el proyecto **Página Web Takara / Takara3D Web**.

Quiero que mantengas exactamente este método de trabajo:

- Español.
- Profesional, cuidadoso y sin improvisar.
- Antes de tocar código: revisar estado real, Git, archivos y alcance.
- Dar bloques únicos de PowerShell con acción + backup + validación + diff + estado Git.
- No hacer commit ni push sin mi aprobación explícita.
- No usar `git add .`.
- No tocar UI grande si el problema es backend.
- No hacer reemplazos frágiles con regex sobre HTML complejo.
- No dejar temporales, scripts `_takara_*.ps1`, `.bak`, `.old` ni restos experimentales.
- Si aparece `[ERROR]`, excepción, `NativeCommandError`, `TAKARA_QUALITY_GATE_FAIL` o exit code distinto de 0, se considera fallo.
- Si Git muestra `(END)`, decirme que pulse `q`.

Estado actual importante:

- Repo local: `<REPO_LOCAL>`.
- Backups: `<BACKUPS_LOCAL>`.
- Web pública: `https://takara3d.es/`.
- Remoto: `masdmg7991/takara3d-web`.
- Base local buena conocida: `bf32ff5 Validar dry-run y fotos de 20MB`.
- El pedido completo con foto funciona.
- El contacto funciona.
- Apps Script público está en `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8`.
- Precio backend: 35 €.
- Límite backend: 20 MB.
- No queremos aplicar pedido ligero porque el pedido completo con foto funciona.
- Pedido ligero queda solo como plan B técnico.
- Gmail es la entrada oficial de pedidos.
- WhatsApp queda para dudas, trato humano y seguimiento.

Preview protegido:

- Archivo: `assets/js/takara-pedido-preview.js`.
- Marcador: `TAKARA PEDIDO PREVIEW LITHO REAL V16B-1`.
- Hash: `1DE7F09D5CCC6A8C5E3990B4AC1B59499B5160887F317A3D4DBABE91F32BA4F6`.
- No tocar ni sustituir sin benchmark y aprobación.

Arquitectura actual:

```text
HTML + CSS + JavaScript modular + Apps Script + Gmail
```

Arquitectura premium objetivo:

```text
Astro + Vue 3 + TypeScript + Vite
+ CSS propio con tokens
+ Canvas / Web Worker / OffscreenCanvas para preview
+ Vitest + Playwright + Lighthouse
+ GitHub Actions + GitHub Pages
+ Apps Script como backend ligero
+ Gmail como bandeja oficial
+ backend de produccion futuro como backend real de producción
```

Decisión clave:

- No hacer toda la web como Vue SPA.
- Astro para la web completa.
- Vue 3 solo como isla interactiva del configurador/pedido.
- TypeScript para motor de pedido.
- Preview V2 separado, no mezclado con UI.

Siguiente paso recomendado:

1. Crear documentación en `docs/`.
2. Guardar `Code.gs` de Apps Script V1_8 en `apps-script/takara-pedidos-web/Code.gs`.
3. Crear `apps-script/takara-pedidos-web/README.md`.
4. Commit solo de documentación y Apps Script versionado.
5. Después planificar migración Astro/Vue aislada.

No quiero que programes nada nuevo hasta verificar Git y consolidar documentación.
