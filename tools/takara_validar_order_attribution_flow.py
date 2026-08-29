from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "apps-script" / "takara-pedidos-web" / "Code.gs"
CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"
TEST = ROOT / "tools" / "takara_test_order_attribution_flow.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def extract_function(source: str, name: str) -> str:
    signature = f"function {name}("
    start = source.find(signature)
    require(start >= 0, f"Existe función {name}")

    open_index = source.find("{", start)
    require(open_index >= 0, f"Función {name} tiene cuerpo")

    depth = 0
    quote = None
    escaped = False

    for index in range(open_index, len(source)):
        char = source[index]

        if quote is not None:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue

        if char in ('"', "'", "`"):
            quote = char
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start:index + 1]

    raise AssertionError(f"[FAIL] Función {name} desbalanceada")


def main() -> int:
    code = read(CODE)
    test = read(TEST)
    contract = read(CONTRACT) if CONTRACT.is_file() else ""

    do_post = extract_function(code, "doPost")

    normalize = "const pedido = normalizarPedido_(payload);"
    attach = (
        "pedido.attribution = "
        "buildAuthoritativeOrderAttribution_(payload);"
    )
    validate = "validarPedido_(pedido);"
    dry_run = "if (pedido.modo_prueba)"
    side_effect = "const fotoPreparada = prepararFotoOriginal_("

    for marker in (
        normalize,
        attach,
        validate,
        dry_run,
        side_effect,
    ):
        require(marker in do_post, f"doPost conserva {marker}")

    require(
        do_post.index(normalize)
        < do_post.index(attach)
        < do_post.index(validate)
        < do_post.index(dry_run)
        < do_post.index(side_effect),
        "Atribución ocurre antes de cualquier efecto lateral",
    )
    require(
        do_post.index('tipoSolicitud === "CONTACTO_WEB"')
        < do_post.index(attach),
        "Contacto sale antes de atribución de pedido",
    )

    require(
        do_post.count("buildAuthoritativeOrderAttribution_(payload)") == 1,
        "doPost materializa atribución exactamente una vez",
    )
    require(
        "store_id" not in do_post,
        "doPost no devuelve ni deriva store_id directamente",
    )
    require(
        "source_type" not in do_post,
        "doPost no deriva source_type directamente",
    )

    for function_name in (
        "construirCuerpoInternoV1Compat_",
        "construirCuerpoInternoV2_",
    ):
        block = extract_function(code, function_name)

        for marker in (
            '"[ATRIBUCION]"',
            '"Versión atribución: " + pedido.attribution.version',
            '"Origen pedido: " + pedido.attribution.source_type',
            '"Store ID: " + (pedido.attribution.store_id || "")',
            (
                '"Store nombre snapshot: " + '
                '(pedido.attribution.store_name_snapshot || "")'
            ),
        ):
            require(
                marker in block,
                f"{function_name} persiste {marker}",
            )

    for marker in (
        "DIRECT technical body persists attribution",
        "STORE technical body persists authoritative id",
        "invalid STORE stops before persistence",
        "contact path bypasses order attribution",
        "TAKARA_ORDER_ATTRIBUTION_FLOW_F3D_OK",
    ):
        require(marker in test, f"F3D functional cubre {marker}")

    if contract:
        for marker in (
            "## Real doPost attribution wiring (F3D)",
            "`pedido.attribution`",
            "antes de cualquier efecto lateral",
            "cuerpo técnico interno",
        ):
            require(marker in contract, f"Contract conserva {marker}")

    print("[TAKARA_ORDER_ATTRIBUTION_FLOW_F3D_STATIC_OK] 39 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())