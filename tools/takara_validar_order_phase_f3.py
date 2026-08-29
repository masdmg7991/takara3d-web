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
    order_js = read("assets/js/takara-pedido-web.js")
    resolution = read(
        "apps-script/takara-pedidos-web/StoreOrderResolution.gs"
    )
    attribution = read(
        "apps-script/takara-pedidos-web/OrderAttribution.gs"
    )
    code = read("apps-script/takara-pedidos-web/Code.gs")
    product_qr = read("qr/index.html")
    contract = read("docs/ORDER_ENGINE_CONTRACT.md")
    quality_gate = read("tools/takara_quality_gate.ps1")

    prior_artifacts = (
        "tools/takara_test_order_store_context.js",
        "tools/takara_validar_order_store_context.py",
        "tools/takara_test_store_order_resolution.js",
        "tools/takara_validar_store_order_resolution.py",
        "tools/takara_test_order_attribution.js",
        "tools/takara_validar_order_attribution.py",
        "tools/takara_test_order_attribution_flow.js",
        "tools/takara_validar_order_attribution_flow.py",
        "tools/takara_test_order_downstream_handoff.js",
        "tools/takara_validar_order_downstream_handoff.py",
        "tools/takara_test_order_system_f3f.js",
        "tools/takara_validar_order_system_f3f.py",
    )

    artifacts = {
        relative: read(relative)
        for relative in prior_artifacts
    }

    # F3A - browser transport authority.
    for marker in (
        'const STORE_CONTEXT_VERSION = "TAKARA_STORE_CONTEXT_V1"',
        '"TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1"',
        "setVerifiedContext:",
        "getTransport:",
        "getMeta:",
        "window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1",
    ):
        require(marker in order_js, f"F3A conserva {marker}")

    require(
        "store_id" not in extract_function(
            order_js,
            "getOrderStoreContextTransport",
        ),
        "F3A transport no expone store_id",
    )

    # F3B - backend identity resolution authority.
    transport = extract_function(
        resolution,
        "getOrderStoreContextTransport_",
    )
    resolve = extract_function(
        resolution,
        "resolveOrderStoreIdentity_",
    )

    require(
        'keys.join(",") !== "store_ref,version"' in transport,
        "F3B acepta solo version + store_ref",
    )
    require(
        "resolveStoreOrderIdentityRuntime_(transport.store_ref)"
        in resolve,
        "F3B resuelve mediante Store Runtime",
    )
    require(
        "if (transport === null) return null;" in resolve,
        "F3B conserva rama DIRECT sin Store",
    )
    require(
        "TAKARA_STORE_STATUS.ACTIVE" in resolve,
        "F3B exige Store ACTIVE",
    )
    require(
        "createStoreSheetsRepository_" not in resolution,
        "F3B no lee Sheets directamente",
    )

    # F3C - unique DIRECT/STORE attribution authority.
    build = extract_function(
        attribution,
        "buildAuthoritativeOrderAttribution_",
    )
    forbid = extract_function(
        attribution,
        "assertNoBrowserDerivedAttribution_",
    )

    require(
        'TAKARA_STORE_ATTRIBUTION_VERSION = '
        '"TAKARA_STORE_ATTRIBUTION_V1"' in attribution,
        "F3C conserva versión de atribución",
    )
    require(
        'DIRECT: "DIRECT"' in attribution
        and 'STORE: "STORE"' in attribution,
        "F3C conserva fuentes DIRECT/STORE",
    )
    require(
        "resolveOrderStoreIdentity_(payload)" in build,
        "F3C consume F3B",
    )
    require(
        "source_type: TAKARA_ORDER_SOURCE_TYPE.DIRECT" in build,
        "F3C materializa DIRECT",
    )
    require(
        "source_type: TAKARA_ORDER_SOURCE_TYPE.STORE" in build,
        "F3C materializa STORE",
    )
    require(
        "store_id: assertStoreId_(identity.store_id)" in build,
        "F3C congela store_id backend",
    )
    require(
        "store_name_snapshot: normalizeStoreDisplayName_"
        in build,
        "F3C congela nombre autoritativo",
    )
    for forbidden in (
        '"source_type"',
        '"store_id"',
        '"store_name_snapshot"',
        '"store_attribution"',
    ):
        require(
            forbidden in forbid,
            f"F3C rechaza browser {forbidden}",
        )
    require(
        "createStoreSheetsRepository_" not in attribution,
        "F3C no lee Store persistence",
    )

    # F3D - orchestration into real doPost and technical persistence.
    do_post = extract_function(code, "doPost")
    attribution_line = (
        "pedido.attribution = "
        "buildAuthoritativeOrderAttribution_(payload);"
    )
    validate_line = "validarPedido_(pedido);"

    require(
        attribution_line in do_post,
        "F3D conecta atribución en doPost",
    )
    require(
        do_post.index(attribution_line)
        < do_post.index(validate_line),
        "F3D atribuye antes de validar",
    )
    require(
        do_post.index("CONTACTO_WEB")
        < do_post.index(attribution_line),
        "CONTACTO sale antes de atribución de pedido",
    )
    require(
        code.count("[ATRIBUCION]") == 2,
        "F3D conserva bloques V1/V2 de atribución",
    )
    for marker in (
        "pedido.attribution.version",
        "pedido.attribution.source_type",
        "pedido.attribution.store_id",
        "pedido.attribution.store_name_snapshot",
    ):
        require(
            code.count(marker) == 2,
            f"F3D persiste V1/V2 {marker}",
        )

    # F3E - downstream handoff, no re-resolution.
    internal = extract_function(code, "enviarEmailInterno_")
    client = extract_function(code, "enviarConfirmacionCliente_")

    require(
        "body: body" in internal,
        "F3E entrega body técnico sin reconstruir",
    )
    require(
        "MailApp.sendEmail(options)" in internal,
        "F3E usa MailApp handoff real",
    )
    require(
        "buildAuthoritativeOrderAttribution_" not in internal,
        "F3E no recalcula atribución",
    )
    require(
        "resolveOrderStoreIdentity_" not in internal,
        "F3E no re-resuelve Store",
    )
    for forbidden in (
        "store_id",
        "store_name_snapshot",
        "TAKARA_STORE_ATTRIBUTION_V1",
    ):
        require(
            forbidden not in client,
            f"F3E cliente no expone {forbidden}",
        )

    # F3F - horizontal SystemScenario is the functional phase proof.
    f3f = artifacts["tools/takara_test_order_system_f3f.js"]
    for marker in (
        '"STORE"',
        '"DIRECT"',
        '"MANIPULATED"',
        '"MISSING"',
        '"RENAME"',
        '"INACTIVE"',
        "directStoreLookups === 0",
        "rename keeps same F3A transport ref",
        "firstSnapshot.store_name_snapshot",
        "inactiveBefore + 1",
        "handoff preserves technical body byte-for-byte",
        "TAKARA_ORDER_SYSTEM_F3F_OK",
    ):
        require(marker in f3f, f"F3F conserva escenario {marker}")

    # Product QR remains an independent product-care channel.
    require(
        "TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1" not in product_qr,
        "Product QR no depende de F3A",
    )
    require(
        "TAKARA_STORE_ATTRIBUTION_V1" not in product_qr,
        "Product QR no conoce atribución Store",
    )
    require(
        "store_ref" not in product_qr,
        "Product QR no transporta store_ref",
    )

    # QG must retain every F3 gate plus this phase closure.
    for marker in (
        "takara_validar_order_store_context.py",
        "takara_test_order_store_context.js",
        "takara_validar_store_order_resolution.py",
        "takara_test_store_order_resolution.js",
        "takara_validar_order_attribution.py",
        "takara_test_order_attribution.js",
        "takara_validar_order_attribution_flow.py",
        "takara_test_order_attribution_flow.js",
        "takara_validar_order_downstream_handoff.py",
        "takara_test_order_downstream_handoff.js",
        "takara_validar_order_system_f3f.py",
        "takara_test_order_system_f3f.js",
        "takara_validar_order_phase_f3.py",
    ):
        require(marker in quality_gate, f"Quality Gate conserva {marker}")

    # F3G contract: cumulative closure, no new authority.
    for marker in (
        "## F3 cumulative phase closure (F3G)",
        "F3A",
        "F3B",
        "F3C",
        "F3D",
        "F3E",
        "F3F",
        "AUTHOR != AUTHORITY",
        "Product QR != Store QR",
        "F3 7/7",
        "F4",
    ):
        require(marker in contract, f"Contrato F3G conserva {marker}")

    print(
        "[TAKARA_ORDER_PHASE_F3_CLOSURE_OK] "
        + json.dumps({"checks": checks})
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())