const TAKARA_STORE_ADMIN_UI_VERSION = "TAKARA_STORE_ADMIN_UI_V1";

function getStoreAdminUiBootstrap() {
  const stores = listStoresAdmin_();

  return Object.freeze({
    version: TAKARA_STORE_ADMIN_UI_VERSION,
    mode: "MANAGE",
    stores: stores,
  });
}

function getStoreAdminUiStore(storeId) {
  return getStoreAdmin_(storeId);
}

function createStoreAdminUiStore(input) {
  return createStoreAdmin_(input);
}

function updateStoreAdminUiStore(storeId, patch) {
  return updateStoreAdmin_(storeId, patch);
}

function activateStoreAdminUiStore(storeId) {
  return activateStoreAdmin_(storeId);
}

function deactivateStoreAdminUiStore(storeId) {
  return deactivateStoreAdmin_(storeId);
}