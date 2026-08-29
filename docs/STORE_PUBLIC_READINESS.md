# Store Public Readiness V1

F2E congela la superficie pública del canal Store antes de introducir
atribución de pedido en F3.

Garantías:
- noindex/nofollow/noarchive;
- sin navegación a Home, catálogo general, pedido directo o Product QR;
- sin analítica comercial en `/tienda/`;
- loading, ACTIVE y error son estados accesibles y fail-closed;
- sin JavaScript no se continúa;
- el nombre visible procede exclusivamente de StoreContext autoritativo;
- `store_id` no aparece en HTML ni se usa como identidad pública;
- la atribución persistente de pedido sigue fuera de F2 y pertenece a F3.