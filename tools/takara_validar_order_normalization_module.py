from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

NORMALIZATION_FUNCTIONS = (
    'detectarContratoPedido_',
    'normalizarPedido_',
    'normalizarPedidoV1Compat_',
    'normalizarPedidoV2_',
    'objetoPlanoSeguro_',
    'listaObjetosSegura_',
    'normalizarModoVisual_',
    'normalizarPersonalizacionMarco_',
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
    norm = read('apps-script/takara-pedidos-web/OrderNormalization.gs')
    validation = read('apps-script/takara-pedidos-web/OrderValidation.gs')
    delivery = read('apps-script/takara-pedidos-web/OrderDelivery.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    require('TAKARA ORDER NORMALIZATION V1' in norm, 'OrderNormalization declara versión arquitectónica')
    require('function doGet(' not in norm and 'function doPost(' not in norm, 'OrderNormalization no posee HTTP')

    all_gs = {
        path.name: path.read_text(encoding='utf-8-sig')
        for path in APP.glob('*.gs')
    }
    for name in NORMALIZATION_FUNCTIONS:
        marker = f'function {name}('
        require(norm.count(marker) == 1, f'{name} existe una vez en OrderNormalization')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')

    normalize_call = 'const pedido = normalizarPedido_(payload);'
    attribution_call = 'pedido.attribution = buildAuthoritativeOrderAttribution_(payload);'
    validate_call = 'validarPedido_(pedido);'
    require(normalize_call in code, 'doPost delega normalización')
    require(attribution_call in code, 'doPost conserva atribución backend')
    require(validate_call in code, 'doPost delega validación')
    require(code.index(normalize_call) < code.index(attribution_call) < code.index(validate_call), 'doPost conserva normalize -> attribution -> validate')

    require('validarSnapshotV2_(pedido);' in norm, 'Normalización V2 conserva validación de snapshot')
    require('function validarSnapshotV2_(' in validation, 'Snapshot se valida desde autoridad de validación')
    require('normalizarEntregaPedido_(' in norm, 'Normalización delega entrega')
    require('normalizarImporteEstricto_(' in norm, 'Normalización usa helper numérico compartido')
    require('normalizarImporteEstricto_(' in delivery, 'Delivery usa el mismo helper numérico compartido')
    require(code.count('function normalizarImporteEstricto_(') == 1, 'Helper numérico conserva autoridad única en core')

    code_lines = len(code.splitlines())
    norm_lines = len(norm.splitlines())
    require(code_lines < 750, 'Code.gs queda por debajo de 750 líneas')
    require(350 <= norm_lines <= 400, 'OrderNormalization mantiene tamaño acotado')
    require('OrderNormalization.gs' in readme, 'README documenta OrderNormalization')
    require('apps-script/takara-pedidos-web/OrderNormalization.gs' in gate, 'Quality Gate exige OrderNormalization')
    require('tools/takara_validar_order_normalization_module.py' in gate, 'Quality Gate exige validador de normalización')

    print('[TAKARA_ORDER_NORMALIZATION_MODULE_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'normalization_lines': norm_lines,
        'functions': len(NORMALIZATION_FUNCTIONS),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
