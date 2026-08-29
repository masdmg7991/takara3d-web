from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "assets" / "js" / "takara-store-public.js"
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
    arch = read(ARCH)
    test = read(TEST)

    for marker in (
        "TAKARA_STORE_QR_URL_V1",
        'STORE_PUBLIC_CANONICAL_ORIGIN = "https://takara3d.es"',
        'STORE_PUBLIC_CANONICAL_PATH = "/tienda/"',
        "buildStorePublicUrl",
        "parseStorePublicUrl",
        "isStorePublicUrl",
        "rawValue !== parsed.href",
        'parsed.protocol !== "https:"',
        "parsed.origin !== STORE_PUBLIC_CANONICAL_ORIGIN",
        "parsed.pathname !== STORE_PUBLIC_CANONICAL_PATH",
        'parsed.searchParams.getAll("s")',
        "parsed.hash",
    ):
        require(marker in js, f"Store QR client conserva {marker}")

    for forbidden in (
        'STORE_PUBLIC_CANONICAL_PATH = "/qr"',
        "store_id=",
        "STO_000001",
        "Math.random",
    ):
        require(forbidden not in js, f"Store QR production no contiene {forbidden}")

    require("## Store QR URL Contract V1" in arch, "Arquitectura documenta QR V1")
    require("PRODUCT_QR != STORE_QR" in arch, "Arquitectura separa Product/Store QR")
    require(
        "https://takara3d.es/tienda/?s=<store_public_code>" in arch,
        "Arquitectura congela URL física",
    )
    require("`store_id` nunca forma parte del Store QR" in arch, "No internal id in QR")
    require("`/qr` pertenece al Product QR" in arch, "Product QR route separated")
    require("Store Registry sigue siendo la autoridad" in arch, "Registry authority retained")

    require("TAKARA_STORE_QR_CONTRACT_TEST_OK" in test, "Test marker")
    require("Product QR route" in test, "Test rejects Product QR")
    require("duplicate s" in test, "Test rejects duplicate s")
    require("store_id" in test, "Test rejects store_id")
    require("foreign host" in test, "Test rejects foreign host")
    require("explicit default port" in test, "Test rejects explicit port")

    print("[TAKARA_STORE_QR_CONTRACT_STATIC_OK] 32 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())