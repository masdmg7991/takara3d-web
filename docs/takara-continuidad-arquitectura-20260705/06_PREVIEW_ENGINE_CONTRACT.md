# 06 — Contrato del motor preview Takara

## Estado actual

Preview actual protegido:

```text
assets/js/takara-pedido-preview.js
TAKARA PEDIDO PREVIEW LITHO REAL V16B-1
```

Hash conocido:

```text
1DE7F09D5CCC6A8C5E3990B4AC1B59499B5160887F317A3D4DBABE91F32BA4F6
```

## Regla de protección

No se toca directamente.

No se reemplaza sin:

- backup,
- benchmark visual,
- benchmark rendimiento,
- validación local,
- diff revisado,
- confirmación explícita.

## Objetivo V2

Crear un motor preview moderno, suave, determinista y no bloqueante.

Arquitectura deseada:

```text
OrderApp.vue
  ↓ estado
usePreviewBridge.ts
  ↓ contrato estable
preview-engine.ts
  ↓
image-pipeline.ts
frame-materials.ts
lighting-model.ts
  ↓
Canvas / OffscreenCanvas / Worker
```

## Pipeline ideal

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

## Características obligatorias

- Rápido.
- Suave.
- No bloquear UI.
- Visual premium.
- Determinista.
- Fallback si navegador no soporta Worker/OffscreenCanvas.
- Separado de Vue.
- Separado del DOM.
- Tests de contrato.

## No usar WebAssembly de entrada

WebAssembly se descarta inicialmente.

Solo se valorará si:

- Canvas/Worker no basta.
- Hay mediciones reales.
- El cuello de botella está probado.
- El coste de complejidad merece la pena.

## Benchmark contra V16B-1

V2 solo reemplaza V16B-1 si supera:

- Calidad visual.
- Realismo de litofanía.
- Marco/color.
- Modo encendida/apagada.
- Tiempo de carga.
- Fluidez.
- Robustez móvil.
- Robustez PC lento.

## Tests mínimos

```text
preview-contract.test.ts
```

Debe comprobar:

- formato vertical.
- formato horizontal.
- imagen pequeña.
- imagen grande.
- modo encendido.
- modo apagado.
- color marco.
- fallback.
- no mutación peligrosa del estado.
