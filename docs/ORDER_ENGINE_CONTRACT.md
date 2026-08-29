# TAKARA ORDER ENGINE CONTRACT

Estado: CORE V1-R0I
Proyecto: Takara3D Web
Objetivo: definir el contrato funcional del pedido web antes de tocar UI o logica nueva.

---

## 1. Principio maestro

El pedido web debe convertir una intencion de compra en un correo estructurado, claro y accionable.

WhatsApp queda para dudas, trato humano, seguimiento y casos especiales. El pedido formal debe entrar por Gmail.

No se acepta una solucion improvisada tipo mailto como sistema profesional final.

---

## 2. Alcance del motor de pedido

El motor de pedido debe gestionar:

- producto seleccionado;
- formato;
- orientacion;
- imagen del cliente;
- texto personalizado si aplica;
- cantidad;
- modalidad de entrega y código postal;
- datos de contacto;
- observaciones;
- consentimiento basico;
- resumen final;
- envio estructurado por Gmail.

El motor no debe fabricar datos que el cliente no haya dado.

---

## 3. Datos minimos obligatorios

Un pedido no debe considerarse completo sin:

- nombre del cliente;
- email o telefono de contacto;
- producto;
- formato;
- imagen aportada o instruccion clara sobre como aportarla;
- aceptacion de que la imagen sera revisada antes de fabricar;
- confirmacion de que Takara puede contactar para validar el pedido.

Si falta un dato critico, el sistema debe bloquear el envio o marcar el pedido como incompleto.

### 3.1 Frontera de confianza de la fotografia

El pedido publico actual exige la fotografia original dentro del mismo envio.
El servidor no puede aceptar su ausencia basandose en campos controlados por el
remitente, incluidos modos de prueba, modos de transporte o banderas que solo
declaren que la foto estaba presente.

Antes de crear una carpeta en Drive, el servidor debe:

- confirmar que existe contenido base64;
- decodificarlo sin errores;
- calcular su tamano real y compararlo con el declarado cuando exista;
- limitarlo a 20 MB;
- reconocer por firma binaria JPG, PNG o WEBP;
- asignar nombre, extension y tipo MIME desde datos controlados por el servidor.

La validacion del navegador mejora la experiencia, pero nunca sustituye esta
validacion del servidor.

---

## 4. Datos recomendados

Datos utiles pero no siempre obligatorios:

- telefono;
- preferencia de contacto;
- fecha deseada;
- si es para entrega local o envio;
- direccion solo cuando sea necesaria;
- frase personalizada;
- notas sobre recorte o personas importantes en la foto;
- color o acabado si el producto lo permite.

La direccion completa no debe pedirse antes de ser necesaria.

---

## 5. Validaciones

Validaciones minimas:

- email con formato razonable si se aporta email;
- telefono con longitud razonable si se aporta telefono;
- producto existente en catalogo;
- formato compatible con producto;
- cantidad mayor o igual a uno;
- modalidad de entrega válida;
- código postal español de cinco cifras;
- coherencia entre código postal, zona, tarifa y cantidad;
- texto personalizado dentro de limite;
- imagen presente o pendiente declarada;
- consentimiento basico marcado.

La validacion debe ser clara para el cliente, sin mensajes tecnicos.

---

## 6. Resumen del pedido

Antes de enviar, el cliente debe ver un resumen con:

- producto;
- formato;
- precio base si aplica;
- extras si aplica;
- entrega y coste, o indicación clara de confirmación pendiente;
- total estimado cuando pueda cerrarse;
- imagen o estado de imagen pendiente;
- datos de contacto;
- aviso de revision humana antes de fabricar.

El resumen debe coincidir con lo que se envia por Gmail.

---

## 7. Correo estructurado

El correo de pedido debe tener asunto claro y cuerpo estructurado.

Asunto recomendado:

Pedido Takara3D - producto - nombre cliente

Bloques minimos del cuerpo:

- identificacion del pedido web;
- datos del cliente;
- producto y formato;
- personalizacion;
- imagen;
- precio del producto, entrega y total, o estado pendiente de confirmar;
- observaciones;
- consentimiento;
- fecha y origen web.

El correo debe permitir trabajar el pedido sin tener que reconstruir informacion desde mensajes sueltos.

### 7.1 Personalización del marco

Cuando el cliente seleccione texto, el payload debe incluir el objeto
`producto.personalizacion_marco` y conservarlo también dentro de
`snapshot_pedido.producto.personalizacion_marco`.

El correo interno y la confirmación al cliente deben mostrar:

- número de lados;
- color de las letras;
- texto asociado a cada lado;
- marco con litofanía a 35,00 EUR;
- suplemento de personalización, cuando exista;
- total por unidad;
- total del pedido.

La misma información debe existir en texto plano y HTML. Si cualquiera de esos
datos es incoherente con el catálogo o con el formato del marco, el servidor
debe rechazar la solicitud antes de enviar correos.

El suplemento no debe repetirse en la sección de textos ni presentarse de una
forma que pueda interpretarse como un importe todavía pendiente de sumar.

### 7.2 Ficha visual del pedido

El navegador puede generar una ficha visual a partir del canvas V16B-2 y de la
capa SVG de textos ya renderizados. La ficha debe mostrar únicamente el marco,
la fotografía y los textos visibles en el momento del envío.

La ficha visual es evidencia complementaria y nunca sustituye a:

- la fotografía original;
- `producto.personalizacion_marco`;
- el precio calculado desde catálogo;
- los campos escritos de los correos en texto plano y HTML.

Requisitos obligatorios:

- versión `TAKARA_ORDER_VISUAL_PROOF_V1`;
- JPEG con un máximo de 960 px en su lado mayor;
- tamaño máximo de 900 KiB;
- límite del Base64 aplicado antes de decodificar;
- tipo JPEG reconocido por firma binaria, con marcadores de inicio y fin;
- coincidencia entre tamaño binario real y tamaño declarado;
- inclusión mediante `inlineImages` en los correos HTML interno y del cliente;
- adjunto JPG explícito solo en el correo interno de Takara;
- ausencia de `attachments` explícitos en la confirmación del cliente;
- ausencia de almacenamiento adicional en Drive;
- ausencia de datos personales dentro de la imagen.

Si el navegador no puede generarla o el servidor la descarta por integridad,
el pedido debe continuar con sus datos estructurados. Un fallo de la ficha
visual nunca puede bloquear ni degradar la información principal del pedido.
La ficha descartada no puede crear blobs, adjuntos ni imágenes inline.

### 7.3 Entrega y cálculo inicial

La solicitud web incorpora el contrato
`TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC`. Su finalidad es mostrar una
estimación transparente sin pedir todavía la dirección completa ni obligar al
cliente a escoger una modalidad de transporte.

El cliente introduce el código postal. La web determina automáticamente la
opción de entrega más económica conforme a la política de Takara 3D y, tras
completar las cinco cifras, carga de forma diferida el mapa compacto
`TAKARA_POSTAL_NATIONAL_V1_2026_08_03`. Cuando el código tiene un solo municipio,
lo completa automáticamente; cuando tiene varios, ofrece un selector nacional;
y cuando requiere revisión interprovincial o no existe en el mapa, mantiene una
entrada manual opcional. Las 13 reglas comerciales de Madrid Sur conservan
prioridad y usan su selector específico cuando la localidad o el distrito cambia
la tarifa.

Campos contractuales del payload:

- `entrega.version`;
- `entrega.modalidad_solicitada`, calculada y no elegida por el cliente;
- `entrega.modalidad_resuelta`;
- `entrega.codigo_postal`;
- `entrega.zona_codigo`;
- `entrega.zona_nombre`;
- `entrega.area_codigo`;
- `entrega.fuente_decision`;
- `entrega.ubicacion_requerida`;
- `entrega.ubicacion_codigo`;
- `entrega.ubicacion_nombre`;
- `entrega.localidad_informativa`;
- `entrega.municipio_codigo`, código INE informativo;
- `entrega.municipio_nombre`;
- `entrega.provincia_nombre`;
- `entrega.municipio_fuente`;
- `entrega.precio_eur`;
- `entrega.moneda`;
- `entrega.estado_precio`;
- `entrega.direccion_completa_solicitada`, siempre `false` en esta fase;
- `entrega.texto_cliente`;
- `totales.subtotal_productos_eur`;
- `totales.precio_entrega_eur`;
- `totales.total_estimado_eur`;
- `totales.moneda`;
- `totales.estado_total`.

Política inicial:

- códigos exclusivos de Leganés: entrega local gratuita;
- códigos seguros de Alcorcón, Móstoles, Fuenlabrada, Getafe, Carabanchel y
  Villaverde: entrega local por 3,00 EUR;
- códigos compartidos con la misma tarifa, como `28021`, se resuelven
  automáticamente;
- códigos compartidos con tarifas diferentes, como `28914`, `28917`, `28925`,
  `28044` o `28054`, requieren seleccionar una localidad o distrito de la
  lista oficial;
- el mapa nacional contiene 10.851 códigos postales y 8.085 municipios: 7.282 resoluciones automáticas, 3.422 selectores y 147 casos de revisión manual;
- el municipio nacional se usa únicamente para autocompletar o ayudar a ubicar el pedido y nunca decide la tarifa;
- en los casos manuales o sin cobertura el cliente puede indicar opcionalmente una localidad; el servidor la limita a 80 caracteres;
- resto de España peninsular: envío estándar con seguimiento por 6,50 EUR
  para una unidad;
- Baleares, Canarias, Ceuta y Melilla: precio pendiente de confirmación;
- dos o más unidades con envío: precio pendiente de confirmación según el
  embalaje final.

La tabla postal se basa en el snapshot oficial
`TAKARA_F3_ZONAS_POSTALES_OFICIALES_2026_08_03`, elaborado con CartoCiudad
(IGN/CNIG) y el callejero del Ayuntamiento de Madrid. La clasificación
automática conserva 7 códigos exclusivos de Leganés, 29 códigos seguros de
zona cercana y 13 códigos compartidos que requieren una selección oficial.

El mapa nacional procede de la auditoría de 52 provincias de CartoCiudad, con
15.619.049 direcciones procesadas. El artefacto de producción elimina calles,
portales, coordenadas y contadores de evidencia; conserva únicamente la relación
compacta código postal–municipio–provincia. Pesa menos de 700 KB y se solicita
solo cuando el código postal tiene cinco cifras. Su atribución es CartoCiudad
(IGN/CNIG). Si la carga falla, el pedido vuelve de forma segura a localidad
manual opcional y la tarifa sigue calculándose con las reglas locales.

La entrega local se acuerda previamente con el cliente. No promete reparto
inmediato ni una fecha cerrada desde la web.

El navegador puede calcular y mostrar la estimación, pero el servidor es la
fuente de verdad para modalidad, zona, localidad o distrito comercial, precio y
total. Debe recalcularlos a partir del código postal, la ubicación comercial
oficial cuando proceda y la cantidad. El municipio nacional se normaliza y se
conserva en el pedido, pero no participa en el cálculo económico. Cualquier modalidad, zona, ubicación, tarifa o total manipulado
debe rechazarse.

Durante la transición, el backend puede aceptar temporalmente el frontend
anterior sin objeto `entrega`, pero debe registrarlo como pendiente de
confirmación y nunca inventar un coste.

La dirección completa se solicitará únicamente después de revisar la
fotografía y confirmar el pedido con el cliente. La solicitud inicial no debe
incluir campos de calle, número, piso o puerta.

Los correos interno y del cliente deben mostrar la modalidad calculada, el
código postal, la zona, la localidad o distrito cuando haya sido necesaria,
el estado del precio, el coste de entrega confirmado y el total estimado
cuando pueda calcularse.

### 7.4 Contrato de transporte V2

La frontera activa del candidato local es:

- payload: `TAKARA_WEB_ORDER_PAYLOAD_V2`;
- snapshot: `TAKARA_ORDER_SNAPSHOT_V2`;
- correo técnico: `TAKARA_PEDIDO_WEB_V2`;
- entrega: `TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC`;
- Apps Script: `TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2`.

Un payload que declare V2 pero esté incompleto o contradiga snapshot, catálogo,
precio o entrega debe rechazarse. No se degrada silenciosamente a V1. Los
controles canónicos son `consiente_gestion_datos`,
`declara_derechos_y_autoriza_revision_imagen` y
`autoriza_publicacion_resultado`. Los nombres de checkboxes históricos de la UI
pueden mantenerse internamente como puente visual, pero no forman parte del
payload V2 ni del correo técnico.

El transporte admite códigos de producto y variantes estables sin fijar la capa
de recepción a una única familia. La aceptación para producción sigue
requiriendo un mapeo explícito de catálogo/normalización.

---

## 8. Estados del pedido

Estados previstos:

- borrador local;
- pendiente de imagen;
- listo para enviar;
- enviado por web;
- pendiente de revision humana;
- aceptado para fabricacion;
- requiere aclaracion.

La web publica solo necesita mostrar estados utiles para el cliente. Los estados internos pueden quedar para backend de produccion futuro o gestion posterior.

---

## 9. Contrato con catalogo

El pedido no debe inventar productos ni precios fuera de catalogo.

El catalogo debe actuar como fuente de verdad para:

- productos disponibles;
- formatos;
- precios base;
- extras;
- productos proximamente;
- restricciones.

Si un producto esta marcado como proximamente, no debe entrar como pedido normal.

---

## 10. Contrato con preview

El pedido puede usar preview para ayudar a decidir, pero el preview no sustituye la revision humana.

El pedido no debe romper el motor V16B-2 ni acoplarse de forma fragil a su implementacion interna.

La ficha visual solo puede leer el canvas y la capa SVG una vez renderizados.
No puede modificar el estado, la geometría ni las funciones internas del motor.

Cualquier motor futuro debe mantener un contrato estable de entrada y salida.

---

## 11. Limites

El pedido web no debe:

- prometer fabricacion automatica sin revision;
- aceptar imagenes sin opcion de revision;
- enviar pedidos incompletos como si fueran completos;
- depender de WhatsApp como canal principal de pedido;
- duplicar logica de catalogo en HTML;
- ocultar al cliente que puede requerirse confirmacion humana.

---

## 12. Criterio de aceptacion

El contrato estara cumplido cuando un cliente pueda preparar un pedido claro, revisable y enviable por Gmail, sin depender de conversaciones dispersas por WhatsApp.

Tambien estara cumplido cuando Takara pueda recibir el pedido con datos suficientes para revisar imagen, confirmar precio, resolver dudas y fabricar sin perder informacion.

## Consentimiento opcional de publicación del resultado

- Campo: `control.autoriza_publicacion_resultado`.
- Es opcional, se muestra desmarcado y no bloquea el envío.
- El servidor lo normaliza como `false` cuando está ausente o no reconocido.
- El correo interno y la confirmación al cliente registran el estado.
- Aunque exista autorización, no se utilizarán trabajos con imágenes de menores.


### Compatibilidad de transición V1/V2

Mientras la web pública continúe emitiendo V1, Apps Script puede aceptar
`TAKARA_WEB_ORDER_PAYLOAD_V1` por una ruta compat aislada que conserva el correo
`TAKARA_PEDIDO_WEB_V1`. La ruta primaria sigue siendo V2. Cualquier payload que
declare V2 y sea inválido o incompleto debe rechazarse sin downgrade. El puente
existe solo para permitir un despliegue backend-first sin interrumpir pedidos y
se retirará después de validar el flujo V2 real.

## StoreContext transport bridge (F3A)

F3A añade un transporte aditivo y explícito entre el StoreContext público ya
resuelto y el pedido V2.

Contrato de transporte:
- API puente: `TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1`.
- Contexto de entrada: `TAKARA_STORE_CONTEXT_V1`.
- Payload STORE: `meta.store_context = { version, store_ref }`.
- Payload DIRECT: `meta.store_context` ausente.
- `display_name` y `status` se usan para validar el contexto recibido, pero no se
  transportan dentro del pedido.
- `store_id` nunca se acepta ni se transporta desde navegador.
- el frontend no deriva `source_type`, `store_id` ni
  `TAKARA_STORE_ATTRIBUTION_V1`.
- la autoridad para resolver `store_ref`, verificar estado y congelar la
  atribución pertenece al backend de pedido en F3B/F3C.
- `snapshot_pedido.meta` hereda de forma aditiva el mismo `payload.meta`; no se
  crea un segundo contrato paralelo.

## Backend authoritative Store resolution (F3B)

F3B introduce una frontera backend explícita y Store-owned:

`payload.meta.store_context.store_ref`
→ `StoreOrderResolution`
→ `Store Runtime`
→ `Store Service`
→ `Store Registry`
→ `TAKARA_STORE_ORDER_IDENTITY_V1`.

Reglas:

- DIRECT, sin `meta.store_context`, no consulta Store Registry.
- STORE acepta exclusivamente `{version, store_ref}` desde navegador.
- `store_id`, `display_name`, `status` y `source_type` enviados por navegador se rechazan.
- Store Service es la única autoridad que materializa `store_id`, nombre actual y estado.
- Store inexistente o `INACTIVE` falla cerrado.
- la identidad interna queda congelada y conserva el `store_ref` solicitado.
- F3B no crea `source_type`, `store_name_snapshot` ni `TAKARA_STORE_ATTRIBUTION_V1`.
- F3C será el owner de convertir la identidad validada en atribución de pedido.

# Order Attribution Contract F3C

F3C materializa la atribución exclusivamente en backend y después de F3B.

## DIRECT

Cuando `payload.meta.store_context` está ausente:

```json
{
  "version": "TAKARA_STORE_ATTRIBUTION_V1",
  "source_type": "DIRECT"
}
```

DIRECT no contiene `store_id` ni `store_name_snapshot`.

## STORE

Cuando F3B resuelve una identidad Store autoritativa y `ACTIVE`:

```json
{
  "version": "TAKARA_STORE_ATTRIBUTION_V1",
  "source_type": "STORE",
  "store_id": "STO_000001",
  "store_name_snapshot": "Foto García"
}
```

Reglas:
- Order consume `TAKARA_STORE_ORDER_IDENTITY_V1`; no lee Store Registry ni Sheets.
- `store_id` y nombre proceden de Store Service, nunca del navegador.
- el nombre se congela como snapshot de pedido.
- no existe fallback silencioso de STORE inválido a DIRECT.
- navegador no puede aportar `source_type`, `store_id`, `store_name_snapshot`
  ni una atribución ya construida.
- el resultado se congela y es la única fuente para persistir atribución.
- F3C define el contrato; F3D lo conectará al procesamiento real `doPost`.

## Real doPost attribution wiring (F3D)

F3D conecta `TAKARA_STORE_ATTRIBUTION_V1` al procesamiento real de pedidos.

Flujo:

`parsePayload_ -> normalizarPedido_ -> buildAuthoritativeOrderAttribution_
-> pedido.attribution -> validarPedido_ -> dry-run / efectos laterales`.

Garantías:

- `pedido.attribution` se materializa exactamente una vez.
- la materialización ocurre antes de cualquier efecto lateral.
- `CONTACTO_WEB` permanece fuera del flujo de atribución de pedidos.
- DIRECT y STORE usan el mismo contrato autoritativo F3C.
- un STORE inválido falla antes de Drive, email o persistencia.
- `Code.gs` no deriva `source_type`, `store_id` ni nombre; consume el builder F3C.
- el cuerpo técnico interno V1/V2 persiste `[ATRIBUCION]`, versión, origen,
  `store_id` y `store_name_snapshot`.
- DIRECT persiste `source_type=DIRECT` con campos Store vacíos.
- el navegador no recibe `store_id`; la identidad interna permanece en el
  canal técnico backend.
- el snapshot procedente del navegador no se convierte en autoridad de
  atribución.
- los tests que invocan constructores downstream directamente deben aportar
  una atribución autoritativa explícita; producción nunca inventa DIRECT como
  fallback por ausencia de `pedido.attribution`.
- los harness que ejecutan `doPost` fuera de Apps Script deben cargar las
  dependencias backend Store/Order reales que producción carga como archivos
  del mismo proyecto; no se reemplazan por stubs de atribución.
- los harness históricos de entrega/personalización que saltan `doPost` y
  llaman cuerpos técnicos downstream deben materializar DIRECT mediante el
  builder F3C real antes de usar esos helpers.
- las mutaciones de harness no deben depender de bloques multilinea completos:
  usar anclas semánticas pequeñas, únicas y con conteo exacto para tolerar EOL,
  espacios y cambios de formato no semánticos.
- cuando muchos fixtures comparten la misma precondición downstream, preferir
  decorar una única frontera del harness (por ejemplo el normalizador real)
  antes que reescribir cada llamada individual.
- cuando `Code.gs` cambia legítimamente, el validador canónico de identidad
  debe evolucionar su SHA exacto en el mismo ticket y verificar además la
  semántica nueva; nunca se desactiva el hash ni se acepta cualquier versión.
- la autoridad SHA del validador debe localizarse estructuralmente como una
  única asignación `$ExpectedHash` de 64 hex y comprobar primero el SHA previo
  certificado; no depender de una línea literal completa para promoverla.
- el SHA previo que se promueve debe proceder de la autoridad observada en
  el repo/validador real del baseline, no de un snapshot asumido o histórico;
  si difiere, se aborta antes de escribir y se reconcilia.

## Downstream attribution handoff (F3E)

F3E certifica la frontera downstream existente sin introducir otro modelo de
pedido ni otra autoridad.

Frontera contractual:

`pedido.attribution`
→ `construirCuerpoInterno_`
→ cuerpo técnico
→ `enviarEmailInterno_`
→ `MailApp.sendEmail(options)`.

Garantías:

- `options.body` recibe byte-for-byte el cuerpo técnico ya construido.
- STORE conserva `TAKARA_STORE_ATTRIBUTION_V1`, `source_type=STORE`,
  `store_id` y `store_name_snapshot` hasta el correo técnico interno.
- DIRECT conserva `source_type=DIRECT` y no inventa identidad Store.
- `enviarEmailInterno_` no resuelve Store, no consulta Registry/Sheets y no
  recalcula atribución.
- la confirmación del cliente y la respuesta HTTP no exponen `store_id`,
  `store_name_snapshot` ni la atribución interna.
- el cuerpo técnico interno es la única representación downstream de
  atribución dentro de Takara Web; no se crea un payload paralelo.
- F3E no cambia runtime de producto: instala evidencia y regresiones
  permanentes sobre la frontera ya implementada por F3D.
- F5 verificará el despliegue/E2E más allá de esta frontera del repositorio.
- los validadores documentales verifican invariantes semánticos y no una
  conjugación o frase literal completa cuando la prosa no es la autoridad.
- los validadores que inspeccionan tests verifican la mecánica de la prueba
  (inputs, llamadas y aserciones) y no el texto humano de sus mensajes `ok`.
