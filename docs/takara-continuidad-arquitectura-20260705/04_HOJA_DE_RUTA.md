# 04 — Hoja de ruta Takara3D Web Premium

## Principio

No migrar todo de golpe. No romper la web actual. La web actual funciona y debe mantenerse viva mientras se construye la base premium en paralelo o por fases muy controladas.

## Fase 0 — Congelar documentación y estado

Objetivo: dejar escrito el contrato antes de seguir programando.

Entregables:

```text
docs/ARCHITECTURE.md
docs/DESIGN_SYSTEM.md
docs/ORDER_ENGINE_CONTRACT.md
docs/PREVIEW_ENGINE_CONTRACT.md
docs/CLEANUP_POLICY.md
docs/DEPLOYMENT.md
apps-script/takara-pedidos-web/Code.gs
apps-script/takara-pedidos-web/README.md
```

Validaciones:

- Repo limpio antes.
- Solo se añaden docs y Apps Script versionado.
- No se cambia web productiva.
- No se cambia JS/CSS/HTML salvo que sea necesario para documentar.
- Diff claro.
- Commit sugerido: `Documentar arquitectura premium Takara Web`.

## Fase 1 — Verificación de producción actual

Objetivo: asegurar que lo que funciona queda controlado.

Comprobar:

- Pedido público llega.
- Pedido local llega.
- Contacto llega.
- Endpoint Apps Script devuelve V1_8.
- Precio 35 € backend.
- Límite 20 MB backend.
- Frontend local `bf32ff5` validado.
- Preview hash intacto.
- Quality Gate OK.

Resultado esperado:

```text
Sistema actual estable y documentado.
```

## Fase 2 — Guardar Apps Script V1_8 en Git

Objetivo: que el backend ligero no viva solo en Google Apps Script.

Crear:

```text
apps-script/takara-pedidos-web/Code.gs
apps-script/takara-pedidos-web/README.md
```

README debe incluir:

- URL del endpoint, si se decide documentarla.
- Cómo desplegar nueva versión.
- Qué permisos usa.
- Qué correos manda.
- Cómo comprobar `doGet`.
- Qué NO tocar.

Validación:

- `Code.gs` coincide con V1_8 publicado.
- No se cambia endpoint en `pedido.html`.
- No se cambia flujo pedido.

## Fase 3 — Preparar base Astro/Vue aislada

Objetivo: crear arquitectura moderna sin sustituir web actual.

Acciones:

- Crear rama de migración o carpeta aislada.
- Inicializar Astro.
- Integrar Vue 3.
- Configurar TypeScript strict.
- Configurar ESLint/Prettier.
- Configurar Vitest.
- Configurar Playwright.
- Configurar Lighthouse mínimo.
- Validar build local.

No hacer:

- No sustituir `index.html` aún.
- No tocar web pública.
- No migrar pedido todavía.
- No romper rutas actuales.

Resultado esperado:

```text
Proyecto moderno compila aislado.
```

## Fase 4 — Sistema visual base

Objetivo: crear base visual premium reutilizable.

Migrar/crear:

- `BaseLayout.astro`
- `MarketingLayout.astro`
- `OrderLayout.astro`
- `SiteHeader.astro`
- `SiteFooter.astro`
- `SeoHead.astro`
- `SkipLink.astro`
- `tokens.css`
- `reset.css`
- `base.css`
- `typography.css`
- `layout.css`
- `components.css`

Reglas:

- No rediseño agresivo.
- No tocar home cerrada salvo adaptación mínima.
- Mantener estética cálida/premium.
- Nada de Tailwind sin criterio.
- Nada de Bootstrap.

## Fase 5 — Contrato del motor de pedido V2

Objetivo: separar dominio de UI.

Crear:

```text
src/order-app/domain/order.types.ts
src/order-app/domain/products.ts
src/order-app/domain/pricing.ts
src/order-app/domain/validation.ts
src/order-app/domain/payload.ts
```

Debe cubrir:

- Producto.
- Formato.
- Orientación.
- Color.
- Cantidad.
- Precio base.
- Extras futuros.
- Frases personalizadas.
- Contacto.
- Consentimientos.
- Foto.
- Estado de envío.
- Payload para Apps Script.
- Payload futuro para backend de produccion futuro.

Tests:

```text
tests/unit/pricing.test.ts
tests/unit/validation.test.ts
tests/unit/payload.test.ts
```

## Fase 6 — Pedido V2 como isla Vue

Objetivo: crear configurador moderno sin romper pedido actual.

Componentes:

```text
OrderApp.vue
OrderConfigurator.vue
FrameOptions.vue
PhotoUploader.vue
ContactDetails.vue
LegalConsent.vue
OrderSummary.vue
SubmitPanel.vue
```

Composables:

```text
useOrderState.ts
usePricing.ts
useValidation.ts
usePreviewBridge.ts
useSubmitOrder.ts
```

Reglas:

- Vue no calcula precios a mano.
- Vue no decide contrato final por su cuenta.
- Vue consume dominio.
- Vue solo orquesta UI/estado.

Validación:

- Pedido test con foto pequeña.
- Pedido test con foto grande <20 MB.
- Validación de campos.
- Error si falta aceptación legal.
- No romper endpoint.

## Fase 7 — Motor preview V2

Objetivo: crear motor moderno y compararlo contra V16B-1.

Crear:

```text
preview-engine.ts
preview-worker.ts
image-pipeline.ts
frame-materials.ts
lighting-model.ts
```

Pipeline:

1. Usuario sube imagen.
2. Crear `ImageBitmap` optimizado.
3. Detectar orientación.
4. Calcular preset vertical/horizontal.
5. Normalizar imagen.
6. Renderizar litofanía.
7. Aplicar marco.
8. Aplicar color/material.
9. Aplicar modo encendida/apagada.
10. Dibujar en canvas.
11. Trabajo pesado a worker si procede.
12. OffscreenCanvas si está disponible.
13. Fallback a canvas normal.
14. Animaciones con `requestAnimationFrame`.

Regla crítica:

```text
V16B-1 sigue protegido hasta que V2 lo supere.
```

No usar WebAssembly de entrada. Solo se plantea si mediciones reales demuestran que hace falta.

## Fase 8 — Productos V2

Objetivo: migrar catálogo a estructura mantenible.

Crear:

- Productos desde datos/content collections.
- Tarjetas reutilizables.
- Filtros estables.
- Próximamente controlado.
- SEO por producto.

Productos actuales:

- Marco vertical.
- Marco horizontal.
- Caja/lámpara 4 caras próximamente.
- Edición regalo próximamente.

## Fase 9 — Contacto V2

Objetivo: formulario limpio, premium y seguro.

Mantener:

- Apps Script contacto.
- Confirmación cliente.
- Email interno.

Mejorar:

- Microcopy.
- Validación.
- Estados visuales.
- Legal.
- Antispam básico si hace falta.

## Fase 10 — Home V2 controlada

La home está considerada estable/cerrada. No se reabre salvo decisión explícita.

Si se migra a Astro, debe ser adaptación estructural, no rediseño completo.

Regla:

```text
No reventar la home.
```

## Fase 11 — Reseñas/opiniones

Objetivo: añadir confianza sin crear caos.

Opciones:

- Reseñas manuales curadas al principio.
- Estructura de datos local.
- Más adelante, integración externa o panel.

Debe evitarse:

- Sistema complejo de usuarios al principio.
- Comentarios abiertos sin moderación.

## Fase 12 — Cuentas de usuario / zona privada

No es prioridad inmediata.

Solo plantear cuando:

- Pedido estable.
- backend de produccion futuro estable.
- Panel interno claro.
- Necesidad real de cliente recurrente.

Posibles funciones futuras:

- Ver pedido.
- Subir foto posterior.
- Aprobar preview.
- Consultar estado.
- Historial.

## Fase 13 — backend de produccion futuro

Objetivo: cerrar el circuito de producción.

Flujo deseado:

```text
Gmail pedido
→ lector backend de produccion futuro
→ normalización
→ expediente TK
→ custodia original
→ registro BD
→ trazabilidad
→ revisión humana
→ preparación producción
```

Estados sugeridos:

```text
recibido
foto_custodiada
pendiente_revision
validado
pendiente_produccion
en_produccion
finalizado
entregado
cancelado
```

## Fase 14 — CI/CD

Objetivo: despliegue profesional.

GitHub Actions:

- install.
- lint.
- format check.
- unit tests.
- e2e mínimo.
- build.
- lighthouse opcional.
- deploy GitHub Pages.

Regla:

```text
No deploy si falla calidad.
```

## Fase 15 — Consolidación final

Objetivo: retirar legacy cuando la versión nueva sea superior.

Condiciones:

- Astro build OK.
- Pedido V2 probado.
- Preview V2 supera V16B-1.
- Contacto OK.
- Productos OK.
- Home OK.
- GitHub Pages OK.
- Rollback documentado.

Solo entonces se sustituye la web actual.
