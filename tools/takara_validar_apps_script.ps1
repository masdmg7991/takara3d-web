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
$ExpectedHash = "BE6CD2BDD8F097CD4A5055B21B830237D480DE9D7147C5DAFA92DE76325CA68C"

function Ok($Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Fail($Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "[RUN] Takara Apps Script validation"

if (!(Test-Path $CodePath)) { Fail "No existe $CodeRel" }

$Text = Get-Content $CodePath -Raw -Encoding UTF8
$Hash = (Get-FileHash -Algorithm SHA256 -Path $CodePath).Hash

if ($Hash -ne $ExpectedHash) { Fail "Hash Code.gs inesperado: $Hash" }
Ok "Hash Code.gs exacto"

$V2BodyStart = $Text.IndexOf("function construirCuerpoInternoV2_")
$V2BodyEnd = $Text.IndexOf("/* TAKARA EMAIL PEDIDO PREMIUM V1 START */", $V2BodyStart)
if ($V2BodyStart -lt 0 -or $V2BodyEnd -le $V2BodyStart) {
    Fail "No se pudo aislar construirCuerpoInternoV2_."
}
$V2BodyText = $Text.Substring($V2BodyStart, $V2BodyEnd - $V2BodyStart)

$Checks = @(
    @{ Name = "VERSION_SCRIPT V1_14_1 dual-stack"; Pass = ($Text -match "TAKARA_PEDIDOS_WEB_APPS_SCRIPT_V1_14_1_DUAL_STACK_V1_V2") },
    @{ Name = "Privacidad fail-closed"; Pass = (
        $Text -match 'function\s+normalizarPrivacidad_\s*\(' -and
        $Text -match 'text\s*===\s*"si"' -and
        $Text -match 'text\s*===\s*"true"' -and
        $Text -match 'text\s*===\s*"1"' -and
        $Text -notmatch 'text\s*===\s*"no"\s*\|\|'
    ) },
    @{ Name = "Consentimiento opcional resultado"; Pass = (
        $Text -match 'autoriza_publicacion_resultado:\s*booleano_' -and
        $Text -notmatch 'if\s*\(\s*!pedido\.control\.autoriza_publicacion_resultado' -and
        $Text -notmatch 'autoriza_publicacion_resultado\s*!==\s*true' -and
        $Text -match 'pedido\.control\.autoriza_publicacion_resultado'
    ) },
    @{ Name = "Politica postal automatica V2"; Pass = (
        $Text -match 'TAKARA_DELIVERY_V2_POSTAL_AUTOMATIC' -and
        $Text -match 'function\s+calcularCotizacionEntrega_\s*\(' -and
        $Text -match 'function\s+normalizarEntregaPedido_\s*\(' -and
        $Text -match 'function\s+validarEntregaPedido_\s*\('
    ) },
    @{ Name = "Tarifas entrega exactas"; Pass = (
        $Text -match 'DELIVERY_PRICE_LOCAL_FREE_EUR:\s*"0\.00"' -and
        $Text -match 'DELIVERY_PRICE_LOCAL_NEARBY_EUR:\s*"3\.00"' -and
        $Text -match 'DELIVERY_PRICE_MAINLAND_TRACKED_EUR:\s*"6\.50"' -and
        $Text -match 'DELIVERY_FIXED_MAINLAND_MAX_QUANTITY:\s*1'
    ) },
    @{ Name = "Entrega postal recalculada y fail closed"; Pass = (
        $Text -match 'validarEntregaPedido_\(pedido\.entrega,\s*pedido\.totales\)' -and
        $Text -match 'clasificarCodigoPostalEntrega_' -and
        $Text -match 'deliverySource\.codigo_postal' -and
        $Text -match 'deliverySource\.ubicacion_codigo' -and
        $Text -match 'DELIVERY_AUTOMATIC_FREE_POSTAL_CODES' -and
        $Text -match 'DELIVERY_AUTOMATIC_NEARBY_BY_AREA' -and
        $Text -match 'DELIVERY_AMBIGUOUS_POSTAL_OPTIONS' -and
        $Text -match 'fuente_decision' -and
        $Text -match 'ubicacion_requerida' -and
        $Text -match 'precio de entrega' -and
        $Text -match 'total estimado' -and
        $Text -match 'direccion_completa_solicitada' -and
        $Text -match 'legacy_sin_entrega'
    ) },
    @{ Name = "Entrega y ubicacion en correos"; Pass = (
        $Text -match '\[ENTREGA\]' -and
        $Text -match 'construirBloqueEntregaClienteTexto_' -and
        $Text -match 'construirFilasEntregaEmailPremium_' -and
        $Text -match 'Localidad o distrito' -and
        $Text -match 'Ubicaci\u00F3n c\u00F3digo:' -and
        $Text -match 'localidad_informativa' -and
        $Text -match 'normalizarLocalidadInformativa_' -and
        $Text -match 'Localidad indicada'
    ) },
    @{ Name = "Municipio nacional informativo"; Pass = (
        $Text -match 'normalizarMunicipioInformativo_' -and
        $Text -match 'municipio_codigo' -and
        $Text -match 'municipio_nombre' -and
        $Text -match 'provincia_nombre' -and
        $Text -match 'municipio_fuente' -and
        $Text -match 'cartociudad_automatico' -and
        $Text -match 'cartociudad_seleccion' -and
        $Text -match 'pedido\.entrega\.ubicacion_codigo\s*\|\|\s*pedido\.entrega\.municipio_codigo' -and
        $Text -match 'pedido\.entrega\.ubicacion_nombre\s*\|\|\s*pedido\.entrega\.municipio_nombre'
    ) },
    @{ Name = "Contrato V2"; Pass = (
        $Text -match "TAKARA_PEDIDO_WEB_V2" -and
        $Text -match "TAKARA_WEB_ORDER_PAYLOAD_V2" -and
        $Text -match "TAKARA_ORDER_SNAPSHOT_V2" -and
        $Text -match "consiente_gestion_datos" -and
        $Text -match "declara_derechos_y_autoriza_revision_imagen" -and
        $V2BodyText -notmatch "Acepta pol.tica privacidad:"
    ) },
    @{ Name = "Puente temporal V1/V2 fail-closed"; Pass = (
        $Text -match 'PAYLOAD_VERSION_V1_COMPAT:\s*"TAKARA_WEB_ORDER_PAYLOAD_V1"' -and
        $Text -match 'VERSION_PLANTILLA_V1_COMPAT:\s*"TAKARA_PEDIDO_WEB_V1"' -and
        $Text -match 'function\s+detectarContratoPedido_\s*\(' -and
        $Text -match 'function\s+normalizarPedidoV1Compat_\s*\(' -and
        $Text -match 'function\s+validarPedidoV1Compat_\s*\(' -and
        $Text -match 'function\s+construirCuerpoInternoV1Compat_\s*\(' -and
        $Text -match 'Payload V2 declarado pero no compatible o incompleto'
    ) },
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
    @{ Name = "Desglose de precio y entrega en ambos correos"; Pass = (
        ([regex]::Matches($Text, 'construirTituloSeccionEmailPremium_\("Desglose del precio"\)')).Count -eq 2 -and
        ([regex]::Matches($Text, "construirFilasDesglosePrecioEmailPremium_\(")).Count -eq 3 -and
        $Text -match "construirBloqueDesglosePrecioClienteTexto_" -and
        $Text -match "Marco con litofan" -and
        $Text -match "Total por unidad" -and
        $Text -match "Subtotal de productos" -and
        $Text -match "textoPrecioEntrega_\(pedido\.entrega\)" -and
        $Text -match "textoTotalEstimado_\(pedido\.totales\)" -and
        $Text -match "Total estimado"
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
