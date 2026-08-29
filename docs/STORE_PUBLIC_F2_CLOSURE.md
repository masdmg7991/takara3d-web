# Store Public F2 Closure

F2 queda certificado únicamente cuando las garantías F2A–F2E permanecen
simultáneamente vigentes.

Cadena pública certificada:

`Store QR físico -> TAKARA_STORE_QR_URL_V1 -> /tienda/?s=...
-> TAKARA_APPS_SCRIPT_ENDPOINT_V1 -> JSONP read-only -> Store HTTP Bridge
-> Public API -> Runtime -> Store Registry -> TAKARA_STORE_CONTEXT_V1
-> estados loading / ACTIVE / error`.

Garantías de cierre:
- F2A: shell Store cerrada, `noindex,nofollow,noarchive`, sin escape al ecommerce general.
- F2B: una sola autoridad web para la URL Apps Script en `takara-config.js`.
- F2C: Store QR canónico, opaco y separado de Product QR.
- F2D: SystemScenario horizontal desde QR hasta Registry y vuelta al navegador.
- F2E: superficie pública accesible, fail-closed y sin analítica comercial.
- `store_id` no se expone en la superficie pública.
- Product QR no conoce Store.
- F2 no introduce todavía atribución persistente en el pedido.
- `pedido.html` y `takara-pedido-web.js` permanecen sin `TAKARA_STORE_ATTRIBUTION_V1`.
- la atribución Store del pedido pertenece exclusivamente a F3.

F2F no añade una nueva autoridad de producto. Es el gate de certificación
acumulativo de la fase Store Public.


## Post-F2 ownership

La ausencia de atribución dentro del motor de pedido fue una condición de cierre
de F2, no una prohibición permanente para fases futuras.

Desde F3, `takara-pedido-web.js` puede transportar `TAKARA_STORE_CONTEXT_V1`
de forma aditiva. F2 conserva como regresión permanente que Store Public no se
convierta en autoridad de `store_id`, `source_type` ni
`TAKARA_STORE_ATTRIBUTION_V1`.

La autoridad de atribución pertenece al backend de pedido de F3.