from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "apps-script" / "takara-pedidos-web"
FILES = {
    "order_js": ROOT / "assets" / "js" / "takara-pedido-web.js",
    "domain": APP / "StoreDomain.gs",
    "registry": APP / "StoreRegistry.gs",
    "runtime": APP / "StoreRuntime.gs",
    "resolution": APP / "StoreOrderResolution.gs",
    "attribution": APP / "OrderAttribution.gs",
    "code": APP / "Code.gs",
    "contract": ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md",
    "test": ROOT / "tools" / "takara_test_order_system_f3f.js",
}
checks = 0


def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1


def read(name: str) -> str:
    path = FILES[name]
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
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
    order_js = read("order_js")
    domain = read("domain")
    registry = read("registry")
    runtime = read("runtime")
    resolution = read("resolution")
    attribution = read("attribution")
    code = read("code")
    contract = read("contract")
    test = read("test")

    for marker in (
        "TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1",
        "setVerifiedContext",
        "getTransport",
        "getMeta",
        "store_ref",
    ):
        require(marker in order_js, f"F3A bridge conserva {marker}")
    require("store_id" not in extract_function(order_js, "getOrderStoreContextMeta"), "F3A meta no deriva store_id")

    for marker in (
        "TAKARA_STORE_CONTEXT_VERSION",
        "TAKARA_STORE_ORDER_IDENTITY_VERSION",
        "ACTIVE",
        "INACTIVE",
        "toStoreContext_",
        "toStoreOrderIdentity_",
    ):
        require(marker in domain, f"Store domain conserva {marker}")

    require("resolveStoreOrderIdentityService_" in registry, "Registry expone order identity service")
    require("updateStoreService_" in registry, "Registry soporta rename")
    require("setStoreStatusService_" in registry, "Registry soporta ACTIVE/INACTIVE")
    require("resolveStoreOrderIdentityRuntime_" in runtime, "Runtime resuelve identidad de pedido")
    require("updateStoreRuntime_" in runtime, "Runtime expone rename")
    require("deactivateStoreRuntime_" in runtime, "Runtime expone INACTIVE")

    resolved = extract_function(resolution, "resolveOrderStoreIdentity_")
    require("getOrderStoreContextTransport_(payload)" in resolved, "F3B consume transporte F3A")
    require("resolveStoreOrderIdentityRuntime_(transport.store_ref)" in resolved, "F3B re-resuelve por store_ref")
    require("identity.status !== TAKARA_STORE_STATUS.ACTIVE" in resolved, "F3B exige ACTIVE")

    builder = extract_function(attribution, "buildAuthoritativeOrderAttribution_")
    require("assertNoBrowserDerivedAttribution_(payload)" in builder, "F3C rechaza derivados browser")
    require("resolveOrderStoreIdentity_(payload)" in builder, "F3C consume F3B")
    require("source_type: TAKARA_ORDER_SOURCE_TYPE.DIRECT" in builder, "F3C conserva DIRECT")
    require("source_type: TAKARA_ORDER_SOURCE_TYPE.STORE" in builder, "F3C conserva STORE")
    require("store_id: assertStoreId_(identity.store_id)" in builder, "F3C usa store_id backend")
    require("store_name_snapshot" in builder, "F3C congela nombre Store")
    require("createStoreSheetsRepository_" not in builder, "F3C no consulta persistence directamente")

    do_post = extract_function(code, "doPost")
    require("pedido.attribution = buildAuthoritativeOrderAttribution_(payload);" in do_post, "F3D cablea atribución real")
    require(do_post.index("buildAuthoritativeOrderAttribution_(payload)") < do_post.index("validarPedido_(pedido)"), "F3D atribuye antes de validar")
    require(code.count("[ATRIBUCION]") == 2, "V1/V2 conservan dos bloques ATRIBUCION")

    internal = extract_function(code, "enviarEmailInterno_")
    require("body: body" in internal, "F3E entrega body técnico sin reconstruir")
    require("MailApp.sendEmail(options)" in internal, "F3E usa MailApp handoff")
    require("buildAuthoritativeOrderAttribution_" not in internal, "F3E no recalcula atribución")

    for marker in (
        "## Order phase SystemScenario (F3F)",
        "StoreContext V1",
        "F3A transport",
        "F3B resolution",
        "F3C attribution",
        "F3D doPost",
        "F3E MailApp handoff",
        "DIRECT no transporta StoreContext y realiza cero consultas Store",
        "rename conserva `store_ref` y `store_id`",
        "INACTIVE bloquea",
        "Product QR != Store QR",
        "F3G",
    ):
        require(marker in contract, f"Contrato F3F conserva {marker}")

    normalized_test = " ".join(test.split())
    require(
        'const document = { addEventListener(type, handler, options)' in normalized_test,
        "F3F harness aporta primitive document.addEventListener",
    )
    require(
        'fs.readFileSync(ORDER_JS, "utf8")' in normalized_test,
        "F3F ejecuta bytes completos de takara-pedido-web.js",
    )
    require(
        'entry.type === "DOMContentLoaded"' in normalized_test,
        "F3F verifica bootstrap DOMContentLoaded sin dispararlo",
    )
    require(
        'window.TAKARA_ORDER_STORE_CONTEXT_BRIDGE_V1' in normalized_test,
        "F3F usa bridge F3A real del producto completo",
    )
    for marker in (
        'const initialContext = clone(backend.resolveStoreContextRuntime_(STORE_REF));',
        'bridge.setVerifiedContext(initialContext)',
        'createOrderHarness(backend, storePayload)',
        'handoff(storeOrder.result.technical_email_body, initialPedido)',
        'const directStoreLookups = repo.metrics.findByPublicCode - directBefore;',
        'directStoreLookups === 0',
        'store_id: "STO_999999"',
        'const renamed = backend.updateStoreRuntime_("STO_000001", { display_name: "Foto García Centro" });',
        'firstSnapshot.store_name_snapshot === "Foto García"',
        'backend.deactivateStoreRuntime_("STO_000001")',
        'backend.resolveStoreContextRuntime_(STORE_REF)',
        'repo.metrics.findByPublicCode === inactiveBefore + 1',
        '[TAKARA_ORDER_SYSTEM_F3F_OK]',
    ):
        require(marker in normalized_test or marker in test, f"Test F3F cubre mecánica {marker}")

    for scenario in ("STORE", "DIRECT", "MANIPULATED", "MISSING", "RENAME", "INACTIVE"):
        require(f'"{scenario}"' in test, f"Test F3F declara escenario {scenario}")

    print(f"[TAKARA_ORDER_SYSTEM_F3F_STATIC_OK] {{\"checks\":{checks}}}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())