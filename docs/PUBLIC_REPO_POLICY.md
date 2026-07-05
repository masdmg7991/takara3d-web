# Politica de repositorio publico

Este repositorio puede estar publicado en GitHub.

Reglas:

- No guardar credenciales, tokens, passwords, claves privadas ni secretos.
- No guardar datos reales de clientes ni pedidos reales.
- No guardar rutas locales personales.
- No guardar endpoints internos en documentacion; usar placeholders.
- El frontend publicado puede contener HTML, CSS, JS y endpoints necesarios para formularios publicos.
- La documentacion publica debe describir arquitectura y metodo sin exponer detalles internos sensibles.
- El backend real, credenciales, automatizaciones privadas y datos operativos deben vivir fuera del repo publico.

Placeholders permitidos:

- <REPO_LOCAL>
- <BACKUPS_LOCAL>
- <APPS_SCRIPT_ENDPOINT>
- backend de produccion futuro

Antes de publicar cambios:

- Ejecutar quality gate.
- Ejecutar auditoria de secretos.
- Revisar diff.
- No usar git add punto.
