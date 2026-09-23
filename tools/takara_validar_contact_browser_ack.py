from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
checks = 0

LIVE = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_3_ORDER_BROWSER_ACK_V1"
LOCAL = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_17_0_CONTACT_BROWSER_ACK_V1"


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
    code = read("apps-script/takara-pedidos-web/Code.gs")
    transport = read(
        "apps-script/takara-pedidos-web/ContactBrowserTransport.gs"
    )
    ledger = read(
        "apps-script/takara-pedidos-web/ContactIdempotency.gs"
    )
    client = read("assets/js/takara-contacto-web.js")
    html = read("contacto.html")
    contract = read("docs/CONTACT_BROWSER_ACK_CONTRACT.md")
    gate = read("tools/takara_quality_gate.ps1")
    deployment = json.loads(read("config/deployment-state.json"))

    do_post = extract_function(code, "doPost")
    process_contact = extract_function(code, "procesarContactoWeb_")
    normalize_contact = extract_function(code, "normalizarContactoWeb_")

    require(
        f'VERSION_SCRIPT: "{LOCAL}"' in code,
        "Code.gs declara candidato W9 V1.17.0",
    )

    for marker in (
        "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
        "contact_postmessage_v1",
        "CONTACT_BROWSER_ALLOWED_ORIGINS",
        "CONTACT_BROWSER_NONCE_PATTERN",
        "CONTACT_BROWSER_REQUEST_ID_PATTERN",
        "CONTACT_BROWSER_ID_PATTERN",
        "parseContactBrowserResponseRequest_",
        "contactBrowserSafeResponse_",
        "contactBrowserResponseOrJson_",
        "window.parent.postMessage(",
        "XFrameOptionsMode.ALLOWALL",
    ):
        require(marker in transport, f"Transport conserva {marker}")

    require(
        '"https://takara3d.es"' in transport
        and '"https://www.takara3d.es"' in transport,
        "Backend contact ACK limita parent origins",
    )
    require(
        "email_destino" not in transport,
        "Transport ACK no conoce email interno",
    )

    for marker in (
        "TAKARA_CONTACT_IDEMPOTENCY_V1",
        "TAKARA_CONTACT_IDEMPOTENCY_KEY_PREFIX",
        "TAKARA_CONTACT_IDEMPOTENCY_RETENTION_MS",
        "PropertiesService.getScriptProperties()",
        "LockService.getScriptLock()",
        "buildContactIdempotencyFingerprint_",
        "assertContactIdempotencyRequestId_",
        "INTERNAL_EMAIL_IN_FLIGHT",
        "CLIENT_EMAIL_IN_FLIGHT",
        "COMPLETED",
        "CONTACT_IDEMPOTENCY_REVIEW_REQUIRED",
        "CONTACT_IDEMPOTENCY_CONFLICT",
        "releaseContactIdempotencyLease_",
    ):
        require(marker in ledger, f"Ledger conserva {marker}")

    require(
        'key !== "fecha_cliente"' in ledger,
        "Fingerprint excluye timestamp cliente",
    )
    require(
        'key !== "request_id"' in ledger,
        "Fingerprint excluye propia clave idempotente",
    )
    require(
        "contacto.email" not in ledger
        and "contacto.mensaje" not in ledger,
        "Ledger no persiste PII literal",
    )

    require(
        "parseOrderBrowserResponseRequest_(e)" in do_post,
        "doPost conserva protocolo de pedido",
    )
    require(
        "parseContactBrowserResponseRequest_(e)" in do_post,
        "doPost parsea protocolo de contacto",
    )
    require(
        'throw new Error("El ACK de pedido no admite solicitudes de contacto.")'
        in do_post,
        "doPost separa ACK pedido de contacto",
    )
    require(
        'throw new Error("El ACK de contacto no admite solicitudes de pedido.")'
        in do_post,
        "doPost separa ACK contacto de pedido",
    )
    require(
        "contactBrowserResponseOrJson_(" in do_post
        and "contactResponseRequest" in do_post,
        "Errores de contacto ACK vuelven por postMessage",
    )

    require(
        "if (!browserResponseRequest)" in process_contact,
        "Contacto conserva rama legacy",
    )
    require(
        "assertContactIdempotencyRequestId_" in process_contact,
        "Ruta ACK exige request id estable",
    )
    require(
        "beginContactIdempotency_" in process_contact,
        "Ruta ACK abre ledger antes de efectos",
    )
    require(
        'reservePublicSideEffectBudget_(' in process_contact,
        "Ruta moderna conserva W8",
    )
    require(
        'execution.mode === "COMPLETED"' in process_contact,
        "Retry completado devuelve ACK persistido",
    )

    begin_pos = process_contact.index("beginContactIdempotency_")
    budget_pos = process_contact.index(
        'reservePublicSideEffectBudget_(',
        begin_pos,
    )
    internal_inflight = process_contact.index(
        "INTERNAL_EMAIL_IN_FLIGHT",
        begin_pos,
    )
    internal_send = process_contact.index(
        "enviarEmailContactoInterno_",
        begin_pos,
    )
    client_inflight = process_contact.index(
        "CLIENT_EMAIL_IN_FLIGHT",
        begin_pos,
    )
    client_send = process_contact.index(
        "enviarConfirmacionContactoCliente_",
        begin_pos,
    )

    require(
        begin_pos < budget_pos < internal_inflight < internal_send,
        "Ledger y W8 preceden correo interno",
    )
    require(
        internal_send < client_inflight < client_send,
        "Fase cliente IN_FLIGHT precede correo cliente",
    )
    require(
        "contact_request_id: requestId" in process_contact,
        "ACK persistido conserva request id",
    )
    require(
        "releaseContactIdempotencyLease_" in process_contact
        and "finally" in process_contact,
        "Lease contacto se libera desde finally",
    )

    require(
        "request_id: texto_(payload.contact_request_id).toUpperCase()"
        in normalize_contact,
        "Normalizador incorpora request id",
    )

    for marker in (
        "CONTACT_BROWSER_TRANSPORT_VERSION",
        "CONTACT_BROWSER_ACK_TIMEOUT_MS = 120000",
        "CONTACT_REQUEST_ID_PATTERN",
        "getOrCreateContactRequestId",
        "window.crypto.getRandomValues",
        "event.source !== frame.contentWindow",
        "isAllowedContactBrowserAckOrigin(event.origin)",
        "data.nonce !== nonce",
        "data.request_id !== normalizedRequestId",
        "CONTACT_ID_PATTERN.test",
        "submitContactWithBrowserAck",
        'form.removeAttribute("data-takara-contact-request-id")',
    ):
        require(marker in client, f"Cliente conserva {marker}")

    require('mode: "no-cors"' not in client, "Cliente elimina no-cors")
    require("await fetch(" not in client, "Cliente no usa fetch como ACK")
    require(
        'payload.append("contact_request_id", requestId)' in client,
        "Cliente envia request id dentro del payload",
    )
    require(
        '"contact_request_id",\n        normalizedRequestId' in client,
        "Envelope de transporte repite request id",
    )
    require(
        "No la damos por recibida" in client,
        "Timeout comunica fail-closed",
    )

    require(
        'takara-contacto-web.js?v=contact-ack-v1' in html,
        "HTML activa cache build W9",
    )
    require(
        'action="https://script.google.com/macros/s/' in html,
        "Fallback HTML conserva action Apps Script",
    )

    for marker in (
        "TAKARA_CONTACT_BROWSER_POSTMESSAGE_V1",
        "TAKARA_CONTACT_IDEMPOTENCY_V1",
        "event.source === iframe.contentWindow",
        "request_id",
        "*_IN_FLIGHT",
        "fallback sin JavaScript",
        "30 días",
        LIVE,
        LOCAL,
    ):
        require(marker.lower() in contract.lower(), f"Contrato documenta {marker}")

    require(
        deployment["production"]["script_version"] == LIVE,
        "Deployment conserva LIVE V1.14.3",
    )
    require(
        deployment["local"]["script_version"] == LOCAL,
        "Deployment declara candidato W9 V1.17.0",
    )
    require(
        deployment["local"]["status"] == "candidate_not_deployed",
        "Deployment declara W9 no desplegado",
    )

    for artifact in (
        "apps-script/takara-pedidos-web/ContactBrowserTransport.gs",
        "apps-script/takara-pedidos-web/ContactIdempotency.gs",
        "docs/CONTACT_BROWSER_ACK_CONTRACT.md",
        "tools/takara_test_contact_browser_transport.js",
        "tools/takara_test_contact_idempotency.js",
        "tools/takara_validar_contact_browser_ack.py",
    ):
        require(artifact in gate, f"Quality Gate conserva {artifact}")

    print(
        "[TAKARA_CONTACT_BROWSER_ACK_STATIC_OK] "
        + json.dumps(
            {"checks": checks, "local": LOCAL},
            ensure_ascii=False,
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
