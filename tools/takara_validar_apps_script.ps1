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
$ExpectedHash = "F934A6C0FFA6AE670FF70F44059E2A6C4566C919A10B0A51CB9AA804B2AD408D"

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
    @{ Name = "VERSION_SCRIPT V1_12_1"; Pass = ($Text -match "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_12_1_SECURE_VISUAL_PROOF") },
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
    @{ Name = "Foto original obligatoria en servidor"; Pass = (
        $Text -match 'if\s*\(\s*!pedido\.archivos\.foto_base64\s*\)' -and
        $Text -match 'throw new Error\("Falta la foto del pedido\."\)' -and
        $Text -notmatch "function\s+esPedidoLigeroSinFoto_" -and
        $Text -notmatch "payload\.modo_prueba\s*!==\s*true"
    ) },
    @{ Name = "Foto validada por firma y tamano real"; Pass = (
        $Text -match "function\s+prepararFotoOriginal_\s*\(" -and
        $Text -match "function\s+detectarContentTypeImagen_\s*\(" -and
        $Text -match "MAX_FOTO_BASE64_CHARS" -and
        $Text -match "archivos\.size_bytes\s*!==\s*bytes\.length"
    ) },
    @{ Name = "Foto validada antes de crear carpeta Drive"; Pass = (
        $Text.IndexOf("const fotoPreparada = prepararFotoOriginal_(") -ge 0 -and
        $Text.IndexOf("const fotoPreparada = prepararFotoOriginal_(") -lt
            $Text.IndexOf("const folder = asegurarCarpetaPedido_(")
    ) },
    @{ Name = "Correo premium cliente"; Pass = ($Text -match "construirHtmlConfirmacionPedidoCliente_") },
    @{ Name = "Correo premium interno"; Pass = ($Text -match "construirHtmlInterno_") },
    @{ Name = "Personalizacion normalizada"; Pass = ($Text -match "normalizarPersonalizacionMarco_") },
    @{ Name = "Personalizacion validada"; Pass = ($Text -match "validarPersonalizacionMarco_") },
    @{ Name = "Precio por numero de lados"; Pass = ($Text -match "FRAME_TEXT_PRICE_BY_SIDE_COUNT") },
    @{ Name = "Bloque tecnico personalizacion"; Pass = ($Text -match "\[PERSONALIZACION_MARCO\]") },
    @{ Name = "Personalizacion en correo cliente texto"; Pass = ($Text -match "construirBloquePersonalizacionClienteTexto_") },
    @{ Name = "Personalizacion en correos HTML"; Pass = (
        ([regex]::Matches($Text, "construirFilasPersonalizacionEmailPremium_\(")).Count -ge 3
    ) },
    @{ Name = "Ficha visual versionada"; Pass = ($Text -match "TAKARA_ORDER_VISUAL_PROOF_V1") },
    @{ Name = "Ficha visual limitada a 900 KiB"; Pass = (
        $Text -match "MAX_VISUAL_PROOF_BYTES:\s*900\s*\*\s*1024" -and
        $Text -match "MAX_VISUAL_PROOF_BASE64_CHARS"
    ) },
    @{ Name = "Ficha visual validada por firma JPEG completa"; Pass = (
        $Text -match "function\s+esJpegCompletoPorFirma_\s*\(" -and
        $Text -match 'detectarContentTypeImagen_\(bytes\)\s*!==\s*"image/jpeg"' -and
        $Text -match "bytes\.length\s*-\s*2" -and
        $Text -match "La ficha visual no tiene una firma JPEG"
    ) },
    @{ Name = "Ficha visual preparada sin copia en Drive"; Pass = (
        $Text -match "function\s+prepararFichaVisual_\s*\(" -and
        ([regex]::Matches($Text, "folder\.createFile\(")).Count -eq 1 -and
        $Text -notmatch "function\s+guardarFichaVisual_\s*\("
    ) },
    @{ Name = "Ficha visual no bloquea pedido"; Pass = (
        $Text -match "function\s+prepararFichaVisualSegura_\s*\(" -and
        $Text -match 'estado:\s*"descartada"'
    ) },
    @{ Name = "Ficha visual incluida en ambos correos"; Pass = (
        ([regex]::Matches($Text, "options\.inlineImages")).Count -eq 2 -and
        ([regex]::Matches(
            $Text,
            "takaraOrderVisualProof:\s*fichaVisual\.blob"
        )).Count -eq 2 -and
        $Text -match 'src="cid:takaraOrderVisualProof"' -and
        ([regex]::Matches(
            $Text,
            "construirBloqueFichaVisualEmailPremium_\("
        )).Count -eq 3
    ) },
    @{ Name = "Adjunto descargable solo para Takara"; Pass = (
        ([regex]::Matches($Text, "options\.attachments")).Count -eq 1 -and
        ([regex]::Matches($Text, "options\.inlineImages")).Count -eq 2
    ) },
    @{ Name = "Desglose de precio en ambos correos"; Pass = (
        ([regex]::Matches($Text, 'construirTituloSeccionEmailPremium_\("Desglose del precio"\)')).Count -eq 2 -and
        ([regex]::Matches($Text, "construirFilasDesglosePrecioEmailPremium_\(")).Count -eq 3 -and
        $Text -match "construirBloqueDesglosePrecioClienteTexto_" -and
        $Text -match "Marco con litofan" -and
        $Text -match "Total por unidad" -and
        $Text -match "Total del pedido"
    ) },
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
