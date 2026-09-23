/*
 * TAKARA CONTACT IDEMPOTENCY V1
 * Durable fail-closed ledger for browser-confirmed contact submissions.
 */

const TAKARA_CONTACT_IDEMPOTENCY_VERSION =
  "TAKARA_CONTACT_IDEMPOTENCY_V1";
const TAKARA_CONTACT_IDEMPOTENCY_KEY_PREFIX =
  "TAKARA_CONTACT_IDEMPOTENCY_V1:";
const TAKARA_CONTACT_IDEMPOTENCY_GC_KEY =
  TAKARA_CONTACT_IDEMPOTENCY_KEY_PREFIX + "__GC__";
const TAKARA_CONTACT_IDEMPOTENCY_LEASE_MS =
  5 * 60 * 1000;
const TAKARA_CONTACT_IDEMPOTENCY_RETENTION_MS =
  30 * 24 * 60 * 60 * 1000;
const TAKARA_CONTACT_IDEMPOTENCY_GC_INTERVAL_MS =
  24 * 60 * 60 * 1000;
const TAKARA_CONTACT_REQUEST_ID_PATTERN =
  /^TK-CONTACT-REQ-[A-HJ-NP-Z2-9]{32}$/;

const TAKARA_CONTACT_IDEMPOTENCY_PHASE =
  Object.freeze({
    RESERVED: "RESERVED",
    INTERNAL_EMAIL_IN_FLIGHT: "INTERNAL_EMAIL_IN_FLIGHT",
    INTERNAL_EMAIL_SENT: "INTERNAL_EMAIL_SENT",
    CLIENT_EMAIL_IN_FLIGHT: "CLIENT_EMAIL_IN_FLIGHT",
    COMPLETED: "COMPLETED"
  });

function contactIdempotencyError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function contactIdempotencySha256Hex_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(
      value === undefined || value === null
        ? ""
        : value
    ),
    Utilities.Charset.UTF_8
  );

  return digest.map(function (byte) {
    return (
      ((Number(byte) % 256) + 256) % 256
    )
      .toString(16)
      .padStart(2, "0");
  }).join("").toUpperCase();
}

function canonicalizeContactIdempotencyValue_(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(
      canonicalizeContactIdempotencyValue_
    );
  }

  if (typeof value !== "object") {
    return value;
  }

  const result = {};

  Object.keys(value)
    .sort()
    .forEach(function (key) {
      result[key] =
        canonicalizeContactIdempotencyValue_(
          value[key]
        );
    });

  return result;
}

function buildContactIdempotencyFingerprint_(contacto) {
  const source = {};

  Object.keys(contacto || {}).forEach(
    function (key) {
      if (
        key !== "fecha_cliente" &&
        key !== "request_id"
      ) {
        source[key] = contacto[key];
      }
    }
  );

  return contactIdempotencySha256Hex_(
    JSON.stringify(
      canonicalizeContactIdempotencyValue_(
        source
      )
    )
  );
}

function assertContactIdempotencyRequestId_(value) {
  const requestId = String(value || "")
    .trim()
    .toUpperCase();

  if (
    !TAKARA_CONTACT_REQUEST_ID_PATTERN.test(
      requestId
    )
  ) {
    throw contactIdempotencyError_(
      "CONTACT_IDEMPOTENCY_ID_REQUIRED",
      "La consulta necesita una referencia estable para evitar duplicados."
    );
  }

  return requestId;
}

function contactIdempotencyKey_(requestId) {
  return TAKARA_CONTACT_IDEMPOTENCY_KEY_PREFIX +
    String(requestId || "")
      .trim()
      .toUpperCase();
}

function getContactIdempotencyProperties_() {
  return PropertiesService.getScriptProperties();
}

function withContactIdempotencyLock_(callback) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw contactIdempotencyError_(
      "CONTACT_IDEMPOTENCY_LOCK_BUSY",
      "El registro de contacto esta ocupado. Vuelve a intentarlo."
    );
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function readContactIdempotencyRecord_(
  store,
  requestId
) {
  const raw = store.getProperty(
    contactIdempotencyKey_(requestId)
  );

  if (!raw) {
    return null;
  }

  try {
    const record = JSON.parse(raw);

    if (
      !record ||
      record.version !==
        TAKARA_CONTACT_IDEMPOTENCY_VERSION
    ) {
      throw new Error("version");
    }

    return record;
  } catch (error) {
    throw contactIdempotencyError_(
      "CONTACT_IDEMPOTENCY_CORRUPT",
      "El registro idempotente de contacto esta corrupto y requiere revision."
    );
  }
}

function writeContactIdempotencyRecord_(
  store,
  record
) {
  store.setProperty(
    contactIdempotencyKey_(
      record.request_id
    ),
    JSON.stringify(record)
  );
}

function contactIdempotencyLeaseActive_(
  record,
  now
) {
  if (
    !record ||
    !record.lease_token ||
    !record.lease_until_iso
  ) {
    return false;
  }

  const expires = new Date(
    record.lease_until_iso
  ).getTime();

  return (
    Number.isFinite(expires) &&
    expires > now.getTime()
  );
}

function contactIdempotencyAmbiguous_(phase) {
  return (
    phase ===
      TAKARA_CONTACT_IDEMPOTENCY_PHASE
        .INTERNAL_EMAIL_IN_FLIGHT ||
    phase ===
      TAKARA_CONTACT_IDEMPOTENCY_PHASE
        .CLIENT_EMAIL_IN_FLIGHT
  );
}

function maybeCleanupContactIdempotency_(
  store,
  now
) {
  const previous = store.getProperty(
    TAKARA_CONTACT_IDEMPOTENCY_GC_KEY
  );
  const previousMs = previous
    ? new Date(previous).getTime()
    : 0;

  if (
    Number.isFinite(previousMs) &&
    previousMs > 0 &&
    now.getTime() - previousMs <
      TAKARA_CONTACT_IDEMPOTENCY_GC_INTERVAL_MS
  ) {
    return 0;
  }

  const cutoff =
    now.getTime() -
    TAKARA_CONTACT_IDEMPOTENCY_RETENTION_MS;
  const properties = store.getProperties();
  let removed = 0;

  Object.keys(properties).forEach(
    function (key) {
      if (
        key.indexOf(
          TAKARA_CONTACT_IDEMPOTENCY_KEY_PREFIX
        ) !== 0 ||
        key ===
          TAKARA_CONTACT_IDEMPOTENCY_GC_KEY
      ) {
        return;
      }

      try {
        const record = JSON.parse(
          properties[key]
        );
        const updated = new Date(
          record.updated_at_iso || ""
        ).getTime();

        if (
          record.phase ===
            TAKARA_CONTACT_IDEMPOTENCY_PHASE
              .COMPLETED &&
          Number.isFinite(updated) &&
          updated < cutoff
        ) {
          store.deleteProperty(key);
          removed += 1;
        }
      } catch (error) {
        // Corrupt records remain for review.
      }
    }
  );

  store.setProperty(
    TAKARA_CONTACT_IDEMPOTENCY_GC_KEY,
    now.toISOString()
  );

  return removed;
}

function beginContactIdempotency_(
  requestId,
  fingerprint,
  now
) {
  return withContactIdempotencyLock_(
    function () {
      const store =
        getContactIdempotencyProperties_();

      maybeCleanupContactIdempotency_(
        store,
        now
      );

      let record =
        readContactIdempotencyRecord_(
          store,
          requestId
        );

      if (
        record &&
        record.fingerprint !== fingerprint
      ) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_CONFLICT",
          "La referencia de contacto ya existe con contenido diferente."
        );
      }

      if (
        record &&
        record.phase ===
          TAKARA_CONTACT_IDEMPOTENCY_PHASE
            .COMPLETED
      ) {
        return {
          mode: "COMPLETED",
          token: "",
          record: record,
          ack: record.ack || null
        };
      }

      if (
        record &&
        contactIdempotencyAmbiguous_(
          record.phase
        )
      ) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_REVIEW_REQUIRED",
          "La consulta requiere revision antes de poder reintentarse."
        );
      }

      if (
        record &&
        contactIdempotencyLeaseActive_(
          record,
          now
        )
      ) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_BUSY",
          "La consulta ya se esta procesando."
        );
      }

      const token = Utilities.getUuid();

      if (!record) {
        record = {
          version:
            TAKARA_CONTACT_IDEMPOTENCY_VERSION,
          request_id: requestId,
          fingerprint: fingerprint,
          contact_id:
            generarIdContactoWeb_(now),
          phase:
            TAKARA_CONTACT_IDEMPOTENCY_PHASE
              .RESERVED,
          created_at_iso: now.toISOString(),
          updated_at_iso: now.toISOString(),
          lease_token: "",
          lease_until_iso: "",
          ack: null
        };
      }

      record.lease_token = token;
      record.lease_until_iso = new Date(
        now.getTime() +
          TAKARA_CONTACT_IDEMPOTENCY_LEASE_MS
      ).toISOString();
      record.updated_at_iso =
        now.toISOString();

      writeContactIdempotencyRecord_(
        store,
        record
      );

      return {
        mode: "ACTIVE",
        token: token,
        record: JSON.parse(
          JSON.stringify(record)
        ),
        ack: null
      };
    }
  );
}

function transitionContactIdempotency_(
  requestId,
  token,
  expectedPhase,
  nextPhase,
  patch,
  now
) {
  return withContactIdempotencyLock_(
    function () {
      const store =
        getContactIdempotencyProperties_();
      const record =
        readContactIdempotencyRecord_(
          store,
          requestId
        );

      if (!record) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_MISSING",
          "No existe el registro idempotente de contacto."
        );
      }

      if (
        !token ||
        record.lease_token !== token
      ) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_OWNER_MISMATCH",
          "La ejecucion ya no posee el lease de contacto."
        );
      }

      const expected = Array.isArray(
        expectedPhase
      )
        ? expectedPhase
        : [expectedPhase];

      if (
        expected.indexOf(record.phase) < 0
      ) {
        throw contactIdempotencyError_(
          "CONTACT_IDEMPOTENCY_PHASE_MISMATCH",
          "La consulta no esta en la fase esperada."
        );
      }

      const updates = patch || {};

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "ack"
        )
      ) {
        record.ack = updates.ack;
      }

      record.phase = nextPhase;
      record.updated_at_iso =
        now.toISOString();

      if (
        nextPhase ===
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .COMPLETED
      ) {
        record.lease_token = "";
        record.lease_until_iso = "";
      } else {
        record.lease_until_iso = new Date(
          now.getTime() +
            TAKARA_CONTACT_IDEMPOTENCY_LEASE_MS
        ).toISOString();
      }

      writeContactIdempotencyRecord_(
        store,
        record
      );

      return JSON.parse(
        JSON.stringify(record)
      );
    }
  );
}

function releaseContactIdempotencyLease_(
  requestId,
  token,
  now
) {
  if (!token) {
    return false;
  }

  return withContactIdempotencyLock_(
    function () {
      const store =
        getContactIdempotencyProperties_();
      const record =
        readContactIdempotencyRecord_(
          store,
          requestId
        );

      if (
        !record ||
        record.lease_token !== token
      ) {
        return false;
      }

      if (
        record.phase ===
        TAKARA_CONTACT_IDEMPOTENCY_PHASE
          .COMPLETED
      ) {
        return true;
      }

      record.lease_token = "";
      record.lease_until_iso = "";
      record.updated_at_iso =
        now.toISOString();

      writeContactIdempotencyRecord_(
        store,
        record
      );

      return true;
    }
  );
}
