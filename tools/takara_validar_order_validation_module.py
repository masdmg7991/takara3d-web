from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

VALIDATION_FUNCTIONS = (
    'validarSnapshotV2_',
    'validarPedido_',
    'validarPedidoV1Compat_',
    'validarPedidoV2_',
    'validarProductoCatalogoV2_',
    'validarFichaVisual_',
    'validarPersonalizacionMarco_',
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
    validation = read('apps-script/takara-pedidos-web/OrderValidation.gs')
    normalization = read('apps-script/takara-pedidos-web/OrderNormalization.gs')
    media = read('apps-script/takara-pedidos-web/OrderMedia.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    require('TAKARA ORDER VALIDATION V1' in validation, 'OrderValidation declara versión arquitectónica')
    require('function doGet(' not in validation and 'function doPost(' not in validation, 'OrderValidation no posee HTTP')
    require('MailApp.' not in validation and 'DriveApp.' not in validation, 'Validación no ejecuta efectos laterales')

    all_gs = {
        path.name: path.read_text(encoding='utf-8-sig')
        for path in APP.glob('*.gs')
    }
    for name in VALIDATION_FUNCTIONS:
        marker = f'function {name}('
        require(validation.count(marker) == 1, f'{name} existe una vez en OrderValidation')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')

    attribution_call = 'pedido.attribution = buildAuthoritativeOrderAttribution_(payload);'
    validate_call = 'validarPedido_(pedido);'
    require(validate_call in code, 'doPost delega validación')
    require(code.index(attribution_call) < code.index(validate_call), 'Validación ocurre después de atribución autoritativa')
    require('validarSnapshotV2_(pedido);' in normalization, 'Normalización conserva validación de snapshot')
    require('validarEntregaPedido_(' in validation, 'Validación de pedido delega entrega')
    require('validarProductoCatalogoV2_(pedido);' in validation, 'V2 valida catálogo autoritativo')
    require('validarPersonalizacionMarco_(' in validation, 'Validación conserva personalización')
    require('validarFichaVisual_(archivos);' in media, 'OrderMedia consume autoridad de validación visual')

    code_lines = len(code.splitlines())
    validation_lines = len(validation.splitlines())
    require(code_lines < 750, 'Code.gs queda por debajo de 750 líneas')
    require(320 <= validation_lines <= 360, 'OrderValidation mantiene tamaño acotado')
    require('OrderValidation.gs' in readme, 'README documenta OrderValidation')
    require('apps-script/takara-pedidos-web/OrderValidation.gs' in gate, 'Quality Gate exige OrderValidation')
    require('tools/takara_validar_order_validation_module.py' in gate, 'Quality Gate exige validador de validación')

    print('[TAKARA_ORDER_VALIDATION_MODULE_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'validation_lines': validation_lines,
        'functions': len(VALIDATION_FUNCTIONS),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
