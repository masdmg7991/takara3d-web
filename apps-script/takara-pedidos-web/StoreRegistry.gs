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

function assertStoreLookupRepositoryPort_(repository) {
  if (!repository) {
    throw storeDomainError_(
      "STORE_REPOSITORY_REQUIRED",
      "Store repository is required."
    );
  }
  if (typeof repository.findById !== "function") {
    throw storeDomainError_(
      "STORE_REPOSITORY_INVALID",
      "Store lookup repository does not implement findById."
    );
  }
  return repository;
}

function assertStoreBrandingRepositoryPort_(repository) {
  const required = [
    "withWriteLock",
    "findByPublicCode",
    "upsert",
    "storeLogo",
    "readLogoDataUrl",
    "trashLogo",
  ];

  if (!repository) {
    throw storeDomainError_(
      "STORE_BRANDING_REPOSITORY_REQUIRED",
      "Store branding repository is required."
    );
  }
  required.forEach(function (method) {
    if (typeof repository[method] !== "function") {
      throw storeDomainError_(
        "STORE_BRANDING_REPOSITORY_INVALID",
        "Store branding repository does not implement " + method + "."
      );
    }
  });
  return repository;
}

function safeStoreBrandingLogoDataUrl_(repository, record) {
  if (!record.logo_file_id) return "";
  try {
    return String(repository.readLogoDataUrl(record) || "");
  } catch (error) {
    return "";
  }
}

function getStoreBrandingService_(storeRepository, brandingRepository, storeId) {
  const storeRepo = assertStoreLookupRepositoryPort_(storeRepository);
  const brandingRepo = assertStoreBrandingRepositoryPort_(brandingRepository);
  const store = storeRepo.findById(assertStoreId_(storeId));
  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  const publicCode = assertStorePublicCode_(store.store_public_code);
  const record = normalizeStoreBrandingRecord_(
    brandingRepo.findByPublicCode(publicCode),
    publicCode
  );
  return toStoreBrandingAdmin_(
    record,
    safeStoreBrandingLogoDataUrl_(brandingRepo, record)
  );
}

function resolveStoreBrandingPublicService_(brandingRepository, storePublicCode) {
  const brandingRepo = assertStoreBrandingRepositoryPort_(brandingRepository);
  const publicCode = assertStorePublicCode_(storePublicCode);
  const record = normalizeStoreBrandingRecord_(
    brandingRepo.findByPublicCode(publicCode),
    publicCode
  );
  return toStoreBrandingPublic_(
    record,
    safeStoreBrandingLogoDataUrl_(brandingRepo, record)
  );
}

function updateStoreBrandingService_(
  storeRepository,
  brandingRepository,
  storeId,
  input,
  dependencies
) {
  const storeRepo = assertStoreLookupRepositoryPort_(storeRepository);
  const brandingRepo = assertStoreBrandingRepositoryPort_(brandingRepository);
  const deps = dependencies || {};
  if (typeof deps.nowIso !== "function") {
    throw storeDomainError_("STORE_CLOCK_REQUIRED", "Store clock dependency is required.");
  }

  const normalizedInput = normalizeStoreBrandingUpdateInput_(input);
  const store = storeRepo.findById(assertStoreId_(storeId));
  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }
  const publicCode = assertStorePublicCode_(store.store_public_code);

  return brandingRepo.withWriteLock(function () {
    const current = normalizeStoreBrandingRecord_(
      brandingRepo.findByPublicCode(publicCode),
      publicCode
    );
    let nextLogo = {
      file_id: current.logo_file_id,
      mime_type: current.logo_mime_type,
      file_name: current.logo_file_name,
    };
    let createdLogo = null;

    if (normalizedInput.logo) {
      createdLogo = brandingRepo.storeLogo(publicCode, normalizedInput.logo);
      nextLogo = {
        file_id: normalizeStoreOptionalText_(createdLogo && createdLogo.file_id, 256),
        mime_type: normalizeStoreOptionalText_(createdLogo && createdLogo.mime_type, 80),
        file_name: normalizeStoreOptionalText_(createdLogo && createdLogo.file_name, 180),
      };
      if (
        !nextLogo.file_id ||
        TAKARA_STORE_LOGO_ALLOWED_MIME_TYPES.indexOf(nextLogo.mime_type) < 0
      ) {
        try {
          if (nextLogo.file_id) brandingRepo.trashLogo(nextLogo.file_id);
        } catch (cleanupError) {}
        throw storeDomainError_(
          "STORE_BRANDING_LOGO_STORE_FAILED",
          "Store logo storage returned invalid metadata."
        );
      }
    } else if (normalizedInput.remove_logo) {
      nextLogo = { file_id: "", mime_type: "", file_name: "" };
    }

    if (storeBrandingModeUsesLogo_(normalizedInput.mode) && !nextLogo.file_id) {
      if (createdLogo && createdLogo.file_id) {
        try { brandingRepo.trashLogo(createdLogo.file_id); } catch (cleanupError) {}
      }
      throw storeDomainError_(
        "STORE_BRANDING_LOGO_REQUIRED",
        "Logo mode requires a Store logo."
      );
    }

    const timestamp = String(deps.nowIso() || "").trim();
    if (!timestamp) {
      if (createdLogo && createdLogo.file_id) {
        try { brandingRepo.trashLogo(createdLogo.file_id); } catch (cleanupError) {}
      }
      throw storeDomainError_(
        "STORE_TIMESTAMP_REQUIRED",
        "Store branding timestamp is required."
      );
    }

    const nextRecord = {
      store_public_code: publicCode,
      mode: normalizedInput.mode,
      logo_file_id: nextLogo.file_id,
      logo_mime_type: nextLogo.mime_type,
      logo_file_name: nextLogo.file_name,
      updated_at: timestamp,
      version: Number(current.version || 0) + 1,
    };

    try {
      brandingRepo.upsert(nextRecord);
    } catch (error) {
      if (createdLogo && createdLogo.file_id) {
        try { brandingRepo.trashLogo(createdLogo.file_id); } catch (cleanupError) {}
      }
      throw error;
    }

    // Preserve previously referenced logos as private recovery history.
    // Only newly created, uncommitted logos are trashed on failure above.

    return toStoreBrandingAdmin_(
      nextRecord,
      safeStoreBrandingLogoDataUrl_(brandingRepo, nextRecord)
    );
  });
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

function assertStoreReadRepositoryPort_(repository) {
  const repo = assertStoreLookupRepositoryPort_(repository);
  if (typeof repo.listAll !== "function") {
    throw storeDomainError_(
      "STORE_REPOSITORY_INVALID",
      "Store read repository does not implement listAll."
    );
  }
  return repo;
}

function getStoreService_(repository, storeId) {
  const repo = assertStoreLookupRepositoryPort_(repository);
  const normalizedStoreId = assertStoreId_(storeId);
  const store = repo.findById(normalizedStoreId);

  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  return Object.assign({}, store);
}

function listStoresService_(repository) {
  const repo = assertStoreReadRepositoryPort_(repository);
  const stores = repo.listAll();

  if (!Array.isArray(stores)) {
    throw storeDomainError_(
      "STORE_REPOSITORY_INVALID",
      "Store read repository returned an invalid list."
    );
  }

  return stores
    .map(function (store) {
      assertStoreId_(store && store.store_id);
      return Object.assign({}, store);
    })
    .sort(function (left, right) {
      return String(left.store_id).localeCompare(String(right.store_id));
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

function resolveStoreOrderIdentityService_(repository, storePublicCode) {
  const repo = assertStoreRepositoryPort_(repository);
  const publicCode = assertStorePublicCode_(storePublicCode);
  const store = repo.findByPublicCode(publicCode);

  if (!store) {
    throw storeDomainError_("STORE_NOT_FOUND", "Store not found.");
  }

  return toStoreOrderIdentity_(store);
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