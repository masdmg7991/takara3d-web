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
$ExpectedHash = "B7FA96414E47B09D77EE9F792D6D81C7735772CBABA7CCA52342F89A23689103"

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
    @{ Name = "VERSION_SCRIPT V1_9"; Pass = ($Text -match "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_9_5_EXTERNAL_LOGO") },
    @{ Name = "VERSION_PLANTILLA"; Pass = ($Text -match "TAKARA_PEDIDO_WEB_V1") },
    @{ Name = "doGet"; Pass = ($Text -match "function\s+doGet\s*\(") },
    @{ Name = "doPost"; Pass = ($Text -match "function\s+doPost\s*\(") },
    @{ Name = "CONTACTO_WEB"; Pass = ($Text -match "CONTACTO_WEB") },
    @{ Name = "MailApp.sendEmail"; Pass = ($Text -match "MailApp\.sendEmail") },
    @{ Name = "DriveApp"; Pass = ($Text -match "DriveApp") },
    @{ Name = "MAX_FOTO_BYTES 20MB"; Pass = ($Text -match "20\s*\*\s*1024\s*\*\s*1024") },
    @{ Name = "Precio 35.00"; Pass = ($Text -match "35\.00") },
    @{ Name = "JSON response"; Pass = ($Text -match "ContentService") },
    @{ Name = "Telefono obligatorio en servidor"; Pass = ($Text -match "telefonoPedidoValido_") },
    @{ Name = "Email obligatorio en servidor"; Pass = ($Text -match "emailPedidoValido_") },
    @{ Name = "Correo premium cliente"; Pass = ($Text -match "construirHtmlConfirmacionPedidoCliente_") },
    @{ Name = "Correo premium interno"; Pass = ($Text -match "construirHtmlInterno_") },
    @{ Name = "Alternativa HTML sin sustituir body"; Pass = (
        ($Text -match "body:\s*body") -and
        ($Text -match "htmlBody:\s*construirHtmlInterno_")
    ) },
    @{ Name = "Respuesta cliente dirigida a Takara"; Pass = ($Text -match "replyTo:\s*CFG\.DESTINO_PEDIDOS") },
    @{ Name = "Paleta premium Takara"; Pass = (
        $Text.Contains("#24170F") -and
        $Text.Contains("#C89B4A") -and
        $Text.Contains("#F7F3EE") -and
        $Text.Contains("#FFFBF6")
    ) },
    @{ Name = "Contrato premium delimitado"; Pass = (
        $Text.Contains("TAKARA EMAIL PEDIDO PREMIUM V1 START") -and
        $Text.Contains("TAKARA EMAIL PEDIDO PREMIUM V1 END")
    ) }
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
