# Contrato de datos estructurados de producto

## Objetivo

Los datos JSON-LD deben describir fielmente los productos que Takara3D ofrece
en la web, sin inventar condiciones comerciales para silenciar avisos de
herramientas externas.

## Productos activos

Las tres entidades `Product` actuales son:

- marco vertical en `productos.html`;
- marco horizontal en `productos.html`;
- marco de litofanía configurable en `pedido.html`.

Cada entidad debe incluir:

- `name`;
- `url`;
- `image` con URL HTTPS absoluta y archivo real del mismo producto;
- `brand`;
- `offers.price` igual a `35.00`;
- `offers.priceCurrency` igual a `EUR`;
- `offers.availability` igual a `https://schema.org/InStock`.

## Imágenes contractuales

- Vertical:
  `https://takara3d.es/assets/img/fotos/producto-marco-vertical-familia-card-v18.webp`
- Horizontal:
  `https://takara3d.es/assets/img/fotos/producto-marco-horizontal-mascota.webp`

La entidad general de `pedido.html` puede declarar ambas imágenes.

## Propiedades no inventadas

No se añadirán `shippingDetails`, `hasMerchantReturnPolicy`, `review` ni
`aggregateRating` hasta que existan condiciones públicas reales y verificables
para esos campos.

## Regresión

`tools/takara_validar_datos_estructurados.py` debe parsear el JSON-LD, comprobar
las tres entidades `Product`, validar sus imágenes locales y confirmar precio,
moneda y disponibilidad antes de cualquier commit o push.
