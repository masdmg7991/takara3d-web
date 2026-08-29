from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "apps-script" / "takara-pedidos-web"

ATTRIBUTION = BASE / "OrderAttribution.gs"
RESOLUTION = BASE / "StoreOrderResolution.gs"
DOMAIN = BASE / "StoreDomain.gs"
CONTRACT = ROOT / "docs" / "ORDER_ENGINE_CONTRACT.md"
TEST = ROOT / "tools" / "takara_test_order_attribution.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError("[FAIL] " + message)


def read(path: Path) -> str:
    require(path.is_file(), f"Existe {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8-sig")


def main() -> int:
    attribution = read(ATTRIBUTION)
    resolution = read(RESOLUTION)
    domain = read(DOMAIN)
    contract = read(CONTRACT)
    test = read(TEST)

    for marker in (
        'TAKARA_STORE_ATTRIBUTION_VERSION = "TAKARA_STORE_ATTRIBUTION_V1"',
        'DIRECT: "DIRECT"',
        'STORE: "STORE"',
        "assertNoBrowserDerivedAttribution_",
        "buildAuthoritativeOrderAttribution_",
        "resolveOrderStoreIdentity_(payload)",
        "source_type: TAKARA_ORDER_SOURCE_TYPE.DIRECT",
        "source_type: TAKARA_ORDER_SOURCE_TYPE.STORE",
        "store_id: assertStoreId_(identity.store_id)",
        "store_name_snapshot: normalizeStoreDisplayName_(",
        "Object.freeze({",
    ):
        require(marker in attribution, f"Attribution conserva {marker}")

    require(
        "createStoreSheetsRepository_" not in attribution,
        "Order attribution no lee Sheets",
    )
    require(
        "findByPublicCode" not in attribution,
        "Order attribution no lee Registry",
    )
    require(
        "resolveStoreOrderIdentityRuntime_" not in attribution,
        "Order attribution consume F3B boundary, no salta capas",
    )

    for field in (
        '"source_type"',
        '"store_id"',
        '"store_name_snapshot"',
        '"store_attribution"',
    ):
        require(
            field in attribution,
            f"Derived browser field {field} fail-closed",
        )

    require(
        "return null;" in resolution,
        "F3B conserva DIRECT null identity",
    )
    require(
        'TAKARA_STORE_ORDER_IDENTITY_VERSION = "TAKARA_STORE_ORDER_IDENTITY_V1"'
        in domain,
        "F3C consume identity contract F3B",
    )

    for marker in (
        "# Order Attribution Contract F3C",
        '"source_type": "DIRECT"',
        '"source_type": "STORE"',
        '"store_id": "STO_000001"',
        '"store_name_snapshot": "Foto García"',
        "no existe fallback silencioso",
        "F3D lo conectará al procesamiento real `doPost`",
    ):
        require(marker in contract, f"Contract conserva {marker}")

    require(
        'const forbiddenBrowserFields = [' in test,
        "Test declara matriz de campos browser prohibidos",
    )
    for field in (
        '["source_type", "STORE"]',
        '["store_id", "STO_999999"]',
        '["store_name_snapshot", "Fake"]',
        '["store_attribution", { source_type: "STORE" }]',
    ):
        require(field in test, f"Test cubre derived field {field}")

    for marker in (
        "DIRECT does not query Registry",
        "STORE id authoritative",
        "STORE name snapshot authoritative",
        "previous attribution snapshot stays immutable",
        "inactive Store does not fall back DIRECT",
        "missing Store does not fall back DIRECT",
        "injected store_id rejected before attribution",
        "TAKARA_ORDER_ATTRIBUTION_F3C_OK",
    ):
        require(marker in test, f"Test cubre {marker}")

    print("[TAKARA_ORDER_ATTRIBUTION_F3C_STATIC_OK] 46 comprobaciones")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())