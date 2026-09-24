from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
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
    code = read("apps-script/takara-pedidos-web/Code.gs")
    module = read("apps-script/takara-pedidos-web/OrderIdempotency.gs")
    contract = read("docs/ORDER_IDEMPOTENCY_CONTRACT.md")
    gate = read("tools/takara_quality_gate.ps1")
    flow = read("tools/takara_test_order_idempotency_flow.js")
    unit = read("tools/takara_test_order_idempotency.js")
    do_post = extract_function(code, "doPost")

    require(
        'VERSION_SCRIPT: "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_19_0_STORE_URL_V2"' in code,
        "Code.gs declara candidato V1.19.0",
    )

    for marker in (
        'PHOTO_IN_FLIGHT: "PHOTO_IN_FLIGHT"',
        'INTERNAL_EMAIL_IN_FLIGHT: "INTERNAL_EMAIL_IN_FLIGHT"',
        'CLIENT_EMAIL_IN_FLIGHT: "CLIENT_EMAIL_IN_FLIGHT"',
        'COMPLETED: "COMPLETED"',
        "PropertiesService.getScriptProperties()",
        "LockService.getScriptLock()",
        "buildOrderIdempotencyFingerprint_",
        "assertOrderIdempotencyOrderId_",
        "resolveOrderIdempotencyReview_",
        "TAKARA_ORDER_IDEMPOTENCY_RETENTION_MS",
    ):
        require(marker in module, f"Modulo conserva {marker}")

    require("CacheService" not in module, "Ledger no depende de cache volatil")
    require(
        'if (key === "foto_base64")' in module and "foto_sha256" in module,
        "Fingerprint sustituye foto grande por hash",
    )
    require(
        'if (key === "ficha_visual_base64")' in module
        and "ficha_visual_sha256" in module,
        "Fingerprint sustituye ficha visual por hash",
    )
    require(
        'key !== "recibido_apps_script_iso"' in module,
        "Fingerprint excluye timestamp de recepcion",
    )
    require(
        "delete source.attribution" not in module,
        "Fingerprint conserva atribucion autoritativa",
    )

    contact = do_post.index('tipoSolicitud === "CONTACTO_WEB"')
    validate = do_post.index("validarPedido_(pedido);")
    dry = do_post.index("if (pedido.modo_prueba)")
    stable_id = do_post.index("assertOrderIdempotencyOrderId_")
    begin = do_post.index("beginOrderIdempotency_")
    folder = do_post.index("asegurarCarpetaPedido_")
    photo = do_post.index("guardarFoto_")
    internal = do_post.index("enviarEmailInterno_")
    client = do_post.index("enviarConfirmacionCliente_")

    require(contact >= 0 and contact < validate, "Contacto sale antes del ledger")
    require(validate >= 0 and validate < dry, "Validacion precede dry-run")
    require(dry >= 0 and dry < stable_id, "Dry-run sale antes del ledger")
    require(stable_id < begin, "ID estable se exige antes de reservar")
    require(begin < folder and begin < photo, "Ledger se reserva antes de Drive")
    require(
        'TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT' in do_post
        and do_post.index("TAKARA_ORDER_IDEMPOTENCY_PHASE.PHOTO_IN_FLIGHT") < folder,
        "Drive entra IN_FLIGHT antes del side effect",
    )
    require(
        'TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT' in do_post
        and do_post.index("TAKARA_ORDER_IDEMPOTENCY_PHASE.INTERNAL_EMAIL_IN_FLIGHT") < internal,
        "Correo interno entra IN_FLIGHT antes de enviar",
    )
    require(
        'TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT' in do_post
        and do_post.index("TAKARA_ORDER_IDEMPOTENCY_PHASE.CLIENT_EMAIL_IN_FLIGHT") < client,
        "Correo cliente entra IN_FLIGHT antes de enviar",
    )
    require(
        'idempotencyExecution.mode === "COMPLETED"' in do_post,
        "Retry completado devuelve ACK persistido",
    )
    require(
        "releaseOrderIdempotencyLease_" in do_post and "finally" in do_post,
        "Lease se libera desde finally",
    )
    require("error_code:" in do_post, "Errores idempotentes exponen codigo diagnostico")

    for marker in (
        "mismo ID con contenido diferente",
        "*_IN_FLIGHT",
        "revisión manual",
        "COMPLETED",
        "30 dias",
    ):
        require(marker.lower() in contract.lower(), f"Contrato documenta {marker}")

    for artifact in (
        "apps-script/takara-pedidos-web/OrderIdempotency.gs",
        "tools/takara_test_order_idempotency.js",
        "tools/takara_test_order_idempotency_flow.js",
        "tools/takara_validar_order_idempotency.py",
        "docs/ORDER_IDEMPOTENCY_CONTRACT.md",
    ):
        require(artifact in gate, f"Quality Gate conserva {artifact}")
    require("ORDER_IDEMPOTENCY_REVIEW_REQUIRED" in flow, "Flow cubre retry ambiguo")
    require("ORDER_IDEMPOTENCY_CONFLICT" in flow, "Flow cubre conflicto de payload")
    require("ORDER_IDEMPOTENCY_ID_REQUIRED" in flow, "Flow cubre id ausente")
    require("PHOTO_IN_FLIGHT" in unit, "Unit cubre fase Drive ambigua")

    print(
        "[TAKARA_ORDER_IDEMPOTENCY_STATIC_OK] "
        + json.dumps({"checks": checks}, separators=(",", ":"))
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
