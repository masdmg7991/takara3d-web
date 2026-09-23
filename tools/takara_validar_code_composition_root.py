from __future__ import annotations

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
checks = 0

EXPECTED_FUNCTIONS = (
    'doGet',
    'doPost',
    'parsePayload_',
    'generarIdPedidoWeb_',
    'resolverIdPedidoWeb_',
)

FORBIDDEN_DOMAIN_DEFINITIONS = (
    'normalizarPedido_',
    'validarPedido_',
    'procesarContactoWeb_',
    'prepararFotoOriginal_',
    'enviarEmailInterno_',
    'calcularCotizacionEntrega_',
    'numeroEnteroEstricto_',
    'texto_',
    'json_',
    'createStoreService_',
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
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    functions = tuple(re.findall(r'^function\s+([A-Za-z0-9_]+)\s*\(', code, re.MULTILINE))
    require(functions == EXPECTED_FUNCTIONS, 'Code.gs contiene exactamente las cinco funciones del composition root')
    require('const CFG = Object.freeze({' in code, 'Code conserva configuración runtime compartida')
    require('const PRODUCT_RULES_V2 = Object.freeze({' in code, 'Code conserva reglas runtime de producto actuales')
    require('function doGet(' in code and 'function doPost(' in code, 'Code conserva entrypoints HTTP')
    require('RUNTIME HELPERS' in code and 'RuntimeHelpers.gs' in code, 'Code declara delegación de helpers')

    for name in FORBIDDEN_DOMAIN_DEFINITIONS:
        require(f'function {name}(' not in code, f'{name} no regresa al composition root')

    for marker in ('MailApp.', 'DriveApp.', 'SpreadsheetApp.', '.createFile('):
        require(marker not in code, f'Code no ejecuta efecto lateral directo: {marker}')

    require('const pedido = normalizarPedido_(payload);' in code, 'doPost delega normalización')
    require('validarPedido_(pedido);' in code, 'doPost delega validación')
    require('procesarContactoWeb_(payload, contactResponseRequest)' in code, 'doPost delega contacto')
    require('enviarEmailInterno_(' in code, 'doPost delega correo interno')
    require('enviarConfirmacionCliente_(' in code, 'doPost delega confirmación cliente')
    require('json_(' in code and 'function json_(' in runtime, 'Code delega respuesta JSON en RuntimeHelpers')

    code_lines = len(code.splitlines())
    require(code_lines <= 480, 'Composition root permanece acotado a 480 líneas')
    require('`Code.gs`: **composition root HTTP**' in readme, 'README declara Code.gs como composition root HTTP')
    require('`RuntimeHelpers.gs`' in readme, 'README documenta RuntimeHelpers')
    require('tools/takara_validar_code_composition_root.py' in gate, 'Quality Gate exige guard del composition root')

    print('[TAKARA_CODE_COMPOSITION_ROOT_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'functions': len(functions),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
