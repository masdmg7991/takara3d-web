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
- F4C — authorized Store create
- F4D — authorized Store inspect/edit
- F4E — authorized ACTIVE/INACTIVE lifecycle
- F4F — Admin UI/SystemScenario
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
