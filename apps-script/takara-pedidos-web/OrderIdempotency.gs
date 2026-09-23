/*
 * TAKARA ORDER IDEMPOTENCY V1
 * Durable, fail-closed execution ledger for real order side effects.
 */

const TAKARA_ORDER_IDEMPOTENCY_VERSION = "TAKARA_ORDER_IDEMPOTENCY_V1";
const TAKARA_ORDER_IDEMPOTENCY_KEY_PREFIX = "TAKARA_ORDER_IDEMPOTENCY_V1:";
const TAKARA_ORDER_IDEMPOTENCY_GC_KEY = TAKARA_ORDER_IDEMPOTENCY_KEY_PREFIX + "__GC__";
const TAKARA_ORDER_IDEMPOTENCY_LEASE_MS = 5 * 60 * 1000;
const TAKARA_ORDER_IDEMPOTENCY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const TAKARA_ORDER_IDEMPOTENCY_GC_INTERVAL_MS = 24 * 60 * 60 * 1000;

const TAKARA_ORDER_IDEMPOTENCY_PHASE = Object.freeze({
  RESERVED: "RESERVED",
  PHOTO_IN_FLIGHT: "PHOTO_IN_FLIGHT",
  PHOTO_SAVED: "PHOTO_SAVED",
  INTERNAL_EMAIL_IN_FLIGHT: "INTERNAL_EMAIL_IN_FLIGHT",
  INTERNAL_EMAIL_SENT: "INTERNAL_EMAIL_SENT",
  CLIENT_EMAIL_IN_FLIGHT: "CLIENT_EMAIL_IN_FLIGHT",
  CLIENT_EMAIL_SENT: "CLIENT_EMAIL_SENT",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  COMPLETED: "COMPLETED"
});

function orderIdempotencyError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function orderIdempotencySha256Hex_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value === undefined || value === null ? "" : value),
    Utilities.Charset.UTF_8
  );

  return digest.map(function (byte) {
    return (((Number(byte) % 256) + 256) % 256)
      .toString(16)
      .padStart(2, "0");
  }).join("").toUpperCase();
}

function canonicalizeOrderIdempotencyValue_(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(canonicalizeOrderIdempotencyValue_);
  }
  if (typeof value !== "object") return value;

  const result = {};
  Object.keys(value).sort().forEach(function (key) {
    result[key] = canonicalizeOrderIdempotencyValue_(value[key]);
  });
  return result;
}

function buildOrderIdempotencyFingerprint_(pedido) {
  const input = pedido || {};
  const source = {};

  Object.keys(input).forEach(function (key) {
    if (key !== "recibido_apps_script_iso") {
      source[key] = input[key];
    }
  });

  if (input.archivos && typeof input.archivos === "object") {
    const archivos = {};

    Object.keys(input.archivos).forEach(function (key) {
      const value = input.archivos[key];

      if (key === "foto_base64") {
        archivos.foto_sha256 = orderIdempotencySha256Hex_(value);
        return;
      }

      if (key === "ficha_visual_base64") {
        archivos.ficha_visual_sha256 = orderIdempotencySha256Hex_(value);
        return;
      }

      archivos[key] = value;
    });

    source.archivos = archivos;
  }

  const canonical = JSON.stringify(
    canonicalizeOrderIdempotencyValue_(source)
  );

  return orderIdempotencySha256Hex_(canonical);
}

function assertOrderIdempotencyOrderId_(payload, resolvedOrderId) {
  const raw = String(
    payload && payload.pedido_web_id !== undefined
      ? payload.pedido_web_id
      : ""
  ).trim().toUpperCase();
  const resolved = String(resolvedOrderId || "").trim().toUpperCase();

  if (
    !/^TK-WEB-[A-Z0-9-]{6,80}$/.test(raw) ||
    !resolved ||
    raw !== resolved
  ) {
    throw orderIdempotencyError_(
      "ORDER_IDEMPOTENCY_ID_REQUIRED",
      "El pedido real necesita una referencia web estable para evitar duplicados."
    );
  }

  return raw;
}

function summarizeOrderVisualProof_(fichaVisual) {
  const source = fichaVisual || {};
  return {
    ficha_visual_recibida: !!source.ficha_visual_recibida,
    estado: String(source.estado || ""),
    nombre_archivo: String(source.nombre_archivo || "")
  };
}

function orderIdempotencyKey_(orderId) {
  return TAKARA_ORDER_IDEMPOTENCY_KEY_PREFIX + String(orderId || "").trim();
}

function getOrderIdempotencyProperties_() {
  return PropertiesService.getScriptProperties();
}

function withOrderIdempotencyLock_(callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    throw orderIdempotencyError_(
      "ORDER_IDEMPOTENCY_LOCK_BUSY",
      "El registro de pedidos esta ocupado. Vuelve a intentarlo."
    );
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function readOrderIdempotencyRecord_(store, orderId) {
  const raw = store.getProperty(orderIdempotencyKey_(orderId));
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (!record || record.version !== TAKARA_ORDER_IDEMPOTENCY_VERSION) {
      throw new Error("version");
    }
    return record;
  } catch (error) {
    throw orderIdempotencyError_(
      "ORDER_IDEMPOTENCY_CORRUPT",
      "El registro idempotente del pedido esta corrupto y requiere revision."
    );
  }
}

function writeOrderIdempotencyRecord_(store, record) {
  store.setProperty(
    orderIdempotencyKey_(record.order_id),
    JSON.stringify(record)
  );
}

function orderIdempotencyLeaseActive_(record, now) {
  if (!record || !record.lease_token || !record.lease_until_iso) return false;
  const expires = new Date(record.lease_until_iso).getTime();
  return Number.isFinite(expires) && expires > now.getTime();
}

function orderIdempotencyReviewPhase_(phase) {
  return phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT ||
    phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT ||
    phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT ||
    phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.REVIEW_REQUIRED;
}

function maybeCleanupOrderIdempotency_(store, now) {
  const previous = store.getProperty(TAKARA_ORDER_IDEMPOTENCY_GC_KEY);
  const previousMs = previous ? new Date(previous).getTime() : 0;
  if (Number.isFinite(previousMs) &&
      previousMs > 0 &&
      now.getTime() - previousMs < TAKARA_ORDER_IDEMPOTENCY_GC_INTERVAL_MS) {
    return 0;
  }

  const cutoff = now.getTime() - TAKARA_ORDER_IDEMPOTENCY_RETENTION_MS;
  const properties = store.getProperties();
  let removed = 0;

  Object.keys(properties).forEach(function (key) {
    if (key.indexOf(TAKARA_ORDER_IDEMPOTENCY_KEY_PREFIX) !== 0 ||
        key === TAKARA_ORDER_IDEMPOTENCY_GC_KEY) {
      return;
    }
    try {
      const record = JSON.parse(properties[key]);
      const updated = new Date(record.updated_at_iso || "").getTime();
      if (record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.COMPLETED &&
          Number.isFinite(updated) &&
          updated < cutoff) {
        store.deleteProperty(key);
        removed += 1;
      }
    } catch (error) {
      // Corrupt records are deliberately preserved for manual review.
    }
  });

  store.setProperty(TAKARA_ORDER_IDEMPOTENCY_GC_KEY, now.toISOString());
  return removed;
}

function beginOrderIdempotency_(orderId, fingerprint, now) {
  return withOrderIdempotencyLock_(function () {
    const store = getOrderIdempotencyProperties_();
    maybeCleanupOrderIdempotency_(store, now);
    let record = readOrderIdempotencyRecord_(store, orderId);

    if (record && record.fingerprint !== fingerprint) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_CONFLICT",
        "El identificador del pedido ya existe con contenido diferente."
      );
    }

    if (record && record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.COMPLETED) {
      return {
        mode: "COMPLETED",
        created: false,
        token: "",
        record: record,
        ack: record.ack || null
      };
    }

    if (record && orderIdempotencyReviewPhase_(record.phase)) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_REVIEW_REQUIRED",
        "El pedido requiere revision manual antes de poder reintentarse."
      );
    }

    if (record && orderIdempotencyLeaseActive_(record, now)) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_BUSY",
        "El pedido ya se esta procesando."
      );
    }

    const token = Utilities.getUuid();
    const created = !record;
    if (!record) {
      record = {
        version: TAKARA_ORDER_IDEMPOTENCY_VERSION,
        order_id: orderId,
        fingerprint: fingerprint,
        phase: TAKARA_ORDER_IDEMPOTENCY_PHASE.RESERVED,
        created_at_iso: now.toISOString(),
        updated_at_iso: now.toISOString(),
        lease_token: "",
        lease_until_iso: "",
        photo: null,
        visual_proof: null,
        ack: null,
        review_note: ""
      };
    }

    record.lease_token = token;
    record.lease_until_iso = new Date(
      now.getTime() + TAKARA_ORDER_IDEMPOTENCY_LEASE_MS
    ).toISOString();
    record.updated_at_iso = now.toISOString();
    writeOrderIdempotencyRecord_(store, record);

    return {
      mode: created ? "NEW" : "RESUME",
      created: created,
      token: token,
      record: JSON.parse(JSON.stringify(record)),
      ack: null
    };
  });
}

function transitionOrderIdempotency_(
  orderId,
  token,
  expectedPhase,
  nextPhase,
  patch,
  now
) {
  return withOrderIdempotencyLock_(function () {
    const store = getOrderIdempotencyProperties_();
    const record = readOrderIdempotencyRecord_(store, orderId);
    if (!record) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_MISSING",
        "No existe el registro idempotente del pedido."
      );
    }
    if (!token || record.lease_token !== token) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_OWNER_MISMATCH",
        "La ejecucion ya no posee el lease del pedido."
      );
    }

    const expected = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
    if (expected.indexOf(record.phase) < 0) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_PHASE_MISMATCH",
        "El pedido no esta en la fase esperada."
      );
    }

    const updates = patch || {};
    if (Object.prototype.hasOwnProperty.call(updates, "photo")) {
      record.photo = updates.photo;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "visual_proof")) {
      record.visual_proof = updates.visual_proof;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "ack")) {
      record.ack = updates.ack;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "review_note")) {
      record.review_note = String(updates.review_note || "");
    }

    record.phase = nextPhase;
    record.updated_at_iso = now.toISOString();

    if (nextPhase === TAKARA_ORDER_IDEMPOTENCY_PHASE.COMPLETED) {
      record.lease_token = "";
      record.lease_until_iso = "";
    } else {
      record.lease_until_iso = new Date(
        now.getTime() + TAKARA_ORDER_IDEMPOTENCY_LEASE_MS
      ).toISOString();
    }

    writeOrderIdempotencyRecord_(store, record);
    return JSON.parse(JSON.stringify(record));
  });
}

function releaseOrderIdempotencyLease_(orderId, token, now) {
  if (!token) return false;
  return withOrderIdempotencyLock_(function () {
    const store = getOrderIdempotencyProperties_();
    const record = readOrderIdempotencyRecord_(store, orderId);
    if (!record || record.lease_token !== token) return false;
    if (record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.COMPLETED) return true;

    record.lease_token = "";
    record.lease_until_iso = "";
    record.updated_at_iso = now.toISOString();
    writeOrderIdempotencyRecord_(store, record);
    return true;
  });
}

function resolveOrderIdempotencyReview_(orderId, nextPhase, note, now) {
  return withOrderIdempotencyLock_(function () {
    const store = getOrderIdempotencyProperties_();
    const record = readOrderIdempotencyRecord_(store, orderId);
    if (!record || !orderIdempotencyReviewPhase_(record.phase)) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_NOT_IN_REVIEW",
        "El pedido no esta en una fase que requiera recuperacion manual."
      );
    }

    const allowed =
      record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT
        ? [
            TAKARA_ORDER_IDEMPOTENCY_PHASE.RESERVED
          ]
        : record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT
          ? [
              TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED,
              TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT
            ]
          : record.phase === TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT
            ? [
                TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT,
                TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_SENT
              ]
            : [
                TAKARA_ORDER_IDEMPOTENCY_PHASE.RESERVED,
                TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_SAVED,
                TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_SENT,
                TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_SENT
              ];

    if (allowed.indexOf(nextPhase) < 0) {
      throw orderIdempotencyError_(
        "ORDER_IDEMPOTENCY_INVALID_RECOVERY",
        "La fase de recuperacion solicitada no es valida."
      );
    }

    record.phase = nextPhase;
    record.review_note = String(note || "");
    record.updated_at_iso = now.toISOString();
    record.lease_token = "";
    record.lease_until_iso = "";
    writeOrderIdempotencyRecord_(store, record);
    return JSON.parse(JSON.stringify(record));
  });
}
