from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]

CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
ADMIN_ACCESS = ROOT / "apps-script" / "takara-pedidos-web" / "StoreAdminAccess.gs"
ADMIN_BRIDGE = ROOT / "apps-script" / "takara-pedidos-web" / "StoreAdminUiBridge.gs"
DEPLOYMENT = ROOT / "docs" / "DEPLOYMENT.md"
ADMIN_CONTRACT = ROOT / "docs" / "STORE_ADMIN_CONTRACT.md"
QUALITY = ROOT / "tools" / "takara_quality_gate.ps1"

EXPECTED_CODE_SHA = (
    "6FF429CA389F93CAEB7419081B1B60F1"
    "2DE3E7EC8DE88DB43BD5D0EDC2D2762A"
)
EXPECTED_LOCAL_VERSION = (
    "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_"
    "V1_14_3_ORDER_BROWSER_ACK_V1"
)

checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def semantic_text(value: str) -> str:
    without_inline_code_ticks = value.replace("`", "")
    return re.sub(r"\s+", " ", without_inline_code_ticks).strip()


def function_count(source: str, name: str) -> int:
    return len(
        re.findall(
            rf"(?m)^[ \t]*function[ \t]+{re.escape(name)}[ \t]*\(",
            source,
        )
    )


def extract_function(source: str, name: str) -> str:
    marker = f"function {name}("
    start = source.find(marker)
    require(start >= 0, f"Existe función {name}")
    brace = source.find("{", start)
    require(brace >= 0, f"{name} tiene cuerpo")

    depth = 0
    quote = ""
    escaped = False
    line_comment = False
    block_comment = False
    i = brace

    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""

        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue

        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = ""
            i += 1
            continue

        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue

        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue

        if ch in ('"', "'", "`"):
            quote = ch
            i += 1
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[start : i + 1]

        i += 1

    raise AssertionError(f"[FAIL] Cuerpo no balanceado {name}")


def main() -> int:
    code = read(CODE)
    admin_access = read(ADMIN_ACCESS)
    admin_bridge = read(ADMIN_BRIDGE)
    deployment = read(DEPLOYMENT)
    admin_contract = read(ADMIN_CONTRACT)
    quality = read(QUALITY)

    deployment_sem = semantic_text(deployment)
    admin_contract_sem = semantic_text(admin_contract)

    code_sha = hashlib.sha256(CODE.read_bytes()).hexdigest().upper()

    require(
        code_sha == EXPECTED_CODE_SHA,
        f"Code.gs deployment candidate exact-byte preservado; actual={code_sha}",
    )
    require(
        EXPECTED_LOCAL_VERSION in code,
        "Code.gs conserva VERSION local candidata V1.14.3",
    )
    require(
        function_count(code, "doGet") == 1,
        "Existe un único doGet",
    )
    require(
        function_count(code, "doPost") == 1,
        "Existe un único doPost",
    )
    require(
        'e.parameter.route === "store-admin"' in code,
        "F5B Admin route sigue integrada",
    )
    require(
        "getStoreAdminUiDeploymentOutput_()" in code,
        "doGet sigue delegando Admin boundary",
    )
    require(
        "routeStorePublicGet_(e)" in code,
        "Store Public fallback sigue presente",
    )

    active_fn = extract_function(
        admin_access,
        "getActiveStoreAdminEmail_",
    )
    owner_fn = extract_function(
        admin_access,
        "getConfiguredStoreAdminOwnerEmail_",
    )
    gate_fn = extract_function(
        admin_access,
        "requireStoreAdminAccess_",
    )

    require(
        "Session.getActiveUser()" in active_fn,
        "F4A obtiene identidad desde ActiveUser",
    )
    require(
        "user.getEmail()" in active_fn,
        "F4A extrae email del ActiveUser",
    )
    require(
        "normalizeStoreAdminEmail_(user.getEmail())" in active_fn,
        "F4A normaliza el email activo",
    )
    require(
        "STORE_ADMIN_UNAUTHENTICATED" in active_fn,
        "F4A falla cerrado sin identidad utilizable",
    )
    require(
        "TAKARA_STORE_ADMIN_OWNER_EMAIL" in admin_access,
        "F4A conserva owner property authority",
    )
    require(
        "PropertiesService.getScriptProperties()" in owner_fn,
        "F4A lee owner desde ScriptProperties",
    )
    require(
        "STORE_ADMIN_CONFIGURATION_INVALID" in owner_fn,
        "F4A falla cerrado con owner mal configurado",
    )
    require(
        "activeEmail !== ownerEmail" in gate_fn,
        "F4A compara identidad activa con owner exacto",
    )
    require(
        "STORE_ADMIN_FORBIDDEN" in gate_fn,
        "F4A rechaza usuario no-owner",
    )
    require(
        "getStoreAdminUiDeploymentOutput_" in admin_bridge,
        "Admin deployment boundary sigue presente",
    )
    require(
        "requireStoreAdminAccess_();" in admin_bridge,
        "Admin HTML boundary exige F4A antes de render",
    )

    dep_markers = (
        "## F5C deployment candidate parity + deploy preflight",
        "same Apps Script project",
        "separate deployment resources",
        "PUBLIC deployment",
        "ADMIN deployment",
        "USER_ACCESSING",
        "MYSELF",
        "USER_DEPLOYING is forbidden for Admin",
        "ANYONE_ANONYMOUS is forbidden for Admin",
        "deployer must equal the configured Store Admin owner",
        "F5C performs no push and no deployment",
        "F5D remote deployment topology",
        "F5E Store Public production E2E",
        "F5F Store Admin production E2E",
        "F5G Store-attributed order production E2E",
    )
    for marker in dep_markers:
        require(marker in deployment_sem, f"DEPLOYMENT contiene semánticamente {marker}")

    require(
        "## F5C deployment identity boundary" in admin_contract,
        "STORE_ADMIN_CONTRACT contiene boundary F5C",
    )
    require(
        "Session.getActiveUser()" in admin_contract_sem,
        "STORE_ADMIN_CONTRACT conserva ActiveUser como identidad F4A",
    )
    require(
        "USER_ACCESSING" in admin_contract_sem
        and "MYSELF" in admin_contract_sem,
        "STORE_ADMIN_CONTRACT fija executeAs/access Admin",
    )
    require(
        "separate deployment resource of the same Apps Script project"
        in admin_contract_sem,
        "STORE_ADMIN_CONTRACT separa deployment sin duplicar proyecto",
    )
    require(
        "not a duplicate backend" in admin_contract_sem
        and "duplicate Store Service" in admin_contract_sem
        and "duplicate Registry" in admin_contract_sem
        and "duplicate Sheets repository" in admin_contract_sem
        and "duplicate identity authority" in admin_contract_sem,
        "STORE_ADMIN_CONTRACT prohíbe autoridades paralelas",
    )
    require(
        "deployer identity equals TAKARA_STORE_ADMIN_OWNER_EMAIL"
        in admin_contract_sem,
        "STORE_ADMIN_CONTRACT liga deployer a owner authority",
    )
    require(
        "anonymous access is forbidden" in admin_contract_sem,
        "STORE_ADMIN_CONTRACT prohíbe acceso anónimo",
    )
    require(
        "authorization remains fail closed" in admin_contract_sem
        and "denied Admin traffic never falls back to Store Public"
        in admin_contract_sem,
        "STORE_ADMIN_CONTRACT conserva fail-closed/no-downgrade",
    )
    require(
        "F5C performs no push and no deployment" in admin_contract_sem,
        "STORE_ADMIN_CONTRACT declara F5C sin push/deploy",
    )

    require(
        "USER_DEPLOYING" in deployment_sem
        and "forbidden for Admin" in deployment_sem,
        "Admin no puede depender de execute-as deployer",
    )
    require(
        "ANYONE_ANONYMOUS" in deployment_sem
        and "forbidden for Admin" in deployment_sem,
        "Admin no admite acceso anónimo",
    )
    require(
        "MYSELF" in deployment_sem
        and "deployer must equal" in deployment_sem,
        "Admin access queda ligado al deployer/owner",
    )

    require(
        "takara_validar_store_f5c_deployment_preflight.py" in quality,
        "Quality Gate ejecuta F5C preflight",
    )
    require(
        "takara_validar_store_f5b_admin_route.py" in quality,
        "Quality Gate conserva F5B",
    )
    require(
        "takara_validar_store_admin_phase_f4.py" in quality,
        "Quality Gate conserva F4 closure",
    )

    result = {
        "checks": checks,
        "code_sha": code_sha,
        "local_version": EXPECTED_LOCAL_VERSION,
        "same_script_project": True,
        "deployment_resources": {
            "PUBLIC": {
                "status": "existing-production-authority",
                "mutation_in_f5c": False,
            },
            "ADMIN": {
                "status": "candidate-only",
                "executeAs": "USER_ACCESSING",
                "access": "MYSELF",
                "requires_deployer_equals_owner": True,
            },
        },
        "doc_validation": "semantic-whitespace-markdown-normalized",
        "push": False,
        "deploy": False,
        "forward_prepared": ["F5D", "F5E", "F5F", "F5G"],
    }

    print(
        "[TAKARA_STORE_F5C_DEPLOYMENT_PREFLIGHT_OK] "
        + json.dumps(result, separators=(",", ":"))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())