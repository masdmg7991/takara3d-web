from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js" / "takara-store-public.js"
BRIDGE = ROOT / "404.html"
ARCH = ROOT / "docs" / "ARCHITECTURE.md"
TEST = ROOT / "tools" / "takara_test_store_qr_contract.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    js = read(JS)
    bridge = read(BRIDGE)
    arch = read(ARCH)
    test = read(TEST)
    bt = chr(96)

    for marker in (
        "TAKARA_STORE_QR_URL_V2",
        "TAKARA_STORE_QR_URL_V1",
        'STORE_PUBLIC_CANONICAL_ORIGIN = "https://takara3d.es"',
        'STORE_PUBLIC_CANONICAL_PATH = "/tienda/"',
        "buildStorePrettyUrl",
        "buildStorePublicUrl",
        "parseStorePublicUrl",
        "isStorePublicUrl",
        "readStoreSlug",
        "buildResolveSlugUrl",
        "rawValue !== parsed.href",
        'parsed.protocol !== "https:"',
        "parsed.origin !== STORE_PUBLIC_CANONICAL_ORIGIN",
        'parsed.searchParams.getAll("s")',
        "parsed.hash",
    ):
        require(marker in js, f"Store QR client conserva {marker}")

    for marker in (
        '"/tienda/?slug=" + encodeURIComponent(match[1])',
        "window.location.search || window.location.hash",
        "var match = /^",
        "window.location.pathname",
        "?)$/.exec(",
    ):
        require(marker in bridge, f"404 bridge conserva {marker}")

    for forbidden in (
        "cloudflareinsights",
        "data-cf-beacon",
    ):
        require(forbidden not in bridge, f"404 Store fallback no contiene {forbidden}")

    for forbidden in (
        'STORE_PUBLIC_CANONICAL_PATH = "/qr"',
        "store_id=",
        "Math.random",
    ):
        require(forbidden not in js, f"Store QR production no contiene {forbidden}")

    require("## Store QR URL Contract V2" in arch, "Arquitectura documenta QR V2")
    require("PRODUCT_QR != STORE_QR" in arch, "Arquitectura separa Product/Store QR")
    require(
        "https://takara3d.es/tienda/<store_slug>" in arch,
        "Arquitectura define URL bonita canonica",
    )
    require(
        "https://takara3d.es/tienda/?s=<store_public_code>" in arch,
        "Arquitectura conserva URL legacy",
    )
    require(
        bt + "store_id" + bt + " nunca forma parte del Store QR" in arch,
        "No internal id in QR",
    )
    require(bt + "/qr" + bt + " pertenece al Product QR" in arch, "Product QR route separated")
    require("Store Registry sigue siendo la autoridad" in arch, "Registry authority retained")

    for marker in (
        "TAKARA_STORE_QR_CONTRACT_TEST_OK",
        "pretty QR contract version",
        "legacy QR contract version",
        "404 bridge rejects noncanonical query/hash",
        "Product QR route",
        "duplicate s",
        "store_id",
        "foreign host",
        "explicit default port",
    ):
        require(marker in test, f"Test QR cubre {marker}")

    print("[TAKARA_STORE_QR_CONTRACT_STATIC_OK] V2+V1 compatibility")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
