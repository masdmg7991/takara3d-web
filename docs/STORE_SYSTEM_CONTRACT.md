# TAKARA STORE SYSTEM CONTRACT

Version: `TAKARA_STORE_SYSTEM_CONTRACT_V1`
Estado: FROZEN STORE-F0 + ADDENDA V2
Fecha de freeze: 2026-08-29

## 1. Frontera de capacidad

`PRODUCT_QR != STORE_QR`

Product QR:
- vive en `/qr`;
- esta fisicamente asociado al producto ya fabricado;
- cubre uso, limpieza, cuidados, seguridad y soporte;
- no conoce Store;
- no contiene `store_id`;
- no contiene `store_public_code`;
- no crea atribucion comercial.

Store QR:
- vive en el expositor del establecimiento colaborador;
- abre el Store Channel;
- V2 expone `store_slug` como identidad de URL legible;
- backend resuelve ese slug al `store_public_code`/`store_ref` canónico;
- V1 por `store_public_code` permanece como compatibilidad;
- inicia un flujo de pedido cerrado y atribuible;
- no reutiliza identificadores ni contratos Product QR.

## 2. Identidades

### `store_id`

Identidad interna, única, inmutable, no reciclable y con formato lógico STO_*.

### `store_public_code`

Identidad pública canónica de backend:
- única;
- aleatoria/opaca;
- inmutable;
- no secreta;
- independiente del nombre comercial.

### `store_slug`

Identificador público de URL V2:
- único dentro del Registry;
- derivado inicialmente de display_name;
- ASCII, minúsculas y guiones;
- inmutable una vez asignado;
- no sustituye store_public_code como identidad canónica de backend;
- una colisión recibe sufijo determinista -2, -3, etc.

### `display_name`

Nombre comercial visible y editable. Cambiarlo no rota store_slug,
store_public_code ni QR.

## 3. Estado Store

Estados V1:

- `ACTIVE`
- `INACTIVE`

No existe DELETE administrativo en V1.

Una Store `INACTIVE`:
- conserva identidad e historico;
- no puede iniciar nuevos pedidos Store;
- nunca se reasigna a otra tienda.

## 4. Ruta publica Store

Ruta canónica V2:

https://takara3d.es/tienda/<store_slug>

Compatibilidad V1:

https://takara3d.es/tienda/?s=<store_public_code>

Reglas:
- una única plantilla física /tienda/index.html;
- ninguna Store genera HTML propio;
- ninguna alta requiere deploy web;
- GitHub Pages usa un bridge 404 limitado a /tienda/<store_slug>;
- el bridge sólo acepta slug canónico sin query/hash y salta al bootstrap interno /tienda/?slug=<store_slug>;
- tras resolver, history.replaceState restaura la URL bonita;
- store_slug es inmutable y no se recalcula al renombrar;
- V1 permanece funcional para QR/enlaces ya emitidos;
- la superficie usa noindex,nofollow,noarchive;
- no ofrece navegación al catálogo general.

## 5. Store Context

Contrato:

`TAKARA_STORE_CONTEXT_V1`

La entrada pública puede transportar store_slug V2 o store_ref V1.
Backend resuelve ambos contra el mismo Registry y el Store Context devuelve
siempre el store_ref canónico.

El navegador no es autoridad de store_id.

## 6. Atribucion de pedido

Contrato:

`TAKARA_STORE_ATTRIBUTION_V1`

El backend debe resolver `store_ref` contra `TAKARA_STORE_REGISTRY_V1`.

Despues de una resolucion valida se congela:

- `source_type = STORE`
- `store_id`
- `store_name_snapshot`

Si el pedido no contiene Store Context:

- `source_type = DIRECT`

Si un pedido declara Store pero:
- la referencia no existe;
- la Store esta `INACTIVE`;
- el Registry no esta disponible;
- el contexto es invalido;

el pedido se rechaza.

Nunca se degrada silenciosamente de `STORE` a `DIRECT`.

## 7. Autoridad Store V1

Autoridad logica unica:

`TAKARA_STORE_REGISTRY_V1`

Persistencia fisica de la autoridad V1:

Google Spreadsheet dedicado.

Compatibilidad de esquema:
- lectura acepta el esquema legacy de 16 columnas y el esquema actual de 17 columnas;
- el esquema actual añade `store_slug`;
- una mutación sobre un Registry legacy migra 16→17 bajo el mismo write lock;
- la migración preserva los 16 campos existentes y asigna slugs de forma determinista;
- `TAKARA_STORE_REGISTRY_V1` sigue identificando la autoridad lógica, no el ancho físico de la hoja.

Reglas:
- acceso mediante Store Service/Admin;
- no editar manualmente como flujo operativo normal;
- unicidad de `store_id`;
- unicidad de `store_public_code`;
- unicidad de `store_slug`;
- control de `version`;
- timestamps;
- baja logica;
- auditoria de mutaciones.

## 8. Concurrencia

Las mutaciones del Registry usan:

`LockService.getScriptLock()`

La mutacion debe adquirir el lock antes de leer-modificar-escribir.

## 9. Backend publico Store

Se reutiliza el Google Apps Script ligero ya existente como adapter backend.

Lectura pública V2:

GET .../exec?action=store.resolve&store_slug=<store_slug>

Compatibilidad V1:

GET .../exec?action=store.resolve&store_ref=<store_public_code>

Ambas rutas devuelven sólo una proyección pública sanitizada y convergen en el mismo
Store Registry. No existe una segunda autoridad por slug.

No expone:
- notas internas;
- datos administrativos privados;
- secretos;
- credenciales.

## 10. Admin Store V1

El Admin gestiona exclusivamente:
- listar Store;
- alta;
- editar;
- activar;
- desactivar.

No incluye:
- pedidos;
- clientes;
- estadisticas;
- comisiones;
- liquidaciones;
- facturacion;
- campañas;
- inventario.

El Admin V1 se publica como Google Apps Script Web App con acceso restringido.

No se implementa autenticacion casera en GitHub Pages.

## 11. Analytics

Web publica Takara:
- Analytics comercial ON.

Store Public:
- Analytics comercial permitido segun contrato de canal.

Admin Store:
- Analytics comercial OFF.

Los logs tecnicos/security no son Analytics comercial.

## 12. Topologia vigente — V2 con compatibilidad V1

```text
takara3d.es
    |
    +-- GitHub Pages
    |      |
    |      +-- /tienda/<store_slug>            [canónica V2]
    |      +-- /tienda/?s=<store_public_code> [legacy V1]
    |
    +-- Google Apps Script
           |
           +-- pedido/contacto existente
           +-- Store public resolver
           +-- Store validation
           +-- Store Admin Web App
                    |
                    v
             Google Spreadsheet
             TAKARA_STORE_REGISTRY_V1
```

Para la topologia vigente no se requiere:
- migrar DNS;
- Cloudflare Worker;
- D1;
- servidor propio;
- infraestructura VBOX;
- TECHRUN.

## 13. Dependencias y ownership

Store Public depende de Store Service.

Store Admin depende de Store Service.

Store Service es el unico owner de Store Registry.

Pedido consume atribucion Store validada.

Apps Script de pedido no se convierte en owner de la administracion Store.

MicroFactory puede consumir `store_id`, pero no es autoridad del estado Store.

Product QR no depende de Store.

Preview no depende de Store.

## 14. Gates de identidad

Debe mantenerse:
- Product QR sin `store_id`;
- Product QR sin `store_public_code`;
- Product QR sin `TAKARA_STORE_CONTEXT_V1`;
- hash protegido del preview;
- pedido directo compatible;
- Store invalida fail closed;
- Admin sin Analytics comercial;
- una sola autoridad Store.

## 15. Evolucion

Si Apps Script/Spreadsheet deja de ser suficiente, se cambia el adapter fisico sin cambiar:
- `store_id`;
- `store_public_code`;
- `store_slug`;
- `TAKARA_STORE_CONTEXT_V1`;
- `TAKARA_STORE_ATTRIBUTION_V1`;
- semantica `ACTIVE/INACTIVE`;
- separacion `PRODUCT_QR != STORE_QR`.

## 16. Addendum Store Web V2 — superficie unica de pedido

Este addendum no reescribe el freeze historico STORE-F0 ni sustituye las autoridades V1.
Añade `store_slug` como identificador de URL V2 estable, resuelto siempre contra la misma autoridad Store.

Invariante de presentacion:

`DIRECT_ORDER_SURFACE == STORE_ORDER_SURFACE`

Reglas:
- `/pedido.html` es la unica superficie fisica y autoridad del formulario de pedido;
- Store reutiliza ese mismo documento desde `/tienda/<store_slug>` y conserva `/tienda/?s=<store_public_code>` únicamente como entrada legacy, sin mantener una copia del formulario;
- preview, catalogo/pricing, personalizacion, entrega, validacion y submit permanecen compartidos;
- Store solo aporta resolucion fail-closed, `display_name`, presentacion white-label y `TAKARA_STORE_CONTEXT_V1` verificado;
- el consentimiento opcional `autoriza_publicacion_resultado` pertenece a la superficie compartida y debe permanecer disponible tanto en DIRECT como en STORE;
- la capa white-label Store puede retirar branding, navegacion o acciones exclusivas DIRECT, pero nunca eliminar ni preseleccionar ese consentimiento;
- las menciones de identidad necesarias dentro de `autoriza_publicacion_resultado` son divulgacion legal, no branding visual; la auditoria white-label solo puede excluir el texto asociado a los dos controles canonicos de ese consentimiento (`name="autoriza_publicacion_resultado"` y `data-takara-accept-proxy="autoriza_publicacion_resultado"`), y cualquier otra aparicion de branding Takara sigue fallando cerrada;
- un formulario ejecutado como canal `STORE` no puede degradar silenciosamente a `DIRECT` si falta Store Context valido;
- no se permiten paginas, motores, pricing, preview, delivery ni submit alternativos por Store;
- la UI publica Store no muestra branding Takara ni navegacion DIRECT;
- el hash protegido del preview sigue siendo una invariante de gate.