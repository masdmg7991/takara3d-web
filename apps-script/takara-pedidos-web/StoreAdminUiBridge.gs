const TAKARA_STORE_ADMIN_UI_VERSION = "TAKARA_STORE_ADMIN_UI_V1";

function getStoreAdminUiBootstrap() {
  const stores = listStoresAdmin_();

  return Object.freeze({
    version: TAKARA_STORE_ADMIN_UI_VERSION,
    mode: "READ_ONLY",
    stores: stores,
  });
}

function getStoreAdminUiStore(storeId) {
  return getStoreAdmin_(storeId);
}