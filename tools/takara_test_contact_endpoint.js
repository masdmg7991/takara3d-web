const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "contacto.html"), "utf8");
const config = fs.readFileSync(path.join(root, "assets/js/takara-config.js"), "utf8");
const contact = fs.readFileSync(path.join(root, "assets/js/takara-contacto-web.js"), "utf8");

let checks = 0;
function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

const configMatch = config.match(/apps_script:\s*Object\.freeze\(\{[\s\S]*?url:\s*"([^"]+)"/);
const actionMatch = html.match(/data-takara-contact-web-v2[^>]*action="([^"]+)"/);

ok(Boolean(configMatch), "config exposes Apps Script endpoint");
ok(Boolean(actionMatch), "contact form keeps no-JS action fallback");
ok(configMatch[1] === actionMatch[1], "HTML fallback matches canonical config endpoint");
ok(!html.includes("data-takara-endpoint="), "contact HTML has no duplicate data endpoint");

const configScript = html.indexOf('src="assets/js/takara-config.js"');
const contactScript = html.indexOf('src="assets/js/takara-contacto-web.js');
ok(configScript >= 0, "contact page loads shared config");
ok(contactScript >= 0, "contact page loads contact client");
ok(configScript < contactScript, "shared config loads before contact client");

ok(
  contact.includes("window.TAKARA_GET_APPS_SCRIPT_ENDPOINT"),
  "contact client consumes canonical endpoint API"
);
ok(
  contact.includes('return configured || form.getAttribute("action") || "";'),
  "contact client keeps HTML action only as fallback"
);
ok(
  !contact.includes(configMatch[1]),
  "contact client contains no hardcoded endpoint value"
);
ok(
  !contact.includes('getAttribute("data-takara-endpoint")'),
  "contact client no longer consumes duplicate data endpoint"
);

const endpointOccurrences = html.split(configMatch[1]).length - 1;
ok(endpointOccurrences === 1, "contact HTML contains endpoint exactly once as fallback");

console.log(
  "[TAKARA_CONTACT_ENDPOINT_AUTHORITY_OK] " +
    JSON.stringify({ checks, endpoint_source: "assets/js/takara-config.js" })
);
