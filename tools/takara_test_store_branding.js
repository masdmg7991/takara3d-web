const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const app = path.join(root, "apps-script", "takara-pedidos-web");
let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, message) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code=" + code);
}

const context = {
  console, Object, Array, String, Number, Boolean, Error, JSON, Math,
};
vm.createContext(context);
for (const file of ["StoreDomain.gs", "StoreRegistry.gs"]) {
  vm.runInContext(
    fs.readFileSync(path.join(app, file), "utf8"),
    context,
    { filename: file }
  );
}

const storeRef = "st_AAAAAAAAAAAAAAAAAAAAAAAA";
const storeId = "STO_000001";
const pngBytes = [137, 80, 78, 71, 13, 10, 26, 10, 0];
const jpegBytes = [255, 216, 255, 1, 2, 255, 217];
const webpBytes = [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 0];

ok(context.storeLogoBytesMatchMime_(pngBytes, "image/png"), "PNG signature valid");
ok(context.storeLogoBytesMatchMime_(jpegBytes, "image/jpeg"), "JPEG signature valid");
ok(context.storeLogoBytesMatchMime_(webpBytes, "image/webp"), "WEBP signature valid");
ok(
  !context.storeLogoBytesMatchMime_([1, 2, 3, 4], "image/png"),
  "fake PNG rejected"
);
expectCode(
  () => context.assertStoreLogoBytes_([1, 2, 3, 4], "image/png"),
  "STORE_BRANDING_LOGO_SIGNATURE_INVALID",
  "binary signature mismatch"
);

for (const mode of ["NAME", "LOGO", "NAME_AND_LOGO"]) {
  ok(context.normalizeStoreBrandingMode_(mode) === mode, "mode " + mode);
}
expectCode(
  () => context.normalizeStoreBrandingMode_("OTHER"),
  "STORE_BRANDING_MODE_INVALID",
  "invalid branding mode"
);
expectCode(
  () => context.normalizeStoreLogoUpload_({
    mime_type: "image/svg+xml",
    file_name: "logo.svg",
    base64: "PHN2Zz48L3N2Zz4=",
  }),
  "STORE_BRANDING_LOGO_MIME_INVALID",
  "SVG logo rejected"
);

const defaultPublic = context.buildDefaultStoreBrandingPublic_();
ok(defaultPublic.mode === "NAME", "default public branding uses name");
ok(
  !Object.prototype.hasOwnProperty.call(defaultPublic, "logo_file_id"),
  "default public branding exposes no file id"
);

const validPngDataUrl = "data:image/png;base64,iVBORw0KGgo=";
const persisted = {
  store_public_code: storeRef,
  mode: "NAME_AND_LOGO",
  logo_file_id: "drive-file-id",
  logo_mime_type: "image/png",
  logo_file_name: "logo.png",
  updated_at: "2026-09-12T09:00:00.000Z",
  version: 3,
};
const publicProjection = context.toStoreBrandingPublic_(persisted, validPngDataUrl);
ok(publicProjection.mode === "NAME_AND_LOGO", "public projection keeps mode");
ok(publicProjection.logo_data_url === validPngDataUrl, "public projection includes safe logo");
ok(
  !Object.prototype.hasOwnProperty.call(publicProjection, "logo_file_id"),
  "public projection hides Drive file id"
);
const adminProjection = context.toStoreBrandingAdmin_(persisted, validPngDataUrl);
ok(adminProjection.has_logo === true, "admin projection reports logo");
ok(adminProjection.record_version === 3, "admin projection reports record version");
ok(
  !Object.prototype.hasOwnProperty.call(adminProjection, "logo_file_id"),
  "admin projection hides Drive file id"
);
const missingLogoPublic = context.toStoreBrandingPublic_(persisted, "");
ok(missingLogoPublic.mode === "NAME", "public branding falls back to NAME without usable logo");
ok(
  !Object.prototype.hasOwnProperty.call(missingLogoPublic, "logo_data_url"),
  "public fallback exposes no broken logo"
);
const missingLogoAdmin = context.toStoreBrandingAdmin_(persisted, "");
ok(missingLogoAdmin.mode === "NAME", "admin reports effective NAME mode without usable logo");
ok(missingLogoAdmin.has_logo === false, "admin reports missing logo consistently");

const storeRepository = {
  findById(id) {
    return id === storeId
      ? { store_id: storeId, store_public_code: storeRef, display_name: "Foto García" }
      : null;
  },
};

function makeBrandingRepository(initialRecord, options = {}) {
  let record = initialRecord ? Object.assign({}, initialRecord) : null;
  const trashed = [];
  const upserts = [];
  return {
    withWriteLock(work) { return work(); },
    findByPublicCode(ref) {
      ok(ref === storeRef, "branding lookup uses immutable public code");
      return record ? Object.assign({}, record) : null;
    },
    upsert(next) {
      if (options.failUpsert) {
        const error = new Error("SIMULATED_UPSERT_FAILURE");
        error.code = "SIMULATED_UPSERT_FAILURE";
        throw error;
      }
      record = Object.assign({}, next);
      upserts.push(Object.assign({}, next));
    },
    storeLogo(ref, upload) {
      ok(ref === storeRef, "logo storage uses immutable public code");
      ok(upload.mime_type === "image/png", "logo upload MIME normalized");
      return {
        file_id: "new-drive-id",
        mime_type: upload.mime_type,
        file_name: upload.file_name,
      };
    },
    readLogoDataUrl(current) {
      return current && current.logo_file_id ? validPngDataUrl : "";
    },
    trashLogo(fileId) { trashed.push(fileId); },
    getRecord() { return record; },
    getTrashed() { return trashed.slice(); },
    getUpserts() { return upserts.slice(); },
  };
}

const emptyRepo = makeBrandingRepository(null);
const emptyAdmin = context.getStoreBrandingService_(
  storeRepository,
  emptyRepo,
  storeId
);
ok(emptyAdmin.mode === "NAME", "missing branding defaults to NAME");
ok(emptyAdmin.has_logo === false, "missing branding has no logo");

const existingRepo = makeBrandingRepository(persisted);
const updated = context.updateStoreBrandingService_(
  storeRepository,
  existingRepo,
  storeId,
  {
    mode: "LOGO",
    logo: {
      mime_type: "image/png",
      file_name: "new-logo.png",
      base64: "iVBORw0KGgo=",
    },
    remove_logo: false,
  },
  { nowIso() { return "2026-09-12T09:30:00.000Z"; } }
);
ok(updated.mode === "LOGO", "update switches to LOGO");
ok(updated.has_logo === true, "updated branding has logo");
ok(existingRepo.getRecord().logo_file_id === "new-drive-id", "new logo persisted");
ok(existingRepo.getRecord().version === 4, "branding version increments");
ok(
  !existingRepo.getTrashed().includes("drive-file-id"),
  "old logo retained privately after successful replacement"
);

const removeRepo = makeBrandingRepository(persisted);
const removed = context.updateStoreBrandingService_(
  storeRepository,
  removeRepo,
  storeId,
  { mode: "NAME", remove_logo: true },
  { nowIso() { return "2026-09-12T09:45:00.000Z"; } }
);
ok(removed.mode === "NAME", "remove switches to NAME");
ok(removed.has_logo === false, "remove hides logo");
ok(removeRepo.getRecord().logo_file_id === "", "removed logo metadata cleared");
ok(
  !removeRepo.getTrashed().includes("drive-file-id"),
  "removed logo retained privately for recovery"
);

const noLogoRepo = makeBrandingRepository(null);
expectCode(
  () => context.updateStoreBrandingService_(
    storeRepository,
    noLogoRepo,
    storeId,
    { mode: "LOGO", remove_logo: false },
    { nowIso() { return "2026-09-12T10:00:00.000Z"; } }
  ),
  "STORE_BRANDING_LOGO_REQUIRED",
  "LOGO mode requires logo"
);

const failingRepo = makeBrandingRepository(persisted, { failUpsert: true });
expectCode(
  () => context.updateStoreBrandingService_(
    storeRepository,
    failingRepo,
    storeId,
    {
      mode: "LOGO",
      logo: {
        mime_type: "image/png",
        file_name: "uncommitted-logo.png",
        base64: "iVBORw0KGgo=",
      },
      remove_logo: false,
    },
    { nowIso() { return "2026-09-12T10:15:00.000Z"; } }
  ),
  "SIMULATED_UPSERT_FAILURE",
  "failed branding upsert propagates"
);
ok(
  failingRepo.getTrashed().includes("new-drive-id"),
  "new uncommitted logo cleaned after failed upsert"
);
ok(
  !failingRepo.getTrashed().includes("drive-file-id"),
  "previously valid logo retained after failed replacement"
);

const sheetsSource = fs.readFileSync(
  path.join(app, "StoreSheetsRepository.gs"),
  "utf8"
);
ok(
  (sheetsSource.match(/assertStoreLogoBytes_\(/g) || []).length === 2,
  "Sheets adapter validates logo signature on write and read"
);
ok(
  sheetsSource.includes('const TAKARA_STORE_BRANDING_SHEET_NAME = "store_branding";'),
  "branding stays in canonical Registry spreadsheet side sheet"
);
ok(
  !sheetsSource.includes("setSharing("),
  "logo storage does not publish Drive files by sharing"
);

const adminUiSource = fs.readFileSync(
  path.join(app, "StoreAdminUi.html"),
  "utf8"
);
const adminBridgeSource = fs.readFileSync(
  path.join(app, "StoreAdminUiBridge.gs"),
  "utf8"
);
const publicClientSource = fs.readFileSync(
  path.join(root, "assets", "js", "takara-store-public.js"),
  "utf8"
);
const publicIndexSource = fs.readFileSync(
  path.join(root, "tienda", "index.html"),
  "utf8"
);

for (const marker of [
  "Identidad visual",
  "Solo nombre",
  "Solo logo",
  "Nombre + logo",
  "Guardar identidad",
  "Quitar logo",
  "image/png,image/jpeg,image/webp",
  "getStoreAdminUiBranding",
  "updateStoreAdminUiBranding",
]) {
  ok(adminUiSource.includes(marker), "Store Admin branding UI contains " + marker);
}
ok(
  adminUiSource.includes("STORE_LOGO_MAX_BYTES = 512 * 1024"),
  "Store Admin enforces 512 KiB logo limit"
);
ok(
  adminUiSource.includes("els.detail.appendChild(publicAccess);\n        els.detail.appendChild(renderStoreBrandingSection(store));"),
  "Store Admin places identity after public access"
);
ok(
  adminBridgeSource.includes("getStoreAdminUiBranding") &&
    adminBridgeSource.includes("updateStoreAdminUiBranding"),
  "Store Admin bridge exposes canonical branding operations"
);
for (const marker of [
  "TAKARA_STORE_BRANDING_PUBLIC_V1",
  "data-store-logo",
  "takara-store-name--visually-hidden",
  "normalizeStoreBrandingContext",
]) {
  ok(publicClientSource.includes(marker), "Public Store branding contains " + marker);
}
ok(
  !publicClientSource.includes("logo_file_id"),
  "Public Store client never receives Drive file ids"
);
ok(
  publicClientSource.includes("bridge.setVerifiedContext({") &&
    publicClientSource.includes("version: context.version") &&
    publicClientSource.includes("store_ref: context.store_ref") &&
    publicClientSource.includes("display_name: context.display_name") &&
    publicClientSource.includes("status: context.status") &&
    !publicClientSource.includes("bridge.setVerifiedContext(context);"),
  "Public Store strips branding before verified order context bridge"
);
ok(
  publicIndexSource.includes("data-store-logo") &&
    publicIndexSource.includes("store-branding-v1"),
  "Public Store shell loads versioned branding surface"
);

console.log(
  "[TAKARA_STORE_BRANDING_TEST_OK] " +
    JSON.stringify({ checks })
);
