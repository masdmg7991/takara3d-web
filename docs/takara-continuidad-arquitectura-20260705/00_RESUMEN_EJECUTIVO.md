# 00 — Resumen ejecutivo Takara3D Web

## Objetivo general

Construir Takara3D como una web de producto seria, rápida, premium, mantenible y preparada para crecer hacia un sistema completo de pedidos y producción.

No queremos una web hecha a base de parches. Queremos una arquitectura donde el cliente vea algo muy simple, bonito y fiable, pero por debajo exista un sistema ordenado, trazable y preparado para backend de produccion futuro.

## Estado real actual

La web pública y local funcionan como web estática con HTML, CSS y JavaScript modular. El flujo de pedido completo con foto ya funciona. El contacto funciona. Apps Script está publicado en V1_8 y responde online.

El pedido completo con foto funciona tanto en GitHub/web pública como en local. Por tanto, **no se debe cambiar ahora a pedido ligero**. El pedido ligero queda como plan B técnico, no como flujo oficial.

## Qué tenemos funcionando

- Página web estática de Takara3D.
- Página de pedido.
- Motor JS de pedido en `assets/js/takara-pedido-web.js`.
- Preview protegido en `assets/js/takara-pedido-preview.js`.
- Contacto web por Apps Script.
- Pedido web por Apps Script.
- Email interno a Takara.
- Confirmación al cliente.
- Apps Script V1_8 publicado.
- Precio backend corregido a 35 €.
- Límite backend corregido a 20 MB.
- Pedido completo con foto validado.
- Local probado y llega pedido.
- Quality Gate local existente.
- Base Git conocida: `bf32ff5 Validar dry-run y fotos de 20MB`.

## Qué NO está implantado todavía

- Astro.
- Vue 3.
- TypeScript.
- Vite moderno como build principal.
- Tests Vitest.
- Tests E2E Playwright.
- Lighthouse en CI.
- GitHub Actions para build/test/deploy.
- Panel interno de pedidos.
- Cuentas de usuario.
- Reseñas/opiniones.
- Integración automática Gmail → backend de produccion futuro.
- Custodia automática en backend de produccion futuro desde pedidos web.
- Base de datos de pedidos web.
- Idempotencia fuerte backend.
- Estado de pedido visible: recibido, pendiente revisión, aprobado, producción, enviado.

## Decisión de arquitectura

### Estado actual

```text
HTML + CSS + JavaScript modular + Apps Script + Gmail
```

### Arquitectura premium objetivo

```text
Astro + Vue 3 + TypeScript + Vite
+ CSS propio con tokens
+ Canvas / Web Worker / OffscreenCanvas para preview
+ Vitest + Playwright + Lighthouse
+ GitHub Actions + GitHub Pages
+ Apps Script como backend ligero de entrada
+ Gmail como bandeja oficial
+ backend de produccion futuro como backend real de producción
```

## Regla clave

No convertir toda la web en una SPA Vue.
Usar Astro para la web completa y Vue 3 solo como isla interactiva en el configurador/pedido.

## Prioridad inmediata

1. Documentar arquitectura en el repo.
2. Guardar Apps Script V1_8 en el repo.
3. Confirmar estado Git y push controlado si corresponde.
4. No tocar UI grande.
5. No tocar preview protegido.
6. No tocar envío completo con foto.
7. Planificar migración Astro/Vue aislada, sin romper web actual.
