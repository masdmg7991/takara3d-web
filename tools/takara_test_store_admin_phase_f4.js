const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = path.resolve(__dirname, "..");

let checks = 0;

function ok(condition, message) {
  if (!condition) throw new Error("[FAIL] " + message);
  checks += 1;
}

const phaseTests = [
  [
    "tools/takara_test_store_admin_access.js",
    "TAKARA_STORE_ADMIN_ACCESS_F4A_OK",
  ],
  [
    "tools/takara_test_store_admin_read.js",
    "TAKARA_STORE_ADMIN_READ_F4B_OK",
  ],
  [
    "tools/takara_test_store_admin_ui.js",
    "TAKARA_STORE_ADMIN_UI_F4C_OK",
  ],
  [
    "tools/takara_test_store_admin_write.js",
    "TAKARA_STORE_ADMIN_WRITE_F4D_OK",
  ],
  [
    "tools/takara_test_store_admin_lifecycle.js",
    "TAKARA_STORE_ADMIN_LIFECYCLE_F4E_OK",
  ],
  [
    "tools/takara_test_store_admin_system_f4f.js",
    "TAKARA_STORE_ADMIN_SYSTEM_F4F_OK",
  ],
];

for (const [relative, marker] of phaseTests) {
  const absolute = path.join(ROOT, relative);

  ok(fs.existsSync(absolute), "phase test exists: " + relative);

  const result = childProcess.spawnSync(
    process.execPath,
    [absolute],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    }
  );

  if (result.error) throw result.error;

  ok(
    result.status === 0,
    "phase test GREEN: " +
      relative +
      "\n" +
      String(result.stdout || "") +
      String(result.stderr || "")
  );

  ok(
    String(result.stdout || "").includes(marker),
    "phase marker exact: " + marker
  );
}

const contract = fs.readFileSync(
  path.join(ROOT, "docs", "STORE_ADMIN_CONTRACT.md"),
  "utf8"
);

ok(
  contract.includes("## F4A access authority"),
  "F4A historical certified section remains accepted"
);
ok(
  contract.includes("## F4C tangible read-only Admin UI"),
  "F4C historical certified section remains accepted"
);

const contractHeaders = contract
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith("## F4"));

for (const ticket of [
  "F4A",
  "F4B",
  "F4C",
  "F4D",
  "F4E",
  "F4F",
  "F4G",
]) {
  const prefix = "## " + ticket + " ";
  const matches = contractHeaders.filter((line) =>
    line.startsWith(prefix)
  );

  ok(
    matches.length === 1,
    "phase contract has one section for " + ticket
  );
}

const bridge = fs.readFileSync(
  path.join(
    ROOT,
    "apps-script",
    "takara-pedidos-web",
    "StoreAdminUiBridge.gs"
  ),
  "utf8"
);

ok(
  bridge.includes("getStoreAdminUiDeploymentOutput_"),
  "F4F deployment boundary remains"
);
ok(
  !bridge.includes("function doGet("),
  "F4 closure still has no Admin doGet"
);
ok(
  !bridge.includes("function doPost("),
  "F4 closure still has no Admin doPost"
);

console.log(
  "[TAKARA_STORE_ADMIN_PHASE_F4_OK] " +
    JSON.stringify({
      checks,
      phaseTests: phaseTests.length,
      routeIntegration: false,
    })
);