# Contrato de protección anti-abuso público

Estado: candidato local no desplegado.

## Objetivo

Las rutas públicas que pueden producir efectos externos no pueden consumir
Drive o cuota de correo de forma ilimitada.

La protección cubre:

- pedidos reales antes de crear carpeta o archivo en Drive;
- contacto web antes de generar la referencia y antes de cualquier correo.

No cubre operaciones sin efectos:

- dry-run del pedido;
- retry de un pedido W7 ya `COMPLETED`, que devuelve el ACK persistido.

## Autoridad

La versión LIVE continúa siendo:

`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1`.

El candidato local W8 es:

`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_17_0_CONTACT_BROWSER_ACK_V1`.

Un commit o push no cambia la versión LIVE.

## Estado persistente

La política usa un único estado compacto de Script Properties:

`TAKARA_PUBLIC_ABUSE_GUARD_V1:STATE`.

El estado:

- se protege con `LockService.getScriptLock()`;
- nunca guarda el email en claro;
- identifica al actor mediante SHA-256 del email normalizado y conserva sólo
  24 caracteres hexadecimales del hash;
- admite como máximo 80 actores activos;
- rechaza estados corruptos, incoherentes o con tiempos futuros;
- rechaza serializaciones por encima de 8.500 caracteres, por debajo del límite
  de 9 KB por valor de Apps Script.

No se usa `CacheService` como frontera de seguridad.

## Presupuesto de correo

Cada pedido real o contacto aceptado reserva dos unidades de destinatario:

1. correo interno de Takara;
2. confirmación al cliente.

Antes de reservar:

- se consulta `MailApp.getRemainingDailyQuota()`;
- se conservan siempre 20 destinatarios como reserva operativa;
- la ventana diaria pública toma como presupuesto el menor valor entre:
  - cuota observada menos la reserva;
  - 200 destinatarios públicos;
- la ventana dura 24 horas;
- una reserva aceptada se considera consumida aunque el efecto posterior falle,
  porque la política es conservadora.

Si la cuota no puede consultarse o devuelve un valor inválido, la ruta falla
cerrado.

## Límites de ráfaga

Además del presupuesto diario:

- global: máximo 20 solicitudes con efectos en 5 minutos;
- CONTACT: máximo 3 solicitudes por actor en 15 minutos;
- ORDER: máximo 5 solicitudes por actor en 30 minutos.

Cambiar el email no evita el límite global ni el presupuesto diario.

## Contacto web

El backend valida antes de reservar presupuesto:

- honeypot `website` vacío;
- nombre obligatorio, máximo 100 caracteres;
- email obligatorio y válido, máximo 254 caracteres;
- asunto obligatorio, máximo 160 caracteres;
- mensaje obligatorio, máximo 5.000 caracteres;
- teléfono y WhatsApp opcionales, máximo 32 caracteres;
- origen y fecha cliente, máximo 64 caracteres;
- origen efectivo exactamente `contacto.html`.

El formulario HTML replica los máximos y mantiene un honeypot fuera de pantalla.
Estas ayudas de cliente no sustituyen al servidor.

## Pedido

W8 se ejecuta después de:

- parsing;
- atribución autoritativa;
- validación del pedido;
- salida de dry-run;
- reserva idempotente W7;
- detección de retry `COMPLETED`.

Y antes de:

- `asegurarCarpetaPedido_`;
- `guardarFoto_`;
- correo interno;
- correo del cliente.

Por tanto un pedido repetido ya completado no consume W8 otra vez y un pedido
nuevo bloqueado por W8 no toca Drive ni Mail.

## Privacidad

La política no usa dirección IP, fingerprint de dispositivo ni datos
persistentes del navegador.

El único identificador por actor es un hash truncado del email ya necesario para
la operación. El estado no conserva nombre, mensaje, foto, Store ni payload.

## Alcance y limitaciones

Esta capa protege los recursos internos de Apps Script. No sustituye un WAF,
CAPTCHA o protección de borde si el volumen futuro exige una frontera adicional.

Un atacante puede variar emails, pero sigue sujeto al límite global, al
presupuesto diario y a la cuota real restante de MailApp.

## Pruebas

La certificación W8 debe cubrir sin Drive/Mail reales:

- presupuesto y reserva de cuota;
- rate limit por actor;
- ráfaga global;
- reset de ventanas;
- estado corrupto fail-closed;
- ausencia de PII en estado;
- tamaño máximo representativo del estado;
- honeypot y límites de contacto;
- cero correos ante contacto rechazado;
- W7 `COMPLETED` sin nueva reserva W8;
- W8 antes de Drive en pedido;
- Quality Gate completo.

## Regla de despliegue

W8 permanece local hasta autorización explícita. Push y deploy son operaciones
separadas y ninguna está autorizada por este contrato.
