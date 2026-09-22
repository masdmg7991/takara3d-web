#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "config" / "deployment-state.json"
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
CONFIG = ROOT / "assets" / "js" / "takara-config.js"
DEPLOYMENT = ROOT / "docs" / "DEPLOYMENT.md"
APP_README = ROOT / "apps-script" / "takara-pedidos-web" / "README.md"
ORDER_CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"

SCHEMA = "TAKARA_DEPLOYMENT_STATE_V1"
SERVICE = "Takara Pedidos Web"
SERVICE_VERSION = "TAKARA_PEDIDO_WEB_V2"
SCRIPT_VERSION = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"
ENDPOINT_AUTHORITY = "assets/js/takara-config.js"

checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    state_text = read(STATE)
    state = json.loads(state_text)
    code = read(CODE)
    config = read(CONFIG)
    deployment = read(DEPLOYMENT)
    app_readme = read(APP_README)
    order_contract = read(ORDER_CONTRACT)

    require(state.get("schema_version") == SCHEMA, "Schema de deployment exacto")
    require(state.get("endpoint_authority") == ENDPOINT_AUTHORITY, "Autoridad de endpoint exacta")

    verification = state.get("live_verification") or {}
    method = str(verification.get("method") or "")
    verified_on = str(verification.get("verified_on") or "")
    require("GET" in method and "script" in method, "Verificacion LIVE exige GET y campo script")
    require(re.fullmatch(r"\d{4}-\d{2}-\d{2}", verified_on) is not None, "Fecha LIVE estructurada")

    production = state.get("production") or {}
    local = state.get("local") or {}
    require(production.get("service") == SERVICE, "Servicio productivo exacto")
    require(production.get("service_version") == SERVICE_VERSION, "Version de servicio productiva exacta")
    require(production.get("script_version") == SCRIPT_VERSION, "Version script productiva exacta")
    require(production.get("status") == "online", "Estado productivo online")
    require(local.get("script_version") == SCRIPT_VERSION, "Version local coincide con autoridad productiva")

    require(code.count(SCRIPT_VERSION) == 1, "Code.gs declara una unica VERSION_SCRIPT actual")
    require("TAKARA_GET_APPS_SCRIPT_ENDPOINT" in config, "Config expone API canonica de endpoint")

    require("config/deployment-state.json" in deployment, "DEPLOYMENT referencia estado mecanico")
    require(SCRIPT_VERSION in deployment, "DEPLOYMENT documenta version productiva actual")
    require(ENDPOINT_AUTHORITY in deployment, "DEPLOYMENT documenta autoridad de endpoint")
    require("respuesta GET del" in deployment and "endpoint productivo" in deployment, "DEPLOYMENT documenta autoridad LIVE por GET")

    for text, name in ((app_readme, "Apps Script README"), (order_contract, "ORDER_ENGINE_CONTRACT")):
        require(SCRIPT_VERSION in text, f"{name} documenta V1.14.3")
        require("V1_14_2_STORE_ADMIN_ROUTE_V1" not in text, f"{name} no presenta V1.14.2 como estado actual")

    print(
        "[TAKARA_DEPLOYMENT_STATE_OK] "
        + json.dumps(
            {
                "checks": checks,
                "production": SCRIPT_VERSION,
                "verified_on": verified_on,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
