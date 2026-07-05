# 03 — Arquitectura premium objetivo Takara3D Web

## Decisión principal

La arquitectura premium acordada es:

```text
Astro
+ Vue 3
+ TypeScript
+ Vite
+ CSS propio con tokens/componentes
+ Vitest
+ Playwright
+ ESLint
+ Prettier
+ Lighthouse/Core Web Vitals
+ GitHub Pages/GitHub Actions
```

No se hará una SPA completa en Vue.

Se hará:

```text
Astro para la web completa.
Vue 3 solo para zonas interactivas.
TypeScript para motor de pedido y dominio.
Canvas/Web Worker/OffscreenCanvas para preview.
HTML estático para contenido comercial.
```

## Por qué Astro

Takara no necesita una aplicación pesada. Necesita una web comercial rápida, premium, indexable y con interacción solo donde hace falta.

Astro permite:

- Generar HTML estático rápido.
- Hidratar solo componentes interactivos.
- Mantener SEO fuerte.
- Reducir JavaScript innecesario.
- Desplegar bien en GitHub Pages.

## Por qué Vue 3

Vue se usará para el configurador y pedido porque:

- Permite componentes reactivos claros.
- Es progresivo.
- No obliga a convertir toda la web en SPA.
- Encaja bien como isla interactiva dentro de Astro.

## Por qué TypeScript

TypeScript será obligatorio en el motor de pedido porque:

- Protege contratos.
- Detecta errores antes del navegador.
- Evita mezclar estados inválidos.
- Hace mantenible el cálculo de precios, payload y validación.

## Estructura de carpetas objetivo

```text
takara3d-web/
├─ public/
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ assets/
│     ├─ brand/
│     ├─ img/
│     └─ data/
│
├─ src/
│  ├─ pages/
│  │  ├─ index.astro
│  │  ├─ productos.astro
│  │  ├─ pedido.astro
│  │  ├─ contacto.astro
│  │  └─ 404.astro
│  │
│  ├─ layouts/
│  │  ├─ BaseLayout.astro
│  │  ├─ MarketingLayout.astro
│  │  └─ OrderLayout.astro
│  │
│  ├─ components/
│  │  ├─ global/
│  │  │  ├─ SiteHeader.astro
│  │  │  ├─ SiteFooter.astro
│  │  │  ├─ SeoHead.astro
│  │  │  └─ SkipLink.astro
│  │  │
│  │  ├─ ui/
│  │  │  ├─ Button.astro
│  │  │  ├─ Card.astro
│  │  │  ├─ Field.astro
│  │  │  ├─ SectionHeader.astro
│  │  │  └─ TrustBadge.astro
│  │  │
│  │  ├─ marketing/
│  │  │  ├─ Hero.astro
│  │  │  ├─ ProductStrip.astro
│  │  │  ├─ ProcessSteps.astro
│  │  │  └─ Testimonials.astro
│  │  │
│  │  └─ order/
│  │     ├─ OrderShell.astro
│  │     └─ OrderApp.vue
│  │
│  ├─ order-app/
│  │  ├─ components/
│  │  │  ├─ OrderConfigurator.vue
│  │  │  ├─ FrameOptions.vue
│  │  │  ├─ PhotoUploader.vue
│  │  │  ├─ ContactDetails.vue
│  │  │  ├─ LegalConsent.vue
│  │  │  ├─ OrderSummary.vue
│  │  │  └─ SubmitPanel.vue
│  │  │
│  │  ├─ composables/
│  │  │  ├─ useOrderState.ts
│  │  │  ├─ usePricing.ts
│  │  │  ├─ useValidation.ts
│  │  │  ├─ usePreviewBridge.ts
│  │  │  └─ useSubmitOrder.ts
│  │  │
│  │  ├─ domain/
│  │  │  ├─ order.types.ts
│  │  │  ├─ products.ts
│  │  │  ├─ pricing.ts
│  │  │  ├─ validation.ts
│  │  │  └─ payload.ts
│  │  │
│  │  └─ engine/
│  │     ├─ preview-engine.ts
│  │     ├─ preview-worker.ts
│  │     ├─ image-pipeline.ts
│  │     ├─ frame-materials.ts
│  │     └─ lighting-model.ts
│  │
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ reset.css
│  │  ├─ base.css
│  │  ├─ typography.css
│  │  ├─ layout.css
│  │  ├─ components.css
│  │  ├─ pages/
│  │  │  ├─ home.css
│  │  │  ├─ products.css
│  │  │  ├─ order.css
│  │  │  └─ contact.css
│  │  └─ index.css
│  │
│  └─ content/
│     ├─ products/
│     ├─ faq/
│     └─ legal/
│
├─ tests/
│  ├─ unit/
│  │  ├─ pricing.test.ts
│  │  ├─ validation.test.ts
│  │  ├─ payload.test.ts
│  │  └─ preview-contract.test.ts
│  │
│  └─ e2e/
│     ├─ pedido.spec.ts
│     ├─ productos.spec.ts
│     └─ navigation.spec.ts
│
├─ scripts/
│  ├─ audit/
│  ├─ migrate/
│  ├─ validate/
│  └─ cleanup/
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ DESIGN_SYSTEM.md
│  ├─ ORDER_ENGINE_CONTRACT.md
│  ├─ PREVIEW_ENGINE_CONTRACT.md
│  ├─ DEPLOYMENT.md
│  └─ CLEANUP_POLICY.md
│
├─ apps-script/
│  └─ takara-pedidos-web/
│     ├─ Code.gs
│     └─ README.md
│
├─ astro.config.mjs
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ eslint.config.js
├─ prettier.config.js
└─ README.md
```

## Capas

### 1. Contenido

HTML estático generado por Astro:

- Home.
- Productos.
- Contacto.
- FAQ.
- Legal.
- Textos comerciales.

Debe poder leerse sin depender de JavaScript.

### 2. Diseño

Sistema propio:

```text
tokens.css
reset.css
base.css
typography.css
layout.css
components.css
pages/*.css
```

Reglas:

- Diseño común en componentes.
- Página solo ajusta composición.
- Nada de parches al final del CSS.
- Nada de fases temporales acumuladas antes del commit.

### 3. Interacción

Vue 3 solo donde haga falta:

- Configurador de pedido.
- Resumen de precio.
- Validación reactiva.
- Estado de imagen subida.
- Puente con preview.

### 4. Dominio

Lógica de negocio separada de la UI:

- Producto.
- Formato.
- Orientación.
- Color.
- Cantidad.
- Precio.
- Contacto.
- Consentimientos.
- Payload.
- Estado de envío.

La UI nunca calcula precios a mano.

### 5. Preview

Motor separado:

- `preview-engine.ts`
- `image-pipeline.ts`
- `frame-materials.ts`
- `lighting-model.ts`
- `preview-worker.ts`
- `usePreviewBridge.ts`

### 6. Envío

Adaptadores, no lógica pegada al formulario:

```text
submit-order.ts
payload.ts
adapters/gmail-adapter.ts
adapters/microfactory-adapter.ts
adapters/future-shop-adapter.ts
```

El formulario no debe saber si mañana se envía a Gmail, MicroFactory o base de datos.

### 7. Calidad

Herramientas obligatorias:

- TypeScript strict.
- ESLint.
- Prettier.
- Vitest.
- Playwright.
- Lighthouse.
- `git diff --check`.
- Validadores propios Takara.
