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


def main() -> int:
    bridge = read(
        "apps-script/takara-pedidos-web/StoreAdminUiBridge.gs"
    )
    ui = read(
        "apps-script/takara-pedidos-web/StoreAdminUi.html"
    )
    contract = read("docs/STORE_ADMIN_CONTRACT.md")
    quality = read("tools/takara_quality_gate.ps1")
    preview = read("tools/takara_store_admin_preview.ps1")
    f4b = read("apps-script/takara-pedidos-web/StoreAdminRead.gs")

    require(
        'TAKARA_STORE_ADMIN_UI_VERSION = "TAKARA_STORE_ADMIN_UI_V1"'
        in bridge,
        "UI bridge version exacta",
    )
    require(
        "listStoresAdmin_()" in bridge,
        "bootstrap reutiliza F4B list",
    )
    require(
        'mode: "MANAGE"' in bridge,
        "F4C read foundation opera bajo modo MANAGE desde F4D",
    )
    require(
        "getStoreAdmin_(storeId)" in bridge,
        "detail reutiliza F4B get",
    )
    require(
        "SpreadsheetApp" not in bridge
        and "PropertiesService" not in bridge
        and "createStoreSheetsRepository_" not in bridge,
        "UI bridge no posee infraestructura",
    )

    for marker in (
        "<h1>Store Admin</h1>",
        "Store Admin",
        'id="stat-total"',
        'id="stat-active"',
        'id="stat-inactive"',
        'id="search"',
        'id="store-list"',
        'id="detail"',
        "TAKARA_STORE_ADMIN_UI_V1",
        "TAKARA_STORE_ADMIN_PREVIEW_DATA",
        "google.script.run",
        "getStoreAdminUiBootstrap",
        "getStoreAdminUiStore",
        "STORE_ADMIN_UI_BACKEND_UNAVAILABLE",
        "prefers-reduced-motion",
    ):
        require(marker in ui, f"UI conserva {marker}")

    for forbidden in (
        "activateStoreAdmin_",
        "deactivateStoreAdmin_",
        "deleteStore",
        "SpreadsheetApp",
        "TAKARA_STORE_ADMIN_OWNER_EMAIL",
        "@gmail.com",
        "orders",
        "commission",
    ):
        require(forbidden not in ui, f"UI read-only excluye {forbidden}")

    require(
        ".textContent" in ui and "document.createElement" in ui,
        "UI renderiza datos mediante nodos/textContent",
    )
    require(
        "innerHTML" not in ui,
        "UI no inyecta Store data con innerHTML",
    )

    for marker in (
        "127.0.0.1",
        "TAKARA_STORE_ADMIN_PREVIEW_DATA",
        "ConvertTo-Json",
        "python",
        "http.server",
        "Start-Process",
        "DEMO / no Registry real",
        "Remove-Item",
    ):
        require(marker in preview, f"Preview conserva {marker}")

    require(
        "ValidateOnly" in preview,
        "Preview expone modo determinista de self-test",
    )
    require(
        "TAKARA_STORE_ADMIN_PREVIEW_SELFTEST_OK" in preview,
        "Preview conserva marcador de ejecución real",
    )
    require(
        "[regex]::Replace(" not in preview,
        "Preview no depende de overload ambiguo Regex.Replace",
    )
    require(
        "$html.Substring(0, $headIndex)" in preview
        and "$html.Substring($headIndex)" in preview,
        "Preview inyecta DEMO por frontera estructural </head>",
    )

    require(
        "TAKARA_STORE_ADMIN_OWNER_EMAIL" not in preview,
        "Preview no configura owner",
    )
    require(
        "TAKARA_STORE_REGISTRY_SPREADSHEET_ID" not in preview,
        "Preview no configura Registry",
    )

    for marker in (
        "## F4C tangible read-only Admin UI",
        "TAKARA_STORE_ADMIN_UI_V1",
        "127.0.0.1",
        "development-only",
        "Preview data is not Store authority",
        "F4D",
        "F4G",
    ):
        require(marker in contract, f"Contrato F4C conserva {marker}")

    for marker in (
        "takara_validar_store_admin_ui.py",
        "takara_test_store_admin_ui.js",
        "takara_validar_store_admin_read.py",
        "takara_test_store_admin_read.js",
    ):
        require(marker in quality, f"QG conserva {marker}")

    require(
        "requireStoreAdminAccess_();" in f4b,
        "F4B sigue autorizando antes de read",
    )

    print(
        "[TAKARA_STORE_ADMIN_UI_F4C_STATIC_OK] "
        + json.dumps({"checks": checks})
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())