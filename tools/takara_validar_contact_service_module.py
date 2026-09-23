from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

CONTACT_FUNCTIONS = (
    'procesarContactoWeb_',
    'normalizarContactoWeb_',
    'validarContactoWeb_',
    'generarIdContactoWeb_',
    'construirAsuntoContactoWeb_',
    'construirCuerpoContactoWeb_',
    'enviarEmailContactoInterno_',
    'construirHtmlContactoHumano_',
    'enviarConfirmacionContactoCliente_',
    'construirHtmlConfirmacionContactoCliente_',
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
    service = read('apps-script/takara-pedidos-web/ContactService.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    require('TAKARA CONTACT SERVICE V1' in service, 'Modulo declara versión arquitectónica')
    require('function doGet(' not in service, 'ContactService no posee doGet')
    require('function doPost(' not in service, 'ContactService no posee doPost')
    require('function doPost(' in code, 'Code conserva entrypoint doPost')
    require('procesarContactoWeb_(payload, contactResponseRequest)' in code, 'doPost sigue delegando contacto')

    all_gs = {}
    for path in APP.glob('*.gs'):
        all_gs[path.name] = path.read_text(encoding='utf-8-sig')

    for name in CONTACT_FUNCTIONS:
        marker = f'function {name}('
        require(service.count(marker) == 1, f'{name} existe una vez en ContactService')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        total = sum(text.count(marker) for text in all_gs.values())
        require(total == 1, f'{name} tiene autoridad única en Apps Script')

    code_lines = len(code.splitlines())
    service_lines = len(service.splitlines())
    require(code_lines < 3400, 'Code.gs baja de 3400 líneas tras extracción')
    require(service_lines >= 450, 'ContactService contiene el bloque completo de contacto')
    require(service_lines < 600, 'ContactService mantiene responsabilidad acotada')

    require('ContactService.gs' in readme, 'README Apps Script documenta ContactService')
    require('apps-script/takara-pedidos-web/ContactService.gs' in gate, 'Quality Gate exige ContactService')
    require('tools/takara_validar_contact_service_module.py' in gate, 'Quality Gate exige validador W12.1')

    print('[TAKARA_CONTACT_SERVICE_MODULE_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'service_lines': service_lines,
        'functions': len(CONTACT_FUNCTIONS),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
