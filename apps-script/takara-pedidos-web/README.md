# Takara Pedidos Web — Google Apps Script

## Estado

Este directorio queda preparado para versionar el backend ligero de pedidos y contacto.

Versión pública esperada:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

Endpoint actual:

```text
https://script.google.com/macros/s/AKfycbzdrgKXZ0NbRWgx4huEi80K5MIEu3ytX217yEf6H5mQXK03-KN5W1NlMPD7W614tZ03-Q/exec
```

## Regla crítica

`Code.gs` no debe inventarse ni reconstruirse desde memoria.

Debe copiarse literalmente desde el proyecto real publicado en Google Apps Script V1_8.

Hasta tener ese código real, este directorio solo documenta el contrato y queda pendiente de completar.

## Responsabilidades del Apps Script

- Recibir contacto web.
- Recibir pedido web completo con foto.
- Validar campos mínimos.
- Mantener precio backend actual de 35 euros.
- Mantener límite backend actual de 20 MB.
- Enviar email interno a Takara.
- Enviar confirmación al cliente.
- Devolver respuesta estructurada.

## Validación GET

La respuesta actual es JSON. La validación correcta debe comprobar el campo `script`:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

No comparar la respuesta completa contra texto plano.

## Pendiente

- Añadir `Code.gs` real.
- Documentar despliegue de nueva versión.
- Documentar permisos usados.
- Documentar pruebas manuales de contacto y pedido.

## Prohibido

- Cambiar endpoint desde la web sin backup.
- Asumir que guardar en Apps Script equivale a desplegar.
- Bajar el límite de 20 MB sin decisión explícita.
- Volver a precio 27,50 euros.
- Sustituir pedido completo por pedido ligero si el completo funciona.
