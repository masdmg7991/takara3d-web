const TAKARA_STORE_ADMIN_READ_VERSION = "TAKARA_STORE_ADMIN_READ_V1";

function toStoreAdminReadModel_(store) {
  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  return Object.freeze({
    contract_version: TAKARA_STORE_ADMIN_READ_VERSION,
    store_id: assertStoreId_(store.store_id),
    store_public_code: assertStorePublicCode_(store.store_public_code),
    status: assertStoreStatus_(store.status),
    created_at: String(store.created_at || ""),
    updated_at: String(store.updated_at || ""),
    deactivated_at: String(store.deactivated_at || ""),
    version: Number(store.version || 0),
    display_name: normalizeStoreDisplayName_(store.display_name),
    contact_name: normalizeStoreOptionalText_(store.contact_name, 120),
    email: normalizeStoreOptionalText_(store.email, 254),
    phone: normalizeStoreOptionalText_(store.phone, 40),
    address_line: normalizeStoreOptionalText_(store.address_line, 240),
    postal_code: normalizeStoreOptionalText_(store.postal_code, 20),
    city: normalizeStoreOptionalText_(store.city, 120),
    province: normalizeStoreOptionalText_(store.province, 120),
    notes: normalizeStoreOptionalText_(store.notes, 1000),
  });
}

function getStoreAdmin_(storeId) {
  requireStoreAdminAccess_();
  return toStoreAdminReadModel_(
    getStoreRuntime_(storeId)
  );
}

function listStoresAdmin_() {
  requireStoreAdminAccess_();

  const stores = listStoresRuntime_().map(function (store) {
    return toStoreAdminReadModel_(store);
  });

  return Object.freeze(stores);
}