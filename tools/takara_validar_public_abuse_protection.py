#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"
LOCAL = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_16_0_PUBLIC_ABUSE_GUARD_V1"
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f"Existe {relative}")
    return path.read_text(encoding="utf-8-sig")


def extract_function(source: str, name: str) -> str:
    marker = f"function {name}("
    start = source.find(marker)
    require(start >= 0, f"Existe funcion {name}")
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
        if ch in ('"', "'", chr(96)):
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
    module = read("apps-script/takara-pedidos-web/PublicAbuseProtection.gs")
    code = read("apps-script/takara-pedidos-web/Code.gs")
    html = read("contacto.html")
    client = read("assets/js/takara-contacto-web.js")
    css = read("assets/css/styles.css")
    contract = read("docs/PUBLIC_ABUSE_PROTECTION_CONTRACT.md")
    gate = read("tools/takara_quality_gate.ps1")
    state = json.loads(read("config/deployment-state.json"))

    do_post = extract_function(code, "doPost")
    contact = extract_function(code, "procesarContactoWeb_")
    contact_validation = extract_function(code, "validarContactoWeb_")

    require(
        f'VERSION_SCRIPT: "{LOCAL}"' in code,
        "Code.gs declara candidato W8 V1.16.0",
    )

    for marker in (
        'TAKARA_PUBLIC_ABUSE_VERSION = "TAKARA_PUBLIC_ABUSE_GUARD_V1"',
        'MAIL_RESERVE_RECIPIENTS: 20',
        'DAILY_MAX_PUBLIC_RECIPIENTS: 200',
        'GLOBAL_BURST_WINDOW_MS: 5 * 60 * 1000',
        'GLOBAL_BURST_MAX_SUBMISSIONS: 20',
        'CONTACT_ACTOR_WINDOW_MS: 15 * 60 * 1000',
        'CONTACT_ACTOR_MAX_SUBMISSIONS: 3',
        'ORDER_ACTOR_WINDOW_MS: 30 * 60 * 1000',
        'ORDER_ACTOR_MAX_SUBMISSIONS: 5',
        'MAX_ACTOR_ENTRIES: 80',
        'PropertiesService.getScriptProperties()',
        'LockService.getScriptLock()',
        'MailApp.getRemainingDailyQuota()',
        'assertPublicAbuseStateShape_',
        'serialized.length > 8500',
        '.slice(0, 24)',
    ):
        require(marker in module, f"Modulo conserva {marker}")

    require("CacheService" not in module, "Seguridad no depende de CacheService")
    require(
        "PUBLIC_ABUSE_STATE_CORRUPT" in module
        and "PUBLIC_ABUSE_MAIL_RESERVE" in module
        and "PUBLIC_ABUSE_GLOBAL_BURST" in module
        and "PUBLIC_ABUSE_ACTOR_RATE" in module,
        "Errores fail-closed principales presentes",
    )

    dry = do_post.index("if (pedido.modo_prueba)")
    begin = do_post.index("beginOrderIdempotency_")
    completed = do_post.index('idempotencyExecution.mode === "COMPLETED"')
    reserve = do_post.index('reservePublicSideEffectBudget_(')
    folder = do_post.index("asegurarCarpetaPedido_")
    photo = do_post.index("guardarFoto_")
    internal = do_post.index("enviarEmailInterno_")
    customer = do_post.index("enviarConfirmacionCliente_")

    require(dry < begin, "Dry-run sale antes de W7")
    require(begin < completed < reserve, "Retry W7 COMPLETED sale antes de W8")
    require(
        reserve < folder < photo < internal < customer,
        "W8 protege pedido antes de Drive y correos",
    )
    require('"ORDER"' in do_post and "pedido.cliente.email" in do_post, "ORDER usa actor email")
    require(",\n      2," in do_post, "ORDER reserva dos destinatarios")

    validate_pos = contact.index("validarContactoWeb_(contacto)")
    contact_reserve = contact.index("reservePublicSideEffectBudget_(")
    contact_id = contact.index("generarIdContactoWeb_")
    contact_internal = contact.index("enviarEmailContactoInterno_")
    contact_customer = contact.index("enviarConfirmacionContactoCliente_")
    require(
        validate_pos < contact_reserve < contact_id < contact_internal < contact_customer,
        "CONTACT valida y reserva antes de IDs/correos",
    )
    require('"CONTACT"' in contact and "contacto.email" in contact, "CONTACT usa actor email")

    for marker in (
        "PUBLIC_ABUSE_HONEYPOT",
        "CFG.CONTACT_NAME_MAX_CHARS",
        "emailPedidoValido_(contacto.email)",
        "CFG.CONTACT_SUBJECT_MAX_CHARS",
        "CFG.CONTACT_MESSAGE_MAX_CHARS",
        "CFG.CONTACT_OPTIONAL_PHONE_MAX_CHARS",
        "CFG.CONTACT_METADATA_MAX_CHARS",
        'contacto.origen !== "contacto.html"',
    ):
        require(marker in contact_validation, f"Contacto valida {marker}")

    for marker in (
        'name="website"',
        'tabindex="-1"',
        'autocomplete="off"',
        'name="nombre" autocomplete="name" placeholder="Tu nombre" maxlength="100"',
        'name="email" autocomplete="email" placeholder="tu@email.com" maxlength="254"',
        'name="asunto" placeholder="Consulta, colaboración o duda general" maxlength="160"',
        'textarea name="mensaje" rows="6" maxlength="5000"',
    ):
        require(marker in html, f"HTML contacto conserva {marker}")

    require(".contacto-final-form__trap" in css, "CSS oculta honeypot fuera de pantalla")
    require(
        'payload.append("website", value(form, "website"));' in client,
        "Cliente JS transporta honeypot",
    )

    require(
        state.get("production", {}).get("script_version") == LIVE,
        "Deployment state conserva LIVE V1.14.3",
    )
    require(
        state.get("local", {}).get("script_version") == LOCAL,
        "Deployment state declara local W8 V1.16.0",
    )
    require(
        state.get("local", {}).get("status") == "candidate_not_deployed",
        "W8 sigue no desplegado",
    )

    for marker in (
        "20 destinatarios",
        "200 destinatarios",
        "20 solicitudes",
        "3 solicitudes",
        "5 solicitudes",
        "8.500",
        "nunca guarda el email en claro",
        "No se usa",
        LIVE,
        LOCAL,
    ):
        require(marker in contract, f"Contrato documenta {marker}")

    for artifact in (
        "apps-script/takara-pedidos-web/PublicAbuseProtection.gs",
        "docs/PUBLIC_ABUSE_PROTECTION_CONTRACT.md",
        "tools/takara_test_public_abuse_protection.js",
        "tools/takara_test_public_abuse_flow.js",
        "tools/takara_validar_public_abuse_protection.py",
    ):
        require(artifact in gate, f"Quality Gate exige {artifact}")

    print(
        "[TAKARA_PUBLIC_ABUSE_STATIC_OK] "
        + json.dumps({"checks": checks}, separators=(",", ":"))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
