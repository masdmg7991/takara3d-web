from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

DELIVERY_FUNCTIONS = (
    'normalizarCodigoPostalEntrega_',
    'normalizarUbicacionEntregaCodigo_',
    'codigoPostalEspanolValido_',
    'opcionesUbicacionEntrega_',
    'buscarOpcionUbicacionEntrega_',
    'buscarAreaEntregaCercana_',
    'clasificacionEntregaInvalida_',
    'clasificarCodigoPostalEntrega_',
    'calcularCotizacionEntrega_',
    'normalizarEntregaPedido_',
    'normalizarLocalidadInformativa_',
    'normalizarMunicipioInformativo_',
    'normalizarImporteOpcional_',
    'validarEntregaPedido_',
)

CORE_NUMERIC_FUNCTIONS = (
    'numeroEnteroEstricto_',
    'normalizarImporteEstricto_',
    'importeEnCentimos_',
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
    runtime = read('apps-script/takara-pedidos-web/RuntimeHelpers.gs')
    normalization = read('apps-script/takara-pedidos-web/OrderNormalization.gs')
    delivery = read('apps-script/takara-pedidos-web/OrderDelivery.gs')
    normalization = read('apps-script/takara-pedidos-web/OrderNormalization.gs')
    validation = read('apps-script/takara-pedidos-web/OrderValidation.gs')
    email = read('apps-script/takara-pedidos-web/OrderEmail.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')
    require('TAKARA ORDER DELIVERY V1' in delivery, 'OrderDelivery declara versión arquitectónica')
    require('function doGet(' not in delivery and 'function doPost(' not in delivery, 'OrderDelivery no posee HTTP')
    all_gs = {p.name: p.read_text(encoding='utf-8-sig') for p in APP.glob('*.gs')}
    for name in DELIVERY_FUNCTIONS:
        marker = f'function {name}('
        require(delivery.count(marker) == 1, f'{name} existe una vez en OrderDelivery')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')
    for name in CORE_NUMERIC_FUNCTIONS:
        marker = f'function {name}('
        require(runtime.count(marker) == 1, f'{name} vive en RuntimeHelpers')
        require(delivery.count(marker) == 0 and code.count(marker) == 0, f'{name} no se duplica en delivery/Code')
    require('normalizarEntregaPedido_(' in normalization, 'normalización de pedido delega entrega')
    require('validarEntregaPedido_(' in validation, 'validación de pedido delega entrega')
    require('textoPrecioEntrega_(' in email, 'OrderEmail consume autoridad delivery')
    code_lines=len(code.splitlines()); delivery_lines=len(delivery.splitlines())
    require(code_lines < 1450, 'Code.gs baja de 1450 líneas')
    require(540 <= delivery_lines <= 590, 'OrderDelivery mantiene bloque acotado')
    require('OrderDelivery.gs' in readme, 'README documenta OrderDelivery')
    require('apps-script/takara-pedidos-web/OrderDelivery.gs' in gate, 'Gate exige OrderDelivery')
    require('tools/takara_validar_order_delivery_module.py' in gate, 'Gate exige validador W12.4')
    print('[TAKARA_ORDER_DELIVERY_MODULE_OK] '+json.dumps({'checks':checks,'code_lines':code_lines,'delivery_lines':delivery_lines,'functions':len(DELIVERY_FUNCTIONS)},ensure_ascii=False,separators=(',',':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
