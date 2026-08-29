const TAKARA_STORE_ADMIN_WRITE_VERSION = "TAKARA_STORE_ADMIN_WRITE_V1";

const TAKARA_STORE_ADMIN_EDITABLE_FIELDS = Object.freeze([
  "display_name",
  "contact_name",
  "email",
  "phone",
  "address_line",
  "postal_code",
  "city",
  "province",
  "notes",
]);

function assertStoreAdminWriteInput_(input, requireDisplayName) {
  if (
    !input ||
    Object.prototype.toString.call(input) !== "[object Object]"
  ) {
    throw storeDomainError_(
      "STORE_ADMIN_INPUT_INVALID",
      "Store Admin input must be an object."
    );
  }

  const keys = Object.keys(input);
  const unexpected = keys.filter(function (key) {
    return TAKARA_STORE_ADMIN_EDITABLE_FIELDS.indexOf(key) < 0;
  });

  if (unexpected.length) {
    throw storeDomainError_(
      "STORE_ADMIN_INPUT_FORBIDDEN_FIELD",
      "Store Admin input contains forbidden fields."
    );
  }

  if (
    requireDisplayName &&
    !Object.prototype.hasOwnProperty.call(input, "display_name")
  ) {
    throw storeDomainError_(
      "STORE_ADMIN_DISPLAY_NAME_REQUIRED",
      "Store display_name is required."
    );
  }

  if (!keys.length) {
    throw storeDomainError_(
      "STORE_ADMIN_INPUT_EMPTY",
      "Store Admin input is empty."
    );
  }

  return keys.reduce(function (result, key) {
    result[key] = input[key];
    return result;
  }, {});
}

function createStoreAdmin_(input) {
  requireStoreAdminAccess_();

  const createInput = assertStoreAdminWriteInput_(input, true);

  return toStoreAdminReadModel_(
    createStoreRuntime_(createInput)
  );
}

function updateStoreAdmin_(storeId, patch) {
  requireStoreAdminAccess_();

  const normalizedStoreId = assertStoreId_(storeId);
  const updatePatch = assertStoreAdminWriteInput_(patch, false);

  return toStoreAdminReadModel_(
    updateStoreRuntime_(normalizedStoreId, updatePatch)
  );
}

function activateStoreAdmin_(storeId) {
  requireStoreAdminAccess_();

  const normalizedStoreId = assertStoreId_(storeId);

  return toStoreAdminReadModel_(
    activateStoreRuntime_(normalizedStoreId)
  );
}

function deactivateStoreAdmin_(storeId) {
  requireStoreAdminAccess_();

  const normalizedStoreId = assertStoreId_(storeId);

  return toStoreAdminReadModel_(
    deactivateStoreRuntime_(normalizedStoreId)
  );
}