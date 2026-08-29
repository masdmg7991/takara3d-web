#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$Repo = "C:\Users\Miky\Desktop\takara3d-web",
  [int]$Port = 8765
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$UiPath = Join-Path $Repo "apps-script\takara-pedidos-web\StoreAdminUi.html"

if (!(Test-Path -LiteralPath $UiPath -PathType Leaf)) {
  throw "StoreAdminUi.html no encontrado."
}

$Python = Get-Command py.exe -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($null -eq $Python) {
  $Python = Get-Command python.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1
}

if ($null -eq $Python) {
  throw "Python no disponible para preview local."
}

$TempRoot = Join-Path $env:TEMP (
  "TakaraStoreAdminPreview_" + [Guid]::NewGuid().ToString("N")
)
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null

$previewData = @{
  version = "TAKARA_STORE_ADMIN_UI_V1"
  stores = @(
    @{
      contract_version = "TAKARA_STORE_ADMIN_READ_V1"
      store_id = "STO_000001"
      store_public_code = "st_Q7m2F5pV8Kx4N9aBcD3e"
      status = "ACTIVE"
      created_at = "2026-08-12T10:30:00.000Z"
      updated_at = "2026-08-29T19:20:00.000Z"
      deactivated_at = ""
      version = 4
      display_name = "Foto García"
      contact_name = "Ana García"
      email = "ana@example.test"
      phone = "600 123 456"
      address_line = "Calle Mayor 24"
      postal_code = "28013"
      city = "Madrid"
      province = "Madrid"
      notes = "Tienda piloto del canal Store."
    },
    @{
      contract_version = "TAKARA_STORE_ADMIN_READ_V1"
      store_id = "STO_000002"
      store_public_code = "st_P3h8J2sR6Lm9W4xYkT7v"
      status = "ACTIVE"
      created_at = "2026-08-18T08:15:00.000Z"
      updated_at = "2026-08-28T16:10:00.000Z"
      deactivated_at = ""
      version = 2
      display_name = "Estudio Norte"
      contact_name = "Luis Martín"
      email = "luis@example.test"
      phone = "611 555 901"
      address_line = "Avenida del Norte 8"
      postal_code = "39001"
      city = "Santander"
      province = "Cantabria"
      notes = "Muestra física en escaparate."
    },
    @{
      contract_version = "TAKARA_STORE_ADMIN_READ_V1"
      store_id = "STO_000003"
      store_public_code = "st_Z8n1C5qM4Rs7V2bKpL6d"
      status = "INACTIVE"
      created_at = "2026-08-20T11:00:00.000Z"
      updated_at = "2026-08-27T12:45:00.000Z"
      deactivated_at = "2026-08-27T12:45:00.000Z"
      version = 3
      display_name = "Regalos Centro"
      contact_name = "Marta Ruiz"
      email = "marta@example.test"
      phone = "622 100 305"
      address_line = "Plaza Central 3"
      postal_code = "46001"
      city = "Valencia"
      province = "Valencia"
      notes = "Ejemplo INACTIVE para validar el estado visual."
    }
  )
}

$json = $previewData | ConvertTo-Json -Depth 6 -Compress
$injection = (
  "<script>window.TAKARA_STORE_ADMIN_PREVIEW_DATA=" +
  $json +
  ";</script>"
)

$html = [IO.File]::ReadAllText(
  $UiPath,
  [Text.Encoding]::UTF8
)

if ($html.IndexOf("</head>", [StringComparison]::OrdinalIgnoreCase) -lt 0) {
  throw "StoreAdminUi.html no contiene </head>."
}

$html = [regex]::Replace(
  $html,
  "</head>",
  ($injection + "</head>"),
  1,
  [Text.RegularExpressions.RegexOptions]::IgnoreCase
)

$PreviewPath = Join-Path $TempRoot "index.html"
[IO.File]::WriteAllText(
  $PreviewPath,
  $html,
  (New-Object Text.UTF8Encoding($false))
)

$url = "http://127.0.0.1:$Port/"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " TAKARA STORE ADMIN | PREVIEW LOCAL" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ("UI      : " + $UiPath)
Write-Host ("URL     : " + $url) -ForegroundColor Green
Write-Host "Datos   : DEMO / no Registry real" -ForegroundColor Yellow
Write-Host "Cerrar  : Ctrl+C" -ForegroundColor Cyan
Write-Host ""

Start-Process $url

try {
  & $Python.Source -m http.server $Port --bind 127.0.0.1 --directory $TempRoot
}
finally {
  Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}