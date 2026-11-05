"""Guard the new architecture and the approved GLB identities."""
from pathlib import Path
import hashlib
import json
import re
from takara_validar_vertical_back import validate as validate_vertical_back

ROOT = Path(__file__).resolve().parents[1]


def main():
    page = (ROOT / 'pedido.html').read_text(encoding='utf-8-sig')
    core = (ROOT / 'assets/js/3d/product-viewer.js').read_text(encoding='utf-8-sig')
    for word in ('MARCO', 'Lithophane', 'FrameText', 'personalizacion', 'precio'):
        assert word not in core, f'Core contains product/business knowledge: {word}'
    for old in ('takara-pedido-preview.js', 'takara-frame-text.js', '3d/frame-viewer.js'):
        assert not (ROOT / 'assets/js' / old).exists(), f'Obsolete renderer retained: {old}'
    assert 'data-takara-preview-canvas' not in page
    assert 'data-takara-frame-text-overlay' not in page
    assert len(re.findall(r'<script[^>]*src="assets/js/3d/order-preview.js', page)) == 1
    assert 'data-takara-product-stage' in page
    assert 'data-takara-product-status' in page and 'data-takara-product-retry' in page
    order = (ROOT / 'assets/js/takara-pedido-web.js').read_text(encoding='utf-8-sig')
    assert 'preview.capture(expectedPhoto)' in order
    for old in ('sourceCanvas', 'createOverlayImage', 'waitForPreviewPhoto'):
        assert old not in order, f'Order retains old capture: {old}'
    expected = {
        'vertical': 'b9924227d15439f2d6f863226036bdfaf4ddafa701619a07d14da3e82f92eb9b',
        'horizontal': '3bd9650529315713deb88b0aa9998c6ad52a0348fcee503f978e88cc97c6fba8',
    }
    for variant, digest in expected.items():
        model = ROOT / f'assets/models/marco/{variant}.glb'
        assert hashlib.sha256(model.read_bytes()).hexdigest() == digest, f'Approved model changed: {variant}'
    validate_vertical_back()
    assert (ROOT / 'assets/vendor/model-viewer/LICENSE').is_file()
    vendor = ROOT / 'assets/vendor/model-viewer'
    manifest = json.loads((vendor / 'INTEGRITY.json').read_text(encoding='utf-8'))
    assert manifest['version'] == '4.4.0'
    for filename, record in manifest['files'].items():
        data = (vendor / filename).read_bytes()
        assert len(data) == record['bytes'], f'Vendor size changed: {filename}'
        assert hashlib.sha256(data).hexdigest() == record['sha256'], f'Vendor changed: {filename}'
    print('TAKARA_3D_ARCHITECTURE_OK: one renderer, product isolation, approved GLBs, real capture')


if __name__ == '__main__':
    main()
