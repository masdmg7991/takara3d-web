# Store Public SystemScenario V1

F2D valida el flujo horizontal de Store Public sin introducir una autoridad
nueva:

`Store QR URL V1 -> /tienda/?s=... -> config endpoint V1 -> JSONP
-> Store HTTP Bridge -> Public API -> Runtime -> Registry -> StoreContext V1
-> render de nombre/estado`.

Garantías:
- `store_id` no cruza la frontera pública.
- `ACTIVE` abre el canal Store.
- rename conserva el mismo Store QR físico y muestra el nombre autoritativo nuevo.
- `INACTIVE` bloquea la sesión nueva.
- reactivación conserva identidad y QR.
- identidad ausente o interna falla antes de red.
- Store Public no duplica el formulario/motor de pedido.
- Product QR permanece fuera del flujo Store.