# Documentación Takara3D Web

Este directorio contiene documentación estable del proyecto web Takara3D.

La documentación de continuidad de conversación, prompts temporales, checklists fechados o volcados de sesión no deben vivir aquí como documentación principal.

## Documentos principales

- ARCHITECTURE.md: arquitectura vigente del sitio.
- DESIGN_SYSTEM.md: sistema visual y criterios de interfaz.
- ORDER_ENGINE_CONTRACT.md: contrato funcional del flujo de pedido.
- PREVIEW_ENGINE_CONTRACT.md: contrato del preview de litofanía.
- CLEANUP_POLICY.md: reglas de limpieza, no romper y control de cambios.
- DEPLOYMENT.md: publicación, validación y despliegue.

## Backend ligero

La documentación del Google Apps Script de pedidos/contacto vive en:

- apps-script/takara-pedidos-web/README.md

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
