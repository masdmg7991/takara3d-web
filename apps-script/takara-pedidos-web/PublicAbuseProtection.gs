/*
 * TAKARA PUBLIC ABUSE PROTECTION V1
 * Persistent, privacy-preserving guard for public side effects.
 */

const TAKARA_PUBLIC_ABUSE_VERSION = "TAKARA_PUBLIC_ABUSE_GUARD_V1";
const TAKARA_PUBLIC_ABUSE_STATE_KEY = "TAKARA_PUBLIC_ABUSE_GUARD_V1:STATE";

const TAKARA_PUBLIC_ABUSE_CONFIG = Object.freeze({
  MAIL_RESERVE_RECIPIENTS: 20,
  DAILY_MAX_PUBLIC_RECIPIENTS: 200,
  DAILY_WINDOW_MS: 24 * 60 * 60 * 1000,
  GLOBAL_BURST_WINDOW_MS: 5 * 60 * 1000,
  GLOBAL_BURST_MAX_SUBMISSIONS: 20,
  CONTACT_ACTOR_WINDOW_MS: 15 * 60 * 1000,
  CONTACT_ACTOR_MAX_SUBMISSIONS: 3,
  ORDER_ACTOR_WINDOW_MS: 30 * 60 * 1000,
  ORDER_ACTOR_MAX_SUBMISSIONS: 5,
  MAX_ACTOR_ENTRIES: 80
});

function publicAbuseError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function publicAbuseSha256Hex_(value) {
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

function normalizePublicAbuseActor_(value) {
  return String(value || "").trim().toLowerCase();
}

function publicAbuseRouteConfig_(route) {
  const normalized = String(route || "").trim().toUpperCase();

  if (normalized === "CONTACT") {
    return {
      route: normalized,
      actor_window_ms: TAKARA_PUBLIC_ABUSE_CONFIG.CONTACT_ACTOR_WINDOW_MS,
      actor_max: TAKARA_PUBLIC_ABUSE_CONFIG.CONTACT_ACTOR_MAX_SUBMISSIONS
    };
  }

  if (normalized === "ORDER") {
    return {
      route: normalized,
      actor_window_ms: TAKARA_PUBLIC_ABUSE_CONFIG.ORDER_ACTOR_WINDOW_MS,
      actor_max: TAKARA_PUBLIC_ABUSE_CONFIG.ORDER_ACTOR_MAX_SUBMISSIONS
    };
  }

  throw publicAbuseError_(
    "PUBLIC_ABUSE_ROUTE_INVALID",
    "La ruta publica no tiene una politica anti-abuso valida."
  );
}

function publicAbuseActorKey_(route, actorValue) {
  const actor = normalizePublicAbuseActor_(actorValue);

  if (!actor) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_ACTOR_REQUIRED",
      "No se puede proteger la solicitud sin identidad de contacto."
    );
  }

  return String(route || "").toUpperCase() + ":" +
    publicAbuseSha256Hex_(actor).slice(0, 24);
}

function getPublicAbuseProperties_() {
  return PropertiesService.getScriptProperties();
}

function withPublicAbuseLock_(callback) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_LOCK_BUSY",
      "La proteccion de solicitudes esta ocupada. Vuelve a intentarlo."
    );
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function newPublicAbuseState_(now, observedQuota) {
  const safeQuota = Math.max(
    0,
    Number(observedQuota) - TAKARA_PUBLIC_ABUSE_CONFIG.MAIL_RESERVE_RECIPIENTS
  );

  return {
    version: TAKARA_PUBLIC_ABUSE_VERSION,
    daily_started_at_ms: now.getTime(),
    daily_budget_recipients: Math.min(
      TAKARA_PUBLIC_ABUSE_CONFIG.DAILY_MAX_PUBLIC_RECIPIENTS,
      safeQuota
    ),
    daily_used_recipients: 0,
    burst_started_at_ms: now.getTime(),
    burst_count: 0,
    actors: []
  };
}

function publicAbuseActorWindowMs_(route) {
  return publicAbuseRouteConfig_(route).actor_window_ms;
}

function assertPublicAbuseStateShape_(state, nowMs) {
  const numericFields = [
    "daily_started_at_ms",
    "daily_budget_recipients",
    "daily_used_recipients",
    "burst_started_at_ms",
    "burst_count"
  ];

  numericFields.forEach(function (field) {
    if (!Number.isFinite(Number(state[field])) || Number(state[field]) < 0) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_STATE_CORRUPT",
        "El estado anti-abuso contiene contadores invalidos."
      );
    }
  });

  if (
    Number(state.daily_budget_recipients) >
      TAKARA_PUBLIC_ABUSE_CONFIG.DAILY_MAX_PUBLIC_RECIPIENTS ||
    Number(state.daily_used_recipients) >
      Number(state.daily_budget_recipients) ||
    Number(state.burst_count) >
      TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_MAX_SUBMISSIONS
  ) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_CORRUPT",
      "El estado anti-abuso contiene limites incoherentes."
    );
  }

  if (
    Number(state.daily_started_at_ms) >
      nowMs + TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_WINDOW_MS ||
    Number(state.burst_started_at_ms) >
      nowMs + TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_WINDOW_MS
  ) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_CORRUPT",
      "El estado anti-abuso contiene tiempos futuros invalidos."
    );
  }

  if (
    !Array.isArray(state.actors) ||
    state.actors.length > TAKARA_PUBLIC_ABUSE_CONFIG.MAX_ACTOR_ENTRIES
  ) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_CORRUPT",
      "El estado anti-abuso contiene actores invalidos."
    );
  }

  state.actors.forEach(function (entry) {
    const routeConfig = publicAbuseRouteConfig_(entry && entry.r);
    const count = Number(entry && entry.c);
    const started = Number(entry && entry.s);

    if (
      !entry ||
      !new RegExp("^" + routeConfig.route + ":[A-F0-9]{24}$").test(
        String(entry.k || "")
      ) ||
      !Number.isFinite(started) ||
      started < 0 ||
      started > nowMs + TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_WINDOW_MS ||
      !Number.isInteger(count) ||
      count < 0 ||
      count > routeConfig.actor_max
    ) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_STATE_CORRUPT",
        "El estado anti-abuso contiene un actor incoherente."
      );
    }
  });
}

function prunePublicAbuseActors_(actors, nowMs) {
  return actors.filter(function (entry) {
    return nowMs - Number(entry.s) <
      publicAbuseActorWindowMs_(entry.r);
  });
}

function readPublicAbuseState_(store, now, observedQuota) {
  const raw = store.getProperty(TAKARA_PUBLIC_ABUSE_STATE_KEY);

  if (!raw) {
    return newPublicAbuseState_(now, observedQuota);
  }

  let state;

  try {
    state = JSON.parse(raw);
  } catch (error) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_CORRUPT",
      "El estado anti-abuso esta corrupto y requiere revision."
    );
  }

  if (!state || state.version !== TAKARA_PUBLIC_ABUSE_VERSION) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_VERSION",
      "El estado anti-abuso tiene una version incompatible."
    );
  }

  const nowMs = now.getTime();
  assertPublicAbuseStateShape_(state, nowMs);
  const started = Number(state.daily_started_at_ms);

  if (
    !Number.isFinite(started) ||
    nowMs - started >= TAKARA_PUBLIC_ABUSE_CONFIG.DAILY_WINDOW_MS
  ) {
    return newPublicAbuseState_(now, observedQuota);
  }

  const burstStarted = Number(state.burst_started_at_ms);

  if (
    !Number.isFinite(burstStarted) ||
    nowMs - burstStarted >= TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_WINDOW_MS
  ) {
    state.burst_started_at_ms = nowMs;
    state.burst_count = 0;
  }

  state.actors = prunePublicAbuseActors_(state.actors, nowMs);
  return state;
}

function writePublicAbuseState_(store, state) {
  const serialized = JSON.stringify(state);

  if (serialized.length > 8500) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_STATE_TOO_LARGE",
      "El estado anti-abuso excede el limite seguro de persistencia."
    );
  }

  store.setProperty(TAKARA_PUBLIC_ABUSE_STATE_KEY, serialized);
}
function getRemainingPublicMailQuota_() {
  let quota;

  try {
    quota = Number(MailApp.getRemainingDailyQuota());
  } catch (error) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_MAIL_QUOTA_UNAVAILABLE",
      "No se ha podido verificar la cuota de correo. La solicitud no se ejecutara."
    );
  }

  if (!Number.isFinite(quota) || quota < 0) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_MAIL_QUOTA_INVALID",
      "La cuota de correo devuelta por Apps Script no es valida."
    );
  }

  return quota;
}

function reservePublicSideEffectBudget_(
  route,
  actorValue,
  recipientUnits,
  now
) {
  const routeConfig = publicAbuseRouteConfig_(route);
  const actorKey = publicAbuseActorKey_(routeConfig.route, actorValue);
  const units = Number(recipientUnits);
  const instant = now instanceof Date ? now : new Date(now);

  if (
    !Number.isInteger(units) ||
    units < 1 ||
    units > 10 ||
    !Number.isFinite(instant.getTime())
  ) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_RESERVATION_INVALID",
      "La reserva anti-abuso solicitada no es valida."
    );
  }

  const observedQuota = getRemainingPublicMailQuota_();
  const requiredQuota =
    units + TAKARA_PUBLIC_ABUSE_CONFIG.MAIL_RESERVE_RECIPIENTS;

  if (observedQuota < requiredQuota) {
    throw publicAbuseError_(
      "PUBLIC_ABUSE_MAIL_RESERVE",
      "El envio esta temporalmente protegido para conservar cuota operativa."
    );
  }

  return withPublicAbuseLock_(function () {
    const store = getPublicAbuseProperties_();
    const state = readPublicAbuseState_(store, instant, observedQuota);
    const nowMs = instant.getTime();
    const currentSafeQuota = Math.max(
      0,
      observedQuota - TAKARA_PUBLIC_ABUSE_CONFIG.MAIL_RESERVE_RECIPIENTS
    );

    if (
      Number(state.daily_used_recipients) + units >
      Number(state.daily_budget_recipients)
    ) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_DAILY_BUDGET",
        "Se ha alcanzado el presupuesto diario de efectos publicos."
      );
    }

    if (units > currentSafeQuota) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_MAIL_RESERVE",
        "El envio esta temporalmente protegido para conservar cuota operativa."
      );
    }

    if (
      Number(state.burst_count) + 1 >
      TAKARA_PUBLIC_ABUSE_CONFIG.GLOBAL_BURST_MAX_SUBMISSIONS
    ) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_GLOBAL_BURST",
        "Hay demasiadas solicitudes publicas en un intervalo corto."
      );
    }

    let actorEntry = null;

    for (let i = 0; i < state.actors.length; i += 1) {
      if (state.actors[i].k === actorKey) {
        actorEntry = state.actors[i];
        break;
      }
    }

    if (!actorEntry) {
      if (
        state.actors.length >= TAKARA_PUBLIC_ABUSE_CONFIG.MAX_ACTOR_ENTRIES
      ) {
        throw publicAbuseError_(
          "PUBLIC_ABUSE_ACTOR_CAPACITY",
          "La proteccion de actores ha alcanzado su capacidad segura."
        );
      }

      actorEntry = {
        k: actorKey,
        r: routeConfig.route,
        s: nowMs,
        c: 0
      };
      state.actors.push(actorEntry);
    } else if (
      nowMs - Number(actorEntry.s) >= routeConfig.actor_window_ms
    ) {
      actorEntry.s = nowMs;
      actorEntry.c = 0;
    }

    if (Number(actorEntry.c) + 1 > routeConfig.actor_max) {
      throw publicAbuseError_(
        "PUBLIC_ABUSE_ACTOR_RATE",
        "Hay demasiadas solicitudes recientes para el mismo contacto."
      );
    }

    state.daily_used_recipients =
      Number(state.daily_used_recipients) + units;
    state.burst_count = Number(state.burst_count) + 1;
    actorEntry.c = Number(actorEntry.c) + 1;

    writePublicAbuseState_(store, state);

    return {
      version: TAKARA_PUBLIC_ABUSE_VERSION,
      route: routeConfig.route,
      reserved_recipients: units,
      daily_budget_recipients: Number(state.daily_budget_recipients),
      daily_used_recipients: Number(state.daily_used_recipients),
      burst_count: Number(state.burst_count),
      actor_count: Number(actorEntry.c)
    };
  });
}
