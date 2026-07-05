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
    "assets/css/styles.css",
    "assets/js/takara-pedido-preview.js",
    "docs/ARCHITECTURE.md",
    "docs/DESIGN_SYSTEM.md",
    "docs/QUALITY_GATE.md",
    "docs/ERROR_REGISTRY.md",
    "docs/CLEANUP_POLICY.md",
    "docs/ORDER_ENGINE_CONTRACT.md",
    "docs/PREVIEW_ENGINE_CONTRACT.md"
)

foreach ($File in $RequiredFiles) {
    if (Test-Path (Join-Path $Project $File)) { Ok ("Existe " + $File) } else { Err ("Falta archivo requerido: " + $File) }
}

$PreviewPath = Join-Path $Project "assets/js/takara-pedido-preview.js"
$PedidoPath = Join-Path $Project "pedido.html"

if (Test-Path $PreviewPath) {
    $PreviewText = Read-Utf8 $PreviewPath
    $PreviewHash = (Get-FileHash $PreviewPath -Algorithm SHA256).Hash
    $ModeOn = "data-takara-litho-mode=" + [char]34 + "on" + [char]34
    $ModeOff = "data-takara-litho-mode=" + [char]34 + "off" + [char]34
    if ($PreviewText.Contains("TAKARA PEDIDO PREVIEW LITHO REAL V16B-1")) { Ok "Preview V16B-1 detectado" } else { Err "Preview V16B-1 no detectado" }
    if ($PreviewText.Contains($ModeOn) -and $PreviewText.Contains($ModeOff)) { Ok "Preview contiene Encendida/Apagada" } else { Err "Preview no contiene Encendida/Apagada" }
    Ok ("Hash preview: " + $PreviewHash)
}

if (Test-Path $PedidoPath) {
    $PedidoText = Read-Utf8 $PedidoPath
    if ($PedidoText.Contains("takara-pedido-preview.js")) { Ok "pedido.html carga preview JS" } else { Err "pedido.html no carga preview JS" }

# TAKARA LEGACY ENGINE GUARDS START
$ProductosPath = Join-Path $Project "productos.html"
if (Test-Path $ProductosPath) {
    $ProductosText = Read-Utf8 $ProductosPath
    if ($ProductosText.Contains('<script src="assets/js/productos.js"></script>')) { Err "productos.html carga motor legado productos.js" } else { Ok "productos.html no carga motor legado productos.js" }
    if ($ProductosText.Contains("renderTakaraProducts") -and $ProductosText.Contains("assets/js/core/takara-catalogo.js") -and $ProductosText.Contains("assets/js/core/takara-pricing.js")) { Ok "productos.html conserva motor catalogo actual" } else { Err "productos.html no conserva motor catalogo actual" }
} else {
    Err "No existe productos.html"
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

Log-Line "[TAKARA_QUALITY_GATE_OK]"
exit 0
