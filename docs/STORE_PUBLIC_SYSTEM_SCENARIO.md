# Store Public SystemScenario V1

> Nota histórica — baseline F2/V1. Este documento conserva la certificación histórica de Store Public V1. El contrato vigente usa Store URL V2 /tienda/<store_slug> y mantiene V1 como compatibilidad. La autoridad actual está en STORE_SYSTEM_CONTRACT.md.

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