const TAKARA_STORE_ADMIN_ACCESS_VERSION = "TAKARA_STORE_ADMIN_ACCESS_V1";
const TAKARA_STORE_ADMIN_OWNER_PROPERTY = "TAKARA_STORE_ADMIN_OWNER_EMAIL";
const TAKARA_STORE_ADMIN_ROLE = "OWNER";

function normalizeStoreAdminEmail_(value) {
  const email = String(value || "").trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "";
  }

  return email;
}

function getConfiguredStoreAdminOwnerEmail_() {
  const properties = PropertiesService.getScriptProperties();

  if (!properties || typeof properties.getProperty !== "function") {
    throw new Error("STORE_ADMIN_CONFIGURATION_INVALID");
  }

  const ownerEmail = normalizeStoreAdminEmail_(
    properties.getProperty(TAKARA_STORE_ADMIN_OWNER_PROPERTY)
  );

  if (!ownerEmail) {
    throw new Error("STORE_ADMIN_CONFIGURATION_INVALID");
  }

  return ownerEmail;
}

function getActiveStoreAdminEmail_() {
  if (
    typeof Session === "undefined" ||
    !Session ||
    typeof Session.getActiveUser !== "function"
  ) {
    throw new Error("STORE_ADMIN_UNAUTHENTICATED");
  }

  const user = Session.getActiveUser();

  if (!user || typeof user.getEmail !== "function") {
    throw new Error("STORE_ADMIN_UNAUTHENTICATED");
  }

  const activeEmail = normalizeStoreAdminEmail_(user.getEmail());

  if (!activeEmail) {
    throw new Error("STORE_ADMIN_UNAUTHENTICATED");
  }

  return activeEmail;
}

function requireStoreAdminAccess_() {
  const ownerEmail = getConfiguredStoreAdminOwnerEmail_();
  const activeEmail = getActiveStoreAdminEmail_();

  if (activeEmail !== ownerEmail) {
    throw new Error("STORE_ADMIN_FORBIDDEN");
  }

  return Object.freeze({
    version: TAKARA_STORE_ADMIN_ACCESS_VERSION,
    role: TAKARA_STORE_ADMIN_ROLE,
    authorized: true,
  });
}