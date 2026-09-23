from __future__ import annotations

from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'apps-script'/'takara-pedidos-web'
checks=0

HELPERS=(
    'numeroEnteroEstricto_',
    'normalizarImporteEstricto_',
    'importeEnCentimos_',
    'normalizarFormatoHumano_',
    'normalizarOrientacion_',
    'normalizarEntorno_',
    'telefonoPedidoValido_',
    'emailPedidoValido_',
    'normalizarCantidad_',
    'normalizarTamanoArchivo_',
    'normalizarPrecio_',
    'calcularTotalMostrado_',
    'formatearEuros_',
    'formatearCantidad_',
    'capitalizar_',
    'normalizarPrivacidad_',
    'extensionDesdeContentType_',
    'booleano_',
    'siNo_',
    'texto_',
    'escapeHtml_',
    'json_',
)

def require(condition,message):
    global checks
    if not condition: raise AssertionError('[FAIL] '+message)
    checks+=1

def read(rel):
    p=ROOT/rel
    require(p.is_file(),f'Existe {rel}')
    return p.read_text(encoding='utf-8-sig')

def main():
    code=read('apps-script/takara-pedidos-web/Code.gs')
    runtime=read('apps-script/takara-pedidos-web/RuntimeHelpers.gs')
    normalization=read('apps-script/takara-pedidos-web/OrderNormalization.gs')
    validation=read('apps-script/takara-pedidos-web/OrderValidation.gs')
    delivery=read('apps-script/takara-pedidos-web/OrderDelivery.gs')
    email=read('apps-script/takara-pedidos-web/OrderEmail.gs')
    contact=read('apps-script/takara-pedidos-web/ContactService.gs')
    media=read('apps-script/takara-pedidos-web/OrderMedia.gs')
    readme=read('apps-script/takara-pedidos-web/README.md')
    gate=read('tools/takara_quality_gate.ps1')
    require('TAKARA RUNTIME HELPERS V1' in runtime,'RuntimeHelpers declara versión arquitectónica')
    require('function doGet(' not in runtime and 'function doPost(' not in runtime,'RuntimeHelpers no posee HTTP')
    require('MailApp' not in runtime and 'DriveApp' not in runtime,'RuntimeHelpers no posee efectos laterales externos')
    all_gs={p.name:p.read_text(encoding='utf-8-sig') for p in APP.glob('*.gs')}
    for name in HELPERS:
        marker=f'function {name}('
        require(runtime.count(marker)==1,f'{name} existe una vez en RuntimeHelpers')
        require(code.count(marker)==0,f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values())==1,f'{name} tiene autoridad única')
    require('texto_(' in normalization,'Normalización consume texto compartido')
    require('importeEnCentimos_(' in validation,'Validación consume dinero compartido')
    require('normalizarImporteEstricto_(' in delivery,'Entrega consume importe compartido')
    require('formatearEuros_(' in email and 'escapeHtml_(' in email,'Email consume formato/escape compartido')
    require('emailPedidoValido_(' in contact and 'escapeHtml_(' in contact,'Contacto consume validación/escape compartido')
    require('extensionDesdeContentType_(' in media,'Media consume extensión compartida')
    require('json_(' in code,'Entrypoint conserva respuesta JSON mediante helper compartido')
    code_lines=len(code.splitlines()); runtime_lines=len(runtime.splitlines())
    require(code_lines < 500,'Code.gs baja de 500 líneas')
    require(220 <= runtime_lines <= 250,'RuntimeHelpers mantiene tamaño acotado')
    require('RuntimeHelpers.gs' in readme,'README documenta RuntimeHelpers')
    require('apps-script/takara-pedidos-web/RuntimeHelpers.gs' in gate,'Gate exige RuntimeHelpers')
    require('tools/takara_validar_runtime_helpers_module.py' in gate,'Gate exige validador W12.6')
    print('[TAKARA_RUNTIME_HELPERS_MODULE_OK] '+json.dumps({'checks':checks,'code_lines':code_lines,'runtime_lines':runtime_lines,'functions':len(HELPERS)},ensure_ascii=False,separators=(',',':')))
    return 0

if __name__=='__main__': raise SystemExit(main())
