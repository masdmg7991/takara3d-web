# Documentación Takara 3D Web

Este directorio contiene la documentación técnica estable del proyecto.

La documentación debe servir como **contrato y mapa de autoridad**, no como
volcado de conversaciones, estado temporal ni archivo de rescate.

## Mapa de autoridad documental

| Área | Documento autoritativo | Responsabilidad |
|---|---|---|
| Arquitectura global | `ARCHITECTURE.md` | Capas, límites y evolución técnica |
| Sistema visual | `DESIGN_SYSTEM.md` | Tokens, componentes y reglas visuales |
| Pedido web | `ORDER_ENGINE_CONTRACT.md` | Payload, validación, precio, entrega y correo |
| ACK de contacto | `CONTACT_BROWSER_ACK_CONTRACT.md` | Confirmación causal, request_id e idempotencia de contacto |
| Preview | `PREVIEW_ENGINE_CONTRACT.md` | Motor y contrato del preview |
| Store | `STORE_SYSTEM_CONTRACT.md` | Registry, QR, contexto y atribución |
| Store Admin | `STORE_ADMIN_CONTRACT.md` | Acceso, lectura, escritura y lifecycle |
| QR de producto | `QR_PAGE_CONTRACT.md` | Contrato de la página QR de producto |
| SEO estructurado | `SEO_STRUCTURED_DATA_CONTRACT.md` | Datos estructurados publicados |
| Despliegue | `DEPLOYMENT.md` | Estado, publicación y verificación |
| Retención de datos | `DATA_RETENTION_POLICY.md` | Ciclo de vida, snapshots y límites de borrado |
| Quality Gate | `QUALITY_GATE.md` | Qué valida y qué bloquea |
| Limpieza | `CLEANUP_POLICY.md` | Higiene y cierre de fases |
| Repo público | `PUBLIC_REPO_POLICY.md` | Qué puede y qué no puede publicarse |
| Decisiones vigentes | `DECISIONES_TECNICAS.md` | Decisiones aún aplicables |
| Errores aprendidos | `ERROR_REGISTRY.md` | Fallos reales y prevención |
| Backend Apps Script | `../apps-script/takara-pedidos-web/README.md` | Contrato del backend |

## Evidencia, no autoridad

Los siguientes documentos conservan evidencia de cierres o escenarios y **no
sustituyen** a los contratos anteriores:

- `STORE_PUBLIC_F2_CLOSURE.md`
- `STORE_PUBLIC_READINESS.md`
- `STORE_PUBLIC_SYSTEM_SCENARIO.md`

Ante una discrepancia, manda el contrato autoritativo de la tabla anterior.

## Reglas de prioridad

1. El contrato específico de un dominio manda sobre `ARCHITECTURE.md`.
2. `DEPLOYMENT.md` manda sobre notas históricas de publicación.
3. `DESIGN_SYSTEM.md` manda sobre decisiones visuales dispersas.
4. `CLEANUP_POLICY.md` y `QUALITY_GATE.md` mandan sobre higiene y cierre.
5. `PUBLIC_REPO_POLICY.md` manda sobre qué material puede vivir en GitHub.
6. `ERROR_REGISTRY.md` conserva memoria de fallos, pero no define arquitectura.

## Regla de documentación

Un documento nuevo debe cumplir al menos una de estas funciones:

- definir una autoridad estable;
- explicar una interfaz o contrato;
- registrar una decisión todavía vigente;
- conservar evidencia necesaria para una certificación reproducible.

Si no cumple ninguna, no pertenece a `docs/`.

## Regla de trabajo

Antes de modificar una parte productiva:

- preflight de Git;
- cambios acotados;
- pruebas específicas;
- Quality Gate;
- revisión del diff;
- commit coherente;
- publicación controlada.

No deben entrar aquí prompts, continuidad privada, backups, rutas locales,
volcados de sesión ni documentación duplicada.
