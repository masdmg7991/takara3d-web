# Politica de repositorio publico

Este repositorio puede estar publicado en GitHub.

Regla principal:

- Este repo solo debe contener la web publica y documentacion tecnica necesaria para crearla, mantenerla, validarla y desplegarla.

Permitido en este repo:

- HTML, CSS, JavaScript, imagenes y assets publicos de la web.
- Datos publicos necesarios para la web, como catalogo, textos comerciales, precios publicos y configuracion frontend.
- Documentacion tecnica de arquitectura web, diseno, validacion, despliegue y politicas de calidad.
- Endpoints publicos necesarios en HTML para formularios, siempre que no contengan secretos.
- Datos publicos de contacto de Takara, como email comercial o telefono comercial, cuando se decida publicarlos.

No permitido en este repo:

- Credenciales, tokens, passwords, claves privadas ni secretos.
- Datos reales de clientes, pedidos reales, fotografias privadas o adjuntos de clientes.
- Rutas locales personales.
- Prompts internos de continuidad o documentos completos de trabajo privado.
- Estrategia operativa privada, backend interno, automatizaciones privadas o detalles de produccion no necesarios para la web publica.
- Codigo backend con secretos o configuracion privada.

Placeholders permitidos:

- <REPO_LOCAL>
- <BACKUPS_LOCAL>
- <APPS_SCRIPT_ENDPOINT>
- backend de produccion futuro

Documentacion privada:

- La documentacion completa de continuidad debe vivir fuera del repo publico.
- Si hace falta consultarla, se conserva en copias privadas/locales.
- Solo se trasladan al repo publico las decisiones tecnicas necesarias para la web.

Antes de publicar cambios:

- Ejecutar quality gate.
- Ejecutar auditoria de secretos cuando toque.
- Revisar diff.
- No usar git add punto.
