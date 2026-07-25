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
- Exigir telefono y correo validos tambien en el servidor.
- Conservar el cuerpo tecnico TAKARA_PEDIDO_WEB_V1 que procesa MicroFactory.
- Responder siempre en JSON.

Contrato validado:

- TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_9_5_EXTERNAL_LOGO
- TAKARA_PEDIDO_WEB_V1
- doGet()
- doPost(e)
- CONTACTO_WEB
- MailApp.sendEmail
- DriveApp
- limite de foto 20 MB
- precio mostrado 35.00 EUR
- ContentService para respuesta JSON

Reglas:

- Este codigo no debe contener tokens, contrasenas ni claves privadas.
- No se versionan pedidos reales, fotos, adjuntos ni datos de clientes.
- El endpoint real de despliegue no se documenta aqui.
- Si se cambia el Apps Script real en Google, primero debe actualizarse este archivo y pasar el quality gate.

Hash exacto versionado:

- SHA256 B7FA96414E47B09D77EE9F792D6D81C7735772CBABA7CCA52342F89A23689103
