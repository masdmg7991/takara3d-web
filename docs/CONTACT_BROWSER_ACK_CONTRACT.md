# Contrato de ACK causal de contacto

Estado: candidato local no desplegado.

## Objetivo

El formulario de contacto sólo puede mostrar éxito cuando Apps Script ha
confirmado causalmente que la consulta terminó su flujo de aceptación.

La ruta JavaScript no usa `fetch(..., no-cors)` como señal de éxito.

## Transporte

El protocolo es `TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1`.

El navegador crea:

- un `request_id` estable con formato `TK-CONTACT-REQ-...`;
- un nonce independiente para cada intento de transporte;
- un iframe invisible y un formulario POST dirigido al endpoint canónico.

Apps Script valida:

- modo de respuesta exacto;
- origin permitido: `https://takara3d.es` o `https://www.takara3d.es`;
- nonce con formato permitido;
- `request_id` estable.

La respuesta HTML usa `postMessage` dirigido únicamente al origin solicitado.
El navegador acepta el mensaje sólo si coinciden:

- `event.source === iframe.contentWindow`;
- origin de respuesta perteneciente a Google Apps Script;
- versión del protocolo;
- nonce;
- `request_id`;
- `id_contacto_web` válido;
- estado `recibido`.

Un timeout o una respuesta negativa nunca se interpreta como éxito.

## Idempotencia

La ruta browser ACK usa `TAKARA_CONTACT_IDEMPOTENCY_V1`.

El `request_id` se mantiene en el formulario mientras el resultado no quede
confirmado. Un retry reutiliza la misma referencia.

El backend calcula un fingerprint SHA-256 del contacto normalizado. El
fingerprint excluye únicamente el timestamp cliente y el propio `request_id`.
Cambiar contenido con el mismo `request_id` produce conflicto fail-closed.

Fases:

`RESERVED -> INTERNAL_EMAIL_IN_FLIGHT -> INTERNAL_EMAIL_SENT ->
CLIENT_EMAIL_IN_FLIGHT -> COMPLETED`.

Las fases `*_IN_FLIGHT` se persisten antes de llamar a MailApp. Si el proceso
muere en una fase ambigua, un retry no reenvía automáticamente el correo:
requiere revisión.

`COMPLETED` conserva el ACK. Si el navegador perdió el `postMessage`, un
retry devuelve ese ACK sin volver a consumir W8 ni enviar correos.

## Anti-abuso

W8 se conserva. Una consulta nueva y válida reserva presupuesto anti-abuso antes
de producir correos. Un retry ya completado devuelve su ACK antes de reservar
nuevo presupuesto.

## Compatibilidad

La ruta sin parámetros browser ACK conserva el comportamiento JSON anterior y
el `action` HTML sigue disponible como fallback sin JavaScript.

La idempotencia fuerte se exige únicamente para la ruta browser ACK moderna,
porque el fallback legacy no puede generar una referencia criptográficamente
estable en el navegador.

## Privacidad

El ACK público sólo expone:

- versión del protocolo;
- nonce;
- `request_id`;
- `id_contacto_web`;
- estado;
- resultado seguro.

No expone email interno, contenido del mensaje, datos de cliente ni metadata de
MailApp.

El ledger no guarda PII: conserva `request_id`, fingerprint, fase,
`id_contacto_web`, lease y ACK técnico.

Los registros `COMPLETED` se purgan tras 30 días. Los ambiguos se conservan
para revisión.

## Versiones

LIVE continúa en
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1`.

El candidato local W9 es
`TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_17_0_CONTACT_BROWSER_ACK_V1`.

Un commit o push no modifica la autoridad LIVE ni autoriza despliegue.
