param(
    [string]$Project = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function Ok($Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function FailAudit($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    throw $Message
}

function GitGrep($Pattern, $Paths) {
    $Args = @("grep", "-n", "-I", "-E", "-e", $Pattern, "--") + $Paths
    $Output = @(& git @Args 2>$null)
    $Code = $LASTEXITCODE

    if (($Code -ne 0) -and ($Code -ne 1)) {
        FailAudit "git grep fallo con patron: $Pattern"
    }

    return $Output
}

if (!(Test-Path $Project)) {
    FailAudit "No existe repo: $Project"
}

Set-Location $Project

$TrackedFiles = @(git ls-files)

if ($TrackedFiles.Count -eq 0) {
    FailAudit "No hay archivos trackeados. Ruta equivocada o repo vacio."
}

Write-Host ""
Write-Host "[RUN] Takara public repo audit"

# 1. Carpetas privadas prohibidas en el estado actual
$ForbiddenTracked = @(
    "docs/takara-continuidad-arquitectura-",
    "docs/private/",
    "private-docs/"
)

foreach ($Forbidden in $ForbiddenTracked) {
    $Hits = @($TrackedFiles | Where-Object { $_ -like "$Forbidden*" })

    if ($Hits.Count -gt 0) {
        Write-Host "Archivos prohibidos trackeados:" -ForegroundColor Red
        $Hits | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
        FailAudit "Hay documentacion privada trackeada: $Forbidden"
    }
}

Ok "Sin carpetas privadas trackeadas"

# 2. Politica publica obligatoria
if (!(Test-Path "docs/PUBLIC_REPO_POLICY.md")) {
    FailAudit "Falta docs/PUBLIC_REPO_POLICY.md"
}

$PolicyText = Get-Content "docs/PUBLIC_REPO_POLICY.md" -Raw -Encoding UTF8

if ($PolicyText -notmatch "solo debe contener la web publica") {
    FailAudit "La politica publica no contiene la regla principal."
}

if ($PolicyText -notmatch "No permitido en este repo") {
    FailAudit "La politica publica no contiene bloque No permitido."
}

Ok "Politica publica presente"

# 3. Documentacion publica sin endpoints reales ni rutas locales personales
$DocPaths = @("docs/*.md", "docs/**/*.md", "apps-script/**/*.md")

$EndpointDocHits = @(GitGrep "https://script\.google\.com/macros/s/[A-Za-z0-9_\-]+/exec" $DocPaths)
$LocalPathHits = @(GitGrep "C:\\Users\\[A-Za-z0-9_.\-]+" $DocPaths)
$PrivateDocHits = @(GitGrep "\b(PROMPT_PROXIMA_CONVERSACION|CONTINUIDAD_ARQUITECTURA|takara-continuidad-arquitectura)\b" $DocPaths)

if ($EndpointDocHits.Count -gt 0) {
    Write-Host "Endpoints reales en documentacion:" -ForegroundColor Red
    $EndpointDocHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    FailAudit "Quedan endpoints reales en documentacion."
}

Ok "Sin endpoints reales en documentacion"

if ($LocalPathHits.Count -gt 0) {
    Write-Host "Rutas locales personales en documentacion:" -ForegroundColor Red
    $LocalPathHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    FailAudit "Quedan rutas locales personales en documentacion."
}

Ok "Sin rutas locales personales en documentacion"

if ($PrivateDocHits.Count -gt 0) {
    Write-Host "Referencias directas a continuidad privada:" -ForegroundColor Red
    $PrivateDocHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    FailAudit "Quedan referencias directas a documentacion privada."
}

Ok "Sin referencias directas a continuidad privada"

# 4. Endpoints productivos solo en pedido/contacto
$HtmlEndpointHits = @(GitGrep "https://script\.google\.com/macros/s/[A-Za-z0-9_\-]+/exec" @("*.html"))

if ($HtmlEndpointHits.Count -gt 0) {
    $BadEndpointHits = @($HtmlEndpointHits | Where-Object {
        ($_ -notmatch "^pedido\.html:") -and ($_ -notmatch "^contacto\.html:")
    })

    if ($BadEndpointHits.Count -gt 0) {
        Write-Host "Endpoints en HTML inesperado:" -ForegroundColor Red
        $BadEndpointHits | ForEach-Object { Write-Host $_ -ForegroundColor Red }
        FailAudit "Endpoint productivo fuera de pedido/contacto."
    }
}

Ok "Endpoints productivos limitados a pedido/contacto si existen"

# 5. Archivos sospechosos por nombre
$SuspiciousTracked = @(
    $TrackedFiles | Where-Object {
        ($_ -match "(?i)(cliente|pedido-real|foto-cliente|original-cliente|dni|factura|privado|secret|token|password)") -or
        ($_ -match "(?i)\.(zip|7z|rar)$")
    }
)

if ($SuspiciousTracked.Count -gt 0) {
    Write-Host "Archivos sospechosos trackeados:" -ForegroundColor Red
    $SuspiciousTracked | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    FailAudit "Hay archivos sospechosos en repo publico."
}

Ok "Sin archivos sospechosos por nombre"

# 6. Secretos criticos en arbol actual
$SecretPatterns = @(
    "-----BEGIN .*PRIVATE KEY-----",
    "AIza[0-9A-Za-z_\-]{20,}",
    "ghp_[0-9A-Za-z_]{20,}",
    "github_pat_[0-9A-Za-z_]{20,}",
    "sk-[0-9A-Za-z]{20,}",
    "AKIA[0-9A-Z]{16}",
    "ASIA[0-9A-Z]{16}",
    "Bearer\s+[A-Za-z0-9._\-]{20,}",
    "(password|passwd|client_secret|private_key|refresh_token|access_token|id_token|api_key|api-key|secret)\s*[:=]\s*['""][^'""]{6,}['""]"
)

$SecretHits = @()

foreach ($Pattern in $SecretPatterns) {
    $Hits = @(GitGrep $Pattern @("."))

    foreach ($Hit in $Hits) {
        # TAKARA_PUBLIC_AUDIT_SELF_PATTERN_FILTER_V1
        # El auditor contiene patrones literales de secretos para poder buscarlos.
        # Esas lineas no son secretos reales; son definiciones del propio detector.
        $IsSelfPatternLine = (
            ($Hit -match "^tools/takara_public_repo_audit\.ps1:\d+:") -and
            (
                ($Hit -match "PRIVATE KEY") -or
                ($Hit -match "AIza\[") -or
                ($Hit -match "ghp_") -or
                ($Hit -match "github_pat_") -or
                ($Hit -match "sk-\[") -or
                ($Hit -match "AKIA\[") -or
                ($Hit -match "ASIA\[") -or
                ($Hit -match "Bearer\\s") -or
                ($Hit -match "client_secret") -or
                ($Hit -match "refresh_token") -or
                ($Hit -match "access_token")
            )
        )

        if (!$IsSelfPatternLine) {
            $SecretHits += $Hit
        }
    }
}

if ($SecretHits.Count -gt 0) {
    Write-Host "Posibles secretos criticos:" -ForegroundColor Red
    $SecretHits | Select-Object -First 120 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    FailAudit "Posibles secretos criticos en arbol actual."
}

Ok "Sin secretos criticos en arbol actual"

Write-Host "[TAKARA_PUBLIC_REPO_AUDIT_OK]"
