# Takara3D — Paquete de continuidad, arquitectura y hoja de ruta

Fecha de corte: 2026-07-05
Proyecto: **Página Web Takara / Takara3D Web + Pedido Web + Apps Script + backend de produccion futuro futura**

Este paquete sirve para continuar el trabajo en otra conversación sin perder contexto ni repetir errores. Debe copiarse al repositorio `<REPO_LOCAL>`, idealmente dentro de `docs/`, antes de seguir desarrollando.

## Lectura recomendada para la próxima conversación

1. `00_RESUMEN_EJECUTIVO.md`
2. `01_METODO_DE_TRABAJO.md`
3. `02_ESTADO_ACTUAL_WEB_PEDIDOS.md`
4. `03_ARQUITECTURA_PREMIUM_OBJETIVO.md`
5. `04_HOJA_DE_RUTA.md`
6. `99_PROMPT_PROXIMA_CONVERSACION.md`

## Decisión principal

La web actual funciona con **HTML + CSS + JavaScript modular + Apps Script**.
La arquitectura premium objetivo acordada es **Astro + Vue 3 + TypeScript + Vite**, usando Vue como isla interactiva solo donde haga falta, no como SPA pesada.

## Principio rector

No romper lo que funciona.
Primero documentar, versionar y validar. Después migrar por fases.
