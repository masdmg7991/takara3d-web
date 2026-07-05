# 07 — Apps Script, Gmail y MicroFactory

## Papel de Apps Script

Apps Script es el backend ligero de entrada.

Responsabilidades:

- Recibir `doPost`.
- Distinguir contacto/pedido.
- Normalizar datos.
- Validar mínimos.
- Guardar foto si llega completa.
- Enviar email interno a Takara.
- Enviar confirmación al cliente.
- Responder con estado.

No debe convertirse en el ERP ni en MicroFactory.

## Estado Apps Script

Versión pública actual:

```text
TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
```

Cambios clave V1_8:

- Precio 35 €.
- Límite 20 MB.
- Pedido completo funcionando.
- Contacto funcionando.
- Endpoint verificado por GET.

## Pendiente

Guardar V1_8 en Git:

```text
apps-script/takara-pedidos-web/Code.gs
apps-script/takara-pedidos-web/README.md
```

## Papel de Gmail

Gmail es la bandeja oficial de pedidos.

Ventajas:

- Simple.
- Control humano.
- Trazabilidad inicial.
- Fácil de revisar.
- Permite a MicroFactory importar cuando esté listo.

## Papel de WhatsApp

WhatsApp no debe ser entrada oficial de pedidos web.

Debe usarse para:

- dudas,
- contacto humano,
- seguimiento,
- aclaraciones,
- trato comercial.

## MicroFactory futuro

MicroFactory será el backend de producción.

Flujo deseado:

```text
Gmail pedido estructurado
→ MicroFactory lector
→ parseo/normalización
→ crear expediente TK
→ custodiar original
→ registrar BD
→ generar eventos
→ revisión humana
→ preparación producción
```

## Datos que MicroFactory debe capturar

- ID TK-WEB.
- Fecha recepción.
- Cliente.
- Teléfono/email.
- Producto.
- Formato.
- Color.
- Precio.
- Mensaje.
- Foto original.
- Hash foto.
- Estado pedido.
- Eventos.
- Origen `web`.

## Estados sugeridos MicroFactory

```text
entrada_creada
pedido_maestro_registrado
original_custodiado
pendiente_revision
validado
pendiente_produccion
en_produccion
finalizado
entregado
cancelado
```

## Regla de integración

No automatizar producción completa antes de tener pedidos controlados.

Prioridad:

```text
1. Recibir bien.
2. No perder datos.
3. Custodiar original.
4. Registrar trazabilidad.
5. Revisión humana.
6. Producción asistida.
```
