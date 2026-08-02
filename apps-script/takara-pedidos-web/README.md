# Takara 3D - Apps Script pedidos/contacto

Este directorio versiona el Apps Script real que atiende los formularios publicos de Takara 3D.

Archivo principal:

- Code.gs

Responsabilidad:

- Recibir solicitudes desde la web publica.
- Diferenciar contacto web y pedido web.
- Enviar correo interno a 3d.takara@gmail.com con presentacion HTML operativa.
- Enviar confirmacion premium al cliente en HTML y texto plano.
- Guardar foto original en Drive cuando se recibe en base64.
- Exigir siempre la foto original en el pedido publico, sin aceptar modos de
  prueba ni banderas declarativas como bypass.
- Validar el tamano real y la firma JPG, PNG o WEBP antes de crear la carpeta
  del pedido en Drive.
- Exigir telefono y correo validos tambien en el servidor.
- Normalizar la privacidad en modo fail-closed: solo una aceptación
  afirmativa reconocida se registra como sí; vacío, ausente o desconocido
  se registra como no.
- Conservar el cuerpo tecnico TAKARA_PEDIDO_WEB_V1 que procesa MicroFactory.
- Normalizar y validar la personalización del marco antes de aceptar el pedido.
- Incluir lados, textos, color y suplemento en los correos interno y cliente,
  tanto en texto plano como en HTML.
- Validar el tamaño real y la firma binaria completa de la ficha visual JPEG
  antes de crear el blob usado en los correos.
- Mostrar esa ficha dentro de los dos correos HTML sin sustituir los datos
  estructurados ni bloquear el pedido si la imagen auxiliar falla.
- Adjuntar una copia JPG descargable solo al correo interno de Takara.
- Mostrar al cliente el precio desglosado en producto, personalización,
  total unitario y total del pedido.
- No guardar una copia adicional de la ficha visual en Drive.
- Responder siempre en JSON.

Contrato validado:

- TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_12_2_PRIVACY_FAIL_CLOSED
- TAKARA_PEDIDO_WEB_V1
- TAKARA_ORDER_VISUAL_PROOF_V1
- doGet()
- doPost(e)
- CONTACTO_WEB
- MailApp.sendEmail
- DriveApp
- limite de foto 20 MB
- limite de ficha visual 900 KiB
- descarte no bloqueante de fichas con MIME, firma o tamaño incoherentes
- precio mostrado 35.00 EUR
- suplementos de texto 4.00/6.00/8.00 EUR según el número de lados
- desglose explícito del precio base, suplemento, total unitario y total
- ContentService para respuesta JSON

Reglas:

- Este codigo no debe contener tokens, contrasenas ni claves privadas.
- No se versionan pedidos reales, fotos, adjuntos ni datos de clientes.
- El endpoint real de despliegue no se documenta aqui.
- Si se cambia el Apps Script real en Google, primero debe actualizarse este archivo y pasar el quality gate.

El hash exacto debe recalcularse después de validar y antes de desplegar cada
nueva versión.
