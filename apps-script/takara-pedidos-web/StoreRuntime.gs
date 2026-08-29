/**
 * TAKARA STORE RUNTIME V1
 *
 * Composition root for Store Registry inside the existing Apps Script project.
 * This module wires application services to the Google Sheets adapter.
 * It does not expose HTTP routes and does not own order processing.
 */

function getStoreRuntimeRepository_() {
  return createStoreSheetsRepository_();
}

function getStoreRuntimeDependencies_() {
  return createStoreRuntimeDependencies_();
}

function createStoreRuntime_(input) {
  return createStoreService_(
    getStoreRuntimeRepository_(),
    input,
    getStoreRuntimeDependencies_()
  );
}

function resolveStoreContextRuntime_(storePublicCode) {
  return resolveStoreContextService_(
    getStoreRuntimeRepository_(),
    storePublicCode
  );
}

function resolveStoreOrderIdentityRuntime_(storePublicCode) {
  return resolveStoreOrderIdentityService_(
    getStoreRuntimeRepository_(),
    storePublicCode
  );
}

function updateStoreRuntime_(storeId, patch) {
  return updateStoreService_(
    getStoreRuntimeRepository_(),
    storeId,
    patch,
    getStoreRuntimeDependencies_()
  );
}

function activateStoreRuntime_(storeId) {
  return setStoreStatusService_(
    getStoreRuntimeRepository_(),
    storeId,
    TAKARA_STORE_STATUS.ACTIVE,
    getStoreRuntimeDependencies_()
  );
}

function deactivateStoreRuntime_(storeId) {
  return setStoreStatusService_(
    getStoreRuntimeRepository_(),
    storeId,
    TAKARA_STORE_STATUS.INACTIVE,
    getStoreRuntimeDependencies_()
  );
}