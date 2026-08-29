from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
ATTRIBUTION = (
    ROOT
    / "apps-script"
    / "takara-pedidos-web"
    / "OrderAttribution.gs"
)
CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"
TEST = ROOT / "tools" / "takara_test_order_downstream_handoff.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def extract_function(source: str, name: str) -> str:
    marker = f"function {name}("
    start = source.find(marker)
    require(start >= 0, f"Existe función {name}")

    brace_start = source.find("{", start)
    require(brace_start >= 0, f"{name} tiene cuerpo")

    depth = 0
    quote = ""
    escaped = False
    line_comment = False
    block_comment = False
    i = brace_start

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
    attribution = read(ATTRIBUTION)
    contract = read(CONTRACT)
    test = read(TEST)

    internal = extract_function(code, "enviarEmailInterno_")
    client = extract_function(code, "enviarConfirmacionCliente_")
    client_html = extract_function(
        code,
        "construirHtmlConfirmacionPedidoCliente_",
    )
    do_post = extract_function(code, "doPost")

    require(
        "body: body" in internal,
        "MailApp recibe el cuerpo técnico ya construido",
    )
    require(
        "MailApp.sendEmail(options)" in internal,
        "handoff real usa MailApp options",
    )
    require(
        "construirHtmlInterno_(" in internal,
        "renderer interno recibe pedido autoritativo",
    )

    require(
        code.count("[ATRIBUCION]") == 2,
        "V1/V2 conservan exactamente dos bloques ATRIBUCION",
    )
    for marker in (
        "pedido.attribution.version",
        "pedido.attribution.source_type",
        "pedido.attribution.store_id",
        "pedido.attribution.store_name_snapshot",
    ):
        require(
            code.count(marker) == 2,
            f"V1/V2 conservan {marker}",
        )

    for forbidden in (
        "store_id",
        "store_name_snapshot",
        ".attribution",
        "TAKARA_STORE_ATTRIBUTION_V1",
    ):
        require(
            forbidden not in client,
            f"correo cliente no expone {forbidden}",
        )

    for forbidden in (
        "store_id",
        "store_name_snapshot",
        ".attribution",
    ):
        require(
            forbidden not in client_html,
            f"HTML cliente no expone {forbidden}",
        )

    require(
        '"store_id"' not in do_post,
        "respuesta HTTP no expone store_id",
    )
    require(
        '"store_name_snapshot"' not in do_post,
        "respuesta HTTP no expone Store name snapshot",
    )

    require(
        'TAKARA_STORE_ATTRIBUTION_VERSION = '
        '"TAKARA_STORE_ATTRIBUTION_V1"' in attribution,
        "F3E preserva autoridad F3C",
    )
    require(
        "createStoreSheetsRepository_" not in internal,
        "handoff no consulta Store persistence",
    )
    require(
        "buildAuthoritativeOrderAttribution_" not in internal,
        "handoff no recalcula atribución",
    )

    require(
        "## Downstream attribution handoff (F3E)" in contract,
        "Contrato F3E conserva su sección canónica",
    )
    require(
        "MailApp.sendEmail(options)" in contract,
        "Contrato F3E conserva frontera MailApp",
    )
    require(
        "byte-for-byte" in contract,
        "Contrato F3E exige preservación exacta del body",
    )
    require(
        "STORE conserva" in contract
        and "store_id" in contract
        and "store_name_snapshot" in contract,
        "Contrato F3E conserva identidad STORE downstream",
    )
    require(
        "DIRECT conserva" in contract
        and "no inventa identidad Store" in contract,
        "Contrato F3E conserva DIRECT sin identidad Store",
    )
    require(
        "confirmación del cliente" in contract
        and "respuesta HTTP" in contract
        and "no exponen" in contract
        and "`store_id`" in contract,
        "Contrato F3E conserva privacidad cliente/HTTP",
    )
    require(
        "F5 verificará" in contract,
        "Contrato F3E mantiene límite con E2E F5",
    )

    normalized_test = " ".join(test.split())

    require(
        'store.sent[0].body === storeBody()' in normalized_test,
        "Test F3E compara body STORE exacto en MailApp",
    )
    require(
        'store.sent[0].body.includes("Store ID: STO_000001")'
        in normalized_test,
        "Test F3E verifica store_id STORE downstream",
    )
    require(
        '"Store nombre snapshot: Foto García"' in test,
        "Test F3E verifica snapshot STORE downstream",
    )
    require(
        'direct.sent[0].body === directBody()' in normalized_test,
        "Test F3E compara body DIRECT exacto en MailApp",
    )
    require(
        'Object.prototype.hasOwnProperty.call( directAttribution, "store_id" )'
        in normalized_test,
        "Test F3E verifica DIRECT sin store_id",
    )
    require(
        'Object.prototype.hasOwnProperty.call( directAttribution, '
        '"store_name_snapshot" )' in normalized_test,
        "Test F3E verifica DIRECT sin store_name_snapshot",
    )
    require(
        'const clientSource = extractFunction( source, '
        '"enviarConfirmacionCliente_" );' in normalized_test
        and '"store_id"' in test
        and '"store_name_snapshot"' in test
        and '"TAKARA_STORE_ATTRIBUTION_V1"' in test
        and '"client confirmation hides " + forbidden' in test,
        "Test F3E inspecciona privacidad del correo cliente",
    )
    require(
        'const doPostSource = extractFunction(source, "doPost");'
        in test
        and '!doPostSource.includes(\'"store_id"\')' in test
        and '!doPostSource.includes(\'"store_name_snapshot"\')' in test,
        "Test F3E inspecciona privacidad de la respuesta HTTP",
    )
    require(
        "[TAKARA_ORDER_DOWNSTREAM_HANDOFF_F3E_OK]" in test,
        "Test F3E conserva marcador funcional",
    )

    print(
        "[TAKARA_ORDER_DOWNSTREAM_HANDOFF_F3E_STATIC_OK] "
        "42 comprobaciones"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())