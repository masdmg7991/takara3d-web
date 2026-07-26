# Contrato de la página QR

Versión: `TAKARA_QR_PAGE_V1_2`

## Propósito

`https://takara3d.es/qr` es la guía de servicio incluida físicamente en el
producto. Su función principal es explicar de forma breve cómo usar, limpiar,
conservar y resolver incidencias de una litofanía Takara 3D.

La página está diseñada primero para móvil. No es una portada comercial, un
catálogo ni una página de captación agresiva.

## Jerarquía inamovible

1. Identificación y especificaciones básicas.
2. Primer uso y seguridad.
3. Limpieza.
4. Cuidados.
5. Soporte.
6. Recurrencia comercial discreta al final de la página.

La redacción debe ser breve, escaneable y evitar repetir una misma advertencia
en varias secciones.

## Reglas de limpieza

- La pieza se desconecta antes de limpiarla.
- El polvo de los huecos de la litofanía se retira con un cepillo limpio, seco
  y de cerdas muy suaves, sin presionar.
- Puede citarse como ejemplo un cepillo dental ultrasuave, nuevo y reservado
  exclusivamente para la pieza.
- El paño de microfibra se reserva para el marco y las zonas lisas.
- No se pulverizan líquidos ni se moja el conector.
- Se excluyen alcohol, disolventes, abrasivos, estropajos e inmersión.

## Reglas comerciales

- El encabezado no muestra navegación directa a Productos o Pedido.
- La llamada comercial no usa expresiones como `Comprar ahora`.
- La vía de recurrencia se denomina `Crear otro recuerdo`.
- La tienda colaboradora se presenta como una vía válida para solicitar otra
  pieza, al mismo nivel textual que Takara 3D.
- Los QR exclusivos de tiendas y su atribución se resolverán en un flujo
  independiente; esta página no debe inventar identificadores de tienda.

## Datos técnicos contractuales

- Alimentación: USB-C, 5 V.
- Uso recomendado: interior.
- El cable está incluido.
- El adaptador de corriente no está incluido.
- Es normal que la lámpara esté ligeramente templada durante el uso.
- No se considera normal un calor excesivo o que llegue a quemar, ni la
  aparición de olor, deformación, parpadeo persistente o una conexión
  inestable; en esos casos debe desconectarse.
- No se publican amperajes, potencias máximas ni compatibilidades no validadas.

## Archivos

- `qr/index.html`
- `assets/css/qr.css`

El estilo de esta página se mantiene aislado bajo `.qr-page` para evitar
regresiones en Inicio, Productos, Pedido y Contacto.
