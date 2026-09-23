# Takara 3D Web

Web de producción de **Takara 3D** para catálogo, pedido personalizado, contacto y
canal Store mediante QR. El frontend se sirve como sitio estático desde GitHub Pages
y delega los efectos autoritativos en un backend modular de Google Apps Script.

La idea central es simple: **static-first en el navegador, autoridad en el backend y
contratos verificables entre ambos**.

## Vista rápida

~~~mermaid
flowchart LR
    U[Cliente / navegador]
    P[GitHub Pages<br/>HTML + CSS + JS]
    A[Google Apps Script<br/>API pública + Admin]
    S[(Store Registry / Sheets)]
    D[(Drive)]
    M[MailApp]
    U --> P
    P -->|pedido, contacto, Store| A
    A --> S
    A --> D
    A --> M
~~~

- **Frontend:** HTML, CSS y JavaScript modular, sin framework obligatorio.
- **Dominio frontend:** catálogo, precio, entrega, snapshot y preview desacoplados.
- **Backend:** Apps Script dividido por responsabilidades; Code.gs no concentra el dominio.
- **Store:** QR público, identidad opaca, Registry, Admin y atribución de pedidos.
- **Calidad:** un único Quality Gate local/CI protege contratos, seguridad e higiene.
- **Publicación y deploy:** GitHub y Apps Script son operaciones independientes.

La ausencia de un framework de runtime es deliberada: reduce dependencias, JavaScript
inicial y superficie de fallo sin renunciar a modularidad, contratos ni pruebas.

## Arquitectura

El repositorio separa siete responsabilidades:

1. **Superficie pública** — páginas estáticas, SEO y navegación.
2. **Dominio frontend** — catálogo, pricing, entrega y snapshots en assets/js/core/.
3. **Pedido y preview** — orquestación, personalización y render protegido.
4. **Store** — resolución pública, branding, QR, contexto y atribución.
5. **Backend Apps Script** — validación, normalización, idempotencia y efectos.
6. **Persistencia y efectos** — Sheets, Drive y correo detrás de módulos explícitos.
7. **Assurance** — tests, validadores, auditoría pública y Quality Gate.

La descripción completa de capas, flujos e invariantes está en
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Principios de ingeniería

- **Una autoridad por responsabilidad.**
- **El navegador no es autoridad** de precio, identidad Store ni datos recalculables.
- **Idempotencia antes de repetir efectos.**
- **Fail-closed** en identidad, permisos y contratos críticos.
- **Contratos verificables** mediante tests o validadores cuando el dominio lo permite.
- **Backups, secretos y datos privados fuera de Git.**
- **Deploy separado de publicación.**

## Estructura

~~~text
takara3d-web/
├── index.html
├── productos.html
├── pedido.html
├── contacto.html
├── qr/
├── tienda/
├── assets/
│   ├── brand/
│   ├── css/
│   ├── data/
│   ├── img/
│   └── js/
│       ├── core/
│       └── ...
├── apps-script/
│   └── takara-pedidos-web/
├── config/
├── docs/
├── tools/
└── .github/workflows/
~~~

## Fuentes de verdad

| Área | Autoridad |
|---|---|
| Catálogo público | assets/data/catalogo.json |
| Endpoint público | assets/js/takara-config.js |
| Pedido | docs/ORDER_ENGINE_CONTRACT.md |
| Idempotencia | docs/ORDER_IDEMPOTENCY_CONTRACT.md |
| Store | docs/STORE_SYSTEM_CONTRACT.md |
| Store Admin | docs/STORE_ADMIN_CONTRACT.md |
| Preview | docs/PREVIEW_ENGINE_CONTRACT.md |
| Diseño visual | docs/DESIGN_SYSTEM.md |
| Deployment | config/deployment-state.json + docs/DEPLOYMENT.md |
| Política pública | docs/PUBLIC_REPO_POLICY.md |
| Quality Gate | tools/takara_quality_gate.ps1 + docs/QUALITY_GATE.md |

docs/README.md contiene el mapa documental completo y las reglas de prioridad.

## Calidad verificable

Antes de commit:

~~~powershell
.\tools\takara_quality_gate.ps1 -Mode precommit
~~~

Antes de publicar:

~~~powershell
.\tools\takara_quality_gate.ps1 -Mode prepush
~~~

El mismo gate se ejecuta en GitHub Actions. Comprueba, entre otras capas, estructura,
encoding, catálogo, pedido, entrega, preview, seguridad de fotografías, Store,
idempotencia, protección anti-abuso, ACK de navegador, documentación, repositorio
público, git diff --check y estado final de Git.

Los informes se escriben **fuera del repositorio**.

## Ejecución local

La superficie pública no requiere build:

~~~powershell
py -m http.server 8765
~~~

Después puede abrirse http://127.0.0.1:8765/.

Para el Quality Gate completo se utilizan PowerShell, Python y Node, igual que en CI.

## Seguridad y privacidad

El repositorio está diseñado para poder ser público. No deben almacenarse aquí:

- secretos, tokens o credenciales;
- datos reales de clientes;
- fotografías o adjuntos privados;
- backups locales;
- volcados de producción;
- documentación operativa privada;
- artefactos temporales.

tools/takara_public_repo_audit.ps1 valida mecánicamente esta política.

## Contribución y gobierno

- [CONTRIBUTING.md](CONTRIBUTING.md) — reglas de cambio, validación y commits.
- [docs/GITHUB_GOVERNANCE.md](docs/GITHUB_GOVERNANCE.md) — CI y política de main.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — publicación y promoción de Apps Script.
- [tools/README.md](tools/README.md) — mapa de tests y validadores.

Un cambio no se considera terminado porque “funcione en pantalla”: debe conservar sus
contratos, dejar evidencia reproducible y terminar con el Quality Gate en verde.
