# Documentación Takara3D Web

Este directorio contiene documentación estable del proyecto web Takara3D.

La documentación debe funcionar como contrato técnico del proyecto, no como volcado de conversación ni como notas temporales.

## Mapa de autoridad documental

| Área | Documento que manda | Uso |
|---|---|---|
| Arquitectura global | ARCHITECTURE.md | Define capas, evolución técnica, stack objetivo y límites de arquitectura. |
| Sistema visual | DESIGN_SYSTEM.md | Define criterios de interfaz, tokens, componentes y reglas visuales. |
| Pedido web | ORDER_ENGINE_CONTRACT.md | Fuente de verdad del flujo de pedido, datos, validaciones, correo y límites. |
| Preview litofanía | PREVIEW_ENGINE_CONTRACT.md | Fuente de verdad del motor de preview actual y futuro. |
| Limpieza del repo | CLEANUP_POLICY.md | Define qué se limpia, qué no se sube y cómo se cierran fases. |
| Quality gate | QUALITY_GATE.md | Define comprobaciones automáticas, modos, logs e informes. |
| Errores aprendidos | ERROR_REGISTRY.md | Registro de fallos reales y reglas para no repetirlos. |
| Decisiones técnicas | DECISIONES_TECNICAS.md | Registro breve de decisiones de proyecto que siguen vigentes. |
| Despliegue | DEPLOYMENT.md | Define publicación, validación, Git y push controlado. |
| Apps Script | ../apps-script/takara-pedidos-web/README.md | Contrato del backend ligero de pedidos/contacto. |

## Reglas de prioridad

Cuando dos documentos hablen del mismo tema, se aplica esta prioridad:

1. Para pedido: ORDER_ENGINE_CONTRACT.md manda sobre ARCHITECTURE.md.
2. Para preview: PREVIEW_ENGINE_CONTRACT.md manda sobre ARCHITECTURE.md.
3. Para diseño visual: DESIGN_SYSTEM.md manda sobre textos dispersos en otros documentos.
4. Para publicación: DEPLOYMENT.md manda sobre notas antiguas.
5. Para limpieza y commits: CLEANUP_POLICY.md y QUALITY_GATE.md mandan sobre instrucciones sueltas.
6. Para fallos conocidos: ERROR_REGISTRY.md manda como memoria de errores reales.

## Backend ligero

La documentación del Google Apps Script de pedidos/contacto vive en:

- ../apps-script/takara-pedidos-web/README.md

El archivo Code.gs no debe reconstruirse desde memoria. Debe copiarse literalmente desde el proyecto real publicado.

## Regla de trabajo

Antes de modificar web productiva:

- preflight de Git;
- backup si hay riesgo;
- cambios acotados;
- validación local;
- diff revisado;
- commit de archivos concretos;
- push solo con aprobación explícita.

## Qué no va aquí

- prompts para próxima conversación;
- notas temporales;
- estado puntual que caduca rápido;
- volcados completos de sesión;
- archivos de rescate generados por ChatGPT;
- documentación duplicada o contradictoria.

## Documentos retirados

TAKARA_ARQUITECTURA_PEDIDOS.md fue retirado porque solapaba arquitectura general y contrato de pedido. La autoridad actual queda repartida entre ARCHITECTURE.md y ORDER_ENGINE_CONTRACT.md.
