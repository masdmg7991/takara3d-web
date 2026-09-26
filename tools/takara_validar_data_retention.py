from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
checks = 0

LIVE = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_19_0_STORE_URL_V2"
LOCAL = "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_20_0_STORE_PICKUP"

def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError("[FAIL] " + message)
    checks += 1

def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f"Existe {relative}")
    return path.read_text(encoding="utf-8-sig")

def main() -> int:
    retention = read("apps-script/takara-pedidos-web/DataRetention.gs")
    snapshot = read("apps-script/takara-pedidos-web/StoreRegistryProtection.gs")
    order_ledger = read("apps-script/takara-pedidos-web/OrderIdempotency.gs")
    contact_ledger = read("apps-script/takara-pedidos-web/ContactIdempotency.gs")
    abuse = read("apps-script/takara-pedidos-web/PublicAbuseProtection.gs")
    code = read("apps-script/takara-pedidos-web/Code.gs")
    contract = read("docs/DATA_RETENTION_POLICY.md")
    gate = read("tools/takara_quality_gate.ps1")
    deployment = json.loads(read("config/deployment-state.json"))

    for marker in (
        "TAKARA_DATA_RETENTION_V1",
        "Store Registry Snapshots",
        "TAKARA_STORE_REGISTRY_SNAPSHOT_KEEP_LATEST = 20",
        "180 * 24 * 60 * 60 * 1000",
        "TAKARA_STORE_BRANDING_HISTORY_POLICY",
        "TAKARA_ORDER_MEDIA_RETENTION_POLICY",
        "buildStoreRegistrySnapshotRetentionPlan_",
        "purgeStoreRegistrySnapshots_",
        "buildTakaraDataRetentionReport_",
        "RETENTION_CONFIRMATION_REQUIRED",
        "PURGE_STORE_REGISTRY_SNAPSHOTS",
        "requireStoreAdminAccess_();",
    ):
        require(marker in retention, f"Retention conserva {marker}")

    require("getStoreRegistrySnapshotFolder_(false)" in retention, "Report/listado no crea carpeta de snapshots")
    require("getStoreRegistrySnapshotFolder_(true)" in retention, "Sólo ruta de escritura crea carpeta gestionada")
    require("file.moveTo(folder)" in retention, "Snapshot nuevo se mueve a carpeta gestionada")

    start = retention.index("function purgeStoreRegistrySnapshots_")
    end = retention.index("function buildTakaraDataRetentionReport_")
    purge_function = retention[start:end]
    require("setTrashed(true)" in purge_function, "Purga de snapshots usa papelera")
    require("TAKARA_ORDER_MEDIA_RETENTION_POLICY" not in purge_function, "Purga snapshot no toca fotos de pedidos")
    require("TAKARA_STORE_BRANDING_HISTORY_POLICY" not in purge_function, "Purga snapshot no toca logos")

    require("moveStoreRegistrySnapshotToRetentionFolder_(snapshotId);" in snapshot, "Snapshot Registry entra en carpeta gestionada")
    require(snapshot.index("moveStoreRegistrySnapshotToRetentionFolder_(snapshotId);") < snapshot.index("const properties = PropertiesService.getScriptProperties();"), "Snapshot se mueve antes de marcar latest")

    for ledger, name in ((order_ledger, "pedido"), (contact_ledger, "contacto")):
        require("30 * 24 * 60 * 60 * 1000" in ledger, f"Ledger {name} conserva 30 dias")
        require("COMPLETED" in ledger and "deleteProperty" in ledger, f"Ledger {name} purga completed")

    require("KEEP_FOR_REVIEW" in retention, "Informe declara conservar ambiguos")
    require("pii_stored: false" in retention, "Informe declara W8 sin PII")
    require("actors: []" in abuse, "W8 conserva estado compacto de actores")

    require(f'VERSION_SCRIPT: "{LOCAL}"' in code, "Code.gs conserva W10 productivo")
    require(deployment["production"]["script_version"] == LIVE, "Deployment conserva LIVE")
    require(deployment["local"]["script_version"] == LOCAL, "Deployment declara local W10")
    require(deployment["local"]["status"] == "candidate", "Estado local confirma V1.20.0 candidato")

    for marker in (
        "REPORT_ONLY", "180 días", "20 snapshots",
        "MANUAL_REVIEW_NO_AUTO_DELETE", "PURGE_STORE_REGISTRY_SNAPSHOTS",
        "Fotos de pedidos", "Logos históricos", LIVE,
    ):
        require(marker.lower() in contract.lower(), f"Contrato documenta {marker}")

    for artifact in (
        "apps-script/takara-pedidos-web/DataRetention.gs",
        "docs/DATA_RETENTION_POLICY.md",
        "tools/takara_test_data_retention.js",
        "tools/takara_validar_data_retention.py",
    ):
        require(artifact in gate, f"Quality Gate conserva {artifact}")

    print("[TAKARA_DATA_RETENTION_STATIC_OK] " + json.dumps({"checks": checks, "local": LOCAL}, ensure_ascii=False, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
