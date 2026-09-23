from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'apps-script' / 'takara-pedidos-web'
checks = 0

EMAIL_FUNCTIONS = (
    'nombreModalidadEntrega_',
    'textoPrecioEntrega_',
    'textoTotalEstimado_',
    'construirBloqueEntregaClienteTexto_',
    'construirFilasEntregaEmailPremium_',
    'construirAsunto_',
    'versionPlantillaPedido_',
    'construirCuerpoInterno_',
    'construirCuerpoInternoV1Compat_',
    'construirCuerpoInternoV2_',
    'enviarEmailInterno_',
    'construirHtmlInterno_',
    'enviarConfirmacionCliente_',
    'construirHtmlConfirmacionPedidoCliente_',
    'textoLadoPersonalizacion_',
    'formatearNumeroLadosPersonalizados_',
    'construirBloqueDesglosePrecioClienteTexto_',
    'construirFilasDesglosePrecioEmailPremium_',
    'construirBloquePersonalizacionClienteTexto_',
    'construirFilasPersonalizacionEmailPremium_',
    'construirBloqueFichaVisualEmailPremium_',
    'envolverEmailPremium_',
    'construirCabeceraEmailPremium_',
    'construirReferenciaEmailPremium_',
    'construirTituloSeccionEmailPremium_',
    'construirFilaResumenEmailPremium_',
    'construirPasosClienteEmailPremium_',
    'construirPieEmailPremium_',
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
    email = read('apps-script/takara-pedidos-web/OrderEmail.gs')
    readme = read('apps-script/takara-pedidos-web/README.md')
    gate = read('tools/takara_quality_gate.ps1')

    require('TAKARA ORDER EMAIL V1' in email, 'OrderEmail declara versión arquitectónica')
    require('function doGet(' not in email and 'function doPost(' not in email, 'OrderEmail no posee HTTP')
    require('MailApp.sendEmail' in email, 'OrderEmail concentra handoff MailApp de pedido')
    require('MailApp.sendEmail' not in code, 'Code.gs ya no envía correo directamente')
    require('construirCuerpoInterno_(' in code, 'doPost conserva llamada a cuerpo interno')
    require('enviarEmailInterno_(' in code, 'doPost conserva llamada a correo interno')
    require('enviarConfirmacionCliente_(' in code, 'doPost conserva llamada a confirmación cliente')

    all_gs = {
        path.name: path.read_text(encoding='utf-8-sig')
        for path in APP.glob('*.gs')
    }

    for name in EMAIL_FUNCTIONS:
        marker = f'function {name}('
        require(email.count(marker) == 1, f'{name} existe una vez en OrderEmail')
        require(code.count(marker) == 0, f'{name} ya no vive en Code.gs')
        require(sum(text.count(marker) for text in all_gs.values()) == 1, f'{name} tiene autoridad única')

    for name in CORE_NUMERIC_FUNCTIONS:
        marker = f'function {name}('
        require(code.count(marker) == 1, f'{name} permanece en núcleo compartido')
        require(email.count(marker) == 0, f'{name} no se acopla artificialmente a email')

    code_lines = len(code.splitlines())
    email_lines = len(email.splitlines())
    require(code_lines < 2000, 'Code.gs baja de 2000 líneas tras extracción email')
    require(1000 <= email_lines <= 1120, 'OrderEmail mantiene bloque completo y acotado')

    require('OrderEmail.gs' in readme, 'README documenta OrderEmail')
    require('apps-script/takara-pedidos-web/OrderEmail.gs' in gate, 'Quality Gate exige OrderEmail')
    require('tools/takara_validar_order_email_module.py' in gate, 'Quality Gate exige validador W12.3')

    print('[TAKARA_ORDER_EMAIL_MODULE_OK] ' + json.dumps({
        'checks': checks,
        'code_lines': code_lines,
        'email_lines': email_lines,
        'functions': len(EMAIL_FUNCTIONS),
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
