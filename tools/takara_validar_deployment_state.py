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
PRODUCTION_SCRIPT = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"
LOCAL_SCRIPT = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_17_0_CONTACT_BROWSER_ACK_V1"
ENDPOINT_AUTHORITY = "assets/js/takara-config.js"
LOCAL_STATUS = "candidate_not_deployed"

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
    state = json.loads(read(STATE))
    code = read(CODE)
    config = read(CONFIG)
    deployment = read(DEPLOYMENT)
    app_readme = read(APP_README)
    order_contract = read(ORDER_CONTRACT)

    require(state.get("schema_version") == SCHEMA, "Schema de deployment exacto")
    require(
        state.get("endpoint_authority") == ENDPOINT_AUTHORITY,
        "Autoridad de endpoint exacta",
    )

    verification = state.get("live_verification") or {}
    method = str(verification.get("method") or "")
    verified_on = str(verification.get("verified_on") or "")
    require(
        "GET" in method and "script" in method,
        "Verificacion LIVE exige GET y campo script",
    )
    require(
        re.fullmatch(r"\d{4}-\d{2}-\d{2}", verified_on) is not None,
        "Fecha LIVE estructurada",
    )

    production = state.get("production") or {}
    local = state.get("local") or {}

    require(production.get("service") == SERVICE, "Servicio productivo exacto")
    require(
        production.get("service_version") == SERVICE_VERSION,
        "Version de servicio productiva exacta",
    )
    require(
        production.get("script_version") == PRODUCTION_SCRIPT,
        "Version script LIVE permanece V1.14.3",
    )
    require(production.get("status") == "online", "Estado productivo online")

    require(
        local.get("script_version") == LOCAL_SCRIPT,
        "Version local candidata es V1.17.0 ACK causal contacto",
    )
    require(
        local.get("status") == LOCAL_STATUS,
        "Estado local declara candidato no desplegado",
    )
    require(
        local.get("script_version") != production.get("script_version"),
        "Estado mecanico distingue local de LIVE",
    )

    require(
        code.count(LOCAL_SCRIPT) == 1,
        "Code.gs declara una unica VERSION_SCRIPT candidata",
    )
    require(
        PRODUCTION_SCRIPT not in code,
        "Code.gs no finge ejecutar la version LIVE anterior",
    )
    require(
        "TAKARA_GET_APPS_SCRIPT_ENDPOINT" in config,
        "Config expone API canonica de endpoint",
    )

    for marker in (
        "config/deployment-state.json",
        PRODUCTION_SCRIPT,
        LOCAL_SCRIPT,
        "Script LIVE",
        "Script local candidato",
        "candidato no desplegado",
    ):
        require(marker in deployment, f"DEPLOYMENT documenta {marker}")

    for text, name in (
        (app_readme, "Apps Script README"),
        (order_contract, "ORDER_ENGINE_CONTRACT"),
    ):
        require(PRODUCTION_SCRIPT in text, f"{name} conserva version LIVE")
        require(LOCAL_SCRIPT in text, f"{name} documenta candidato local")

    require(
        "OrderIdempotency.gs" in app_readme,
        "Apps Script README documenta modulo idempotente",
    )
    require(
        "ORDER_IDEMPOTENCY_CONTRACT.md" in order_contract,
        "ORDER_ENGINE_CONTRACT enlaza contrato de idempotencia",
    )

    print(
        "[TAKARA_DEPLOYMENT_STATE_OK] "
        + json.dumps(
            {
                "checks": checks,
                "production": PRODUCTION_SCRIPT,
                "local": LOCAL_SCRIPT,
                "local_status": LOCAL_STATUS,
                "verified_on": verified_on,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
