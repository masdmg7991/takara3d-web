# Takara 3D · Arquitectura de pedidos

## Objetivo

La web de Takara 3D debe funcionar como escaparate premium, configurador de producto y entrada trazable de pedidos.

El sistema no debe depender de precios escritos en varias páginas. El catálogo debe ser la fuente de verdad.

## Flujo correcto

Catalogo JSON
→ render de producto
→ configurador
→ pricing único
→ snapshot cerrado del pedido
→ Apps Script valida
→ Gmail / Drive
→ MicroFactory

## Reglas

1. Ningún precio nuevo debe escribirse a mano en HTML.
2. Ningún producto debe duplicarse entre páginas.
3. El catálogo define productos, variantes, extras, imágenes, disponibilidad y precios.
4. El pricing se calcula en una única función.
5. El pedido enviado al backend debe ser un snapshot cerrado.
6. Apps Script valida, pero no inventa precios.
7. El email interno debe copiar el snapshot técnico.
8. Cada pedido debe incluir versión de catálogo y versión de snapshot.
9. Si el catálogo falla, la web debe fallar controlado y no enviar pedidos incompletos.
10. Todo cambio importante debe pasar por backup, validación, diff, commit y push controlado.

## Archivos base

- assets/data/catalogo.json
- assets/data/catalogo.schema.json
- assets/js/core/takara-catalogo.js
- assets/js/core/takara-pricing.js
- assets/js/core/takara-order-snapshot.js
- tools/validar_catalogo.py

## Estado de esta fase

Esta fase crea cimientos. Todavía no cambia la experiencia visual pública.
