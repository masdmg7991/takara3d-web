# TAKARA WEB ARCHITECTURE

Estado: CORE V1-R0A
Proyecto: Takara3D Web
Objetivo: construir una web premium, rapida, robusta, mantenible y escalable, sin parches acumulados.

---

## 1. Principio maestro

Takara3D no debe ser una web hecha a base de apanios.

Cada cambio debe cumplir:

1. Mejorar o mantener la limpieza del repo.
2. Tener alcance claro.
3. Tener backup previo.
4. Tener validacion automatica.
5. Tener diff revisable.
6. No dejar basura tecnica.
7. No romper componentes protegidos.
8. No hacer commit sin aprobacion.
9. No hacer push automatico.
10. No usar git add punto.

---

## 2. Arquitectura objetivo

La arquitectura objetivo sera:

- Astro para paginas estaticas, SEO, rendimiento y layouts.
- Vue 3 para islas interactivas concretas.
- TypeScript para contratos, dominio y logica critica.
- Vite como ecosistema de build moderno.
- Design System con tokens globales.
- CSS propio por capas, sin parches acumulados.
- Motor de pedido aislado.
- Motor de preview protegido.
- Quality Gate por iteracion.
- Tests automaticos.
- Deploy controlado.

La filosofia sera static-first con islands architecture.

Esto significa:

- HTML estatico para contenido comercial, SEO y velocidad.
- JavaScript solo donde aporte valor real.
- Vue 3 solo en componentes interactivos.
- TypeScript para contratos y logica critica.
- CSS global gobernado por tokens.
- Nada de SPA completa innecesaria.

---

## 3. Por que no una SPA completa

Takara3D es una web comercial con partes interactivas.

No necesita que Home, Productos, Contacto y contenido legal dependan de JavaScript para verse.

Una SPA completa podria introducir:

- mas JavaScript inicial;
- peor carga percibida;
- mas complejidad;
- mas puntos de fallo;
- peor mantenimiento para contenido estatico.

La solucion correcta es contenido estatico rapido mas islas interactivas donde haga falta.

---

## 4. Stack tecnico objetivo

### Astro

Responsable de paginas estaticas, layouts, SEO, rendimiento e integracion de islas interactivas.

### Vue 3

Responsable del configurador de pedido, estado reactivo, resumen de precio, validaciones y conexion con preview mediante bridge.

Vue no debe controlar toda la web.

### TypeScript

Responsable de contratos de datos, tipos de pedido, precios, validaciones, payloads y adaptadores futuros.

### Vite

Responsable de desarrollo moderno, build rapido, bundling optimizado e integracion con Vue y Astro.

### CSS propio con Design Tokens

Responsable de identidad visual, cambios globales, consistencia, componentes reutilizables y evitar tocar pagina por pagina.

---

## 5. Regla de evolucion

No se migrara toda la web de golpe.

Orden recomendado:

1. Documentacion y Quality Gate.
2. Design System.
3. Base Astro, Vue 3 y TypeScript aislada.
4. Pedido V2.
5. Motor preview V2 comparado con Preview V16B-1.
6. Productos.
7. Contacto.
8. Home solo si hace falta.
9. Deploy controlado.

---

## 6. Capas del sistema

La web se organiza por capas. Cada capa tiene una responsabilidad clara.

### 6.1 Capa de contenido

Contiene Home, Productos, Pedido, Contacto, FAQ, textos legales y contenido comercial.
Debe ser rapida, indexable y estable.

### 6.2 Capa de layout

Contiene BaseLayout, MarketingLayout, OrderLayout, cabecera, footer, contenedores y secciones.
Ninguna pagina debe reinventar el layout base.

### 6.3 Capa de componentes UI

Contiene Button, Card, Field, SelectCard, Notice, SectionHeader, TrustBadge, PriceTag y MediaFrame.
Los componentes deben depender de tokens, no de valores hardcodeados.

### 6.4 Capa de dominio

Contiene productos, formatos, colores, precios, descuentos, cantidades, validaciones, consentimiento y payload de pedido.
La UI no calcula precios a mano. La UI consulta al dominio.

### 6.5 Capa de pedido

Contiene estado del pedido, configuracion, datos de contacto, legal, resumen, envio y adaptadores.
El formulario no debe saber si el destino futuro sera Gmail, MicroFactory, base de datos o tienda.

### 6.6 Capa de preview

El preview debe estar aislado.
La UI no debe conocer detalles internos del canvas.
La comunicacion debe hacerse mediante Order App -> Preview Bridge -> Preview Engine.

### 6.7 Capa de calidad

Cada iteracion debe ejecutar validaciones automaticas: contratos inamovibles, mojibake, temporales, marcadores experimentales, diff, catalogo, tests, build y estado Git.

---

## 7. Estructura objetivo futura

Estructura prevista del repo moderno:

- public/assets/brand
- public/assets/img
- public/assets/data
- src/pages
- src/layouts
- src/components/global
- src/components/ui
- src/components/marketing
- src/components/order
- src/order-app/components
- src/order-app/composables
- src/order-app/domain
- src/order-app/engine
- src/order-app/adapters
- src/styles
- src/content
- tests/unit
- tests/e2e
- scripts/audit
- scripts/validate
- scripts/cleanup
- scripts/migrate
- docs

La estructura moderna se introducira por fases y no debe romper la web estatica actual hasta que el build este validado.

---

## 8. Design System obligatorio

La web debe poder cambiar de estilo global sin entrar pagina por pagina.

El disenio se controla mediante:

- design tokens;
- componentes UI;
- layouts comunes.

Las paginas solo componen estructura y contenido.

Deben poder cambiarse globalmente desde tokens o componentes:

- color principal;
- fondo;
- radio de tarjetas;
- sombras;
- ancho maximo;
- espaciado vertical;
- densidad visual;
- estilo premium;
- botones;
- formularios.

Regla: si una decision visual puede afectar a mas de una pagina, no pertenece a una pagina; pertenece al Design System.

---

## 9. Contrato del preview

El motor actual protegido es assets/js/takara-pedido-preview.js.
Debe contener el marcador TAKARA PEDIDO PREVIEW LITHO REAL V16B-1.

Reglas:

1. No se toca sin fase especifica.
2. No se sustituye sin benchmark visual.
3. No se mezcla con UI.
4. No se edita a ciegas.
5. Debe conservar Encendida y Apagada.
6. Cualquier motor nuevo debe superar al actual antes de reemplazarlo.
7. El hash del archivo debe revisarse en fases criticas.

---

## 10. Motor de preview futuro

Objetivo del futuro motor:

- mas rapido;
- mas suave;
- mas fiable;
- no bloqueante;
- determinista;
- testeable;
- con fallback.

Arquitectura futura:

OrderApp.vue -> usePreviewBridge.ts -> preview-engine.ts -> image-pipeline.ts -> frame-materials.ts -> lighting-model.ts -> canvas renderer.

Primero se usara TypeScript, Canvas optimizado, ImageBitmap si aporta, requestAnimationFrame, Web Worker si aporta y OffscreenCanvas solo con fallback.

WebAssembly solo se considerara si una medicion real demuestra que hace falta.

---

## 11. Quality Gate

El repo debe revisar al repo.

Cada fase debe poder ejecutar un gate automatico que compruebe:

- estructura;
- encoding;
- mojibake;
- preview protegido;
- scripts experimentales;
- archivos temporales;
- marcadores de parches;
- git diff --check;
- catalogo;
- tests;
- build;
- estado Git.

Los logs deben ser claros: OK, WARN y ERROR.
No se permite que un script muestre OK despues de un error real sin detenerse.

---

## 12. Politica de limpieza

Una fase no termina cuando visualmente parece bien.

Una fase termina cuando:

1. El cambio esta validado.
2. El diff es entendible.
3. No hay temporales.
4. No hay codigo muerto.
5. No hay parches acumulados.
6. No hay archivos basura.
7. El repo queda controlado.
8. Se decide si iterar, consolidar o commit.

Prohibido en commit:

- _takara_*.ps1;
- archivos tmp, bak, old o patch;
- CSS temporal de fase;
- JS experimental no usado;
- console.log de pruebas;
- codigo muerto;
- backups dentro del repo;
- dist local;
- node_modules.

---

## 13. Regla de commits

No se mezclan cambios incompatibles.

Commits recomendados:

- docs: arquitectura web core v1;
- tools: quality gate inicial;
- style: design system tokens base;
- build: scaffold astro vue typescript;
- pedido: estructura order v2;
- preview: contrato y bridge inicial.

No se permite git add punto.
Cada commit debe aniadir archivos concretos.

---

## 14. Resultado esperado

La web debe sentirse premium, calida, artesanal pero tecnologica, rapida, limpia, confiable, clara, facil de comprar y preparada para crecer.

El codigo debe sentirse modular, predecible, documentado, testeable, sin duplicidades, sin parches, con contratos, con limpieza y con rollback.

---

## 15. Criterio de exito

Esta arquitectura sera correcta si dentro de meses podemos aniadir nuevos productos, formatos, colores, precios por cantidad, cupones, resenias, usuarios, panel interno, MicroFactory y motor preview mejorado sin rehacer la web ni romper lo que funciona.
