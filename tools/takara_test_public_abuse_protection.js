const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(
    ROOT,
    "apps-script",
    "takara-pedidos-web",
    "PublicAbuseProtection.gs"
  ),
  "utf8"
);

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

function expectCode(fn, code, message) {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  ok(Boolean(caught), message + " throws");
  ok(caught && caught.code === code, message + " code");
}

function createStore() {
  const values = Object.create(null);
  return {
    getProperty(key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
    },
    setProperty(key, value) {
      values[key] = String(value);
      return this;
    },
    deleteProperty(key) {
      delete values[key];
      return this;
    },
    getProperties() {
      return Object.assign({}, values);
    },
    raw(key) {
      return values[key] || "";
    }
  };
}

function createHarness(initialQuota) {
  const store = createStore();
  const lock = {
    held: false,
    forceBusy: false,
    tryLock() {
      if (this.forceBusy || this.held) return false;
      this.held = true;
      return true;
    },
    releaseLock() {
      this.held = false;
    }
  };
  const runtime = {
    quota: initialQuota,
    quotaError: false
  };

  const context = {
    console,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Error,
    JSON,
    Math,
    RegExp,
    PropertiesService: {
      getScriptProperties() {
        return store;
      }
    },
    LockService: {
      getScriptLock() {
        return lock;
      }
    },
    MailApp: {
      getRemainingDailyQuota() {
        if (runtime.quotaError) throw new Error("quota unavailable");
        return runtime.quota;
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "SHA_256" },
      Charset: { UTF_8: "UTF_8" },
      computeDigest(algorithm, value) {
        const digest = crypto
          .createHash("sha256")
          .update(String(value), "utf8")
          .digest();
        return Array.from(digest).map((byte) =>
          byte > 127 ? byte - 256 : byte
        );
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context, {
    filename: "PublicAbuseProtection.gs"
  });

  return { context, store, lock, runtime };
}
const firstHarness = createHarness(100);
const t0 = new Date("2026-09-23T00:30:00.000Z");
const first = firstHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "Cliente@Example.Test",
  2,
  t0
);

ok(
  first.version === "TAKARA_PUBLIC_ABUSE_GUARD_V1",
  "version exacta"
);
ok(first.route === "CONTACT", "ruta contact exacta");
ok(first.daily_budget_recipients === 80, "budget adapta 100 quota a reserva 20");
ok(first.daily_used_recipients === 2, "primer contacto reserva dos destinatarios");
ok(first.burst_count === 1, "primer contacto cuenta en burst");
ok(first.actor_count === 1, "primer contacto cuenta por actor");

const stateKey = "TAKARA_PUBLIC_ABUSE_GUARD_V1:STATE";
const raw = firstHarness.store.raw(stateKey);
ok(raw.length > 0, "estado persistido");
ok(!raw.includes("cliente@example.test"), "estado no persiste email");
ok(!raw.includes("Cliente@Example.Test"), "estado no persiste email original");

firstHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "cliente@example.test",
  2,
  new Date(t0.getTime() + 1000)
);
firstHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "CLIENTE@example.test",
  2,
  new Date(t0.getTime() + 2000)
);

expectCode(
  () => firstHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "cliente@example.test",
    2,
    new Date(t0.getTime() + 3000)
  ),
  "PUBLIC_ABUSE_ACTOR_RATE",
  "cuarto contacto del mismo actor en 15 minutos"
);

const afterRate = JSON.parse(firstHarness.store.raw(stateKey));
ok(afterRate.daily_used_recipients === 6, "rechazo por actor no consume budget");
ok(afterRate.burst_count === 3, "rechazo por actor no incrementa burst");

const afterWindow = firstHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "cliente@example.test",
  2,
  new Date(t0.getTime() + 16 * 60 * 1000)
);
ok(afterWindow.actor_count === 1, "actor contact se reinicia tras ventana");
ok(afterWindow.burst_count === 1, "burst se reinicia tras cinco minutos");

const orderHarness = createHarness(100);
for (let i = 0; i < 5; i += 1) {
  const result = orderHarness.context.reservePublicSideEffectBudget_(
    "ORDER",
    "pedido@example.test",
    2,
    new Date(t0.getTime() + i * 1000)
  );
  ok(result.actor_count === i + 1, "order actor count " + (i + 1));
}

expectCode(
  () => orderHarness.context.reservePublicSideEffectBudget_(
    "ORDER",
    "pedido@example.test",
    2,
    new Date(t0.getTime() + 6000)
  ),
  "PUBLIC_ABUSE_ACTOR_RATE",
  "sexto pedido del mismo actor en 30 minutos"
);
const burstHarness = createHarness(100);
for (let i = 0; i < 20; i += 1) {
  const result = burstHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "burst-" + i + "@example.test",
    2,
    new Date(t0.getTime() + i * 1000)
  );
  ok(result.burst_count === i + 1, "burst count " + (i + 1));
}

expectCode(
  () => burstHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "burst-overflow@example.test",
    2,
    new Date(t0.getTime() + 25000)
  ),
  "PUBLIC_ABUSE_GLOBAL_BURST",
  "solicitud 21 en cinco minutos"
);

const budgetHarness = createHarness(26);
for (let i = 0; i < 3; i += 1) {
  budgetHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "budget-" + i + "@example.test",
    2,
    new Date(t0.getTime() + i * 1000)
  );
}
expectCode(
  () => budgetHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "budget-overflow@example.test",
    2,
    new Date(t0.getTime() + 4000)
  ),
  "PUBLIC_ABUSE_DAILY_BUDGET",
  "budget diario derivado de cuota"
);

const reserveHarness = createHarness(21);
expectCode(
  () => reserveHarness.context.reservePublicSideEffectBudget_(
    "ORDER",
    "reserve@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_MAIL_RESERVE",
  "reserva operativa de MailApp"
);

const resetHarness = createHarness(100);
resetHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "reset@example.test",
  2,
  t0
);
resetHarness.runtime.quota = 50;
const reset = resetHarness.context.reservePublicSideEffectBudget_(
  "CONTACT",
  "reset@example.test",
  2,
  new Date(t0.getTime() + 24 * 60 * 60 * 1000 + 1)
);
ok(reset.daily_budget_recipients === 30, "ventana diaria recalcula budget");
ok(reset.daily_used_recipients === 2, "ventana diaria reinicia uso");

const corruptHarness = createHarness(100);
corruptHarness.store.setProperty(stateKey, "{broken");
expectCode(
  () => corruptHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "corrupt@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_STATE_CORRUPT",
  "estado corrupto"
);

const shapeHarness = createHarness(100);
shapeHarness.store.setProperty(
  stateKey,
  JSON.stringify({
    version: "TAKARA_PUBLIC_ABUSE_GUARD_V1",
    daily_started_at_ms: t0.getTime(),
    daily_budget_recipients: 80,
    daily_used_recipients: "not-a-number",
    burst_started_at_ms: t0.getTime(),
    burst_count: 0,
    actors: []
  })
);
expectCode(
  () => shapeHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "shape@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_STATE_CORRUPT",
  "estado parseable con contador invalido"
);

const quotaHarness = createHarness(100);
quotaHarness.runtime.quotaError = true;
expectCode(
  () => quotaHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "quota@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_MAIL_QUOTA_UNAVAILABLE",
  "fallo al consultar cuota"
);
const validationHarness = createHarness(100);
expectCode(
  () => validationHarness.context.reservePublicSideEffectBudget_(
    "UNKNOWN",
    "actor@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_ROUTE_INVALID",
  "ruta desconocida"
);
expectCode(
  () => validationHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "",
    2,
    t0
  ),
  "PUBLIC_ABUSE_ACTOR_REQUIRED",
  "actor ausente"
);
expectCode(
  () => validationHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "actor@example.test",
    0,
    t0
  ),
  "PUBLIC_ABUSE_RESERVATION_INVALID",
  "unidades invalidas"
);

validationHarness.lock.forceBusy = true;
expectCode(
  () => validationHarness.context.reservePublicSideEffectBudget_(
    "CONTACT",
    "actor@example.test",
    2,
    t0
  ),
  "PUBLIC_ABUSE_LOCK_BUSY",
  "lock ocupado"
);
validationHarness.lock.forceBusy = false;

const representative = {
  version: "TAKARA_PUBLIC_ABUSE_GUARD_V1",
  daily_started_at_ms: t0.getTime(),
  daily_budget_recipients: 200,
  daily_used_recipients: 100,
  burst_started_at_ms: t0.getTime(),
  burst_count: 20,
  actors: []
};
for (let i = 0; i < 80; i += 1) {
  representative.actors.push({
    k: "ORDER:" + String(i).padStart(24, "0"),
    r: "ORDER",
    s: t0.getTime(),
    c: 1
  });
}
const capacityHarness = createHarness(1500);
capacityHarness.context.writePublicAbuseState_(
  capacityHarness.store,
  representative
);
const representativeRaw = capacityHarness.store.raw(stateKey);
ok(representativeRaw.length < 8500, "estado maximo representativo cabe bajo 8.5KB");

console.log(
  "[TAKARA_PUBLIC_ABUSE_PROTECTION_TEST_OK] " +
    JSON.stringify({
      checks,
      version: "TAKARA_PUBLIC_ABUSE_GUARD_V1",
      representative_bytes: representativeRaw.length
    })
);
