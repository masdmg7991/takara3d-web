param(
    [ValidateSet("bootstrap", "dev", "precommit", "prepush")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ReportRoot = Join-Path $env:USERPROFILE "Desktop\takara3d-backups\quality_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportDir = Join-Path $ReportRoot ("takara_quality_gate_" + $Mode + "_" + $Stamp)
$ReportTxt = Join-Path $ReportDir "quality_gate_report.txt"

$Errors = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]
$Checks = New-Object System.Collections.Generic.List[string]

function Log-Line($Text) {
    Write-Host $Text
    Add-Content -Path $ReportTxt -Value $Text -Encoding UTF8
}

function Ok($Text) {
    $script:Checks.Add($Text) | Out-Null
    Log-Line ("[OK] " + $Text)
}

function Warn($Text) {
    $script:Warnings.Add($Text) | Out-Null
    Log-Line ("[WARN] " + $Text)
}

function Err($Text) {
    $script:Errors.Add($Text) | Out-Null
    Log-Line ("[ERROR] " + $Text)
}

function Read-Utf8($Path) {
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Get-BadPatterns {
    $c3 = [char]0x00C3
    $c2 = [char]0x00C2
    $e2 = [char]0x00E2
    return @(
        [string]$c3,
        [string]$c2,
        [string]$e2,
        ("litofan" + $c3),
        ("Navegaci" + $c3),
        ("autom" + $c3),
        ("men" + $c3),
        ("Tel" + $c3),
        ("n" + $c3 + "mero")
    )
}

function Has-Mojibake($Text) {
    foreach ($Bad in (Get-BadPatterns)) {
        if ($Bad.Length -gt 0 -and $Text.Contains($Bad)) { return $true }
    }
    return $false
}

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
Set-Location $Project

Log-Line "============================================================"
Log-Line " TAKARA QUALITY GATE"
Log-Line "============================================================"
Log-Line ("Mode: " + $Mode)
Log-Line ("Project: " + $Project)
Log-Line ("Report: " + $ReportDir)
Log-Line ""

if (!(Test-Path ".git")) { Err "No parece un repo Git." } else { Ok "Repo Git detectado" }

$RequiredFiles = @(
    "pedido.html",
    "qr/index.html",
    "assets/css/styles.css",
    "assets/css/qr.css",
    "assets/css/takara-pedido-delivery.css",
    "assets/data/catalogo.json",
    "assets/data/takara-postal-national-v1.json",
    "assets/js/takara-pedido-web.js",
    "assets/js/takara-pedido-delivery.js",
    "assets/js/core/takara-delivery.js",
    "assets/js/core/takara-postal-national.js",
    "assets/js/takara-pedido-preview.js",
    "assets/js/takara-frame-text.js",
    "apps-script/takara-pedidos-web/Code.gs",
    "docs/ARCHITECTURE.md",
    "docs/DESIGN_SYSTEM.md",
    "docs/QUALITY_GATE.md",
    "docs/ERROR_REGISTRY.md",
    "docs/CLEANUP_POLICY.md",
    "docs/ORDER_ENGINE_CONTRACT.md",
    "docs/SEO_STRUCTURED_DATA_CONTRACT.md",
    "docs/FRAME_TEXT_CONTRACT.md",
    "docs/PREVIEW_ENGINE_CONTRACT.md",
    "docs/QR_PAGE_CONTRACT.md",
    "docs/STORE_SYSTEM_CONTRACT.md",
    "tools/takara_validar_personalizacion_pedido.py",
    "tools/takara_validar_entrega_pedido.py",
    "tools/takara_validar_contrato_v2.py",
    "tools/validar_catalogo.py",
    "tools/takara_test_personalizacion_pedido.js",
    "tools/takara_test_entrega_pedido.js",
    "tools/takara_test_order_contract_v2.js",
    "tools/takara_test_transition_v1_v2.js",
    "tools/takara_test_ficha_visual_pedido.js",
    "tools/takara_test_seguridad_foto_pedido.js",
    "tools/takara_validar_datos_estructurados.py"
)

foreach ($File in $RequiredFiles) {
    if (Test-Path (Join-Path $Project $File)) { Ok ("Existe " + $File) } else { Err ("Falta archivo requerido: " + $File) }
}

$PreviewPath = Join-Path $Project "assets/js/takara-pedido-preview.js"
$PedidoPath = Join-Path $Project "pedido.html"
$QrPath = Join-Path $Project "qr/index.html"
$QrCssPath = Join-Path $Project "assets/css/qr.css"
$StoreContractPath = Join-Path $Project "docs/STORE_SYSTEM_CONTRACT.md"

if (Test-Path $PreviewPath) {
    $PreviewText = Read-Utf8 $PreviewPath
    $PreviewHash = (Get-FileHash $PreviewPath -Algorithm SHA256).Hash
    $ModeOn = "data-takara-litho-mode=" + [char]34 + "on" + [char]34
    $ModeOff = "data-takara-litho-mode=" + [char]34 + "off" + [char]34
    if ($PreviewText.Contains("TAKARA PEDIDO PREVIEW LITHO REAL V16B-2")) { Ok "Preview V16B-2 detectado" } else { Err "Preview V16B-2 no detectado" }
    if ($PreviewText.Contains($ModeOn) -and $PreviewText.Contains($ModeOff)) { Ok "Preview contiene Encendida/Apagada" } else { Err "Preview no contiene Encendida/Apagada" }
    Ok ("Hash preview: " + $PreviewHash)
    if ($PreviewHash -eq "1117979A334AA90C305C360F6DB0262D7645CF56676818F20D92E5E341919E23") {
        Ok "Preview V16B-2 conserva el hash protegido"
    } else {
        Err ("Preview V16B-2 ha cambiado: " + $PreviewHash)
    }
    if (
        !$PreviewText.Contains("preloadAllFrames") -and
        $PreviewText.Contains("const frameImg = await loadFrame(frameSrc);") -and
        $PreviewText.Contains("state.frameCache.has(src)") -and
        $PreviewText.Contains("state.frameCache.set(src, img)")
    ) {
        Ok "Preview carga marcos bajo demanda y conserva cache"
    } else {
        Err "Preview no conserva el contrato de carga bajo demanda"
    }
}

if (Test-Path $PedidoPath) {
    $PedidoText = Read-Utf8 $PedidoPath
    if ($PedidoText.Contains("takara-pedido-preview.js")) { Ok "pedido.html carga preview JS" } else { Err "pedido.html no carga preview JS" }
    if ($PedidoText.Contains('id="takara-frame-preload"')) {
        Err "pedido.html contiene una precarga masiva duplicada de marcos"
    } else {
        Ok "pedido.html no precarga masivamente los marcos"
    }
    if ($PedidoText.Contains("assets/js/takara-frame-text.js") -and $PedidoText.Contains("data-takara-frame-text-config")) {
        Ok "pedido.html carga personalizacion de texto V1"
    } else {
        Err "pedido.html no carga correctamente la personalizacion de texto V1"
    }
    if ($PedidoText.Contains('name="color_texto_marco"') -and $PedidoText.Contains("data-takara-frame-text-contrast")) {
        Ok "pedido.html conserva selector unico de color de letras"
    } else {
        Err "pedido.html no contiene el selector contractual de color de letras"
    }
    if ($PedidoText.Contains("takara-pedido-web.js?v=pedido-entrega-v2-2")) {
        Ok "pedido.html carga el motor de pedido sin cache obsoleta"
    } else {
        Err "pedido.html no carga la version contractual del motor de pedido"
    }
    if ($PedidoText.Contains("assets/css/styles.css?v=pedido-consentimiento-color-v1")) {
        Ok "pedido.html invalida la cache CSS del consentimiento"
    } else {
        Err "pedido.html no carga la version CSS contractual del consentimiento"
    }
    if (
        $PedidoText.Contains('name="autoriza_publicacion_resultado" value="si"') -and
        $PedidoText.Contains('data-takara-accept-proxy="autoriza_publicacion_resultado"') -and
        $PedidoText.Contains("web y redes sociales") -and
        $PedidoText.Contains("menores de edad.") -and
        -not $PedidoText.Contains("Resultado final (opcional).") -and
        -not $PedidoText.Contains("<strong>Opcional.</strong>")
    ) {
        Ok "pedido.html conserva consentimiento opcional de publicacion"
    } else {
        Err "pedido.html no conserva consentimiento opcional contractual"
    }
    # Keep this structural check ASCII-only for Windows PowerShell 5.1.
    # Exact visible copy, official postal map and prices are validated in Python/Node.
    if (
        $PedidoText.Contains('type="hidden" name="modalidad_entrega"') -and
        $PedidoText.Contains('name="codigo_postal_entrega"') -and
        $PedidoText.Contains('name="ubicacion_entrega_codigo"') -and
        $PedidoText.Contains('name="ubicacion_entrega_nombre"') -and
        $PedidoText.Contains('name="localidad_entrega_informativa"') -and
        $PedidoText.Contains("data-takara-delivery-panel") -and
        $PedidoText.Contains("data-takara-delivery-postal") -and
        $PedidoText.Contains("data-takara-delivery-locality") -and
        $PedidoText.Contains("data-takara-delivery-municipality") -and
        $PedidoText.Contains("data-takara-delivery-location") -and
        $PedidoText.Contains('name="municipio_entrega_codigo"') -and
        $PedidoText.Contains('name="municipio_entrega_nombre"') -and
        $PedidoText.Contains("data-takara-delivery-status") -and
        $PedidoText.Contains("data-takara-delivery-price") -and
        $PedidoText.Contains("data-takara-delivery-total") -and
        -not $PedidoText.Contains("data-takara-delivery-mode") -and
        -not $PedidoText.Contains("modalidad_entrega_visible")
    ) {
        Ok "pedido.html conserva calculo postal automatico de entrega"
    } else {
        Err "pedido.html no conserva la interfaz postal automatica contractual"
    }
    if (
        $PedidoText.Contains("assets/css/takara-pedido-delivery.css?v=entrega-v2-2") -and
        $PedidoText.Contains("assets/js/core/takara-delivery.js?v=entrega-v2-2") -and
        $PedidoText.Contains("assets/js/core/takara-postal-national.js?v=postal-nacional-v1") -and
        $PedidoText.Contains("assets/js/takara-pedido-delivery.js?v=entrega-v2-2") -and
        $PedidoText.Contains("assets/js/takara-pedido-premium.js?v=entrega-v2-2")
    ) {
        Ok "pedido.html carga modulos de entrega versionados"
    } else {
        Err "pedido.html no carga todos los modulos de entrega"
    }
    if ($PedidoText -notmatch 'name=["''][ ]*(direccion|calle|numero|número|piso|puerta)["'']') {
        Ok "pedido.html no solicita direccion completa inicialmente"
    } else {
        Err "pedido.html contiene campos prematuros de direccion completa"
    }

# TAKARA LEGACY ENGINE GUARDS START
$ProductosPath = Join-Path $Project "productos.html"
if (Test-Path $ProductosPath) {
    $ProductosText = Read-Utf8 $ProductosPath
    if ($ProductosText.Contains('<script src="assets/js/productos.js"></script>')) { Err "productos.html carga motor legado productos.js" } else { Ok "productos.html no carga motor legado productos.js" }
    if ($ProductosText.Contains("renderTakaraProducts") -and $ProductosText.Contains("assets/js/core/takara-catalogo.js") -and $ProductosText.Contains("assets/js/core/takara-pricing.js")) { Ok "productos.html conserva motor catalogo actual" } else { Err "productos.html no conserva motor catalogo actual" }
} else {
    Err "No existe productos.html"
}

if ((Test-Path $QrPath) -and (Test-Path $QrCssPath)) {
    $QrText = Read-Utf8 $QrPath
    $QrCssText = Read-Utf8 $QrCssPath
    $QrContractMarkers = @(
        'href="https://takara3d.es/qr"',
        "USB-C",
        "5 V",
        "Uso en interior",
        "Primer uso",
        "Limpieza",
        "Cuidados cotidianos",
        "ligeramente templada durante el uso es normal",
        "calor es excesivo o llega a quemar",
        "Necesito ayuda con mi pieza",
        "Crear otro recuerdo",
        "establecimiento donde conociste Takara 3D"
    )

    foreach ($Marker in $QrContractMarkers) {
        if ($QrText.Contains($Marker)) {
            Ok ("QR conserva contrato: " + $Marker)
        } else {
            Err ("QR no contiene contrato: " + $Marker)
        }
    }

    if ($QrText.Contains("Comprar ahora")) {
        Err "QR contiene una llamada comercial agresiva"
    } else {
        Ok "QR no contiene llamadas de compra agresivas"
    }

    if ($QrText.Contains("../pedido.html") -and $QrText.IndexOf("../pedido.html") -gt $QrText.IndexOf('id="ayuda"')) {
        Ok "QR mantiene el acceso a pedido despues de guia y soporte"
    } else {
        Err "QR no mantiene la recurrencia comercial al final"
    }

    if ($QrCssText.Contains(".qr-page") -and !$QrCssText.Contains("!important")) {
        Ok "CSS QR esta aislado y no usa important"
    } else {
        Err "CSS QR no esta correctamente aislado"
    }
}

if (Test-Path $StoreContractPath) {
    $StoreContractText = Read-Utf8 $StoreContractPath
    $StoreContractMarkers = @(
        "TAKARA_STORE_SYSTEM_CONTRACT_V1",
        "PRODUCT_QR != STORE_QR",
        "TAKARA_STORE_REGISTRY_V1",
        "TAKARA_STORE_CONTEXT_V1",
        "TAKARA_STORE_ATTRIBUTION_V1",
        "/tienda/?s=<store_public_code>",
        "source_type = STORE",
        "source_type = DIRECT",
        "ACTIVE",
        "INACTIVE",
        "LockService.getScriptLock()",
        "Google Spreadsheet",
        "Analytics comercial OFF"
    )

    foreach ($Marker in $StoreContractMarkers) {
        if ($StoreContractText.Contains($Marker)) {
            Ok ("Store conserva contrato: " + $Marker)
        } else {
            Err ("Store no contiene contrato: " + $Marker)
        }
    }
}

if (Test-Path $QrPath) {
    $QrStoreForbiddenMarkers = @(
        "store_id",
        "store_public_code",
        "TAKARA_STORE_CONTEXT_V1",
        "TAKARA_STORE_REGISTRY_V1"
    )

    foreach ($Marker in $QrStoreForbiddenMarkers) {
        if ($QrText.Contains($Marker)) {
            Err ("Product QR contiene identidad Store prohibida: " + $Marker)
        } else {
            Ok ("Product QR aislado de Store: " + $Marker)
        }
    }
}
$FrameTextPath = Join-Path $Project "assets/js/takara-frame-text.js"
if (Test-Path $FrameTextPath) {
    $FrameText = Read-Utf8 $FrameTextPath
    $FrameTextMarkers = @(
        "TAKARA FRAME TEXT PREVIEW V1",
        "FRAME_TEXT_GEOMETRY_VERTICAL_V1",
        "FRAME_TEXT_GEOMETRY_HORIZONTAL_V1",
        "TAKARA_FRAME_TEXT_V1",
        "PRICE_BY_SIDE_COUNT",
        "TAKARA_FRAME_TEXT_V1_4",
        "TAKARA_FRAME_TEXT_V1_4_9_RENDER_SPACE_LOCK",
        "LETTER_COLORS",
        "fitTextToSafeArea",
        "getPreviewRenderSpace",
        "requestAnimationFrame",
        "color_texto"
    )
    foreach ($Marker in $FrameTextMarkers) {
        if ($FrameText.Contains($Marker)) {
            Ok ("Frame text conserva contrato: " + $Marker)
        } else {
            Err ("Frame text no contiene contrato: " + $Marker)
        }
    }
}

if ($PedidoText.Contains('<script src="assets/js/pedido.js"></script>')) { Err "pedido.html carga motor legado pedido.js" } else { Ok "pedido.html no carga motor legado pedido.js" }
if ($PedidoText.Contains("assets/js/takara-pedido-web.js") -and $PedidoText.Contains("data-takara-pedido-form") -and $PedidoText.Contains("data-takara-pedido-web-v1")) { Ok "pedido.html conserva motor Gmail actual" } else { Err "pedido.html no conserva motor Gmail actual" }
# TAKARA LEGACY ENGINE GUARDS END
    if ($PedidoText.Contains("takara-pedido-configurator.js")) { Err "pedido.html carga configurador experimental prohibido" } else { Ok "pedido.html no carga configurador experimental" }
}

$ForbiddenMarkers = @(
    "TAKARA_PEDIDO_ALREDEDOR_PREVIEW_INAMOVIBLE_2A_START",
    "TAKARA_PEDIDO_CABECERA_ALINEADA_2A1_START",
    "TAKARA_PEDIDO_CABECERA_FULLWIDTH_2A2_START",
    "TAKARA_PEDIDO_CABECERA_GRID_REAL_2A3_START",
    "TAKARA_PEDIDO_HERO_VERTICAL_PREMIUM_2A4_START",
    "TAKARA_PEDIDO_CONTACTO_BAJO_CONFIG_2A5_START",
    "TAKARA_PEDIDO_CONFIGURATOR_V1",
    "takara-pedido-configurator.js"
)

$ScannedTextFiles = @(Get-ChildItem $Project -Recurse -File -Include *.html,*.css,*.js,*.ts,*.vue,*.md,*.json,*.ps1 | Where-Object {
    $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "\\node_modules\\" -and $_.FullName -notmatch "\\dist\\"
})

$ProductionTextFiles = @($ScannedTextFiles | Where-Object {
    $_.FullName -notmatch "\\docs\\" -and $_.FullName -notmatch "\\tools\\" -and (
        $_.Extension -eq ".html" -or $_.Extension -eq ".css" -or $_.Extension -eq ".js" -or $_.Extension -eq ".ts" -or $_.Extension -eq ".vue" -or $_.Extension -eq ".json"
    )
})

foreach ($File in $ScannedTextFiles) {
    $Rel = Resolve-Path -Relative $File.FullName
    $Text = Read-Utf8 $File.FullName
    if ($Text.Length -gt 0 -and ([int][char]$Text[0]) -eq 65279) { Err ("BOM UTF-8 detectado en " + $Rel) }
    if (Has-Mojibake $Text) { Err ("Mojibake detectado en " + $Rel) }
}

foreach ($File in $ProductionTextFiles) {
    $Rel = Resolve-Path -Relative $File.FullName
    $Text = Read-Utf8 $File.FullName
    foreach ($Marker in $ForbiddenMarkers) {
        if ($Text.Contains($Marker)) { Err ("Marcador experimental prohibido en " + $Rel + ": " + $Marker) }
    }
}
Ok "Escaneo de encoding y marcadores completado"

$ForbiddenFiles = @(Get-ChildItem $Project -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\.git\\" -and $_.FullName -notmatch "\\node_modules\\" -and (
        $_.Name -like "_takara_*.ps1" -or $_.Name -like "*.tmp" -or $_.Name -like "*.bak" -or $_.Name -like "*.old" -or $_.Name -like "*.orig" -or $_.Name -like "*.rej" -or $_.Name -like "*.patch"
    )
})

if ($ForbiddenFiles.Count -eq 0) {
    Ok "No hay archivos temporales prohibidos"
} else {
    foreach ($File in $ForbiddenFiles) { Err ("Archivo temporal/prohibido dentro del repo: " + $File.FullName) }
}

if (Test-Path "tools/validar_catalogo.py") {
    Log-Line ""
    Log-Line "[RUN] py tools/validar_catalogo.py"
    py tools/validar_catalogo.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) { Ok "Catalogo valido" } else { Err "Fallo validar_catalogo.py" }
} else {
    Warn "No existe tools/validar_catalogo.py"
}

if (Test-Path "tools/takara_validar_datos_estructurados.py") {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_datos_estructurados.py"
    py tools/takara_validar_datos_estructurados.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Datos estructurados de productos validos"
    } else {
        Err "Fallo takara_validar_datos_estructurados.py"
    }
} else {
    Err "No existe tools/takara_validar_datos_estructurados.py"
}

if (Test-Path "tools/takara_validar_entrega_pedido.py") {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_entrega_pedido.py"
    py tools/takara_validar_entrega_pedido.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Contrato de entrega, codigo postal, tarifas y servidor validos"
    } else {
        Err "Fallo takara_validar_entrega_pedido.py"
    }
} else {
    Err "No existe tools/takara_validar_entrega_pedido.py"
}

if (Test-Path "tools/takara_validar_contrato_v2.py") {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_contrato_v2.py"
    py tools/takara_validar_contrato_v2.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Contrato V2 y ausencia de referencias activas obsoletas validados"
    } else {
        Err "Fallo takara_validar_contrato_v2.py"
    }
} else {
    Err "No existe tools/takara_validar_contrato_v2.py"
}

if (Test-Path "tools/takara_validar_personalizacion_pedido.py") {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_personalizacion_pedido.py"
    py tools/takara_validar_personalizacion_pedido.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Contrato de personalizacion, payload, precio y correo valido"
    } else {
        Err "Fallo takara_validar_personalizacion_pedido.py"
    }
} else {
    Err "No existe tools/takara_validar_personalizacion_pedido.py"
}

$StoreRegistryValidatorPath = Join-Path $Project "tools/takara_validar_store_registry.py"

if (Test-Path $StoreRegistryValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_registry.py"
    py tools/takara_validar_store_registry.py 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store Registry: dominio, application y adapter Sheets validados"
    } else {
        Err "Fallo takara_validar_store_registry.py"
    }
} else {
    Err "No existe tools/takara_validar_store_registry.py"
}

$StoreRuntimeValidatorPath = Join-Path $Project "tools/takara_validar_store_runtime.py"

if (Test-Path $StoreRuntimeValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_runtime.py"
    py tools/takara_validar_store_runtime.py 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store Runtime: composition root y frontera Sheets validadas"
    } else {
        Err "Fallo takara_validar_store_runtime.py"
    }
} else {
    Err "No existe tools/takara_validar_store_runtime.py"
}

$StoreSetupValidatorPath = Join-Path $Project "tools/takara_validar_store_registry_setup.py"

if (Test-Path $StoreSetupValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_registry_setup.py"
    py tools/takara_validar_store_registry_setup.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Store Registry setup y health validados"
    } else {
        Err "Fallo takara_validar_store_registry_setup.py"
    }
} else {
    Err "No existe tools/takara_validar_store_registry_setup.py"
}

$StorePublicApiValidatorPath = Join-Path $Project "tools/takara_validar_store_public_api.py"

if (Test-Path $StorePublicApiValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_public_api.py"
    py tools/takara_validar_store_public_api.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) { Ok "Store Public API read-only validada" }
    else { Err "Fallo takara_validar_store_public_api.py" }
} else { Err "No existe tools/takara_validar_store_public_api.py" }

$StoreHttpValidatorPath = Join-Path $Project "tools/takara_validar_store_http_bridge.py"

if (Test-Path $StoreHttpValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_http_bridge.py"
    py tools/takara_validar_store_http_bridge.py 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) { Ok "Store HTTP bridge JSON/JSONP validado" }
    else { Err "Fallo takara_validar_store_http_bridge.py" }
} else { Err "No existe tools/takara_validar_store_http_bridge.py" }

$StoreF1ValidatorPath = Join-Path $Project "tools/takara_validar_store_backend_f1.py"

if (Test-Path $StoreF1ValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_backend_f1.py"
    py tools/takara_validar_store_backend_f1.py 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store F1 backend horizontal static validado"
    } else {
        Err "Fallo takara_validar_store_backend_f1.py"
    }
} else {
    Err "No existe tools/takara_validar_store_backend_f1.py"
}

$StoreF2AValidatorPath = Join-Path $Project "tools/takara_validar_store_public_f2a.py"

if (Test-Path $StoreF2AValidatorPath) {
    Log-Line ""
    Log-Line "[RUN] py tools/takara_validar_store_public_f2a.py"
    py tools/takara_validar_store_public_f2a.py 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store F2A route, closed UI y client validados"
    } else {
        Err "Fallo takara_validar_store_public_f2a.py"
    }
} else {
    Err "No existe tools/takara_validar_store_public_f2a.py"
}

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_public_client.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_public_client.js"
    node tools/takara_test_store_public_client.js 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store F2A client JSONP fail-closed validado"
    } else {
        Err "Fallo takara_test_store_public_client.js"
    }
} else {
    Err "No se pudo ejecutar Store F2A client test"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_backend_f1.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_backend_f1.js"
    node tools/takara_test_store_backend_f1.js 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store F1 backend horizontal funcional validado"
    } else {
        Err "Fallo takara_test_store_backend_f1.js"
    }
} else {
    Err "No se pudo ejecutar Store F1 horizontal test"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_http_bridge.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_http_bridge.js"
    node tools/takara_test_store_http_bridge.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) { Ok "Store HTTP bridge y callback injection validados" }
    else { Err "Fallo takara_test_store_http_bridge.js" }
} else { Err "No se pudo ejecutar Store HTTP bridge test" }

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_public_api.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_public_api.js"
    node tools/takara_test_store_public_api.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) { Ok "Store Public API fail-closed validada" }
    else { Err "Fallo takara_test_store_public_api.js" }
} else { Err "No se pudo ejecutar Store Public API test" }

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_registry_setup.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_registry_setup.js"
    node tools/takara_test_store_registry_setup.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Store Registry setup idempotente validado"
    } else {
        Err "Fallo takara_test_store_registry_setup.js"
    }
} else {
    Err "No se pudo ejecutar Store Registry setup test"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_runtime_integration.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_runtime_integration.js"
    node tools/takara_test_store_runtime_integration.js 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store Runtime + Sheets adapter integrados"
    } else {
        Err "Fallo takara_test_store_runtime_integration.js"
    }
} else {
    Err "No se pudo ejecutar integración Store Runtime"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_store_registry.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_store_registry.js"
    node tools/takara_test_store_registry.js 2>&1 | ForEach-Object { Log-Line $_ }

    if ($LASTEXITCODE -eq 0) {
        Ok "Store Registry core funcional validado"
    } else {
        Err "Fallo takara_test_store_registry.js"
    }
} else {
    Err "No se pudo ejecutar la prueba funcional Store Registry"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_order_contract_v2.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_order_contract_v2.js ."
    node tools/takara_test_order_contract_v2.js . 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Payload, snapshot, correo V2 y rechazos de manipulacion validados"
    } else {
        Err "Fallo takara_test_order_contract_v2.js"
    }
} else {
    Err "No se pudo ejecutar la prueba de contrato V2"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_transition_v1_v2.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_transition_v1_v2.js"
    node tools/takara_test_transition_v1_v2.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Puente temporal V1/V2 y despliegue backend-first validados"
    } else {
        Err "Fallo takara_test_transition_v1_v2.js"
    }
} else {
    Err "No se pudo ejecutar la prueba de transición V1/V2"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_entrega_pedido.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_entrega_pedido.js"
    node tools/takara_test_entrega_pedido.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Entrega, totales, correos y proteccion contra manipulacion validados"
    } else {
        Err "Fallo takara_test_entrega_pedido.js"
    }
} else {
    Err "No se pudo ejecutar la prueba contractual de entrega"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_personalizacion_pedido.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_personalizacion_pedido.js"
    node tools/takara_test_personalizacion_pedido.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Prueba funcional de personalizacion y cuatro correos superada"
    } else {
        Err "Fallo takara_test_personalizacion_pedido.js"
    }
} else {
    Warn "Node.js no disponible; se conserva la validacion contractual Python obligatoria"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_ficha_visual_pedido.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_ficha_visual_pedido.js"
    node tools/takara_test_ficha_visual_pedido.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Ficha visual, Drive y ambos correos validados"
    } else {
        Err "Fallo takara_test_ficha_visual_pedido.js"
    }
} else {
    Err "No se pudo ejecutar la prueba contractual de ficha visual"
}

if ($null -ne $NodeCommand -and (Test-Path "tools/takara_test_seguridad_foto_pedido.js")) {
    Log-Line ""
    Log-Line "[RUN] node tools/takara_test_seguridad_foto_pedido.js"
    node tools/takara_test_seguridad_foto_pedido.js 2>&1 | ForEach-Object { Log-Line $_ }
    if ($LASTEXITCODE -eq 0) {
        Ok "Foto obligatoria y bypasses del pedido validados"
    } else {
        Err "Fallo takara_test_seguridad_foto_pedido.js"
    }
} else {
    Err "No se pudo ejecutar la prueba de seguridad de la foto"
}

Log-Line ""
Log-Line "[RUN] git diff --check"
$OldErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$GitDiffOutput = @(git diff --check 2>&1)
$GitDiffExitCode = $LASTEXITCODE
$ErrorActionPreference = $OldErrorActionPreference
foreach ($Line in $GitDiffOutput) { Log-Line ([string]$Line) }
if ($GitDiffExitCode -eq 0) { Ok "git diff --check OK" } else { Err "git diff --check detecto problemas" }

$Status = @(git status --short)
Log-Line ""
Log-Line "============================================================"
Log-Line " GIT STATUS"
Log-Line "============================================================"
if ($Status.Count -eq 0) {
    Ok "Working tree limpio"
} else {
    foreach ($Line in $Status) { Log-Line $Line }
    if ($Mode -in @("precommit", "prepush")) { Warn "Hay cambios pendientes. Revisar diff y aniadir archivos concretos, nunca git add punto." } else { Warn "Working tree con cambios. Revisar antes de commit." }
}

Log-Line ""
Log-Line "============================================================"
Log-Line " RESULTADO QUALITY GATE"
Log-Line "============================================================"
Log-Line ("OK: " + $Checks.Count)
Log-Line ("WARN: " + $Warnings.Count)
Log-Line ("ERROR: " + $Errors.Count)
Log-Line ("TXT: " + $ReportTxt)

if ($Errors.Count -gt 0) {
    Log-Line "[TAKARA_QUALITY_GATE_FAIL]"
    exit 1
}


# TAKARA_PUBLIC_REPO_AUDIT_INTEGRATION_V1
$TakaraPublicAudit = Join-Path $PSScriptRoot "takara_public_repo_audit.ps1"
if (Test-Path $TakaraPublicAudit) {
    Write-Host ""
    Write-Host "[RUN] powershell -NoProfile -ExecutionPolicy Bypass -File tools/takara_public_repo_audit.ps1"
    try {
        & $TakaraPublicAudit -Project (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    } catch {
        Write-Host ("[ERROR] Auditoria publica fallo: " + $_.Exception.Message) -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERROR] Falta tools/takara_public_repo_audit.ps1" -ForegroundColor Red
    exit 1
}
# /TAKARA_PUBLIC_REPO_AUDIT_INTEGRATION_V1


# TAKARA_APPS_SCRIPT_VALIDATION_INTEGRATION_V1
Write-Host ""
Write-Host "[RUN] powershell -NoProfile -ExecutionPolicy Bypass -File tools/takara_validar_apps_script.ps1"
$TakaraToolsDir = Split-Path -Parent $PSCommandPath
$TakaraRepoRoot = Resolve-Path (Join-Path $TakaraToolsDir "..")
$TakaraAppsValidator = Join-Path $TakaraToolsDir "takara_validar_apps_script.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File $TakaraAppsValidator -Project $TakaraRepoRoot
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Apps Script validation fallo." -ForegroundColor Red
    exit 1
}

Log-Line "[TAKARA_QUALITY_GATE_OK]"
exit 0
