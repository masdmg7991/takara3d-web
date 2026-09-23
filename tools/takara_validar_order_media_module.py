from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

MEDIA_FUNCTIONS = (
    'prepararFotoOriginal_',
    'guardarFoto_',
    'byteSinSigno_',
    'bytesCoinciden_',
    'detectarContentTypeImagen_',
    'esJpegCompletoPorFirma_',
    'prepararFichaVisual_',
    'prepararFichaVisualSegura_',
    'parseFotoBase64_',
    'asegurarCarpetaPedido_',
)

DRIVE_FUNCTIONS = (
    'getOrCreateRootFolder_',
    'getOrCreateChildFolder_',
)

def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError('[FAIL] ' + message)
    checks += 1

def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f'Existe {relative}')
    return path.read_text(encoding='utf-8-sig')

def main() -> int:
    code = read('apps-script/takara-pedidos-web/Code.gs')
    media = read('apps-script/takara-pedidos-web/OrderMedia.gs')
    drive = read('apps-script/takara-pedidos-web/DriveStorage.gs')
    store_repo = read('apps-script/takara-pedidos-web/StoreSheetsRepository.gs')
    retention = read('apps-script/takara-pedidos-web/DataRetention.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    require('TAKARA ORDER MEDIA V1' in media, 'OrderMedia declara versión arquitectónica')
    require('TAKARA DRIVE STORAGE V1' in drive, 'DriveStorage declara versión arquitectónica')
    require('function doGet(' not in media and 'function doPost(' not in media, 'OrderMedia no posee HTTP')
    require('function doGet(' not in drive and 'function doPost(' not in drive, 'DriveStorage no posee HTTP')
    require('DriveApp' not in media, 'OrderMedia usa puerto Folder y no autoridad global DriveApp')
    require('DriveApp' in drive, 'DriveStorage concentra acceso global DriveApp')

    all_gs = {
        path.name: path.read_text(encoding='utf-8-sig')
        for path in APP.glob('*.gs')
    }

    for name in MEDIA_FUNCTIONS:
        marker = f'function {name}('
        require(media.count(marker) == 1, f'{name} existe una vez en OrderMedia')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')

    for name in DRIVE_FUNCTIONS:
        marker = f'function {name}('
        require(drive.count(marker) == 1, f'{name} existe una vez en DriveStorage')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')

    require('const fotoPreparada = prepararFotoOriginal_(' in code, 'doPost conserva preparación de foto')
    require('const folder = asegurarCarpetaPedido_(' in code, 'doPost conserva creación de carpeta')
    require(code.index('const fotoPreparada = prepararFotoOriginal_(') < code.index('const folder = asegurarCarpetaPedido_('), 'Foto se valida antes de Drive')
    require('getOrCreateRootFolder_()' in media, 'OrderMedia usa DriveStorage compartido')
    require('getOrCreateRootFolder_()' in store_repo, 'Store usa DriveStorage compartido')
    require('getOrCreateRootFolder_()' in retention, 'Retention usa DriveStorage compartido')

    code_lines = len(code.splitlines())
    media_lines = len(media.splitlines())
    drive_lines = len(drive.splitlines())
    require(code_lines < 3050, 'Code.gs baja de 3050 líneas tras extracción media')
    require(230 <= media_lines <= 280, 'OrderMedia mantiene bloque acotado')
    require(20 <= drive_lines <= 45, 'DriveStorage mantiene infraestructura mínima')

    require('OrderMedia.gs' in readme, 'README documenta OrderMedia')
    require('DriveStorage.gs' in readme, 'README documenta DriveStorage')
    require('apps-script/takara-pedidos-web/OrderMedia.gs' in gate, 'Quality Gate exige OrderMedia')
    require('apps-script/takara-pedidos-web/DriveStorage.gs' in gate, 'Quality Gate exige DriveStorage')
    require('tools/takara_validar_order_media_module.py' in gate, 'Quality Gate exige validador W12.2')

    print('[TAKARA_ORDER_MEDIA_MODULE_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'media_lines': media_lines,
        'drive_lines': drive_lines,
        'media_functions': len(MEDIA_FUNCTIONS),
        'drive_functions': len(DRIVE_FUNCTIONS),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
