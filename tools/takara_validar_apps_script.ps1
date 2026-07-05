param(
    [string]$Project = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

if (!$Project) {
    $Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

$CodeRel = "apps-script/takara-pedidos-web/Code.gs"
$CodePath = Join-Path $Project $CodeRel
$ExpectedHash = "02BF9D9CF7FC9CFEF3D9ACE8DE898F52B7E17D0E22A418CD1CF011EB398378EA"

function Ok($Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Fail($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[RUN] Takara Apps Script validation"

if (!(Test-Path $CodePath)) { Fail "No existe $CodeRel" }

$Text = Get-Content $CodePath -Raw -Encoding UTF8
$Hash = (Get-FileHash -Algorithm SHA256 -Path $CodePath).Hash

if ($Hash -ne $ExpectedHash) { Fail "Hash Code.gs inesperado: $Hash" }
Ok "Hash Code.gs exacto"

$Checks = @(
    @{ Name = "VERSION_SCRIPT V1_8"; Pass = ($Text -match "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_8") },
    @{ Name = "VERSION_PLANTILLA"; Pass = ($Text -match "TAKARA_PEDIDO_WEB_V1") },
    @{ Name = "doGet"; Pass = ($Text -match "function\s+doGet\s*\(") },
    @{ Name = "doPost"; Pass = ($Text -match "function\s+doPost\s*\(") },
    @{ Name = "CONTACTO_WEB"; Pass = ($Text -match "CONTACTO_WEB") },
    @{ Name = "MailApp.sendEmail"; Pass = ($Text -match "MailApp\.sendEmail") },
    @{ Name = "DriveApp"; Pass = ($Text -match "DriveApp") },
    @{ Name = "MAX_FOTO_BYTES 20MB"; Pass = ($Text -match "20\s*\*\s*1024\s*\*\s*1024") },
    @{ Name = "Precio 35.00"; Pass = ($Text -match "35\.00") },
    @{ Name = "JSON response"; Pass = ($Text -match "ContentService") }
)

$Errors = 0
foreach ($Check in $Checks) {
    if ($Check.Pass) {
        Ok $Check.Name
    } else {
        Write-Host "[ERROR] $($Check.Name)" -ForegroundColor Red
        $Errors += 1
    }
}

if ($Errors -gt 0) { Fail "Contrato Apps Script incompleto." }

$PrivateKeyPatternA = '-----BEGIN .*'
$PrivateKeyPatternB = 'PRIVATE'
$PrivateKeyPatternC = ' KEY-----'

$SecretPatterns = @(
    ($PrivateKeyPatternA + $PrivateKeyPatternB + $PrivateKeyPatternC),
    'AIza[0-9A-Za-z_\-]{20,}',
    'ghp_[0-9A-Za-z_]{20,}|github_pat_[0-9A-Za-z_]{20,}',
    'sk-[0-9A-Za-z]{20,}',
    'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}',
    'Bearer\s+[A-Za-z0-9._\-]{20,}'
)

$SecretHits = @()
foreach ($Pattern in $SecretPatterns) {
    $Hits = @(Select-String -Path $CodePath -Pattern $Pattern -AllMatches -Encoding UTF8 -ErrorAction SilentlyContinue)
    foreach ($Hit in $Hits) { $SecretHits += ("line " + $Hit.LineNumber) }
}

if ($SecretHits.Count -gt 0) {
    $SecretHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Fail "Posibles secretos criticos en Code.gs."
}

Ok "Sin secretos criticos en Code.gs"
Write-Host "[TAKARA_APPS_SCRIPT_VALIDATION_OK]"
exit 0