# TAKARA DESIGN SYSTEM

Estado: CORE V1-R0B
Proyecto: Takara3D Web
Objetivo: controlar el estilo global de la web desde tokens, componentes y layouts comunes, sin tocar pagina por pagina.

---

## 1. Principio maestro

El Design System es la fuente unica de verdad visual de Takara3D.

Toda decision visual reutilizable debe vivir en una de estas capas:

1. Design tokens.
2. Componentes UI.
3. Layouts comunes.

Las paginas no deben inventar estilos globales.

Regla principal: si una decision visual puede afectar a mas de una pagina, no pertenece a una pagina; pertenece al Design System.

---

## 2. Objetivos del sistema visual

El sistema visual debe permitir cambiar globalmente:

- color principal;
- color de fondo;
- superficies;
- texto principal;
- texto secundario;
- bordes;
- sombras;
- radios;
- espaciado;
- ancho maximo de pagina;
- densidad visual;
- botones;
- formularios;
- tarjetas;
- bloques de producto;
- bloques de pedido;
- tono premium.

Estos cambios deben poder hacerse sin editar Home, Productos, Pedido y Contacto una por una.

---

## 3. Capas de tokens

Los tokens se dividen por responsabilidad.

### 3.1 Tokens primitivos

Son valores base sin intencion de uso.

Ejemplos:

- color.cream.100
- color.red.700
- color.wood.500
- space.4
- radius.6
- shadow.3
- font.size.300

Los componentes no deberian usar tokens primitivos directamente salvo excepcion documentada.

### 3.2 Tokens semanticos

Son los tokens que expresan intencion dentro de la marca.

Ejemplos:

- color.background
- color.surface
- color.surface.elevated
- color.text
- color.text.muted
- color.brand
- color.action
- color.border.soft

Los componentes deben usar tokens semanticos siempre que sea posible.

### 3.3 Tokens de componente

Son tokens especificos para componentes reutilizables.

Ejemplos:

- button.primary.background
- button.primary.text
- button.radius
- card.background
- card.radius
- card.shadow
- field.background
- field.border
- preview.panel.background

Los cambios visuales de un componente deben hacerse en sus tokens o en el componente comun, no en cada pagina.

### 3.4 Tokens de pagina

Solo existen cuando una pagina necesita composicion especifica.

Ejemplos:

- home.hero.maxWidth
- products.grid.gap
- order.preview.width
- order.form.width
- contact.panel.maxWidth

No se debe crear un token de pagina si existe un token global o de componente adecuado.

---

## 4. CSS objetivo

La estructura futura de estilos sera:

- src/styles/tokens.css
- src/styles/reset.css
- src/styles/base.css
- src/styles/typography.css
- src/styles/layout.css
- src/styles/components.css
- src/styles/utilities.css
- src/styles/pages/home.css
- src/styles/pages/products.css
- src/styles/pages/order.css
- src/styles/pages/contact.css

tokens.css debe cargar antes que el resto.
Las paginas solo pueden contener composicion especifica.
Los estilos comunes deben vivir en componentes o capas globales.

---

## 5. Temas globales

La web debe poder cambiar de tono visual sin reescribir paginas.

El objetivo futuro es soportar atributos globales como:

- data-theme igual a takara;
- data-theme igual a takara-premium;
- data-density igual a comfortable;
- data-density igual a compact;
- data-mode igual a light.

Los temas no deben duplicar componentes. Solo cambian tokens.

Ejemplos de cambios permitidos por tema:

- fondo mas calido;
- sombra mas premium;
- tarjetas mas suaves;
- botones mas sobrios;
- densidad mas compacta;
- campania temporal.

---

## 6. Componentes UI obligatorios

La web debe construirse con componentes comunes.

Componentes base previstos:

- Button;
- Card;
- Field;
- SelectCard;
- Notice;
- SectionHeader;
- TrustBadge;
- PriceTag;
- MediaFrame;
- ProductCard;
- OrderPanel.

Regla: si dos paginas necesitan el mismo patron visual, se crea o se reutiliza un componente.

No se copian bloques visuales entre paginas.

---

## 7. Reglas anti-hardcode

Se debe evitar que las paginas acumulen valores visuales fijos.

Prohibido salvo excepcion documentada:

- colores hexadecimales repetidos en paginas;
- sombras definidas dentro de una pagina;
- radios definidos dentro de una pagina;
- espaciados globales definidos dentro de una pagina;
- estilos de botones duplicados;
- estilos de campos duplicados;
- media queries repetidas sin patron comun;
- CSS temporal de fase.

Permitido:

- composicion especifica de una pagina;
- ajustes puntuales documentados;
- variantes de componente registradas;
- tokens de pagina cuando no exista alternativa global.

Antes de commit, cualquier valor visual repetido debe revisarse y moverse a token si procede.

---

## 8. Reglas responsive

El responsive debe ser sistematico.

Reglas:

1. Mobile first cuando se cree estructura nueva.
2. Breakpoints definidos como tokens o constantes globales.
3. Contenedores comunes para anchos maximos.
4. Grids reutilizables para productos y secciones.
5. Pedido y preview deben tener contrato responsive propio.
6. No crear media queries dispersas sin necesidad.

---

## 9. Validacion visual futura

El Design System debe poder validarse.

Validaciones futuras:

- revisar que tokens.css existe;
- revisar que componentes comunes existen;
- detectar CSS temporal;
- detectar colores hardcodeados repetidos;
- detectar console.log en produccion;
- ejecutar build;
- ejecutar tests visuales o capturas cuando exista Playwright;
- revisar Lighthouse cuando exista build moderno.

El Quality Gate incorporara estas comprobaciones progresivamente.

---

## 10. Criterio de aceptacion

El Design System estara bien aplicado cuando un cambio de marca o estilo global pueda hacerse tocando tokens o componentes comunes, sin editar cada pagina manualmente.

Tambien sera correcto si permite crecer sin caos: nuevos productos, nuevos formatos, nuevos bloques de confianza, nuevas campanias y nuevo configurador sin duplicar estilos.
