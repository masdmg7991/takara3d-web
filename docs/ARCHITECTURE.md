# Arquitectura de Takara 3D Web

**Estado:** arquitectura ejecutada y vigente
**Modelo:** frontend static-first + backend modular en Google Apps Script

Este documento describe **el sistema que existe hoy**. Los contratos de dominio de
docs/ tienen prioridad cuando una regla pertenece a una capacidad concreta.

## 1. Objetivo

Takara 3D Web mantiene una superficie pública rápida sin trasladar al navegador
responsabilidades que requieren autoridad, persistencia o efectos externos.

Propiedades buscadas:

1. bajo coste de runtime en cliente;
2. una autoridad identificable por responsabilidad;
3. efectos idempotentes y trazables;
4. límites claros entre UI, dominio, transporte y persistencia;
5. cambios verificables mediante contratos y Quality Gate.

## 2. Topología

~~~mermaid
flowchart TB
    subgraph Browser[Navegador]
      Pages[HTML / CSS]
      Core[Dominio JS]
      Order[Pedido / personalización / preview]
      Store[Store público]
    end

    subgraph Backend[Google Apps Script]
      Entry[Code.gs / entrada]
      Validation[Validación + normalización]
      Idem[Idempotencia + anti-abuso]
      StoreApi[Store API / Admin]
      Effects[Entrega / correo / media]
    end

    Sheets[(Google Sheets)]
    Drive[(Google Drive)]
    Mail[MailApp]

    Pages --> Core
    Core --> Order
    Pages --> Store
    Order --> Entry
    Store --> Entry
    Entry --> Validation
    Validation --> Idem
    Entry --> StoreApi
    Idem --> Effects
    StoreApi --> Sheets
    Effects --> Drive
    Effects --> Mail
~~~

GitHub Pages publica el frontend. Apps Script es un servicio separado: publicar código
en GitHub no promociona automáticamente el backend.

## 3. Capas

### 3.1 Superficie pública

index.html, productos.html, pedido.html, contacto.html, qr/ y tienda/ son entradas
estáticas e indexables.

Responsabilidades:

- contenido y navegación;
- composición visual;
- accesibilidad y SEO;
- carga de módulos JavaScript.

No deben convertirse en una segunda autoridad de reglas de negocio.

### 3.2 Dominio frontend

assets/js/core/ contiene lógica reutilizable separada de la UI:

- takara-catalogo.js — catálogo;
- takara-pricing.js — precio;
- takara-delivery.js — entrega;
- takara-postal-national.js — reglas postales;
- takara-order-snapshot.js — snapshot estable del pedido.

El navegador puede proyectar información para UX, pero el backend valida o recalcula
aquello que no debe confiar al cliente.

### 3.3 Pedido, personalización y preview

Los módulos takara-pedido-*, takara-frame-text.js y takara-pedido-preview.js separan:

- captura de datos;
- personalización;
- resumen y entrega;
- transporte al backend;
- representación visual.

El preview es un componente protegido: sus cambios requieren validaciones específicas y
no se mezclan incidentalmente con Store, transporte o backend.

### 3.4 Store

Store es independiente del QR de producto:

**PRODUCT_QR != STORE_QR**

assets/js/takara-store-public.js resuelve la experiencia desde
/tienda/?s=<store_public_code>.

Invariantes:

- store_id es interno;
- store_public_code es público, opaco e inmutable;
- una referencia inválida o inactiva falla cerrada;
- el navegador no decide la identidad Store;
- la atribución permanece explícita hasta backend.

## Store QR URL Contract V1

**PRODUCT_QR != STORE_QR**

El QR físico de Store usa exclusivamente:

https://takara3d.es/tienda/?s=<store_public_code>

Reglas:

- HTTPS obligatorio;
- host canónico takara3d.es;
- ruta /tienda/;
- un único parámetro s;
- sin hash ni parámetros auxiliares;
- `store_id` nunca forma parte del Store QR;
- store_public_code es opaco, público, inmutable y no secuencial;
- `/qr` pertenece al Product QR y no es una ruta válida del Store QR;
- Store Registry sigue siendo la autoridad de identidad y estado.

Resolver un código Store no convierte al navegador en autoridad de identidad.
### 3.5 Backend Apps Script

apps-script/takara-pedidos-web/ está dividido por responsabilidad. Code.gs compone y
delega.

| Responsabilidad | Módulos principales |
|---|---|
| Validación y normalización | OrderValidation.gs, OrderNormalization.gs |
| Idempotencia | OrderIdempotency.gs, ContactIdempotency.gs |
| Transporte navegador | OrderBrowserTransport.gs, ContactBrowserTransport.gs |
| Entrega y correo | OrderDelivery.gs, OrderEmail.gs |
| Media y Drive | OrderMedia.gs, DriveStorage.gs |
| Atribución | OrderAttribution.gs, StoreOrderResolution.gs |
| Protección pública | PublicAbuseProtection.gs |
| Store dominio/runtime | StoreDomain.gs, StoreRuntime.gs |
| Store Registry | StoreRegistry.gs, StoreSheetsRepository.gs |
| Store público | StorePublicApi.gs, StoreHttpBridge.gs |
| Store Admin | StoreAdminAccess.gs, StoreAdminRead.gs, StoreAdminWrite.gs |
| Retención | DataRetention.gs |

La modularidad evita convertir Code.gs en un monolito y permite validar contratos por
responsabilidad.

### 3.6 Persistencia y efectos

El backend encapsula los efectos externos:

- **Sheets:** Registry y persistencia Store;
- **Drive:** media asociada al pedido;
- **MailApp:** correo de pedido y contacto.

Una respuesta positiva debe guardar relación causal con los efectos exigidos por su
contrato. Los reintentos usan idempotencia para evitar duplicados.

### 3.7 Assurance

tools/ es la capa de verificación del repositorio:

- pruebas funcionales takara_test_*.js;
- validadores contractuales takara_validar_*.py;
- validadores PowerShell;
- auditoría de repositorio público;
- runner único takara_quality_gate.ps1.

.github/workflows/quality-gate.yml ejecuta el mismo gate en CI. No existe una segunda
definición de calidad exclusiva de GitHub.

## 4. Autoridades

| Responsabilidad | Autoridad |
|---|---|
| Catálogo y precios publicados | assets/data/catalogo.json |
| Endpoint consumido por la web | assets/js/takara-config.js |
| Pedido | docs/ORDER_ENGINE_CONTRACT.md |
| Idempotencia | docs/ORDER_IDEMPOTENCY_CONTRACT.md |
| Store | docs/STORE_SYSTEM_CONTRACT.md |
| Store Admin | docs/STORE_ADMIN_CONTRACT.md |
| Preview | docs/PREVIEW_ENGINE_CONTRACT.md |
| Deployment conocido | config/deployment-state.json |
| Retención | docs/DATA_RETENTION_POLICY.md |

Una copia necesaria por compatibilidad o rendimiento es una **proyección derivada**, no
una segunda fuente de verdad. Si no puede verificarse mecánicamente, se considera deuda.

## 5. Flujos principales

### Pedido

1. El navegador captura UX básica.
2. El dominio frontend construye un snapshot estable.
3. El backend normaliza y valida.
4. Resuelve contexto Store si existe.
5. Aplica protección pública e idempotencia.
6. Ejecuta los efectos requeridos.
7. Devuelve ACK causal.
8. Un retry conserva el resultado lógico sin duplicar efectos.

### Contacto

1. El cliente genera request_id.
2. Apps Script valida y aplica anti-abuso.
3. La idempotencia protege el efecto de correo.
4. El transporte devuelve ACK correlacionado.

### Store

1. El QR aporta store_public_code.
2. Backend lo resuelve contra Registry.
3. Estado e identidad proceden de la autoridad Store.
4. Sólo un Store válido y activo alimenta contexto y branding.
5. El pedido conserva atribución explícita hasta backend.

## 6. Invariantes de seguridad y robustez

- El frontend no es autoridad de precios ni identidad.
- No se almacenan secretos ni datos privados en Git.
- Los endpoints públicos tienen protección anti-abuso.
- Los efectos repetibles usan idempotencia.
- Store inválido no degrada silenciosamente a otra identidad.
- Publicación GitHub y deploy Apps Script son operaciones distintas.
- Backups e informes viven fuera del repositorio.
- Un ERROR del Quality Gate bloquea el cierre.

## 7. Static-first deliberado

La web comercial necesita velocidad, SEO y baja complejidad de ejecución más que una SPA
generalista. Por eso mantiene HTML estático y JavaScript donde aporta comportamiento real.

Adoptar un framework futuro sólo estaría justificado por una necesidad demostrable y
después de conservar contratos, rendimiento, accesibilidad, cobertura, URLs y separación
de autoridades.

La arquitectura no depende de una migración futura para ser coherente hoy.

## 8. Evolución

Un cambio arquitectónico debe responder:

1. qué responsabilidad cambia;
2. cuál es la nueva autoridad;
3. qué contrato se modifica;
4. qué pruebas demuestran compatibilidad;
5. qué riesgo se elimina o qué capacidad se gana;
6. cómo se revierte si la aceptación falla.

No se aceptan capas, adapters, dependencias o compatibilidades sin consumidor conocido.

## 9. Criterio de cierre

Una modificación está terminada cuando:

- el comportamiento contractual está preservado;
- las pruebas específicas pasan;
- el Quality Gate completo termina en verde;
- el diff es revisable;
- no quedan temporales ni deuda accidental;
- Git queda controlado.

Así el sistema puede mantenerse y auditarse sin depender de conocimiento que sólo exista
en una conversación o en una máquina concreta.
