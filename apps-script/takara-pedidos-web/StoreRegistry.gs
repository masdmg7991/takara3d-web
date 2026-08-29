/**
 * TAKARA STORE REGISTRY APPLICATION V1
 *
 * Application services depend on a repository port supplied by infrastructure.
 * They do not know Google Sheets, HTTP, Admin UI or the order engine.
 */

function assertStoreRepositoryPort_(repository) {
  const required = [
    "withWriteLock",
    "nextStoreSequence",
    "findById",
    "findByPublicCode",
    "insert",
    "update",
  ];

  if (!repository) {
    throw storeDomainError_("STORE_REPOSITORY_REQUIRED", "Store repository is required.");
  }

  required.forEach(function (method) {
    if (typeof repository[method] !== "function") {
      throw storeDomainError_(
        "STORE_REPOSITORY_INVALID",
        "Store repository does not implement " + method + "."
      );
    }
  });

  return repository;
}

function createStoreService_(repository, input, dependencies) {
  const repo = assertStoreRepositoryPort_(repository);
  const deps = dependencies || {};

  if (typeof deps.nowIso !== "function") {
    throw storeDomainError_("STORE_CLOCK_REQUIRED", "Store clock dependency is required.");
  }
  if (typeof deps.createPublicCode !== "function") {
    throw storeDomainError_(
      "STORE_PUBLIC_CODE_FACTORY_REQUIRED",
      "Store public code factory is required."
    );
  }

  return repo.withWriteLock(function () {
    const storeId = buildStoreId_(repo.nextStoreSequence());
    const publicCode = assertStorePublicCode_(deps.createPublicCode());

    if (repo.findById(storeId)) {
      throw storeDomainError_("STORE_ID_COLLISION", "Generated store_id already exists.");
    }
    if (repo.findByPublicCode(publicCode)) {
      throw storeDomainError_(
        "STORE_PUBLIC_CODE_COLLISION",
        "Generated store_public_code already exists."
      );
    }

    const record = createStoreRecord_({
      store_id: storeId,
      store_public_code: publicCode,
      timestamp: deps.nowIso(),
      data: input,
    });

    repo.insert(record);
    return Object.assign({}, record);
  });
}

function resolveStoreContextService_(repository, storePublicCode) {
  const repo = assertStoreRepositoryPort_(repository);
  const publicCode = assertStorePublicCode_(storePublicCode);
  const store = repo.findByPublicCode(publicCode);

  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  return toStoreContext_(store);
}

function updateStoreService_(repository, storeId, patch, dependencies) {
  const repo = assertStoreRepositoryPort_(repository);
  const deps = dependencies || {};

  if (typeof deps.nowIso !== "function") {
    throw storeDomainError_("STORE_CLOCK_REQUIRED", "Store clock dependency is required.");
  }

  return repo.withWriteLock(function () {
    const normalizedStoreId = assertStoreId_(storeId);
    const current = repo.findById(normalizedStoreId);

    if (!current) {
      throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
    }

    const updated = updateStoreData_(current, patch, deps.nowIso());
    repo.update(updated);
    return Object.assign({}, updated);
  });
}

function setStoreStatusService_(repository, storeId, nextStatus, dependencies) {
  const repo = assertStoreRepositoryPort_(repository);
  const deps = dependencies || {};

  if (typeof deps.nowIso !== "function") {
    throw storeDomainError_("STORE_CLOCK_REQUIRED", "Store clock dependency is required.");
  }

  return repo.withWriteLock(function () {
    const normalizedStoreId = assertStoreId_(storeId);
    const current = repo.findById(normalizedStoreId);

    if (!current) {
      throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
    }

    const updated = setStoreStatus_(current, nextStatus, deps.nowIso());
    repo.update(updated);
    return Object.assign({}, updated);
  });
}