# 05 — Contrato del motor de pedidos Takara

## Principio

El motor de pedido debe ser simple para el cliente y estricto por dentro.

El cliente no debe ver complejidad. Takara y MicroFactory sí deben recibir datos claros, completos y trazables.

## Flujo oficial actual

```text
Pedido completo con foto
```

No usar pedido ligero salvo plan B técnico.

## Entrada oficial

Gmail es la entrada oficial de pedidos.

WhatsApp queda para:

- dudas,
- trato humano,
- seguimiento,
- aclaraciones,
- ventas directas conversacionales.

## Campos mínimos de pedido

```text
pedido_web_id
payload_version
fecha_cliente
origen
producto
formato
orientacion
color_marco
cantidad
precio_unitario
precio_total
cliente.nombre
cliente.email
cliente.telefono
cliente.mensaje
archivos.nombre
archivos.content_type
archivos.size_bytes
archivos.foto_base64
consentimientos.acepta_contacto
consentimientos.acepta_politica
snapshot_pedido
```

## ID

Formato actual:

```text
TK-WEB-...
```

El ID debe acompañar todo el ciclo:

```text
web → Apps Script → Gmail → MicroFactory → producción
```

## Payload versionado

El payload debe llevar versión de contrato.

Ejemplo:

```text
TAKARA_WEB_ORDER_PAYLOAD_V1
```

Cualquier cambio incompatible debe crear nueva versión.

## Precio

Precio actual base:

```text
35 €
```

Regla:

- La UI no calcula precios a mano.
- El precio vive en dominio/core.
- Apps Script valida o muestra el precio esperado.
- MicroFactory debe recibir snapshot de precio.

## Foto

Flujo oficial:

```text
foto completa enviada con el pedido
```

Límite actual:

```text
20 MB
```

Motivo:

- El pedido debe llegar completo.
- La foto debe poder custodiarse.
- No depender de pedir la foto después.

## Snapshot

El snapshot sirve para congelar el pedido tal como lo vio el cliente.

Debe incluir:

- producto.
- formato.
- color.
- precio.
- cantidad.
- estado de opciones.
- versión de catálogo/precio.

Regla:

No duplicar innecesariamente la foto base64 dentro de snapshots anidados.

## Validación frontend

Debe validar:

- nombre.
- email o teléfono.
- foto.
- tamaño foto.
- tipo archivo.
- aceptación legal.
- formato/producto.
- precio total coherente.

## Validación backend Apps Script

Debe validar:

- pedido parseable.
- tipo solicitud.
- campos mínimos.
- foto si no es modo prueba.
- tamaño <= 20 MB.
- consentimiento.
- email/teléfono.

## Confirmación cliente

Debe ser humana, clara y premium.

Debe incluir:

- Gracias.
- ID de pedido.
- Qué ocurre ahora.
- Canal de contacto.
- No saturar con datos técnicos.

## Correo interno Takara

Debe ser estructurado y útil.

Debe incluir:

- ID.
- Cliente.
- Contacto.
- Producto.
- Formato.
- Color.
- Precio.
- Foto/archivo.
- Mensaje cliente.
- Snapshot técnico.
- Indicadores para MicroFactory.

## Idempotencia pendiente

Debe implantarse:

```text
Si llega dos veces el mismo pedido_web_id, no duplicar.
```

Opciones:

- Apps Script PropertiesService.
- Registro en hoja interna.
- MicroFactory deduplica al importar.
- ID único en BD futura.

## Estados futuros

```text
recibido
email_enviado
foto_guardada_drive
pendiente_custodia_microfactory
custodiado
pendiente_revision
validado
produccion_pendiente
produccion_iniciada
finalizado
entregado
cancelado
```
