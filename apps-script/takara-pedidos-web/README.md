# Takara 3D - Apps Script pedidos/contacto

Este directorio versiona el Apps Script real que atiende los formularios publicos de Takara 3D.

Archivo principal:

- Code.gs

Responsabilidad:

- Recibir solicitudes desde la web publica.
- Diferenciar contacto web y pedido web.
- Enviar correo interno a 3d.takara@gmail.com.
- Enviar confirmacion al cliente cuando procede.
- Guardar foto original en Drive cuando se recibe en base64.
- Responder siempre en JSON.

Contrato validado:

- TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8
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

- SHA256 02BF9D9CF7FC9CFEF3D9ACE8DE898F52B7E17D0E22A418CD1CF011EB398378EA
