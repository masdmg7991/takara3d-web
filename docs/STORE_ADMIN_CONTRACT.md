# Takara Store Admin Contract

## Purpose

Store Admin is the private Takara operator zone for managing partner stores.
It is not a merchant portal, order console, analytics product or ecommerce
back office.

F4 starts by certifying access authority before exposing any Store operation.

## F4A access authority

Contract: `TAKARA_STORE_ADMIN_ACCESS_V1`

Canonical implementation:
`apps-script/takara-pedidos-web/StoreAdminAccess.gs`

Authority chain:

`Session.getActiveUser()`
→ normalized authenticated Google email
→ `ScriptProperties[TAKARA_STORE_ADMIN_OWNER_EMAIL]`
→ exact normalized owner match
→ immutable `OWNER` descriptor.

The repository never stores the owner email, password, token, cookie secret,
API key or an equivalent credential. The expected owner email is configured
out-of-band in Apps Script ScriptProperties.

## Deployment boundary

Admin uses a dedicated/restricted Apps Script Web App deployment boundary.
That deployment must require an authenticated Google identity. A hidden URL is
not security.

Every future Admin route/action must call `requireStoreAdminAccess_()` before
reading or mutating Store state. The public Store/Pedido deployment must never
grant Admin authority merely because it executes source from the same Apps
Script project.

If `Session.getActiveUser()` cannot provide a usable authenticated email, the
request is denied.

## Fail closed

- missing/invalid owner property → `STORE_ADMIN_CONFIGURATION_INVALID`
- unavailable/invalid active identity → `STORE_ADMIN_UNAUTHENTICATED`
- authenticated non-owner → `STORE_ADMIN_FORBIDDEN`
- exact normalized owner → immutable authorized `OWNER` descriptor

There is no anonymous, DIRECT, public or fallback Admin session.

## Ownership

F4A owns only Admin authorization. It does not read/write Store Registry,
Google Sheets, orders, customers, commissions, settlements, billing,
inventory, campaigns, analytics or merchant accounts. It exposes no Admin UI
and no Admin HTTP action.

Store Registry remains the unique Store persistence authority.

Future F4B-F4F capabilities depend on F4A authorization and the existing Store
Service/Runtime; they do not duplicate either authority.

## Phase roadmap

- F4A — owner-only Admin access authority
- F4B — authorized Store list/read
- F4C — tangible Admin UI foundation
- F4D — authorized Store create + inspect/edit
- F4E — authorized ACTIVE/INACTIVE lifecycle
- F4F — Admin deployment boundary + SystemScenario
- F4G — cumulative F4 phase closure

F4A certification does not mean the Admin UI exists yet.

## F4B authorized Store list/read

Contract: `TAKARA_STORE_ADMIN_READ_V1`.

F4B extends the canonical Store read path; it does not create an Admin
persistence adapter.

Dependency chain:

`requireStoreAdminAccess_()`
→ `StoreAdminRead`
→ `StoreRuntime`
→ `StoreRegistry application service`
→ Store repository port
→ `StoreSheetsRepository`.

The repository gains a read-only `listAll()` capability. The existing general
Store repository contract is not broadened globally; F4B uses the narrower
`assertStoreReadRepositoryPort_()` so historical consumers are not forced to
implement a capability they do not need.

Authorized operations:

- `listStoresAdmin_()` returns ACTIVE and INACTIVE stores ordered
  deterministically by immutable `store_id`.
- `getStoreAdmin_(store_id)` reads one Store by immutable internal id.
- Admin read models use `TAKARA_STORE_ADMIN_READ_V1` and are immutable.
- Admin may read the internal Store fields required for later inspect/edit,
  including `store_public_code`, status, timestamps, contact data and notes.

Security and authority:

- F4A authorization runs before any Registry/Sheets read.
- unauthenticated, misconfigured or non-owner access reaches zero Registry
  reads.
- `StoreAdminRead.gs` contains no SpreadsheetApp/PropertiesService/LockService
  dependency and never opens Sheets directly.
- F4B performs no create/update/status mutation/delete.
- Store Registry remains the unique Store persistence authority.
- public Store/Pedido APIs gain no Admin read action.
- F4C will add authorized Store creation on top of F4A and existing Store
  creation authority.

## F4C tangible read-only Admin UI

Contract: `TAKARA_STORE_ADMIN_UI_V1`.

F4C introduces the first tangible Store Admin surface without adding Store
mutation authority.

Runtime boundary:

`StoreAdminUi.html`
→ `getStoreAdminUiBootstrap()` / `getStoreAdminUiStore(store_id)`
→ F4B `listStoresAdmin_()` / `getStoreAdmin_()`
→ F4A authorization
→ canonical Store Runtime / Registry.

The UI is read-only:

- shows total, ACTIVE and INACTIVE counts
- lists Stores deterministically
- supports local client-side search
- displays one Store detail including internal contact fields
- exposes no create/edit/status/delete/order/analytics action
- does not know Google Sheets or Registry configuration
- does not contain owner identity or secrets
- fails closed when neither Apps Script `google.script.run` nor explicit
  preview data is available

`tools/takara_store_admin_preview.ps1` is development-only evidence tooling.
It serves the exact tracked `StoreAdminUi.html` on `127.0.0.1` and injects
temporary demonstration data into
`window.TAKARA_STORE_ADMIN_PREVIEW_DATA`.

Preview data is not Store authority, is never written to the repository, and
never reaches the real Registry. Production Admin data continues to come only
from F4B.

F4 roadmap after the tangible UI:

- F4D — authorized create + inspect/edit on this same UI
- F4E — authorized ACTIVE/INACTIVE lifecycle on this same UI
- F4F — Admin deployment boundary + SystemScenario
- F4G — cumulative F4 closure

## F4D authorized create + inspect/edit

Contract: `TAKARA_STORE_ADMIN_WRITE_V1`.

F4D extends the same F4C Admin UI; it does not introduce a second Admin
surface or another Store persistence authority.

This F4D section is the current authority for the F4C→F4D capability
transition and supersedes earlier forward-looking roadmap prose.

Write dependency chain:

`StoreAdminUi.html`
→ `StoreAdminUiBridge`
→ `StoreAdminWrite`
→ F4A `requireStoreAdminAccess_()`
→ canonical `createStoreRuntime_()` / `updateStoreRuntime_()`
→ existing Store Service
→ existing Store repository port
→ existing `StoreSheetsRepository`.

`StoreAdminWrite` is an authorization/transport boundary only. F4B remains
the Admin read-model authority used for mutation responses. StoreAdminWrite
never opens Google Sheets, does not know Registry configuration and does not
recreate Store domain validation.

Browser-writable fields are explicitly limited to:

- `display_name`
- `contact_name`
- `email`
- `phone`
- `address_line`
- `postal_code`
- `city`
- `province`
- `notes`

Create requires a `display_name` key and delegates value validation to the
canonical Store domain/runtime.

The browser cannot write or override `store_id`, `store_public_code`, `status`,
`created_at`, `updated_at`, `deactivated_at`, `version`, order attribution or
source metadata. Unexpected fields fail closed before Runtime mutation.

`store_id` remains immutable and is used only as the update target. The Runtime
continues to own generated identity, timestamps, versioning and Store
persistence.

The same F4C Admin UI now exposes:

- `Nueva tienda`
- `Editar`
- create form
- edit form
- immutable identity/status metadata as read-only detail
- in-memory create/edit behavior in local DEMO preview only

The preview never persists mutations and resets when reloaded.

F4D deliberately does not expose ACTIVE/INACTIVE controls. F4E adds lifecycle
operations on this same UI after its own authorization and regression gates.

Store Registry remains the unique Store persistence authority.

## F4E authorized ACTIVE/INACTIVE lifecycle

F4E adds lifecycle controls to the same Admin UI and does not create another
Store state authority.

Dependency chain:

`StoreAdminUi.html`
→ `StoreAdminUiBridge`
→ `StoreAdminWrite`
→ F4A `requireStoreAdminAccess_()`
→ canonical `activateStoreRuntime_()` / `deactivateStoreRuntime_()`
→ existing `setStoreStatusService_()`
→ existing Store repository
→ existing `StoreSheetsRepository`.

`status` remains non-editable browser/system state. It is never accepted by the
create/edit form and cannot be patched through `updateStoreAdmin_()`.

Lifecycle is expressed only through dedicated operations:

- `activateStoreAdmin_(store_id)`
- `deactivateStoreAdmin_(store_id)`

Both authorize first, validate immutable `store_id`, delegate to the existing
Runtime lifecycle authority and return the F4B Admin read model.

Unauthorized or invalid lifecycle requests reach zero Runtime lifecycle writes.

The same Admin UI now exposes a deliberate `Activar` / `Desactivar` action with
confirmation. Local preview lifecycle mutations are in-memory DEMO only and
reset when the preview is reloaded.

There is still no DELETE. INACTIVE preserves Store identity/history/QR while
blocking new Store sessions/orders according to the existing Store domain.

F4F will add the Admin deployment boundary and cumulative Admin SystemScenario
on top of this same Admin UI.

## F4F Admin deployment boundary + SystemScenario

F4F freezes the deployable Admin boundary without deploying or routing it yet.

Boundary contract:

- `TAKARA_STORE_ADMIN_DEPLOYMENT_V1`
- internal `getStoreAdminUiDeploymentOutput_()`
- F4A `requireStoreAdminAccess_()` executes before any Admin HTML is created
- authorized output is created only from canonical `StoreAdminUi`
- the boundary has no `doGet` and no `doPost`
- no public URL or route is introduced in F4F
- no push and no deployment occur in F4F.

The boundary stays in the existing `StoreAdminUiBridge.gs`; F4F does not create a
second Admin surface, service, persistence adapter or access authority.

Cumulative Admin SystemScenario:

`deployment boundary`
→ F4A owner access
→ same Store Admin UI
→ F4B list/get
→ F4D create/edit
→ F4E activate/deactivate
→ existing Store Runtime
→ existing Store Service/Registry
→ existing StoreSheetsRepository.

System fields remain fail closed. Browser `status` is still rejected by
create/edit and lifecycle is exposed only through the dedicated F4E operations.
Unauthorized deployment reaches zero `HtmlService` calls and unauthorized
mutations reach zero Runtime writes.

F5 owns actual route integration, deployment, remote E2E and production
verification. F4F only certifies the deployable boundary and cumulative
SystemScenario on the current repository baseline.
