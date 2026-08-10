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
- Registrar por separado la autorización opcional para mostrar una fotografía
  del producto terminado en la web o redes sociales. Debe permanecer
  desmarcada por defecto y nunca se aplicará a trabajos con menores.
- Emitir el cuerpo técnico TAKARA_PEDIDO_WEB_V2 que procesa MicroFactory V2, con bloques [CLIENTE], [PRODUCTO], [IMPORTES], [ENTREGA], [ARCHIVOS], [MENSAJE CLIENTE], [CONTROL] y [TECNICO].
- Normalizar y validar la personalización del marco antes de aceptar el pedido.
- Incluir lados, textos, color y suplemento en los correos interno y cliente,
  tanto en texto plano como en HTML.
- Validar el tamaño real y la firma binaria completa de la ficha visual JPEG
  antes de crear el blob usado en los correos.
- Mostrar esa ficha dentro de los dos correos HTML sin sustituir los datos
  estructurados ni bloquear el pedido si la imagen auxiliar falla.
- Adjuntar una copia JPG descargable solo al correo interno de Takara.
- Mostrar al cliente el precio desglosado en producto, personalización,
  entrega y total estimado.
- Normalizar y recalcular en servidor el contrato `TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC`
  a partir del código postal, la localidad o distrito oficial cuando sea
  necesario y la cantidad, sin confiar en modalidades ni tarifas enviadas por
  el navegador.
- Conservar municipio, provincia, código INE y fuente del autocompletado
  nacional como información de ubicación, sin utilizarlos para decidir la tarifa.
- Mantener la dirección completa fuera de la solicitud inicial y dejar el
  precio pendiente para destinos especiales o pedidos de varias unidades.
- No guardar una copia adicional de la ficha visual en Drive.
- Responder siempre en JSON.

Contrato validado:

- TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2 (candidato local)
- TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_12_3_OPTIONAL_SHOWCASE_CONSENT (publicado)
- TAKARA_WEB_ORDER_PAYLOAD_V2
- TAKARA_ORDER_SNAPSHOT_V2
- TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC
- TAKARA_PEDIDO_WEB_V2
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
- desglose explícito del precio base, suplemento, entrega y total estimado
- cálculo automático por código postal, con selección comercial oficial cuando la tarifa cambia
- autocompletado nacional informativo `TAKARA_POSTAL_NATIONAL_V1_2026_08_03`
- municipio automático, selector nacional o localidad manual según cobertura
- entrega local gratuita en Leganés y 3.00 EUR en la zona cercana contractual
- envío peninsular con seguimiento 6.50 EUR para una unidad
- precio pendiente para destinos especiales y varias unidades
- ContentService para respuesta JSON

Reglas:

- Este codigo no debe contener tokens, contrasenas ni claves privadas.
- No se versionan pedidos reales, fotos, adjuntos ni datos de clientes.
- El endpoint real de despliegue no se documenta aqui.
- Si se cambia el Apps Script real en Google, primero debe actualizarse este archivo y pasar el quality gate.

El hash exacto debe recalcularse después de validar y antes de desplegar cada
nueva versión.


Transición de despliegue:
- dual-stack temporal V1/V2 en Apps Script;
- V2 es el contrato primario;
- V1 solo mantiene operativo el formulario público durante el despliegue;
- V2 incompleto no puede caer a V1;
- la misma URL de Web App se conserva.
