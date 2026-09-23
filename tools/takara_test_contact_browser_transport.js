const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "apps-script", "takara-pedidos-web");
let checks = 0;

function ok(value, label) {
  if (!value) throw new Error("[FAIL] " + label);
  checks += 1;
}

function expectThrow(fn, label) {
  let thrown = false;
  try {
    fn();
  } catch (error) {
    thrown = true;
  }
  ok(thrown, label);
}

function backend() {
  const context = {
    console,
    Object,
    String,
    Number,
    Boolean,
    Error,
    Date,
    JSON,
    Array,
    Math,
    RegExp,
    texto_(value) {
      return String(value === undefined || value === null ? "" : value).trim();
    },
    json_(payload) {
      return {
        mimeType: "application/json",
        content: JSON.stringify(payload)
      };
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: "ALLOWALL" },
      createHtmlOutput(content) {
        return {
          content,
          xFrameMode: "",
          setXFrameOptionsMode(value) {
            this.xFrameMode = value;
            return this;
          }
        };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(APP, "ContactBrowserTransport.gs"),
      "utf8"
    ),
    context,
    { filename: "ContactBrowserTransport.gs" }
  );
  return context;
}

function browserHarness() {
  const listeners = {};
  const frames = Object.create(null);
  let timerId = 0;
  const timers = Object.create(null);
  const runtime = {
    submitBehavior: "success",
    wrongSourceFirst: false,
    submittedFields: null
  };

  const body = {
    appendChild(node) {
      node.parentNode = body;
      if (node.tagName === "IFRAME" && node.name) {
        frames[node.name] = node;
      }
    },
    removeChild(node) {
      node.parentNode = null;
      if (node.tagName === "IFRAME" && node.name) {
        delete frames[node.name];
      }
    }
  };

  function emitMessage(event) {
    const handler = listeners.message;
    if (handler) handler(event);
  }

  const document = {
    readyState: "loading",
    body,
    addEventListener() {},
    querySelector() {
      return null;
    },
    createElement(tag) {
      const upper = String(tag).toUpperCase();

      if (upper === "INPUT") {
        return {
          tagName: "INPUT",
          type: "",
          name: "",
          value: "",
          parentNode: null
        };
      }

      if (upper === "IFRAME") {
        return {
          tagName: "IFRAME",
          name: "",
          tabIndex: 0,
          style: {},
          contentWindow: { kind: "contact-frame" },
          parentNode: null,
          setAttribute() {}
        };
      }

      if (upper === "FORM") {
        const fields = [];
        return {
          tagName: "FORM",
          method: "",
          action: "",
          target: "",
          acceptCharset: "",
          style: {},
          parentNode: null,
          appendChild(input) {
            fields.push(input);
            input.parentNode = this;
          },
          submit() {
            const values = {};
            fields.forEach(function (field) {
              values[field.name] = field.value;
            });
            runtime.submittedFields = values;

            const frame = frames[this.target];
            if (!frame) {
              throw new Error("missing target frame");
            }

            if (runtime.submitBehavior === "timeout") {
              const ids = Object.keys(timers);
              if (ids.length) timers[ids[0]]();
              return;
            }

            if (runtime.wrongSourceFirst) {
              emitMessage({
                source: { wrong: true },
                origin: "https://script.googleusercontent.com",
                data: {
                  version: "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
                  nonce: values.takara_contact_response_nonce,
                  request_id: values.contact_request_id,
                  ok: true,
                  id_contacto_web:
                    "TK-CONTACTO-20260923-031500-ABCDEF12",
                  estado: "recibido"
                }
              });
            }

            emitMessage({
              source: frame.contentWindow,
              origin:
                runtime.submitBehavior === "evil-origin"
                  ? "https://evil.example"
                  : "https://script.googleusercontent.com",
              data: {
                version: "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
                nonce:
                  runtime.submitBehavior === "bad-nonce"
                    ? "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
                    : values.takara_contact_response_nonce,
                request_id: values.contact_request_id,
                ok: runtime.submitBehavior !== "negative",
                id_contacto_web:
                  runtime.submitBehavior === "negative"
                    ? ""
                    : "TK-CONTACTO-20260923-031500-ABCDEF12",
                estado:
                  runtime.submitBehavior === "negative"
                    ? ""
                    : "recibido",
                message:
                  runtime.submitBehavior === "negative"
                    ? "Consulta rechazada."
                    : "Consulta recibida."
              }
            });

            if (
              runtime.submitBehavior === "evil-origin" ||
              runtime.submitBehavior === "bad-nonce"
            ) {
              const ids = Object.keys(timers);
              if (ids.length) timers[ids[0]]();
            }
          }
        };
      }

      throw new Error("unsupported element " + tag);
    }
  };

  const window = {
    location: { origin: "https://takara3d.es" },
    crypto: {
      getRandomValues(bytes) {
        for (let i = 0; i < bytes.length; i += 1) {
          bytes[i] = i + 1;
        }
        return bytes;
      }
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    removeEventListener(type, handler) {
      if (listeners[type] === handler) {
        delete listeners[type];
      }
    },
    setTimeout(callback) {
      timerId += 1;
      timers[timerId] = callback;
      return timerId;
    },
    clearTimeout(id) {
      delete timers[id];
    }
  };

  function FakeFormData() {
    this.entries = [];
  }
  FakeFormData.prototype.append = function (name, value) {
    this.entries.push([name, String(value)]);
  };
  FakeFormData.prototype.forEach = function (callback) {
    this.entries.forEach(function (entry) {
      callback(entry[1], entry[0]);
    });
  };

  const context = {
    console,
    window,
    document,
    URL,
    Uint8Array,
    Array,
    String,
    Object,
    Error,
    Promise,
    RegExp,
    FormData: FakeFormData
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(ROOT, "assets", "js", "takara-contacto-web.js"),
      "utf8"
    ),
    context,
    { filename: "takara-contacto-web.js" }
  );

  return {
    api: window.TAKARA_CONTACT_BROWSER_TRANSPORT_V1,
    runtime,
    window,
    FakeFormData
  };
}

(async function main() {
  const ctx = backend();
  const nonce = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const requestId = "TK-CONTACT-REQ-ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const event = {
    parameter: {
      takara_contact_response_mode: "contact_postmessage_v1",
      takara_contact_response_origin: "https://takara3d.es",
      takara_contact_response_nonce: nonce,
      contact_request_id: requestId
    }
  };

  const request = ctx.parseContactBrowserResponseRequest_(event);
  ok(
    request.version === "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
    "backend protocol version"
  );
  ok(request.origin === "https://takara3d.es", "backend allowed origin");
  ok(request.nonce === nonce, "backend nonce preserved");
  ok(request.request_id === requestId, "backend request id preserved");
  ok(
    ctx.parseContactBrowserResponseRequest_({ parameter: {} }) === null,
    "legacy contact response remains available"
  );

  expectThrow(
    () =>
      ctx.parseContactBrowserResponseRequest_({
        parameter: Object.assign({}, event.parameter, {
          takara_contact_response_mode: "unknown"
        })
      }),
    "unknown contact response mode rejected"
  );
  expectThrow(
    () =>
      ctx.parseContactBrowserResponseRequest_({
        parameter: Object.assign({}, event.parameter, {
          takara_contact_response_origin: "https://evil.example"
        })
      }),
    "untrusted contact response origin rejected"
  );
  expectThrow(
    () =>
      ctx.parseContactBrowserResponseRequest_({
        parameter: Object.assign({}, event.parameter, {
          takara_contact_response_nonce: "BAD"
        })
      }),
    "invalid contact nonce rejected"
  );

  const contactId = "TK-CONTACTO-20260923-031500-ABCDEF12";
  const safe = ctx.contactBrowserSafeResponse_(request, {
    ok: true,
    tipo_solicitud: "CONTACTO_WEB",
    contact_request_id: requestId,
    id_contacto_web: contactId,
    estado: "recibido",
    email_destino: "private@example.test",
    script: "PRIVATE"
  });
  ok(safe.ok === true, "backend accepts causal contact ACK");
  ok(safe.request_id === requestId, "backend ACK correlates request id");
  ok(safe.id_contacto_web === contactId, "backend ACK exposes contact id");
  ok(safe.estado === "recibido", "backend ACK exposes received state");
  ok(!("email_destino" in safe), "backend ACK strips internal email");
  ok(!("script" in safe), "backend ACK strips internal script metadata");

  const invalid = ctx.contactBrowserSafeResponse_(request, {
    ok: true,
    tipo_solicitud: "CONTACTO_WEB",
    contact_request_id: requestId,
    id_contacto_web: "BAD",
    estado: "recibido"
  });
  ok(invalid.ok === false, "invalid contact id cannot produce success ACK");

  const html = ctx.contactBrowserResponseOrJson_(request, {
    ok: true,
    tipo_solicitud: "CONTACTO_WEB",
    id_contacto_web: contactId,
    estado: "recibido",
    email_destino: "private@example.test"
  });
  ok(html.xFrameMode === "ALLOWALL", "contact ACK iframe output enabled");
  ok(
    html.content.includes("window.parent.postMessage("),
    "contact ACK posts to parent"
  );
  ok(
    html.content.includes("TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1"),
    "contact ACK marker emitted"
  );
  ok(
    !html.content.includes("private@example.test"),
    "contact ACK HTML contains no PII"
  );

  const legacy = ctx.contactBrowserResponseOrJson_(null, {
    ok: true,
    preserved: true
  });
  ok(
    legacy.mimeType === "application/json",
    "legacy contact response remains JSON"
  );
  ok(
    JSON.parse(legacy.content).preserved === true,
    "legacy contact JSON payload preserved"
  );

  const web = fs.readFileSync(
    path.join(ROOT, "assets", "js", "takara-contacto-web.js"),
    "utf8"
  );
  ok(!web.includes('mode: "no-cors"'), "opaque no-cors path removed");
  ok(!web.includes("await fetch("), "contact client no longer trusts fetch");
  ok(
    web.includes("submitContactWithBrowserAck(\n        endpoint,\n        payload,\n        requestId\n      )"),
    "contact submit waits for browser ACK"
  );
  ok(
    web.includes("event.source !== frame.contentWindow"),
    "contact ACK bound to exact iframe"
  );
  ok(web.includes("data.nonce !== nonce"), "contact ACK nonce checked");
  ok(
    web.includes("CONTACT_BROWSER_ACK_TIMEOUT_MS = 120000"),
    "contact ACK timeout explicit"
  );

  const browser = browserHarness();
  ok(
    browser.api.version === "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
    "browser transport API version"
  );
  ok(
    browser.api.isAllowedResponseOrigin(
      "https://script.googleusercontent.com"
    ),
    "browser allows Google response origin"
  );
  ok(
    !browser.api.isAllowedResponseOrigin("https://evil.example"),
    "browser rejects evil response origin"
  );
  ok(
    !browser.api.isAllowedResponseOrigin("http://script.google.com"),
    "browser requires HTTPS response origin"
  );

  const payload = new browser.FakeFormData();
  payload.append("tipo_solicitud", "CONTACTO_WEB");
  payload.append("email", "client@example.test");
  payload.append("contact_request_id", requestId);

  browser.runtime.wrongSourceFirst = true;
  const ack = await browser.api.submit(
    "https://script.google.com/macros/s/EXAMPLE/exec",
    payload,
    requestId
  );
  ok(ack.estado === "recibido", "browser resolves only verified success");
  ok(
    ack.id_contacto_web === contactId,
    "browser returns server-generated contact id"
  );
  ok(ack.request_id === requestId, "browser ACK preserves request id");
  ok(
    browser.runtime.submittedFields.takara_contact_response_mode ===
      "contact_postmessage_v1",
    "browser sends contact response mode"
  );
  ok(
    /^[A-HJ-NP-Z2-9]{32}$/.test(
      browser.runtime.submittedFields.takara_contact_response_nonce
    ),
    "browser sends strong nonce"
  );
  ok(
    browser.runtime.submittedFields.takara_contact_response_origin ===
      "https://takara3d.es",
    "browser sends exact parent origin"
  );
  ok(
    browser.runtime.submittedFields.contact_request_id === requestId,
    "browser posts stable request id"
  );

  const timeout = browserHarness();
  timeout.runtime.submitBehavior = "timeout";
  const timeoutPayload = new timeout.FakeFormData();
  timeoutPayload.append("tipo_solicitud", "CONTACTO_WEB");
  let timeoutRejected = false;
  try {
    await timeout.api.submit(
      "https://script.google.com/macros/s/EXAMPLE/exec",
      timeoutPayload
 ,
      requestId
    );
  } catch (error) {
    timeoutRejected = /No se ha podido confirmar/.test(error.message);
  }
  ok(timeoutRejected, "browser timeout fails closed");

  const negative = browserHarness();
  negative.runtime.submitBehavior = "negative";
  const negativePayload = new negative.FakeFormData();
  negativePayload.append("tipo_solicitud", "CONTACTO_WEB");
  let negativeRejected = false;
  try {
    await negative.api.submit(
      "https://script.google.com/macros/s/EXAMPLE/exec",
      negativePayload
 ,
      requestId
    );
  } catch (error) {
    negativeRejected = error.message === "Consulta rechazada.";
  }
  ok(negativeRejected, "negative server ACK fails closed");

  const evil = browserHarness();
  evil.runtime.submitBehavior = "evil-origin";
  const evilPayload = new evil.FakeFormData();
  evilPayload.append("tipo_solicitud", "CONTACTO_WEB");
  let evilRejected = false;
  try {
    await evil.api.submit(
      "https://script.google.com/macros/s/EXAMPLE/exec",
      evilPayload
 ,
      requestId
    );
  } catch (error) {
    evilRejected = /No se ha podido confirmar/.test(error.message);
  }
  ok(evilRejected, "message from evil origin never confirms contact");

  console.log(
    "[TAKARA_CONTACT_BROWSER_TRANSPORT_TEST_OK] " +
      JSON.stringify({
        checks,
        protocol: "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1"
      })
  );
})().catch(function (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
